import {
  ENEMY_EXPLODE_SOUNDS,
  getDroppableWeapons,
  getEnemyWeaponDef,
  getShipDrag,
  getShipMaxHitPoints,
  getShipRepairRate,
  getShipThrust,
  getWeaponDef,
  MINE_COLLISION_DAMAGE,
  MINE_HIT_POINTS,
  SPORE_COLLISION_DAMAGE,
  SPORE_HIT_POINTS,
} from "./data.js";
import { playRandomSound, playSound, warmSoundPools } from "./audio.js";
import { buildShipPicker, createWeaponMounts, loadGameAssets } from "./assets.js";
import {
  applyBeamDamage,
  damagePlayer as applyPlayerDamage,
  emitExplosion,
  emitRocketTrail,
  emitShipParts,
  emitSparks,
  handleEnemyProjectileHits,
  handleProjectileHits,
  handleShipCollisions as resolveShipCollisions,
  triggerPlayerDeathEffects,
} from "./combat.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const introScreen = document.getElementById("intro-screen");
const introShipPicker = document.getElementById("intro-ship-picker");
const launchButton = document.getElementById("launch-button");
const menuButton = document.getElementById("menu-button");
const scoreDisplay = document.getElementById("score-display");
const playtestHitboxesToggle = document.getElementById("playtest-hitboxes");

const pointer = { x: window.innerWidth * 0.75, y: window.innerHeight * 0.5, down: false };
const keys = new Set();

const world = {
  width: window.innerWidth,
  height: window.innerHeight,
  stars: [],
  activeShipIndex: 0,
  currentShip: null,
  player: {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    vx: 0,
    vy: 0,
    hitPoints: 100,
    maxHitPoints: 100,
    collisionCooldownUntil: 0,
  },
  projectiles: [],
  beams: [],
  enemies: [],
  particles: [],
  drops: [],
  bosses: [],
  enemyShips: [],
  activeBossIndex: 0,
  defeatedBossCount: 0,
  stageIndex: 0,
  stagePhase: "hazard",
  stageHazardType: "mine",
  stageHazardsRemaining: 0,
  stageEnemyShipsRemaining: 0,
  bossEncounter: null,
  nextBossScore: 1000,
  mineSpawnCount: 0,
  lastMineSpawnAt: 0,
  lastEnemyShipSpawnAt: 0,
  score: 0,
  scene: "intro",
  transitionStartedAt: 0,
  transitionDuration: 2600,
  deathStartedAt: 0,
  deathDuration: 2200,
  audioEnabled: false,
  lastFrame: performance.now(),
  audioWarmed: false,
  playerScaleMultiplier: 0.8,
  debugHitboxes: false,
};

const MAX_ACTIVE_SPORES = 6;
const MAX_ACTIVE_ENEMY_SHIPS = 2;

function getEnemyShipSpawnCap() {
  return world.defeatedBossCount >= 2 ? 2 : 1;
}

function getActiveEnemyShipCount() {
  return world.enemies.filter((enemy) => enemy.type === "enemy-ship" && enemy.hitPoints > 0).length;
}

function getActiveStageHazardCount() {
  return world.enemies.filter((enemy) => enemy.stageHazard && enemy.hitPoints > 0 && (enemy.life === undefined || enemy.life > 0)).length;
}

function chooseEnemyShipRecord() {
  const records = world.enemyShips || [];
  if (!records.length) {
    return null;
  }

  const enemyWaveId = world.stageIndex === 0
    ? "enemy-orb-light"
    : world.stageIndex === 1
      ? "enemy-orb-heavy"
      : "enemy-dart";

  const matchingRecord = records.find((record) => record.id === enemyWaveId);
  if (matchingRecord) {
    return matchingRecord;
  }

  return records[0];
}

function getStageHazardType() {
  return world.stageIndex % 2 === 0 ? "mine" : "spore";
}

function getStageHazardCount() {
  return world.stageHazardType === "mine"
    ? (5 + Math.min(world.stageIndex, 3)) * 4
    : 4 + Math.min(world.stageIndex, 3);
}

function getStageEnemyShipCount() {
  return world.stageIndex >= 2 ? 3 : 2;
}

function prepareNextStage() {
  world.stageHazardType = getStageHazardType();
  world.stageHazardsRemaining = getStageHazardCount();
  world.stageEnemyShipsRemaining = getStageEnemyShipCount();
  world.stagePhase = "hazard";
  world.lastMineSpawnAt = 0;
  world.lastEnemyShipSpawnAt = 0;
}


function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  world.width = canvas.width;
  world.height = canvas.height;
  world.player.x = canvas.width * 0.34;
  world.player.y = canvas.height * 0.5;
  seedStars();
}

function seedStars() {
  world.stars = [];
  const starCount = Math.max(90, Math.floor((world.width * world.height) / 9000));

  for (let i = 0; i < starCount; i += 1) {
    world.stars.push({
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      size: Math.random() * 2.2 + 0.3,
      speed: Math.random() * 45 + 20,
      depth: Math.random() * 0.9 + 0.25,
    });
  }
}

function getShipScale(ship) {
  return getBaseShipScale(ship) * getShipDisplayScale(ship) * getPlayerScaleMultiplier();
}

function getBaseShipScale(ship) {
  return Math.min(world.width * 0.5 / ship.width, world.height * 0.5 / ship.height);
}

function getShipDisplayScale(ship) {
  return ship?.displayScale ?? 1;
}

function getPlayerScaleMultiplier() {
  return world.playerScaleMultiplier ?? 0.8;
}

function getTargetPlayerScaleMultiplier() {
  const encounter = world.bossEncounter;
  if (!encounter) {
    return 0.8;
  }

  if (encounter.phase === "cinematic") {
    const progress = Math.max(0, Math.min(1, encounter.phaseProgress || 0));
    return 0.8 - progress * 0.4;
  }

  if (encounter.phase === "entering" || encounter.phase === "active") {
    return 0.4;
  }

  return 0.8;
}

function updatePlayerScaleTransition(deltaSeconds) {
  const target = getTargetPlayerScaleMultiplier();
  const current = world.playerScaleMultiplier ?? target;
  const blend = Math.min(1, deltaSeconds * 3.2);
  world.playerScaleMultiplier = current + (target - current) * blend;
}

function getShipBounds(ship) {
  const scale = getShipScale(ship);
  return {
    scale,
    width: ship.width * scale,
    height: ship.height * scale,
  };
}

function getShipCollisionCircles(ship) {
  const bounds = getShipBounds(ship);
  if (ship.hitCircles?.length) {
    return ship.hitCircles.map((circle) => ({
      x: world.player.x + (circle.x + circle.radius - ship.width * 0.5) * bounds.scale,
      y: world.player.y + (circle.y + circle.radius - ship.height * 0.5) * bounds.scale,
      radius: circle.radius * bounds.scale,
    }));
  }

  const hullRadius = Math.min(bounds.height * 0.24, bounds.width * 0.14);
  const rearSpan = Math.max(hullRadius * 1.05, bounds.width * 0.28);
  const frontSpan = Math.max(hullRadius * 0.95, bounds.width * 0.19);
  const upperOffset = bounds.height * 0.1;
  const lowerOffset = bounds.height * 0.08;

  return [
    { x: world.player.x - rearSpan, y: world.player.y + lowerOffset * 0.35, radius: hullRadius * 0.9 },
    { x: world.player.x - frontSpan, y: world.player.y - upperOffset, radius: hullRadius * 1.02 },
    { x: world.player.x + bounds.width * 0.02, y: world.player.y, radius: hullRadius * 1.08 },
    { x: world.player.x + frontSpan, y: world.player.y - upperOffset * 0.45, radius: hullRadius },
    { x: world.player.x + rearSpan, y: world.player.y + lowerOffset * 0.15, radius: hullRadius * 0.86 },
  ];
}

function updatePlayer(deltaSeconds) {
  const ship = world.currentShip;
  if (!ship) {
    return;
  }

  const thrust = getShipThrust(ship);
  const drag = getShipDrag(ship);

  if (keys.has("KeyD")) {
    world.player.vx += thrust * deltaSeconds;
  }
  if (keys.has("KeyA")) {
    world.player.vx -= thrust * deltaSeconds;
  }
  if (keys.has("KeyW")) {
    world.player.vy -= thrust * deltaSeconds;
  }
  if (keys.has("KeyS")) {
    world.player.vy += thrust * deltaSeconds;
  }

  world.player.vx *= drag;
  world.player.vy *= drag;

  world.player.x += world.player.vx * deltaSeconds;
  world.player.y += world.player.vy * deltaSeconds;

  const repairRate = getShipRepairRate(ship);
  if (world.scene === "running" && world.player.hitPoints > 0 && world.player.hitPoints < world.player.maxHitPoints) {
    world.player.hitPoints = Math.min(world.player.maxHitPoints, world.player.hitPoints + repairRate * deltaSeconds);
  }

  const bounds = getShipBounds(ship);
  const marginX = bounds.width * 0.5 + 30;
  const marginY = bounds.height * 0.5 + 30;

  world.player.x = Math.max(marginX, Math.min(world.width - marginX, world.player.x));
  world.player.y = Math.max(marginY, Math.min(world.height - marginY, world.player.y));
}

function updateStars(deltaSeconds) {
  const speedBoost = Math.max(0, world.player.vx) * 0.3;

  for (const star of world.stars) {
    star.x -= (star.speed + speedBoost) * star.depth * deltaSeconds;
    if (star.x < -8) {
      star.x = world.width + Math.random() * 40;
      star.y = Math.random() * world.height;
      star.size = Math.random() * 2.2 + 0.3;
      star.speed = Math.random() * 45 + 20;
    }
  }
}

function updateEnemies(deltaSeconds) {
  if (world.scene !== "running") {
    return;
  }

  updateBossEncounter(deltaSeconds);

  const now = performance.now();
  if (!shouldPauseMineSpawns()) {
    if (shouldSpawnBossPreviewSupport() && now - world.lastEnemyShipSpawnAt > 2600) {
      spawnEnemyShip();
      world.lastEnemyShipSpawnAt = now;
    }

    if (world.stagePhase === "hazard" && shouldSpawnStageHazard() && now - world.lastMineSpawnAt > 1500) {
      spawnStageHazard();
      world.lastMineSpawnAt = now;
    }

    if (world.stagePhase === "ships" && shouldSpawnEnemyShips() && now - world.lastEnemyShipSpawnAt > 3400) {
      spawnEnemyShip();
      world.stageEnemyShipsRemaining = Math.max(0, world.stageEnemyShipsRemaining - 1);
      world.lastEnemyShipSpawnAt = now;
    }
  }

  world.enemies = world.enemies.filter((enemy) => {
    updateEnemy(enemy, deltaSeconds);
    return enemy.x > -120 && enemy.hitPoints > 0 && (enemy.life === undefined || enemy.life > 0);
  });

  updateStageProgression();

  handleShipCollisions();
}

function shouldPauseMineSpawns() {
  const encounter = world.bossEncounter;
  return Boolean(encounter && encounter.phase !== "preview");
}

function shouldSpawnBossPreviewSupport() {
  return world.stagePhase === "boss"
    && world.bossEncounter?.phase === "preview"
    && getActiveEnemyShipCount() < 1
    && Boolean(world.enemyShips?.length);
}

function shouldSpawnStageHazard() {
  return world.stageHazardsRemaining > 0;
}

function shouldSpawnEnemyShips() {
  return world.stageEnemyShipsRemaining > 0
    && getActiveEnemyShipCount() < Math.min(MAX_ACTIVE_ENEMY_SHIPS, getEnemyShipSpawnCap())
    && !shouldPauseMineSpawns()
    && Boolean(world.enemyShips?.length);
}

function updateEnemy(enemy, deltaSeconds) {
  if (enemy.type === "mine") {
    enemy.x += enemy.vx * deltaSeconds;
    enemy.y += enemy.vy * deltaSeconds;
    enemy.rotation += enemy.rotationSpeed * deltaSeconds;
    enemy.phase += deltaSeconds;
    enemy.y += Math.sin(enemy.phase * enemy.wobbleFrequency) * enemy.wobbleAmplitude * deltaSeconds;
    return;
  }

  if (enemy.type === "spore") {
    enemy.age = (enemy.age || 0) + deltaSeconds;
    enemy.life -= deltaSeconds;
    const speedProgress = Math.min(1, (enemy.age || 0) / (enemy.accelerationDuration || 1.8));
    const currentSpeed = enemy.baseSpeed + (enemy.targetSpeed - enemy.baseSpeed) * speedProgress;
    const desiredVx = -(currentSpeed - (enemy.forwardDrift || 0));
    const pathOffset = Math.sin((enemy.age || 0) * (enemy.pathFrequency || 2.3) + (enemy.patternPhase || 0))
      * (enemy.pathAmplitude || 18);
    const secondaryWave = Math.cos((enemy.age || 0) * 1.25 + (enemy.wobblePhase || 0)) * (enemy.wobbleAmplitude || 10);
    let desiredVy = pathOffset + secondaryWave;
    if (enemy.driftMode === "boss") {
      const playerDy = world.player.y - enemy.y;
      desiredVy += Math.max(-70, Math.min(70, playerDy * 0.22));
    }
    enemy.vx += (desiredVx - enemy.vx) * Math.min(1, deltaSeconds * 1.6);
    enemy.vy += (desiredVy - enemy.vy) * Math.min(1, deltaSeconds * 1.35);
    enemy.x += enemy.vx * deltaSeconds;
    enemy.y += enemy.vy * deltaSeconds;
    return;
  }

  if (enemy.type === "enemy-ship") {
    enemy.phase = (enemy.phase || 0) + deltaSeconds;
    const desiredX = enemy.patrolX + Math.sin(enemy.phase * enemy.patrolFrequency) * enemy.patrolAmplitude;
    const desiredY = enemy.baseY + Math.sin(enemy.phase * enemy.wobbleFrequency) * enemy.wobbleAmplitude;
    enemy.x += (desiredX - enemy.x) * Math.min(1, deltaSeconds * enemy.driftResponsiveness);
    enemy.y += (desiredY - enemy.y) * Math.min(1, deltaSeconds * (enemy.driftResponsiveness * 0.9));
    enemy.rotation = Math.sin(enemy.phase * 1.4) * (enemy.rotationAmplitude || 0.08);
    updateEnemyShipWeapons(enemy);
    fireEnemyShipWeapons(enemy);
    return;
  }

  if (enemy.type === "boss") {
    if (enemy.entryTargetX !== undefined) {
      enemy.x += (enemy.entryTargetX - enemy.x) * Math.min(1, deltaSeconds * 0.45);
      if (Math.abs(enemy.entryTargetX - enemy.x) < 2) {
        enemy.x = enemy.entryTargetX;
      }
    }
    enemy.floatTime = (enemy.floatTime || 0) + deltaSeconds;
    const floatOffset = world.bossEncounter?.phase === "active"
      ? Math.sin(enemy.floatTime * 0.55) * 26
      : 0;
    const desiredY = enemy.targetY + floatOffset;
    enemy.y += (desiredY - enemy.y) * Math.min(1, deltaSeconds * 0.45);
    enemy.rotation = 0;
    enemy.hitCircles = getBossHitCircles(enemy);
    updateBossWeapons(enemy);
    fireBossWeapons(enemy);
  }
}

function updateBossEncounter(deltaSeconds) {
  if (world.bossEncounter) {
    world.bossEncounter.phaseTime += deltaSeconds;
  }

  const encounter = world.bossEncounter;
  if (!encounter) {
    return;
  }

  if (encounter.phase === "preview") {
    encounter.previewX += encounter.previewSpeed * deltaSeconds;
    if (encounter.previewX - encounter.previewWidth * 0.5 > world.width + 30) {
      encounter.phase = "cinematic";
      encounter.phaseTime = 0;
      encounter.phaseProgress = 0;
    }
    return;
  }

  if (encounter.phase === "cinematic") {
    encounter.phaseProgress = Math.max(0, Math.min(1, encounter.phaseTime / encounter.cinematicDuration));
    if (encounter.phaseTime >= encounter.cinematicDuration) {
      spawnBossEnemy(encounter.bossRecord);
      encounter.phase = "entering";
      encounter.phaseTime = 0;
    }
    return;
  }

  if (encounter.phase === "entering" && encounter.bossEnemy) {
    updateBossSporeSpawns(encounter.bossEnemy);
    if (Math.abs(encounter.bossEnemy.x - encounter.bossEnemy.entryTargetX) < 4) {
      encounter.phase = "active";
      encounter.phaseTime = 0;
    }
    return;
  }

  if (encounter.phase === "active" && encounter.bossEnemy) {
    updateBossSporeSpawns(encounter.bossEnemy);
  }
}

function updateStageProgression() {
  if (world.scene !== "running" || world.bossEncounter) {
    return;
  }

  if (world.stagePhase === "hazard" && world.stageHazardsRemaining <= 0 && getActiveStageHazardCount() === 0) {
    world.stagePhase = "ships";
    world.lastEnemyShipSpawnAt = 0;
    return;
  }

  if (world.stagePhase === "ships" && world.stageEnemyShipsRemaining <= 0 && getActiveEnemyShipCount() <= 1) {
    world.stagePhase = "boss";
    startBossEncounter();
  }
}

function startBossEncounter() {
  const bossRecord = world.bosses[world.activeBossIndex % world.bosses.length];
  world.activeBossIndex += 1;
  world.nextBossScore += 1000;

  const previewScale = Math.min(world.width * 0.16 / bossRecord.width, world.height * 0.18 / bossRecord.height);
  world.bossEncounter = {
    bossRecord,
    bossEnemy: null,
    phase: "preview",
    phaseTime: 0,
    phaseProgress: 0,
    previewX: -bossRecord.width * previewScale * 0.5,
    previewY: world.height * 0.32,
    previewScale,
    previewWidth: bossRecord.width * previewScale,
    previewHeight: bossRecord.height * previewScale,
    previewSpeed: 78,
    cinematicDuration: 2.1,
  };
}

function spawnBossEnemy(bossRecord) {
  const playerMax = world.currentShip ? getShipMaxHitPoints(world.currentShip) : 100;
  const intendedSpawnCount = bossRecord.sporeSpawnCount || 3;
  const fallbackSpawnPoints = Array.from({ length: intendedSpawnCount }, (_, index) => {
    const t = intendedSpawnCount === 1 ? 0.5 : index / (intendedSpawnCount - 1);
    return {
      type: "light",
      x: bossRecord.width * (0.18 + t * 0.64),
      y: bossRecord.height * (0.24 + Math.sin(t * Math.PI) * 0.42),
    };
  });
  const parsedSpawnPoints = (bossRecord.hardpoints || []).filter((point) => point.type === "light");
  const activeSpawnPoints = parsedSpawnPoints.slice(0, intendedSpawnCount);
  const firingPoints = activeSpawnPoints.length ? activeSpawnPoints : fallbackSpawnPoints;
  const boss = {
    type: "boss",
    bossId: bossRecord.id,
    label: bossRecord.label,
    image: bossRecord.image,
    width: bossRecord.width,
    height: bossRecord.height,
    hitCircleDefs: bossRecord.hitCircles || [],
    hardpoints: bossRecord.hardpoints || [],
    x: world.width + world.width * 0.35,
    y: world.height * 0.14,
    targetY: world.height * 0.46,
    entryTargetX: world.width * 0.77,
    floatTime: Math.random() * Math.PI * 2,
    hitPoints: Math.max(playerMax * 10, 1200),
    maxHitPoints: Math.max(playerMax * 10, 1200),
    radius: Math.max(
      bossRecord.width * Math.min(world.width * 0.46 / bossRecord.width, world.height * 0.56 / bossRecord.height),
      bossRecord.height * Math.min(world.width * 0.46 / bossRecord.width, world.height * 0.56 / bossRecord.height),
    ) * 0.32,
    scoreValue: 650,
    sporeSpawnPoints: activeSpawnPoints,
    fallbackSpawnPoints,
    weaponMounts: firingPoints.map((hardpoint) => ({
      hardpoint,
      weaponId: "enemy-shot-3",
      cooldownUntil: performance.now() + 500 + Math.random() * 900,
      angle: Math.PI,
    })),
    bossProjectileDamageScale: 0.62,
    bossProjectileSpeedScale: 0.88,
    bossProjectileCooldownScale: 1.95,
    nextVolleyIndex: 0,
    nextBossVolleyAt: performance.now() + 1200,
    lastSporeAt: performance.now(),
    sporeCooldown: 6400,
  };
  boss.hitCircles = getBossHitCircles(boss);

  world.enemies.push(boss);
  world.bossEncounter.bossEnemy = boss;
}

function getBossScale(enemy) {
  return Math.min(world.width * 0.46 / enemy.width, world.height * 0.56 / enemy.height);
}

function getBossBounds(enemy) {
  const scale = getBossScale(enemy);
  return {
    scale,
    width: enemy.width * scale,
    height: enemy.height * scale,
  };
}

function getBossMountWorldPosition(hardpoint, enemy) {
  const bounds = getBossBounds(enemy);
  return {
    x: enemy.x + (hardpoint.x - enemy.width * 0.5) * bounds.scale,
    y: enemy.y + (hardpoint.y - enemy.height * 0.5) * bounds.scale,
  };
}

function getBossHitCircles(enemy) {
  const bounds = getBossBounds(enemy);
  if (enemy.hitCircleDefs?.length) {
    return enemy.hitCircleDefs.map((circle) => ({
      x: enemy.x + (circle.x + circle.radius - enemy.width * 0.5) * bounds.scale,
      y: enemy.y + (circle.y + circle.radius - enemy.height * 0.5) * bounds.scale,
      radius: circle.radius * bounds.scale,
    }));
  }

  const centerRadius = Math.min(bounds.height * 0.29, bounds.width * 0.115);
  const sideRadius = centerRadius * 0.88;
  const span = bounds.width * 0.22;
  const verticalOffset = bounds.height * 0.06;

  if (enemy.bossId === "boss-oculyte") {
    return [
      { x: enemy.x - span * 0.72, y: enemy.y + verticalOffset * 0.08, radius: sideRadius * 0.9 },
      { x: enemy.x - span * 0.18, y: enemy.y - verticalOffset * 0.55, radius: centerRadius * 0.95 },
      { x: enemy.x + span * 0.22, y: enemy.y - verticalOffset * 0.42, radius: centerRadius * 0.98 },
      { x: enemy.x + span * 0.78, y: enemy.y + verticalOffset * 0.05, radius: sideRadius * 0.88 },
    ];
  }

  if (enemy.bossId === "boss-karnyx") {
    return [
      { x: enemy.x - span * 0.02, y: enemy.y - bounds.height * 0.24, radius: centerRadius * 1.04 },
      { x: enemy.x - span * 0.86, y: enemy.y + verticalOffset * 0.2, radius: sideRadius * 0.92 },
      { x: enemy.x - span * 0.34, y: enemy.y - verticalOffset * 0.5, radius: centerRadius * 0.96 },
      { x: enemy.x + span * 0.18, y: enemy.y - verticalOffset * 0.08, radius: centerRadius * 1.02 },
      { x: enemy.x + span * 0.76, y: enemy.y + verticalOffset * 0.12, radius: centerRadius * 0.94 },
      { x: enemy.x + span * 1.18, y: enemy.y + verticalOffset * 0.28, radius: sideRadius * 0.82 },
    ];
  }

  return [
    { x: enemy.x - span * 1.12, y: enemy.y + verticalOffset * 0.35, radius: sideRadius * 0.86 },
    { x: enemy.x - span * 0.5, y: enemy.y - verticalOffset * 0.35, radius: centerRadius * 0.94 },
    { x: enemy.x + span * 0.05, y: enemy.y - verticalOffset * 0.28, radius: centerRadius * 0.98 },
    { x: enemy.x + span * 0.62, y: enemy.y - verticalOffset * 0.1, radius: centerRadius * 0.92 },
    { x: enemy.x + span * 1.22, y: enemy.y + verticalOffset * 0.28, radius: sideRadius * 0.82 },
  ];
}

function getBossSpawnerPoints(enemy) {
  return enemy.sporeSpawnPoints?.length ? enemy.sporeSpawnPoints : enemy.fallbackSpawnPoints;
}

function getActiveSporeCount(sourceBossId = null) {
  return world.enemies.filter((enemy) => enemy.type === "spore" && (sourceBossId ? enemy.sourceBossId === sourceBossId : true)).length;
}

function getBossSporeLaunchAngle(enemy, spawnIndex, spawnCount, burstOffset) {
  const normalizedIndex = spawnCount <= 1 ? 0.5 : spawnIndex / (spawnCount - 1);

  if (enemy.bossId === "boss-karnyx") {
    return Math.PI + (normalizedIndex - 0.5) * 0.9 + burstOffset * 0.28 + (Math.random() - 0.5) * 0.05;
  }

  if (enemy.bossId === "boss-myxolith") {
    const waveOffset = Math.sin((enemy.floatTime || 0) * 1.2 + normalizedIndex * Math.PI * 2) * 0.24;
    return Math.PI + waveOffset + burstOffset * 0.24 + (Math.random() - 0.5) * 0.05;
  }

  if (enemy.bossId === "boss-oculyte") {
    return Math.PI + (normalizedIndex - 0.5) * 0.42 + burstOffset * 0.18 + (Math.random() - 0.5) * 0.04;
  }

  return Math.PI + burstOffset * 0.22 + (Math.random() - 0.5) * 0.05;
}

function updateBossSporeSpawns(enemy) {
  const now = performance.now();
  const activeBossSpores = getActiveSporeCount(enemy.bossId);
  if (activeBossSpores >= MAX_ACTIVE_SPORES) {
    return;
  }

  if (now < enemy.lastSporeAt + enemy.sporeCooldown || !world.sporeImage) {
    return;
  }

  enemy.lastSporeAt = now;
  spawnSpores(enemy, 1);
}

function spawnSpores(enemy, clusterSize) {
  const spawnPoints = getBossSpawnerPoints(enemy);
  if (!spawnPoints?.length || clusterSize <= 0) {
    return;
  }

  const availableSlots = Math.max(0, MAX_ACTIVE_SPORES - getActiveSporeCount(enemy.bossId));
  if (availableSlots <= 0) {
    return;
  }

  const totalRequested = spawnPoints.length * clusterSize;
  const totalToSpawn = Math.min(totalRequested, availableSlots);
  let spawned = 0;

  for (const [spawnIndex, spawnPoint] of spawnPoints.entries()) {
    const spawnPos = getBossMountWorldPosition(spawnPoint, enemy);

    for (let clusterIndex = 0; clusterIndex < clusterSize; clusterIndex += 1) {
      if (spawned >= totalToSpawn) {
        return;
      }

      const burstOffset = clusterSize === 1 ? 0 : (clusterIndex / (clusterSize - 1) - 0.5);
      const angle = getBossSporeLaunchAngle(enemy, spawnIndex, spawnPoints.length, burstOffset);
      const launchOffset = Math.max(28, enemy.radius * 0.13);
      const emittedX = spawnPos.x + Math.cos(angle) * launchOffset;
      const emittedY = spawnPos.y + Math.sin(angle) * launchOffset;
      emitSparks(world, emittedX, emittedY, 3);
      world.enemies.push({
        type: "spore",
        sourceBossId: enemy.bossId,
        x: emittedX,
        y: emittedY,
        driftMode: "boss",
        vx: Math.cos(angle) * (70 + Math.random() * 12),
        vy: Math.sin(angle) * (26 + Math.random() * 10),
        baseSpeed: 85 + Math.random() * 14,
        targetSpeed: 155 + Math.random() * 22,
        accelerationDuration: 2.1,
        life: 16,
        spawnGraceUntil: performance.now() + 250,
        age: 0,
        radius: 10,
        hitPoints: Math.max(18, SPORE_HIT_POINTS * 0.7),
        maxHitPoints: Math.max(18, SPORE_HIT_POINTS * 0.7),
        rotation: 0,
        rotationSpeed: 0,
        patternPhase: Math.random() * Math.PI * 2,
        pathAmplitude: 12 + Math.random() * 12,
        pathFrequency: 1.7 + Math.random() * 0.7,
        forwardDrift: 12 + Math.random() * 18,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmplitude: 7 + Math.random() * 4,
        scoreValue: 120,
        collisionDamage: SPORE_COLLISION_DAMAGE + 12,
      });
      spawned += 1;
    }
  }
}

function spawnMine() {
  if (!world.mineImage) {
    return;
  }

  world.mineSpawnCount += 1;
  const isLarge = world.mineSpawnCount % 4 === 0;

  world.enemies.push({
    type: "mine",
    x: world.width + 80,
    y: 90 + Math.random() * (world.height - 180),
    vx: -(110 + Math.random() * 70),
    vy: (Math.random() - 0.5) * 22,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 1.2,
    wobbleAmplitude: 12 + Math.random() * 20,
    wobbleFrequency: 1.2 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    hitPoints: isLarge ? MINE_HIT_POINTS * 2 : MINE_HIT_POINTS,
    maxHitPoints: isLarge ? MINE_HIT_POINTS * 2 : MINE_HIT_POINTS,
    radius: isLarge ? 33 : 22,
    scale: isLarge ? 1.00 : 0.40,
    isLarge,
    scoreValue: isLarge ? 180 : 60,
  });
}

function spawnStageHazard() {
  if (world.stageHazardsRemaining <= 0) {
    return;
  }

  if (world.stageHazardType === "spore") {
    spawnStageSpore();
  } else {
    spawnMine();
    const spawnedMine = world.enemies[world.enemies.length - 1];
    if (spawnedMine?.type === "mine") {
      spawnedMine.stageHazard = true;
    }
  }

  world.stageHazardsRemaining = Math.max(0, world.stageHazardsRemaining - 1);
}

function spawnStageSpore() {
  if (!world.sporeImage) {
    return;
  }

  const spawnY = 80 + Math.random() * (world.height - 160);
  world.enemies.push({
    type: "spore",
    stageHazard: true,
    x: world.width + 60,
    y: spawnY,
    driftMode: "stage",
    vx: -(70 + Math.random() * 15),
    vy: (Math.random() - 0.5) * 28,
    baseSpeed: 90 + Math.random() * 20,
    targetSpeed: 155 + Math.random() * 25,
    accelerationDuration: 1.9,
    life: 18,
    spawnGraceUntil: performance.now() + 250,
    age: 0,
    radius: 10,
    hitPoints: Math.max(18, SPORE_HIT_POINTS * 0.7),
    maxHitPoints: Math.max(18, SPORE_HIT_POINTS * 0.7),
    rotation: 0,
    rotationSpeed: 0,
    patternPhase: Math.random() * Math.PI * 2,
    pathAmplitude: 14 + Math.random() * 14,
    pathFrequency: 1.6 + Math.random() * 0.8,
    forwardDrift: 10 + Math.random() * 16,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmplitude: 7 + Math.random() * 4,
    scoreValue: 120,
    collisionDamage: SPORE_COLLISION_DAMAGE + 12,
  });
}

function getEnemyShipScale(enemy) {
  return enemy.radius * 2 / Math.max(enemy.width, enemy.height);
}

function getEnemyShipProfile(record) {
  if (!record) {
    return null;
  }

  if (record.id === "enemy-orb-heavy") {
    return {
      radius: 72,
      hitPoints: 70,
      collisionDamage: 42,
      scoreValue: 180,
      patrolAmplitude: 18 + Math.random() * 24,
      patrolFrequency: 0.42 + Math.random() * 0.3,
      wobbleAmplitude: 12 + Math.random() * 14,
      wobbleFrequency: 0.55 + Math.random() * 0.35,
      driftResponsiveness: 0.74 + Math.random() * 0.22,
      rotationAmplitude: 0.05,
    };
  }

  if (record.id === "enemy-dart") {
    return {
      radius: 76,
      hitPoints: 92,
      collisionDamage: 50,
      scoreValue: 240,
      patrolAmplitude: 36 + Math.random() * 40,
      patrolFrequency: 0.85 + Math.random() * 0.45,
      wobbleAmplitude: 10 + Math.random() * 10,
      wobbleFrequency: 0.9 + Math.random() * 0.45,
      driftResponsiveness: 1.25 + Math.random() * 0.25,
      rotationAmplitude: 0.11,
    };
  }

  return {
    radius: 60,
    hitPoints: 42,
    collisionDamage: 30,
    scoreValue: 110,
    patrolAmplitude: 24 + Math.random() * 36,
    patrolFrequency: 0.55 + Math.random() * 0.45,
    wobbleAmplitude: 18 + Math.random() * 20,
    wobbleFrequency: 0.7 + Math.random() * 0.5,
    driftResponsiveness: 0.9 + Math.random() * 0.35,
    rotationAmplitude: 0.08,
  };
}

function spawnEnemyShip() {
  const enemyRecord = chooseEnemyShipRecord();
  if (!enemyRecord) {
    return;
  }

  const profile = getEnemyShipProfile(enemyRecord);
  const weaponId = enemyRecord.defaultEnemyShotId;
  const hardpoint = enemyRecord.lightHardpoints?.[0] || enemyRecord.hardpoints?.find((point) => point.type === "light");
  const spawnY = 70 + Math.random() * (world.height - 140);

  world.enemies.push({
    type: "enemy-ship",
    enemyId: enemyRecord.id,
    image: enemyRecord.image,
    width: enemyRecord.width,
    height: enemyRecord.height,
    hardpoints: enemyRecord.hardpoints || [],
    weaponMounts: hardpoint ? [{
      hardpoint,
      weaponId,
      cooldownUntil: performance.now() + 450 + Math.random() * 700,
      angle: Math.PI,
    }] : [],
    x: world.width + 70,
    y: spawnY,
    baseY: spawnY,
    patrolX: world.width * (0.66 + Math.random() * 0.2),
    patrolAmplitude: profile.patrolAmplitude,
    patrolFrequency: profile.patrolFrequency,
    driftResponsiveness: profile.driftResponsiveness,
    phase: Math.random() * Math.PI * 2,
    wobbleAmplitude: profile.wobbleAmplitude,
    wobbleFrequency: profile.wobbleFrequency,
    radius: profile.radius,
    hitPoints: profile.hitPoints,
    maxHitPoints: profile.hitPoints,
    collisionDamage: profile.collisionDamage,
    scoreValue: profile.scoreValue,
    rotationAmplitude: profile.rotationAmplitude,
    rotation: 0,
  });
}

function getMountWorldPosition(hardpoint, ship) {
  const bounds = getShipBounds(ship);
  return {
    x: world.player.x + (hardpoint.x - ship.width * 0.5) * bounds.scale,
    y: world.player.y + (hardpoint.y - ship.height * 0.5) * bounds.scale,
  };
}

function getEnemyMountWorldPosition(hardpoint, enemy) {
  const scale = getEnemyShipScale(enemy);
  return {
    x: enemy.x + (hardpoint.x - enemy.width * 0.5) * scale,
    y: enemy.y + (hardpoint.y - enemy.height * 0.5) * scale,
  };
}

function updateEnemyShipWeapons(enemy) {
  for (const mount of enemy.weaponMounts || []) {
    const mountPos = getEnemyMountWorldPosition(mount.hardpoint, enemy);
    mount.angle = Math.atan2(world.player.y - mountPos.y, world.player.x - mountPos.x);
  }
}

function fireEnemyShipWeapons(enemy) {
  const now = performance.now();
  for (const mount of enemy.weaponMounts || []) {
    const weapon = getEnemyWeaponDef(mount.weaponId);
    if (!weapon || now < mount.cooldownUntil) {
      continue;
    }

    const mountPos = getEnemyMountWorldPosition(mount.hardpoint, enemy);
    fireWeapon(mountPos, mount.angle, weapon, { target: { x: world.player.x, y: world.player.y }, isEnemy: true });
    mount.cooldownUntil = now + weapon.cooldown + Math.random() * weapon.cooldown * 0.25;
  }
}

function updateBossWeapons(enemy) {
  for (const mount of enemy.weaponMounts || []) {
    mount.angle = Math.PI;
  }
}

function getBossVolleyPattern(enemy) {
  const patternSets = {
    "boss-karnyx": [
      [0],
      [-0.18, 0, 0.18],
      [-0.34, -0.12, 0.12, 0.34],
    ],
    "boss-myxolith": [
      [-0.22, 0.22],
      [-0.36, -0.12, 0.12, 0.36],
      [-0.48, -0.24, 0, 0.24, 0.48],
    ],
    "boss-oculyte": [
      [0],
      [-0.14, 0.14],
      [-0.28, 0, 0.28],
    ],
    "boss-umbryx": [
      [-0.12, 0.12],
      [-0.26, 0, 0.26],
      [-0.42, -0.16, 0.16, 0.42],
    ],
    "boss-virexon": [
      [-0.12, 0, 0.12],
      [-0.28, 0.28],
      [-0.46, -0.18, 0.18, 0.46],
    ],
  };

  const patterns = patternSets[enemy.bossId] || [[0], [-0.18, 0.18], [-0.3, 0, 0.3]];
  const nextIndex = enemy.nextVolleyIndex || 0;
  enemy.nextVolleyIndex = (nextIndex + 1) % patterns.length;
  return patterns[nextIndex];
}

function fireBossWeapons(enemy) {
  const now = performance.now();
  if (now < (enemy.nextBossVolleyAt || 0)) {
    return;
  }

  const volleyOffsets = getBossVolleyPattern(enemy);
  const mounts = enemy.weaponMounts || [];
  let fired = false;

  for (const [index, mount] of mounts.entries()) {
    const weapon = getEnemyWeaponDef(mount.weaponId);
    if (!weapon) {
      continue;
    }

    const mountPos = getBossMountWorldPosition(mount.hardpoint, enemy);
    const spreadOffset = volleyOffsets[index % volleyOffsets.length];
    const volleyAngle = Math.PI + spreadOffset;
    fireWeapon(mountPos, volleyAngle, {
      ...weapon,
      damage: Math.max(6, weapon.damage * (enemy.bossProjectileDamageScale || 1)),
      projectileSpeed: weapon.projectileSpeed * (enemy.bossProjectileSpeedScale || 1),
    }, { target: { x: world.player.x, y: world.player.y }, isEnemy: true });
    mount.angle = volleyAngle;
    fired = true;
  }

  if (!fired) {
    return;
  }

  const weapon = getEnemyWeaponDef(mounts[0]?.weaponId);
  enemy.nextBossVolleyAt = now + (weapon?.cooldown || 760) * (enemy.bossProjectileCooldownScale || 1) + 720 + Math.random() * 520;
}

function updateWeaponAim(ship) {
  for (const mount of ship.weaponMounts || []) {
    const mountPos = getMountWorldPosition(mount.hardpoint, ship);
    const weapon = getWeaponDef(mount.weaponId);
    if (!weapon || weapon.aimMode === "forward") {
      mount.angle = 0;
      continue;
    }

    if (weapon.aimMode === "up") {
      mount.angle = -Math.PI * 0.5;
      continue;
    }

    mount.angle = Math.atan2(pointer.y - mountPos.y, pointer.x - mountPos.x);
  }
}

function updateProjectiles(deltaSeconds) {
  if (world.scene !== "running") {
    return;
  }

  if (pointer.down && world.currentShip) {
    fireMountedWeapons(world.currentShip);
  }

  world.projectiles = world.projectiles.filter((projectile) => {
    projectile.prevX = projectile.x;
    projectile.prevY = projectile.y;

    if (projectile.fireMode === "lobbed-torpedo") {
      updateLobbedProjectile(projectile, deltaSeconds);
    }

    if (projectile.homing) {
      updateHomingProjectile(projectile, deltaSeconds);
    }

    projectile.x += projectile.vx * deltaSeconds;
    projectile.y += projectile.vy * deltaSeconds;
    projectile.rotation = Math.atan2(projectile.vy, projectile.vx);
    projectile.spriteRotation = (projectile.spriteRotation || 0) + (projectile.spriteSpin || 0) * deltaSeconds;
    projectile.life -= deltaSeconds;

    if (projectile.trail) {
      emitRocketTrail(world, projectile.x, projectile.y);
    }

    return projectile.life > 0
      && projectile.x > -50
      && projectile.x < world.width + 50
      && projectile.y > -50
      && projectile.y < world.height + 50;
  });

  handleProjectileHits({
    world,
    onEnemyDestroyed: destroyEnemy,
  });
  if (world.currentShip) {
    handleEnemyProjectileHits({
      world,
      shipCollisionCircles: getShipCollisionCircles(world.currentShip),
      onPlayerDamaged: damagePlayer,
    });
  }
}

function updateHomingProjectile(projectile, deltaSeconds) {
  projectile.age = (projectile.age || 0) + deltaSeconds;
  if (projectile.age < (projectile.homingDelay || 0)) {
    return;
  }

  let target = null;
  let nearestDistance = projectile.homingRange || Infinity;

  for (const enemy of world.enemies) {
    if (enemy.hitPoints <= 0) {
      continue;
    }

    const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      target = enemy;
    }
  }

  if (!target) {
    return;
  }

  const desiredAngle = Math.atan2(target.y - projectile.y, target.x - projectile.x);
  const currentAngle = Math.atan2(projectile.vy, projectile.vx);
  let angleDelta = desiredAngle - currentAngle;

  while (angleDelta > Math.PI) {
    angleDelta -= Math.PI * 2;
  }
  while (angleDelta < -Math.PI) {
    angleDelta += Math.PI * 2;
  }

  const maxTurn = (projectile.homingTurnRate || 0) * deltaSeconds;
  const nextAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, angleDelta));
  const speed = Math.hypot(projectile.vx, projectile.vy);
  projectile.vx = Math.cos(nextAngle) * speed;
  projectile.vy = Math.sin(nextAngle) * speed;
}

function updateBeams(deltaSeconds) {
  if (world.scene !== "running") {
    return;
  }

  for (const beam of world.beams) {
    beam.life -= deltaSeconds;
    if (beam.damagePerSecond > 0) {
      applyBeamDamage({
        world,
        beam,
        damage: beam.damagePerSecond * deltaSeconds,
        onEnemyDestroyed: destroyEnemy,
      });
    }
  }

  world.beams = world.beams.filter((beam) => beam.life > 0);
}

function fireMountedWeapons(ship) {
  const now = performance.now();
  for (const mount of ship.weaponMounts || []) {
    if (!mount.weaponId) {
      continue;
    }

    const weapon = getWeaponDef(mount.weaponId);
    if (!weapon) {
      continue;
    }
    const mountPos = getMountWorldPosition(mount.hardpoint, ship);
    const angle = mount.angle;

    if (now < mount.cooldownUntil || now < mount.burstCooldownUntil) {
      continue;
    }

    fireWeapon(mountPos, angle, weapon);

    if (weapon.burstCount > 1) {
      mount.burstShotsRemaining += 1;
      if (mount.burstShotsRemaining >= weapon.burstCount) {
        mount.burstShotsRemaining = 0;
        mount.cooldownUntil = now + weapon.burstPause;
      } else {
        mount.cooldownUntil = now + weapon.burstSpacing;
      }
    } else {
      mount.cooldownUntil = now + weapon.cooldown;
    }
  }
}

function fireWeapon(mount, angle, weapon, options = {}) {
  if (weapon.soundPath && !options.isEnemy) {
    playSound(world, weapon.soundPath, { volume: weapon.fireMode === "beam" ? 0.42 : 0.36 });
  }

  if (weapon.fireMode === "beam") {
    spawnBeamWeapon(mount, angle, weapon);
    return;
  }

  if (weapon.fireMode === "spread-projectile") {
    const count = weapon.spreadCount || 3;
    const totalSpread = weapon.spreadAngle || 0.14;
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0 : i / (count - 1);
      const spreadOffset = (t - 0.5) * totalSpread * 2;
      spawnWeaponProjectile(mount, angle + spreadOffset, weapon, options);
    }
    return;
  }

  spawnWeaponProjectile(mount, angle, weapon, options);
}

function spawnWeaponProjectile(mount, angle, weapon, options = {}) {
  const projectile = {
    weaponId: weapon.id,
    fireMode: weapon.fireMode,
    x: mount.x + Math.cos(angle) * 24,
    y: mount.y + Math.sin(angle) * 24,
    vx: Math.cos(angle) * weapon.projectileSpeed,
    vy: Math.sin(angle) * weapon.projectileSpeed,
    life: weapon.projectileLife,
    damage: weapon.damage,
    radius: weapon.projectileRadius,
    lineLength: weapon.lineLength || 0,
    color: weapon.projectileColor,
    trail: Boolean(weapon.rocketTrail),
    rotation: angle,
    spriteRotation: options.isEnemy ? Math.random() * Math.PI * 2 : 0,
    spriteSpin: weapon.projectileSpin || 0,
    explosiveRadius: weapon.explosiveRadius || 0,
    projectileSpriteId: weapon.projectileSpriteId || (options.isEnemy ? weapon.id : null),
    projectileSize: weapon.projectileSize || null,
    age: 0,
    isEnemy: Boolean(options.isEnemy),
  };

  if (projectile.isEnemy) {
    projectile.color = "#b11616";
  }

  if (weapon.fireMode === "lobbed-torpedo") {
    const target = options.target || pointer;
    const dx = target.x - mount.x;
    const dy = target.y - mount.y;
    const distance = Math.max(40, Math.hypot(dx, dy));
    projectile.x = mount.x;
    projectile.y = mount.y - 10;
    projectile.vx = (dx / distance) * weapon.projectileSpeed;
    projectile.vy = (dy / distance) * weapon.projectileSpeed - 150;
    projectile.gravity = weapon.gravity || 220;
  }

  if (weapon.homingTurnRate) {
    projectile.homing = true;
    projectile.homingDelay = weapon.homingDelay || 0;
    projectile.homingTurnRate = weapon.homingTurnRate;
    projectile.homingRange = weapon.homingRange || 800;
  }

  world.projectiles.push({
    ...projectile,
  });
}

function spawnBeamWeapon(mount, angle, weapon) {
  const endX = world.width + 40;
  const endY = mount.y + Math.tan(angle) * (endX - mount.x);

  world.beams.push({
    weaponId: weapon.id,
    x1: mount.x,
    y1: mount.y,
    x2: endX,
    y2: endY,
    life: weapon.beamDuration,
    maxLife: weapon.beamDuration,
    width: weapon.beamWidth,
    color: weapon.beamColor,
    damagePerSecond: weapon.beamDamagePerSecond || 0,
  });

  if (weapon.damage > 0) {
    applyBeamDamage({
      world,
      beam: world.beams[world.beams.length - 1],
      damage: weapon.damage,
      onEnemyDestroyed: destroyEnemy,
    });
  }
}

function updateLobbedProjectile(projectile, deltaSeconds) {
  projectile.vy += (projectile.gravity || 0) * deltaSeconds;
}

function destroyEnemy(enemy) {
  world.score += enemy.scoreValue || 0;
  updateScoreDisplay();
  playRandomSound(world, ENEMY_EXPLODE_SOUNDS, { volume: enemy.isLarge ? 0.5 : 0.38 });
  emitExplosion(world, enemy.x, enemy.y);
  if (enemy.isLarge) {
    emitExplosion(world, enemy.x, enemy.y);
  }

  if (enemy.isLarge) {
    spawnWeaponDrop(enemy.x, enemy.y);
  }

  if (enemy.type === "boss") {
    world.defeatedBossCount += 1;
    world.stageIndex += 1;
    if (world.bossEncounter?.bossEnemy === enemy) {
      world.bossEncounter = null;
    }
    prepareNextStage();
    scatterBossWeaponDrops(enemy.x, enemy.y, 4);
    emitShipParts(world, enemy.x, enemy.y, 16, {
      minSpeed: 65,
      maxSpeed: 190,
      spread: Math.PI * 1.8,
    });
    for (let i = 0; i < 3; i += 1) {
      const burstX = enemy.x + (Math.random() - 0.5) * 90;
      const burstY = enemy.y + (Math.random() - 0.5) * 60;
      emitExplosion(world, burstX, burstY);
      emitShipParts(world, burstX, burstY, 6, {
        minSpeed: 60,
        maxSpeed: 170,
      });
    }
  }
}

function scatterBossWeaponDrops(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.35;
    const distance = 24 + Math.random() * 42;
    spawnWeaponDrop(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
    );
  }
}

function spawnWeaponDrop(x, y) {
  const dropOptions = getDroppableWeapons(world.currentShip);
  if (dropOptions.length === 0) {
    return;
  }

  const selected = dropOptions[Math.floor(Math.random() * dropOptions.length)];
  world.drops.push({
    x,
    y,
    vx: -35,
    vy: -20 + Math.random() * 40,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 1.3,
    weaponId: selected.id,
    radius: 18,
    life: 12,
  });
}

function updateParticles(deltaSeconds) {
  world.particles = world.particles.filter((particle) => {
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    if (typeof particle.rotation === "number") {
      particle.rotation += (particle.rotationSpeed || 0) * deltaSeconds;
    }
    particle.life -= deltaSeconds;
    return particle.life > 0;
  });
}

function updateDrops(deltaSeconds) {
  if (world.scene !== "running") {
    return;
  }

  const ship = world.currentShip;
  const shipBounds = ship ? getShipBounds(ship) : null;

  world.drops = world.drops.filter((drop) => {
    drop.x += drop.vx * deltaSeconds;
    drop.y += drop.vy * deltaSeconds;
    drop.rotation += drop.rotationSpeed * deltaSeconds;
    drop.life -= deltaSeconds;

    if (ship && shipBounds) {
      const dx = drop.x - world.player.x;
      const dy = drop.y - world.player.y;
      const collectDistance = Math.max(shipBounds.width, shipBounds.height) * 0.35 + drop.radius;
      if (Math.hypot(dx, dy) <= collectDistance) {
        equipDropWeapon(drop.weaponId);
        emitSparks(world, drop.x, drop.y, 10);
        return false;
      }
    }

    return drop.life > 0 && drop.x > -50 && drop.y > -50 && drop.y < world.height + 50;
  });
}

function equipDropWeapon(weaponId) {
  const ship = world.currentShip;
  if (!ship || !ship.weaponMounts) {
    return;
  }

  const weapon = getWeaponDef(weaponId);
  if (!weapon) {
    return;
  }
  const compatibleMounts = ship.weaponMounts.filter((mount) => mount.hardpoint.type === weapon.mountType);
  if (compatibleMounts.length === 0) {
    return;
  }

  const lastIndex = ship.lastReplacementByType?.[weapon.mountType] ?? -1;
  let targetMount = compatibleMounts.find((mount, index) => index !== lastIndex);
  if (!targetMount) {
    targetMount = compatibleMounts[0];
  }

  if (!targetMount) {
    return;
  }

  targetMount.weaponId = weaponId;
  targetMount.cooldownUntil = 0;
  targetMount.burstShotsRemaining = 0;
  targetMount.burstCooldownUntil = 0;
  ship.lastReplacementByType[weapon.mountType] = compatibleMounts.indexOf(targetMount);
}

function renderBackground() {
  const launchProgress = getLaunchProgress();
  const introBlend = world.scene === "intro" ? 0 : launchProgress;
  const baseShade = 192;
  ctx.fillStyle = `rgb(${baseShade}, ${baseShade}, ${baseShade})`;
  ctx.fillRect(0, 0, world.width, world.height);

  if (introBlend <= 0) {
    return;
  }

  for (const star of world.stars) {
    ctx.fillStyle = `rgba(0, 0, 0, ${(0.3 + star.depth * 0.5) * introBlend})`;
    ctx.fillRect(star.x, star.y, star.size * star.depth, star.size * star.depth);
  }
}

function renderBossPreview() {
  const encounter = world.bossEncounter;
  if (!encounter || encounter.phase !== "preview") {
    return;
  }

  const boss = encounter.bossRecord;
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.translate(encounter.previewX, encounter.previewY);
  ctx.scale(-1, 1);
  ctx.drawImage(
    boss.image,
    -encounter.previewWidth * 0.5,
    -encounter.previewHeight * 0.5,
    encounter.previewWidth,
    encounter.previewHeight,
  );
  ctx.restore();
}

function renderShip(ship) {
  const bounds = getShipBounds(ship);
  ctx.save();
  ctx.translate(world.player.x, world.player.y);
  ctx.drawImage(ship.image, -bounds.width * 0.5, -bounds.height * 0.5, bounds.width, bounds.height);
  ctx.restore();

  renderWeaponMounts(ship);
}

function renderEnemies() {
  if (!world.mineImage) {
    return;
  }

  for (const enemy of world.enemies) {
    const image = enemy.type === "boss"
      ? enemy.image
      : enemy.type === "enemy-ship"
        ? enemy.image
      : enemy.type === "spore"
        ? world.sporeImage
        : world.mineImage;
    if (!image) {
      continue;
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.rotation || 0);

    if (enemy.type === "boss") {
      const bounds = getBossBounds(enemy);
      ctx.scale(enemy.flipX ? -1 : 1, 1);
      ctx.drawImage(image, -bounds.width * 0.5, -bounds.height * 0.5, bounds.width, bounds.height);
      ctx.restore();
      renderBossSpawnerPoints(enemy);
      continue;
    }

    if (enemy.type === "enemy-ship") {
      const scale = getEnemyShipScale(enemy);
      const width = enemy.width * scale;
      const height = enemy.height * scale;
      ctx.drawImage(image, -width * 0.5, -height * 0.5, width, height);
      ctx.restore();
      continue;
    }

    const size = enemy.type === "spore" ? enemy.radius * 3.6 : enemy.radius * 2.4;

    if (enemy.type === "spore") {
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);

    ctx.restore();
  }
}

function renderBossSpawnerPoints(enemy) {
  const image = world.enemySpawnerImage;
  const spawnPoints = getBossSpawnerPoints(enemy);
  if (!image || !spawnPoints?.length) {
    return;
  }

  const bounds = getBossBounds(enemy);
  const size = Math.max(18, Math.min(34, bounds.width * 0.06));

  spawnPoints.forEach((point, index) => {
    const mountPos = getBossMountWorldPosition(point, enemy);
    const spin = (enemy.floatTime || 0) * 0.75 + index * 0.6;
    ctx.save();
    ctx.translate(mountPos.x, mountPos.y);
    ctx.rotate(spin);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
    ctx.globalAlpha = 1;
    ctx.restore();
  });
}

function renderWeaponMounts(ship) {
  for (const mount of ship.weaponMounts || []) {
    const mountPos = getMountWorldPosition(mount.hardpoint, ship);
    renderTurret(mountPos, mount);
  }
}

function renderTurret(mountPos, mount) {
  const weapon = getWeaponDef(mount.weaponId);
  if (!weapon) {
    return;
  }

  const angle = typeof mount.angle === "number"
    ? mount.angle
    : Math.atan2(pointer.y - mountPos.y, pointer.x - mountPos.x);

  ctx.save();
  ctx.translate(mountPos.x, mountPos.y);
  ctx.rotate(angle);

  if (mount.hardpoint.type === "light") {
    ctx.strokeStyle = "rgba(210, 220, 230, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(26, 31, 36, 0.92)";
  ctx.beginPath();
  ctx.arc(0, 0, mount.hardpoint.type === "heavy" ? 7.5 : 6.5, 0, Math.PI * 2);
  ctx.fill();

  const image = world.weaponImages?.[weapon.id];
  if (image) {
    const size = weapon.turretSize;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function renderProjectiles() {
  for (const projectile of world.projectiles) {
    if (projectile.trail) {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.rotation);
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      const isLargeRocket = projectile.weaponId === "large-missilearray";
      const isSmallRocket = projectile.weaponId === "torpedo" || projectile.weaponId === "missile";
      const length = isLargeRocket ? 20 : isSmallRocket ? 13 : 16;
      const height = isLargeRocket ? 7 : isSmallRocket ? 4.8 : 6;
      ctx.roundRect(-length * 0.5, -height * 0.5, length, height, 3);
      ctx.fill();
      ctx.fillStyle = "#4b4b4b";
      ctx.beginPath();
      ctx.moveTo(-length * 0.5, 0);
      ctx.lineTo(-length * 0.5 - (isSmallRocket ? 4.5 : 6), -height * 0.5);
      ctx.lineTo(-length * 0.5 - (isSmallRocket ? 4.5 : 6), height * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (projectile.fireMode === "line-projectile") {
      const speed = Math.hypot(projectile.vx || 0, projectile.vy || 0) || 1;
      const lineLength = Math.max(
        projectile.lineLength || 0,
        Math.hypot((projectile.x - (projectile.prevX ?? projectile.x)), (projectile.y - (projectile.prevY ?? projectile.y))),
      );
      const tailX = projectile.x - (projectile.vx / speed) * lineLength;
      const tailY = projectile.y - (projectile.vy / speed) * lineLength;
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = Math.max(2, projectile.radius * 1.5);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
      continue;
    }

    const projectileImage = projectile.projectileSpriteId
      ? world.enemyShotImages?.[projectile.projectileSpriteId]
      : null;
    if (projectileImage) {
      const size = projectile.projectileSize || Math.max(16, projectile.radius * 4.5);
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.rotation + (projectile.spriteRotation || 0));
      ctx.drawImage(projectileImage, -size * 0.5, -size * 0.5, size, size);
      ctx.restore();
      continue;
    }

    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderBeams() {
  for (const beam of world.beams) {
    const alpha = Math.max(0, beam.life / beam.maxLife);
    ctx.strokeStyle = beam.color.replace(/[\d.]+\)$/, `${alpha})`);
    ctx.lineWidth = beam.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();

    if (beam.width >= 10) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.45})`;
      ctx.lineWidth = beam.width * 1.75;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    }
  }
}

function renderDrops() {
  for (const drop of world.drops) {
    const weapon = getWeaponDef(drop.weaponId);
    const image = world.weaponImages?.[drop.weaponId];
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(drop.rotation);

    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    if (weapon?.mountType === "heavy") {
      ctx.beginPath();
      ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (image && weapon) {
      ctx.drawImage(image, -14, -14, 28, 28);
    }

    ctx.restore();
  }
}

function renderParticles() {
  for (const particle of world.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    if (particle.kind === "part" && world.partImages?.length) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation || 0);
      const image = world.partImages[particle.partIndex % world.partImages.length];
      const size = particle.size || 18;
      ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
      ctx.restore();
      continue;
    }

    if (particle.kind === "debris") {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation || 0);
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size, -particle.size * 0.6, particle.size * 2, particle.size * 1.2);
      ctx.restore();
      continue;
    }

    ctx.fillStyle = `${particle.color}${toAlphaHex(alpha)}`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function toAlphaHex(alpha) {
  const hex = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, "0");
  return hex;
}

function renderVelocityIndicator() {
  if (world.scene !== "running" && world.scene !== "dying") {
    return;
  }

  const speed = Math.hypot(world.player.vx, world.player.vy);
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.font = '700 16px "Arial Narrow", Arial, Helvetica, sans-serif';
  ctx.fillText(`Velocity ${speed.toFixed(0)}`, 24, world.height - 26);
}

function renderDebugHitboxes() {
  if (!world.debugHitboxes) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(220, 20, 20, 0.22)";
  ctx.strokeStyle = "rgba(220, 20, 20, 0.7)";
  ctx.lineWidth = 1.5;

  if (world.currentShip && (world.scene === "running" || world.scene === "dying")) {
    for (const circle of getShipCollisionCircles(world.currentShip)) {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  for (const enemy of world.enemies) {
    const circles = enemy.type === "boss"
      ? enemy.hitCircles || []
      : [{ x: enemy.x, y: enemy.y, radius: enemy.radius || 0 }];

    for (const circle of circles) {
      if (!circle.radius) {
        continue;
      }
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  for (const projectile of world.projectiles) {
    if (!projectile.radius) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function renderHealthBar() {
  if (world.scene !== "running" && world.scene !== "dying") {
    return;
  }

  const pad = 18;
  const barHeight = 16;
  const top = world.height - 26;
  const width = world.width - pad * 2;
  const ratio = Math.max(0, world.player.hitPoints) / world.player.maxHitPoints;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(pad, top, width, barHeight);
  ctx.fillStyle = "#050505";
  ctx.fillRect(pad, top, width * ratio, barHeight);
  ctx.strokeStyle = "#050505";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad, top, width, barHeight);
}

function renderBossHealthBar() {
  const boss = world.bossEncounter?.bossEnemy;
  if (!boss || boss.hitPoints <= 0) {
    return;
  }

  const pad = 18;
  const barHeight = 14;
  const width = world.width - pad * 2;
  const top = 16;
  const ratio = Math.max(0, boss.hitPoints) / boss.maxHitPoints;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(pad, top, width, barHeight);
  ctx.fillStyle = "#050505";
  ctx.fillRect(pad, top, width * ratio, barHeight);
  ctx.strokeStyle = "#050505";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad, top, width, barHeight);
}

function renderBossCinematic() {
  const encounter = world.bossEncounter;
  if (!encounter || (encounter.phase !== "cinematic" && encounter.phase !== "entering" && encounter.phase !== "active")) {
    return;
  }

  let progress = 1;
  if (encounter.phase === "cinematic") {
    progress = encounter.phaseProgress || 0;
  }

  const barHeight = world.height * 0.12 * progress;
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, world.width, barHeight);
  ctx.fillRect(0, world.height - barHeight, world.width, barHeight);

  if (encounter.phase === "cinematic") {
    const titleFade = Math.sin(Math.min(1, progress) * Math.PI);
    ctx.save();
    ctx.globalAlpha = titleFade;
    ctx.fillStyle = "#050505";
    ctx.font = `900 ${Math.max(40, Math.round(world.width * 0.042))}px "Arial Narrow", Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(encounter.bossRecord.label.toUpperCase(), world.width * 0.5, world.height * 0.5);
    ctx.restore();
  }
}

function resetGameplayState() {
  const maxHitPoints = world.currentShip ? getShipMaxHitPoints(world.currentShip) : 100;
  world.projectiles = [];
  world.beams = [];
  world.enemies = [];
  world.particles = [];
  world.drops = [];
  world.bossEncounter = null;
  world.stageIndex = 0;
  world.stagePhase = "hazard";
  world.stageHazardType = "mine";
  world.stageHazardsRemaining = 0;
  world.stageEnemyShipsRemaining = 0;
  world.nextBossScore = 1000;
  world.activeBossIndex = 0;
  world.defeatedBossCount = 0;
  world.mineSpawnCount = 0;
  world.lastMineSpawnAt = 0;
  world.lastEnemyShipSpawnAt = 0;
  world.score = 0;
  world.player.vx = 0;
  world.player.vy = 0;
  world.player.maxHitPoints = maxHitPoints;
  world.player.hitPoints = maxHitPoints;
  world.player.collisionCooldownUntil = 0;
  world.playerScaleMultiplier = 0.8;
  world.player.x = world.width * 0.34;
  world.player.y = world.height * 0.5;
  pointer.down = false;
  prepareNextStage();
  updateScoreDisplay();
}

function updateScoreDisplay() {
  scoreDisplay.textContent = `${world.score}`;
}

function startLaunchSequence() {
  if (!world.currentShip || world.scene !== "intro") {
    return;
  }

  world.currentShip.weaponMounts = createWeaponMounts(world.currentShip);
  resetGameplayState();
  world.scene = "launch";
  world.transitionStartedAt = performance.now();
  introScreen.classList.add("is-hidden");
  menuButton.classList.remove("is-visible");
  scoreDisplay.classList.remove("is-visible");
}

function getLaunchProgress() {
  if (world.scene === "running" || world.scene === "dying") {
    return 1;
  }

  if (world.scene !== "launch") {
    return 0;
  }

  const elapsed = performance.now() - world.transitionStartedAt;
  return Math.max(0, Math.min(1, elapsed / world.transitionDuration));
}

function easeInOutCubic(value) {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - ((-2 * value + 2) ** 3) / 2;
}

function renderLaunchSequence() {
  if (world.scene !== "launch" || !world.currentShip) {
    return;
  }

  const progress = easeInOutCubic(getLaunchProgress());
  const ship = world.currentShip;
  const baseScale = getBaseShipScale(ship) * getShipDisplayScale(ship);
  const startScale = baseScale * 1.2;
  const finalScale = baseScale * 0.8;
  const scale = startScale + (finalScale - startScale) * progress;
  const width = ship.width * scale;
  const height = ship.height * scale;
  const startX = world.width * 0.5;
  const startY = world.height * 0.5;
  const endX = world.width * 0.34;
  const endY = world.height * 0.5;
  const x = startX + (endX - startX) * progress;
  const y = startY + (endY - startY) * progress;

  ctx.save();
  ctx.globalAlpha = 1 - progress * 0.08;
  ctx.translate(x, y);
  ctx.drawImage(ship.image, -width * 0.5, -height * 0.5, width, height);
  ctx.restore();

  const fadeAlpha = 1 - progress;
  if (fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha * 0.72})`;
    ctx.fillRect(0, 0, world.width, world.height);
  }
}

function handleShipCollisions() {
  const ship = world.currentShip;
  if (!ship || world.scene !== "running") {
    return;
  }

  resolveShipCollisions({
    world,
    shipCollisionCircles: getShipCollisionCircles(ship),
    collisionDamage: MINE_COLLISION_DAMAGE,
    onPlayerDamaged: damagePlayer,
  });
}

function damagePlayer(amount, impactX, impactY) {
  if (world.scene !== "running") {
    return;
  }

  applyPlayerDamage({
    world,
    amount,
    impactX,
    impactY,
    onPlayerDeath: startDeathSequence,
  });
}

function startDeathSequence() {
  if (world.scene === "dying") {
    return;
  }

  world.scene = "dying";
  world.deathStartedAt = performance.now();
  pointer.down = false;
  triggerPlayerDeathEffects(world);
}

function getDeathProgress() {
  if (world.scene !== "dying") {
    return 0;
  }

  const elapsed = performance.now() - world.deathStartedAt;
  return Math.max(0, Math.min(1, elapsed / world.deathDuration));
}

function renderDeathFade() {
  if (world.scene !== "dying") {
    return;
  }

  const alpha = getDeathProgress();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, world.width, world.height);
}

function returnToIntro() {
  world.scene = "intro";
  world.deathStartedAt = 0;
  resetGameplayState();
  keys.clear();
  introScreen.classList.remove("is-hidden");
  menuButton.classList.remove("is-visible");
  scoreDisplay.classList.remove("is-visible");
}

function tick(now) {
  const deltaSeconds = Math.min((now - world.lastFrame) / 1000, 0.033);
  world.lastFrame = now;

  updatePlayerScaleTransition(deltaSeconds);

  if (world.scene === "running") {
    updatePlayer(deltaSeconds);
  }
  updateStars(deltaSeconds);
  updateEnemies(deltaSeconds);
  if (world.currentShip) {
    updateWeaponAim(world.currentShip);
  }
  updateProjectiles(deltaSeconds);
  updateBeams(deltaSeconds);
  updateParticles(deltaSeconds);
  updateDrops(deltaSeconds);

  renderBackground();
  renderBossPreview();
  renderEnemies();
  renderDrops();

  if (world.currentShip && (world.scene === "running" || world.scene === "dying")) {
    renderShip(world.currentShip);
  }

  renderLaunchSequence();

  renderBeams();
  renderProjectiles();
  renderDebugHitboxes();
  renderParticles();
  renderBossCinematic();
  renderBossHealthBar();
  renderHealthBar();
  renderVelocityIndicator();
  renderDeathFade();

  if (world.scene === "launch" && getLaunchProgress() >= 1) {
    world.scene = "running";
    menuButton.classList.add("is-visible");
    scoreDisplay.classList.add("is-visible");
  }

  if (world.scene === "dying" && getDeathProgress() >= 1) {
    returnToIntro();
  }

  requestAnimationFrame(tick);
}

function bindEvents() {
  const unlockAudio = () => {
    world.audioEnabled = true;
    warmSoundPools(world).catch(() => {});
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };

  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  window.addEventListener("resize", resizeCanvas);

  window.addEventListener("keydown", (event) => {
    keys.add(event.code);
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  });

  canvas.addEventListener("mousedown", () => {
    if (world.scene !== "running") {
      return;
    }

    pointer.down = true;
  });

  window.addEventListener("mouseup", () => {
    pointer.down = false;
  });

  launchButton.addEventListener("click", startLaunchSequence);
  menuButton.addEventListener("click", returnToIntro);
  if (playtestHitboxesToggle) {
    playtestHitboxesToggle.addEventListener("change", () => {
      world.debugHitboxes = playtestHitboxesToggle.checked;
    });
  }
}

async function init() {
  resizeCanvas();
  bindEvents();

  const {
    ships,
    bosses,
    enemyShips,
    mineImage,
    sporeImage,
    enemySpawnerImage,
    partImages,
    weaponImages,
    enemyShotImages,
    soundPools,
  } = await loadGameAssets();

  world.bosses = bosses;
  world.enemyShips = enemyShips;
  world.mineImage = mineImage;
  world.sporeImage = sporeImage;
  world.enemySpawnerImage = enemySpawnerImage;
  world.partImages = partImages;
  world.weaponImages = weaponImages;
  world.enemyShotImages = enemyShotImages;
  world.soundPools = soundPools;
  world.debugHitboxes = Boolean(playtestHitboxesToggle?.checked);

  buildShipPicker({
    container: introShipPicker,
    ships,
    activeShipIndex: world.activeShipIndex,
    onSelect: (index) => {
      world.activeShipIndex = index;
      world.currentShip = ships[index];
      world.currentShip.weaponMounts = createWeaponMounts(world.currentShip);
    },
  });
  world.currentShip = ships[world.activeShipIndex];
  world.currentShip.weaponMounts = createWeaponMounts(world.currentShip);
  requestAnimationFrame(tick);
}

init().catch((error) => {
  console.error("Capital Ship failed to initialise", error);
});
