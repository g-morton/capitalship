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
import { buildProceduralBossRecord } from "./proceduralBoss.js";
import { buildProceduralEnemyArchetype } from "./proceduralEnemy.js";
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
} from "./combat.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const introScreen = document.getElementById("intro-screen");
const introShipPicker = document.getElementById("intro-ship-picker");
const launchButton = document.getElementById("launch-button");
const menuButton = document.getElementById("menu-button");
const skipBossButton = document.getElementById("skip-boss-button");
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
  wardens: [],
  enemies: [],
  wrecks: [],
  particles: [],
  drops: [],
  bosses: [],
  enemyShips: [],
  enemyPartImages: [],
  enemyPartBlackImages: [],
  projectileSpriteImages: {},
  activeBossIndex: 0,
  defeatedBossCount: 0,
  stageIndex: 0,
  stagePhase: "hazard",
  stageHazardType: "mine",
  stageHazardsRemaining: 0,
  stageEnemyShipsRemaining: 0,
  stageEnemyArchetype: null,
  stageMidLargeArchetype: null,
  stageMidLargeSpawned: false,
  stageEnemySpawnCount: 0,
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
  playerWreckExited: false,
  audioEnabled: false,
  lastFrame: performance.now(),
  audioWarmed: false,
  playerScaleMultiplier: 0.8,
  debugHitboxes: false,
};

const MAX_ACTIVE_SPORES = 6;
const MAX_ACTIVE_ENEMY_SHIPS = 2;
const WARDEN_PD_WEAPON = {
  id: "warden-pd",
  fireMode: "projectile",
  projectileSpeed: 680,
  projectileLife: 1.0,
  projectileRadius: 1.2,
  projectileColor: "#ffffff",
  damage: 3,
};
const WARDEN_LASER_WEAPON = {
  id: "warden-laser",
  fireMode: "line-projectile",
  projectileSpeed: 910,
  projectileLife: 0.48,
  projectileRadius: 1.4,
  projectileColor: "#ffffff",
  lineLength: 18,
  damage: 4.5,
};

function randomDepthScale(min = 0.88, max = 1.14) {
  return min + Math.random() * (max - min);
}

function getEnemyShipSpawnCap() {
  return Math.min(5, 2 + Math.floor(world.stageIndex * 0.45));
}

function getActiveEnemyShipCount() {
  return world.enemies.filter((enemy) => enemy.type === "enemy-ship" && enemy.hitPoints > 0).length;
}

function getActiveStageHazardCount() {
  return world.enemies.filter((enemy) => enemy.stageHazard && enemy.hitPoints > 0 && (enemy.life === undefined || enemy.life > 0)).length;
}

function chooseMinorEnemyShipRecord() {
  const records = world.enemyShips || [];
  if (!records.length) {
    return null;
  }

  const stage = Math.max(0, world.stageIndex);
  const weights = records.map((record) => {
    if (record.id === "enemy-dart") {
      return { record, weight: Math.max(0.25, stage * 0.25) };
    }
    if (record.id === "enemy-orb-heavy") {
      return { record, weight: 0.85 + stage * 0.17 };
    }
    return { record, weight: 1.35 - Math.min(stage * 0.09, 0.6) };
  });

  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.record;
    }
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
  return 4 + Math.min(10, world.stageIndex * 2);
}

function prepareNextStage() {
  world.stageHazardType = getStageHazardType();
  world.stageHazardsRemaining = getStageHazardCount();
  world.stageEnemyShipsRemaining = getStageEnemyShipCount();
  world.stageEnemySpawnCount = 0;
  world.stageEnemyArchetype = buildProceduralEnemyArchetype({
    stageIndex: world.stageIndex,
    enemyShips: world.enemyShips || [],
    enemyWeaponIds: Object.keys(world.enemyShotImages || {}),
    enemyPartImages: world.enemyPartImages || [],
  });
  world.stageMidLargeArchetype = buildProceduralEnemyArchetype({
    stageIndex: world.stageIndex,
    enemyShips: world.enemyShips || [],
    enemyWeaponIds: Object.keys(world.enemyShotImages || {}),
    enemyPartImages: world.enemyPartImages || [],
    sizeClass: "mid-large",
  });
  world.stageMidLargeSpawned = false;
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
      spawnEnemyShip({ variant: "minor" });
      world.lastEnemyShipSpawnAt = now;
    }

    if (world.stagePhase === "hazard" && shouldSpawnStageHazard() && now - world.lastMineSpawnAt > 1500) {
      spawnStageHazard();
      world.lastMineSpawnAt = now;
    }

    if (world.stagePhase === "ships" && shouldSpawnEnemyShips() && now - world.lastEnemyShipSpawnAt > 1900) {
      let variant = "minor";
      if (!world.stageMidLargeSpawned && world.stageMidLargeArchetype) {
        variant = "mid-large";
        world.stageMidLargeSpawned = true;
      } else if (world.stageEnemyArchetype) {
        variant = (world.stageEnemySpawnCount % 4 === 3) ? "minor" : "backbone";
      }

      spawnEnemyShip({ variant });
      world.stageEnemyShipsRemaining = Math.max(0, world.stageEnemyShipsRemaining - 1);
      world.stageEnemySpawnCount += 1;
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

function getBossRecordForStage() {
  const enemyWeaponIds = Object.keys(world.enemyShotImages || {});
  const procedural = buildProceduralBossRecord({
    stageIndex: world.stageIndex,
    enemyPartImages: world.enemyPartImages || [],
    enemyWeaponIds,
  });
  if (procedural) {
    return procedural;
  }

  if (world.bosses?.length) {
    return world.bosses[world.activeBossIndex % world.bosses.length];
  }

  return null;
}

function startBossEncounter() {
  const bossRecord = getBossRecordForStage();
  if (!bossRecord) {
    return;
  }
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

function skipToBossEncounter() {
  if (world.scene !== "running" || world.bossEncounter) {
    return;
  }

  world.stageHazardsRemaining = 0;
  world.stageEnemyShipsRemaining = 0;
  world.stagePhase = "boss";
  world.lastMineSpawnAt = performance.now();
  world.lastEnemyShipSpawnAt = performance.now();
  world.enemies = world.enemies.filter((enemy) => enemy.type === "boss");
  world.projectiles = world.projectiles.filter((projectile) => !projectile.isEnemy);

  startBossEncounter();
}

function spawnBossEnemy(bossRecord) {
  const playerMax = world.currentShip ? getShipMaxHitPoints(world.currentShip) : 100;
  const intendedSpawnCount = Math.max(0, bossRecord.sporeSpawnCount ?? 3);
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
  const fallbackWeaponMounts = (activeSpawnPoints.length ? activeSpawnPoints : fallbackSpawnPoints).map((hardpoint) => ({
    hardpoint,
    weaponId: "enemy-shot-3",
  }));
  const configuredWeaponMounts = bossRecord.weaponMounts?.length ? bossRecord.weaponMounts : fallbackWeaponMounts;
  const stageScale = 1 + world.stageIndex * 0.16;
  const maxHitPoints = Math.max(
    1200,
    playerMax * 8.5 * (bossRecord.maxHitPointsScale || 1) * (1 + world.stageIndex * 0.06),
  );
  const scoreValue = Math.round(650 * stageScale * (bossRecord.scoreValueScale || 1));
  const sporeSpawnPoints = bossRecord.sporePoints?.length ? bossRecord.sporePoints : activeSpawnPoints;
  const boss = {
    type: "boss",
    bossId: bossRecord.id,
    label: bossRecord.label,
    image: bossRecord.image,
    parts: bossRecord.parts || null,
    width: bossRecord.width,
    height: bossRecord.height,
    hitCircleDefs: bossRecord.hitCircles || [],
    hardpoints: bossRecord.hardpoints || [],
    x: world.width + world.width * 0.35,
    y: world.height * 0.14,
    targetY: world.height * 0.46,
    entryTargetX: world.width * 0.77,
    floatTime: Math.random() * Math.PI * 2,
    hitPoints: maxHitPoints,
    maxHitPoints,
    radius: Math.max(
      bossRecord.width * Math.min(world.width * 0.46 / bossRecord.width, world.height * 0.56 / bossRecord.height),
      bossRecord.height * Math.min(world.width * 0.46 / bossRecord.width, world.height * 0.56 / bossRecord.height),
    ) * 0.32,
    scoreValue,
    sporeSpawnPoints,
    fallbackSpawnPoints,
    emitsSpores: bossRecord.emitsSpores ?? intendedSpawnCount > 0,
    weaponMounts: configuredWeaponMounts.map((mount) => ({
      hardpoint: mount.hardpoint,
      weaponId: mount.weaponId || "enemy-shot-3",
      cooldownUntil: performance.now() + 500 + Math.random() * 900,
      angle: Math.PI,
    })),
    bossProjectileDamageScale: bossRecord.projectileDamageScale ?? 0.62,
    bossProjectileSpeedScale: bossRecord.projectileSpeedScale ?? 0.88,
    bossProjectileCooldownScale: bossRecord.projectileCooldownScale ?? 1.95,
    nextVolleyIndex: 0,
    nextBossVolleyAt: performance.now() + 1200,
    lastSporeAt: performance.now(),
    sporeCooldown: bossRecord.sporeCooldown ?? 6400,
    sporeClusterSize: bossRecord.sporeClusterSize ?? 1,
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

function getBossEmitterPoints(enemy) {
  const weaponPoints = (enemy.weaponMounts || []).map((mount) => mount.hardpoint).filter(Boolean);
  const sporePoints = getBossSpawnerPoints(enemy) || [];
  const combined = [...weaponPoints, ...sporePoints];
  const unique = [];
  for (const point of combined) {
    const exists = unique.some((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 4);
    if (!exists) {
      unique.push(point);
    }
  }
  return unique;
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
  if (!enemy.emitsSpores) {
    return;
  }

  const now = performance.now();
  const activeBossSpores = getActiveSporeCount(enemy.bossId);
  if (activeBossSpores >= MAX_ACTIVE_SPORES) {
    return;
  }

  if (now < enemy.lastSporeAt + enemy.sporeCooldown || !world.sporeImage) {
    return;
  }

  enemy.lastSporeAt = now;
  spawnSpores(enemy, enemy.sporeClusterSize || 1);
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
      const depthScale = randomDepthScale(0.9, 1.15);
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
        depthScale,
        radius: 10 * depthScale,
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
  const depthScale = randomDepthScale(0.84, 1.18);

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
    depthScale,
    radius: (isLarge ? 33 : 22) * depthScale,
    scale: (isLarge ? 1.00 : 0.40) * depthScale,
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
  const depthScale = randomDepthScale(0.9, 1.16);
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
    depthScale,
    radius: 10 * depthScale,
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

function getMinorEnemyShipProfile(record) {
  if (!record) {
    return null;
  }

  if (record.id === "enemy-orb-heavy") {
    return {
      radius: 58,
      hitPoints: 46,
      collisionDamage: 28,
      scoreValue: 110,
      patrolAmplitude: 18 + Math.random() * 20,
      patrolFrequency: 0.45 + Math.random() * 0.25,
      wobbleAmplitude: 10 + Math.random() * 10,
      wobbleFrequency: 0.55 + Math.random() * 0.3,
      driftResponsiveness: 0.8 + Math.random() * 0.2,
      rotationAmplitude: 0.05,
    };
  }

  if (record.id === "enemy-dart") {
    return {
      radius: 62,
      hitPoints: 58,
      collisionDamage: 34,
      scoreValue: 145,
      patrolAmplitude: 28 + Math.random() * 28,
      patrolFrequency: 0.78 + Math.random() * 0.32,
      wobbleAmplitude: 9 + Math.random() * 9,
      wobbleFrequency: 0.86 + Math.random() * 0.34,
      driftResponsiveness: 1.05 + Math.random() * 0.2,
      rotationAmplitude: 0.095,
    };
  }

  return {
    radius: 50,
    hitPoints: 32,
    collisionDamage: 22,
    scoreValue: 80,
    patrolAmplitude: 20 + Math.random() * 26,
    patrolFrequency: 0.58 + Math.random() * 0.35,
    wobbleAmplitude: 12 + Math.random() * 14,
    wobbleFrequency: 0.68 + Math.random() * 0.4,
    driftResponsiveness: 0.9 + Math.random() * 0.25,
    rotationAmplitude: 0.075,
  };
}

function spawnEnemyShip(options = {}) {
  const variant = options.variant || "backbone";

  if (variant === "mid-large" && world.stageMidLargeArchetype) {
    spawnBackboneEnemyShip(world.stageMidLargeArchetype, { isMidLarge: true });
    return;
  }

  if (variant === "backbone" && world.stageEnemyArchetype) {
    spawnBackboneEnemyShip(world.stageEnemyArchetype);
    return;
  }

  spawnMinorEnemyShip();
}

function spawnMinorEnemyShip() {
  const enemyRecord = chooseMinorEnemyShipRecord();
  if (!enemyRecord) {
    return;
  }

  const profile = getMinorEnemyShipProfile(enemyRecord);
  const depthScale = randomDepthScale(0.88, 1.16);
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
    depthScale,
    radius: profile.radius * depthScale,
    hitPoints: profile.hitPoints,
    maxHitPoints: profile.hitPoints,
    collisionDamage: profile.collisionDamage,
    scoreValue: profile.scoreValue,
    rotationAmplitude: profile.rotationAmplitude,
    rotation: 0,
  });
}

function spawnBackboneEnemyShip(archetype, options = {}) {
  if (!archetype) {
    return;
  }

  const spawnY = 80 + Math.random() * (world.height - 160);
  const isMidLarge = Boolean(options.isMidLarge) || archetype.sizeClass === "mid-large";
  const depthScale = isMidLarge ? randomDepthScale(0.96, 1.18) : randomDepthScale(0.9, 1.12);
  const mounts = (archetype.weaponMounts || []).map((mount, index) => ({
    hardpoint: mount.hardpoint,
    weaponId: mount.weaponId,
    cooldownUntil: performance.now() + 380 + Math.random() * 520 + index * 160,
    angle: Math.PI,
  }));

  world.enemies.push({
    type: "enemy-ship",
    enemyId: archetype.id,
    image: archetype.image,
    parts: archetype.parts || null,
    width: archetype.width,
    height: archetype.height,
    hardpoints: archetype.hardpoints || [],
    weaponMounts: mounts,
    x: world.width + 100,
    y: spawnY,
    baseY: spawnY,
    patrolX: world.width * (0.63 + Math.random() * 0.2),
    patrolAmplitude: archetype.patrolAmplitude,
    patrolFrequency: archetype.patrolFrequency,
    driftResponsiveness: archetype.driftResponsiveness,
    phase: Math.random() * Math.PI * 2,
    wobbleAmplitude: archetype.wobbleAmplitude,
    wobbleFrequency: archetype.wobbleFrequency,
    depthScale,
    radius: archetype.radius * depthScale,
    hitPoints: archetype.hitPoints,
    maxHitPoints: archetype.hitPoints,
    collisionDamage: archetype.collisionDamage,
    scoreValue: archetype.scoreValue,
    rotationAmplitude: archetype.rotationAmplitude,
    rotation: 0,
    isStageBackbone: true,
    isStageMidLarge: isMidLarge,
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

function getEnemyHitCircles(enemy) {
  if (enemy.type === "boss" && enemy.hitCircles?.length) {
    return enemy.hitCircles;
  }
  return [{ x: enemy.x, y: enemy.y, radius: enemy.radius || 0 }];
}

function isEnemyDamageable(enemy) {
  return enemy.hitPoints > 0 && (!enemy.spawnGraceUntil || performance.now() >= enemy.spawnGraceUntil);
}

function findNearestEnemyTarget(x, y, maxRange) {
  let nearest = null;
  let nearestDistance = maxRange;
  for (const enemy of world.enemies) {
    if (!isEnemyDamageable(enemy)) {
      continue;
    }
    for (const circle of getEnemyHitCircles(enemy)) {
      const distance = Math.hypot(circle.x - x, circle.y - y) - circle.radius;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { enemy, x: circle.x, y: circle.y };
      }
    }
  }
  return nearest;
}

function damageEnemiesInRadius(x, y, radius, damage) {
  for (const enemy of world.enemies) {
    if (!isEnemyDamageable(enemy)) {
      continue;
    }
    const circles = getEnemyHitCircles(enemy);
    let nearestDistance = Infinity;
    for (const circle of circles) {
      const distance = Math.hypot(circle.x - x, circle.y - y);
      if (distance <= radius + circle.radius) {
        nearestDistance = Math.min(nearestDistance, distance);
      }
    }
    if (!Number.isFinite(nearestDistance)) {
      continue;
    }
    const representativeRadius = Math.max(...circles.map((circle) => circle.radius));
    const falloff = Math.max(0.3, 1 - nearestDistance / (radius + representativeRadius));
    enemy.hitPoints -= damage * falloff;
    emitSparks(world, enemy.x, enemy.y, enemy.type === "boss" ? 9 : 6);
    if (enemy.hitPoints <= 0) {
      enemy.hitPoints = 0;
      destroyEnemy(enemy);
    }
  }
}

function updateWardens(deltaSeconds) {
  if (world.scene !== "running") {
    return;
  }

  const now = performance.now();
  world.wardens = world.wardens.filter((warden) => {
    warden.life -= deltaSeconds;
    warden.age += deltaSeconds;
    warden.rotation += warden.rotationSpeed * deltaSeconds;

    if (warden.age >= warden.lingerDuration) {
      const dx = warden.targetX - warden.x;
      const dy = warden.targetY - warden.y;
      const directionDistance = Math.max(1, Math.hypot(dx, dy));
      const desiredVx = (dx / directionDistance) * warden.cruiseSpeed;
      const desiredVy = (dy / directionDistance) * warden.cruiseSpeed;
      const blend = Math.min(1, deltaSeconds * warden.steerRate);
      warden.vx += (desiredVx - warden.vx) * blend;
      warden.vy += (desiredVy - warden.vy) * blend;
    } else {
      warden.vx *= 0.97;
      warden.vy *= 0.97;
    }

    warden.x += warden.vx * deltaSeconds;
    warden.y += warden.vy * deltaSeconds;

    if (warden.age >= warden.lingerDuration) {
      const target = findNearestEnemyTarget(warden.x, warden.y, warden.attackRange);
      if (target) {
        const attackAngle = Math.atan2(target.y - warden.y, target.x - warden.x);
        if (now >= warden.nextPdShotAt) {
          spawnWeaponProjectile({ x: warden.x, y: warden.y }, attackAngle, WARDEN_PD_WEAPON);
          warden.nextPdShotAt = now + 120;
        }
        if (now >= warden.nextLaserBurstAt) {
          spawnWeaponProjectile({ x: warden.x, y: warden.y }, attackAngle - 0.04, WARDEN_LASER_WEAPON);
          spawnWeaponProjectile({ x: warden.x, y: warden.y }, attackAngle + 0.04, WARDEN_LASER_WEAPON);
          warden.nextLaserBurstAt = now + 420;
        }
      }
    }

    if (warden.life <= 0) {
      emitExplosion(world, warden.x, warden.y);
      return false;
    }

    for (const enemy of world.enemies) {
      if (!isEnemyDamageable(enemy)) {
        continue;
      }
      const hit = getEnemyHitCircles(enemy).some((circle) => {
        const distance = Math.hypot(circle.x - warden.x, circle.y - warden.y);
        return distance <= circle.radius + warden.radius;
      });
      if (!hit) {
        continue;
      }

      emitExplosion(world, warden.x, warden.y, enemy.type === "boss"
        ? {
          partOptions: {
            partKind: "enemy-part",
            partImages: world.enemyPartImages,
          },
        }
        : undefined);
      damageEnemiesInRadius(warden.x, warden.y, warden.explosiveRadius, warden.explosiveDamage);
      return false;
    }

    return warden.x > -80
      && warden.x < world.width + 80
      && warden.y > -80
      && warden.y < world.height + 80;
  });
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

    if (projectile.homing && !projectile.homingPaused) {
      updateHomingProjectile(projectile, deltaSeconds);
    }

    projectile.x += projectile.vx * deltaSeconds;
    projectile.y += projectile.vy * deltaSeconds;
    projectile.rotation = Math.atan2(projectile.vy, projectile.vx);
    projectile.spriteRotation = (projectile.spriteRotation || 0) + (projectile.spriteSpin || 0) * deltaSeconds;

    if (projectile.sparkleEnabled) {
      projectile.sparkleTimer = (projectile.sparkleTimer || 0) - deltaSeconds;
      if (projectile.sparkleTimer <= 0) {
        projectile.sparkleTimer = 0.025 + Math.random() * 0.05;
        projectile.sparkleAngleOffset = (Math.random() - 0.5) * 0.9;
      }
    }

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
  let bestScore = Infinity;
  const homingRange = projectile.homingRange || Infinity;
  const currentAngle = Math.atan2(projectile.vy, projectile.vx);
  const pathRadius = projectile.homingPathRadius;
  const acquireAngle = projectile.homingAcquireAngle;
  const forwardOnly = Boolean(projectile.homingForwardOnly);

  for (const enemy of world.enemies) {
    if (enemy.hitPoints <= 0) {
      continue;
    }
    if (enemy.spawnGraceUntil && performance.now() < enemy.spawnGraceUntil) {
      continue;
    }

    const dx = enemy.x - projectile.x;
    const dy = enemy.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    if (distance > homingRange) {
      continue;
    }

    const headingDx = Math.cos(currentAngle);
    const headingDy = Math.sin(currentAngle);
    const forwardDistance = dx * headingDx + dy * headingDy;
    if (forwardOnly && forwardDistance < -12) {
      continue;
    }

    const lateralDistance = Math.abs(dx * headingDy - dy * headingDx);
    if (pathRadius && lateralDistance > pathRadius) {
      continue;
    }

    if (acquireAngle !== undefined && Number.isFinite(acquireAngle)) {
      const desiredAngle = Math.atan2(dy, dx);
      let angleDelta = desiredAngle - currentAngle;
      while (angleDelta > Math.PI) {
        angleDelta -= Math.PI * 2;
      }
      while (angleDelta < -Math.PI) {
        angleDelta += Math.PI * 2;
      }
      if (Math.abs(angleDelta) > acquireAngle) {
        continue;
      }
    }

    const score = distance + (pathRadius ? lateralDistance * 0.75 : 0);
    if (score < bestScore) {
      bestScore = score;
      target = enemy;
    }
  }

  if (!target) {
    return;
  }

  const desiredAngle = Math.atan2(target.y - projectile.y, target.x - projectile.x);
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
    if (beam.trackPointer && world.currentShip && beam.trackHardpoint) {
      const mountPos = getMountWorldPosition(beam.trackHardpoint, world.currentShip);
      const angle = Math.atan2(pointer.y - mountPos.y, pointer.x - mountPos.x);
      const range = Math.hypot(world.width, world.height) * 1.3;
      beam.x1 = mountPos.x;
      beam.y1 = mountPos.y;
      beam.x2 = mountPos.x + Math.cos(angle) * range;
      beam.y2 = mountPos.y + Math.sin(angle) * range;
    }

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
  const phaserMounts = (ship.weaponMounts || []).filter((mount) => getWeaponDef(mount.weaponId)?.id === "phaser");
  if (phaserMounts.length) {
    firePhaserBank(ship, phaserMounts, now);
  }

  for (const mount of ship.weaponMounts || []) {
    if (!mount.weaponId) {
      continue;
    }

    const weapon = getWeaponDef(mount.weaponId);
    if (!weapon) {
      continue;
    }
    if (weapon.id === "phaser") {
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

function getOrCreatePhaserBank(ship) {
  if (!ship.phaserBank) {
    ship.phaserBank = {
      firingUntil: 0,
      cooldownUntil: 0,
      nextShotAt: 0,
    };
  }
  return ship.phaserBank;
}

function firePhaserBank(ship, phaserMounts, now) {
  const bank = getOrCreatePhaserBank(ship);
  const baseWeapon = getWeaponDef("phaser");
  if (!baseWeapon) {
    return;
  }

  if (!pointer.down) {
    return;
  }

  if (now < bank.cooldownUntil) {
    return;
  }

  if (now >= bank.firingUntil) {
    const sustainDuration = baseWeapon.sustainDurationMs || 1200;
    const sustainCooldown = baseWeapon.sustainCooldownMs || 1800;
    bank.firingUntil = now + sustainDuration;
    bank.cooldownUntil = bank.firingUntil + sustainCooldown;
    bank.nextShotAt = now;
  }

  if (now > bank.firingUntil || now < bank.nextShotAt) {
    return;
  }

  const emittingMount = phaserMounts.reduce((forwardMost, mount) => {
    if (!forwardMost) {
      return mount;
    }
    return (mount.hardpoint?.x || 0) > (forwardMost.hardpoint?.x || 0) ? mount : forwardMost;
  }, null);
  if (!emittingMount) {
    return;
  }
  const mountPos = getMountWorldPosition(emittingMount.hardpoint, ship);
  const angle = emittingMount.angle;
  const extraBanks = Math.max(0, phaserMounts.length - 1);
  const damageMultiplier = 1 + extraBanks * (baseWeapon.bankDamageBonusPerExtra || 0.75);
  fireWeapon(mountPos, angle, {
    ...baseWeapon,
    damage: (baseWeapon.damage || 0) * damageMultiplier,
    beamDamagePerSecond: (baseWeapon.beamDamagePerSecond || 0) * damageMultiplier,
  }, {
    trackPointer: true,
    trackHardpoint: emittingMount.hardpoint,
  });
  bank.nextShotAt = now + baseWeapon.cooldown;
}

function fireWeapon(mount, angle, weapon, options = {}) {
  if (weapon.soundPath && !options.isEnemy) {
    playSound(world, weapon.soundPath, { volume: weapon.fireMode === "beam" ? 0.42 : 0.36 });
  }

  if (weapon.fireMode === "warden-drone") {
    spawnWardenDrone(mount, angle, weapon, options);
    return;
  }

  if (weapon.fireMode === "beam") {
    spawnBeamWeapon(mount, angle, weapon, options);
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

    if (weapon.id === "torpedo") {
      projectile.lockedTargetX = target.x;
      projectile.lockedTargetY = target.y;
      projectile.torpedoPhase = "launch";
      projectile.torpedoPhaseTime = 0;
      projectile.torpedoLaunchDuration = 0.18;
      projectile.torpedoDriftDuration = 0.58;
      projectile.torpedoDriftDamping = 0.86;
      projectile.torpedoBoostSpeed = 760;
      projectile.torpedoBoostTurnRate = 7.2;
      projectile.torpedoBoostAcceleration = 1700;
      projectile.torpedoDriftDirection = Math.random() > 0.5 ? 1 : -1;
      projectile.homingPaused = true;
    }
  }

  if (weapon.homingTurnRate) {
    projectile.homing = true;
    projectile.homingDelay = weapon.homingDelay || 0;
    projectile.homingTurnRate = weapon.homingTurnRate;
    projectile.homingRange = weapon.homingRange || 800;
    projectile.homingPathRadius = weapon.homingPathRadius;
    projectile.homingForwardOnly = Boolean(weapon.homingForwardOnly);
    projectile.homingAcquireAngle = weapon.homingAcquireAngle;
  }

  if (weapon.id === "large-phototorpedo") {
    projectile.sparkleEnabled = true;
    projectile.sparkleTimer = 0.03 + Math.random() * 0.05;
    projectile.sparkleAngleOffset = (Math.random() - 0.5) * 0.75;
  }

  world.projectiles.push({
    ...projectile,
  });
}

function spawnWardenDrone(mount, angle, weapon, options = {}) {
  const target = options.target || pointer;
  const launchSpeed = 34;
  world.wardens.push({
    weaponId: weapon.id,
    x: mount.x + Math.cos(angle) * 18,
    y: mount.y + Math.sin(angle) * 18,
    vx: world.player.vx * 0.18 + Math.cos(angle) * launchSpeed,
    vy: world.player.vy * 0.18 + Math.sin(angle) * launchSpeed,
    rotation: angle,
    rotationSpeed: 2.4,
    radius: 15,
    life: 7.6,
    age: 0,
    lingerDuration: 1.0,
    targetX: target.x,
    targetY: target.y,
    cruiseSpeed: 390,
    steerRate: 1.7,
    attackRange: 520,
    nextPdShotAt: performance.now() + 120,
    nextLaserBurstAt: performance.now() + 340,
    explosiveRadius: 68,
    explosiveDamage: 110,
  });
}

function spawnBeamWeapon(mount, angle, weapon, options = {}) {
  const range = Math.hypot(world.width, world.height) * 1.3;
  const endX = mount.x + Math.cos(angle) * range;
  const endY = mount.y + Math.sin(angle) * range;

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
    trackPointer: Boolean(options.trackPointer),
    trackHardpoint: options.trackHardpoint || null,
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
  if (projectile.weaponId === "torpedo" && projectile.torpedoPhase) {
    projectile.torpedoPhaseTime = (projectile.torpedoPhaseTime || 0) + deltaSeconds;

    if (projectile.torpedoPhase === "launch") {
      projectile.vx *= Math.max(0.84, 1 - deltaSeconds * 0.8);
      projectile.vy += 120 * deltaSeconds;

      if (projectile.torpedoPhaseTime >= (projectile.torpedoLaunchDuration || 0.18)) {
        projectile.torpedoPhase = "drift";
        projectile.torpedoPhaseTime = 0;
        projectile.vx *= 0.55;
        projectile.vy *= 0.32;
      }
      return;
    }

    if (projectile.torpedoPhase === "drift") {
      const damping = Math.max(0, 1 - (1 - (projectile.torpedoDriftDamping || 0.86)) * deltaSeconds * 60);
      projectile.vx *= damping;
      projectile.vy *= Math.min(1, damping + 0.08);
      projectile.vx += (projectile.torpedoDriftDirection || 1) * 22 * deltaSeconds;
      projectile.vy += 24 * deltaSeconds;

      if (projectile.torpedoPhaseTime >= (projectile.torpedoDriftDuration || 0.58)) {
        projectile.torpedoPhase = "boost";
        projectile.torpedoPhaseTime = 0;
        projectile.homingPaused = false;
      }
      return;
    }

    if (projectile.torpedoPhase === "boost") {
      const targetX = projectile.lockedTargetX ?? projectile.x + projectile.vx * 2;
      const targetY = projectile.lockedTargetY ?? projectile.y + projectile.vy * 2;
      const desiredAngle = Math.atan2(targetY - projectile.y, targetX - projectile.x);
      const currentAngle = Math.atan2(projectile.vy, projectile.vx);
      let angleDelta = desiredAngle - currentAngle;
      while (angleDelta > Math.PI) {
        angleDelta -= Math.PI * 2;
      }
      while (angleDelta < -Math.PI) {
        angleDelta += Math.PI * 2;
      }

      const maxTurn = (projectile.torpedoBoostTurnRate || 7.2) * deltaSeconds;
      const nextAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, angleDelta));
      const currentSpeed = Math.hypot(projectile.vx, projectile.vy);
      const boostSpeed = projectile.torpedoBoostSpeed || 760;
      const acceleratedSpeed = Math.min(
        boostSpeed,
        currentSpeed + (projectile.torpedoBoostAcceleration || 1700) * deltaSeconds,
      );

      projectile.vx = Math.cos(nextAngle) * acceleratedSpeed;
      projectile.vy = Math.sin(nextAngle) * acceleratedSpeed;
      return;
    }
  }

  projectile.vy += (projectile.gravity || 0) * deltaSeconds;
}

function destroyEnemy(enemy) {
  if (enemy.deathSequenceActive) {
    return;
  }

  enemy.deathSequenceActive = true;
  world.score += enemy.scoreValue || 0;
  updateScoreDisplay();
  playRandomSound(world, ENEMY_EXPLODE_SOUNDS, { volume: enemy.type === "boss" ? 0.48 : (enemy.isLarge ? 0.5 : 0.38) });

  if (enemy.isStageBackbone) {
    spawnWeaponDrop(enemy.x, enemy.y);
  }

  if (enemy.type === "boss") {
    spawnBossDeathWreck(enemy);
    world.defeatedBossCount += 1;
    world.stageIndex += 1;
    if (world.bossEncounter?.bossEnemy === enemy) {
      world.bossEncounter = null;
    }
    prepareNextStage();
    scatterBossWeaponDrops(enemy.x, enemy.y, 4);
    enemy.hitPoints = 0;
    return;
  }

  emitExplosion(world, enemy.x, enemy.y);
  if (enemy.isLarge) {
    emitExplosion(world, enemy.x, enemy.y);
  }
}

function emitBossStructureScatter(enemy, intensity = 1) {
  const bounds = getBossBounds(enemy);
  const composedParts = enemy.parts || [];
  const sampleParts = composedParts.slice(0, Math.min(32, composedParts.length));

  for (const part of sampleParts) {
    const partImage = world.enemyPartImages?.[part.imageIndex];
    if (!partImage?.image) {
      continue;
    }

    const flipScale = enemy.flipX ? -1 : 1;
    const worldX = enemy.x + part.x * bounds.scale * flipScale;
    const worldY = enemy.y + part.y * bounds.scale;
    const awayAngle = Math.atan2(worldY - enemy.y, worldX - enemy.x) + (Math.random() - 0.5) * 0.55;
    const speed = 75 + Math.random() * 180;

    world.particles.push({
      kind: "enemy-part",
      x: worldX,
      y: worldY,
      vx: Math.cos(awayAngle) * speed,
      vy: Math.sin(awayAngle) * speed,
      life: 1 + Math.random() * 1.7,
      maxLife: 2.7,
      size: (partImage.width * part.scale * bounds.scale) * (0.45 + Math.random() * 0.6),
      rotation: part.rotation + Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 8.8,
      partIndex: part.imageIndex,
    });
  }

  emitShipParts(world, enemy.x, enemy.y, Math.round((28 + Math.floor(Math.random() * 16)) * intensity), {
    direction: Math.random() * Math.PI * 2,
    spread: Math.PI * 2,
    minSpeed: 80,
    maxSpeed: 260,
    minSize: 18,
    maxSize: 40,
    partKind: "enemy-part",
    partImages: world.enemyPartImages,
  });
}

function spawnBossDeathWreck(enemy) {
  const bounds = getBossBounds(enemy);
  world.wrecks.push({
    kind: "boss",
    x: enemy.x,
    y: enemy.y,
    vx: -4 + Math.random() * 8,
    vy: 14 + Math.random() * 10,
    ay: 5 + Math.random() * 4,
    rotation: enemy.rotation || 0,
    rotationSpeed: 0,
    width: bounds.width,
    height: bounds.height,
    scale: bounds.scale,
    flipX: enemy.flipX,
    parts: enemy.parts || null,
    image: enemy.image || null,
    sourceEnemy: enemy,
    emitCooldown: 0,
  });
  emitBossStructureScatter(enemy, 0.7);
}

function spawnPlayerDeathWreck() {
  const ship = world.currentShip;
  if (!ship) {
    return;
  }

  const bounds = getShipBounds(ship);
  world.wrecks.push({
    kind: "player",
    x: world.player.x,
    y: world.player.y,
    vx: Math.max(80, world.player.vx * 0.6 + 120),
    vy: Math.max(25, world.player.vy * 0.45 + 35),
    ay: 38,
    rotation: 0,
    rotationSpeed: 0,
    image: ship.image,
    width: bounds.width,
    height: bounds.height,
    emitCooldown: 0,
  });
}

function updateWrecks(deltaSeconds) {
  world.wrecks = world.wrecks.filter((wreck) => {
    wreck.vy += (wreck.ay || 0) * deltaSeconds;
    wreck.x += wreck.vx * deltaSeconds;
    wreck.y += wreck.vy * deltaSeconds;
    wreck.rotation += (wreck.rotationSpeed || 0) * deltaSeconds;
    wreck.emitCooldown = (wreck.emitCooldown || 0) - deltaSeconds;

    if (wreck.emitCooldown <= 0) {
      wreck.emitCooldown = wreck.kind === "boss"
        ? 0.10 + Math.random() * 0.12
        : 0.05 + Math.random() * 0.08;
      const emitX = wreck.x - (wreck.kind === "player" ? wreck.width * 0.18 : 0);
      const emitY = wreck.y + wreck.height * 0.1;
      emitSparks(world, emitX, emitY, wreck.kind === "player" ? 2 : 3);

      world.particles.push({
        kind: "smoke",
        x: emitX + (Math.random() - 0.5) * 12,
        y: emitY + (Math.random() - 0.5) * 10,
        vx: -20 + (Math.random() - 0.5) * 18,
        vy: -26 + (Math.random() - 0.5) * 16,
        life: 0.8 + Math.random() * 0.8,
        maxLife: 1.6,
        size: 12 + Math.random() * 18,
        color: Math.random() > 0.5 ? "#2f2f2f" : "#4f4f4f",
      });

      emitShipParts(world, emitX, emitY, wreck.kind === "player" ? 1 : 2, {
        direction: Math.PI + (Math.random() - 0.5) * 0.6,
        spread: Math.PI * 1.1,
        minSpeed: 30,
        maxSpeed: wreck.kind === "player" ? 90 : 120,
        partKind: wreck.kind === "boss" ? "enemy-part" : "part",
        partImages: wreck.kind === "boss" ? world.enemyPartImages : world.partImages,
        minSize: wreck.kind === "boss" ? 16 : 14,
        maxSize: wreck.kind === "boss" ? 30 : 24,
      });
    }

    const outOfBounds = (
      wreck.y - wreck.height * 0.6 > world.height + 80
      || wreck.y + wreck.height * 0.6 < -120
      || wreck.x - wreck.width * 0.6 > world.width + 140
      || wreck.x + wreck.width * 0.6 < -120
    );
    if (outOfBounds && wreck.kind === "player") {
      world.playerWreckExited = true;
      return false;
    }

    return !outOfBounds;
  });
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

function buildBlackEnemyPartImages(records) {
  return (records || []).map((record) => {
    const source = record?.image;
    const width = record?.width || source?.naturalWidth || source?.width || 0;
    const height = record?.height || source?.naturalHeight || source?.height || 0;
    if (!source || width <= 0 || height <= 0) {
      return record;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const offscreen = canvas.getContext("2d");
    offscreen.drawImage(source, 0, 0, width, height);
    offscreen.globalCompositeOperation = "source-in";
    offscreen.fillStyle = "#050505";
    offscreen.fillRect(0, 0, width, height);
    offscreen.globalCompositeOperation = "source-over";

    return {
      ...record,
      image: canvas,
      width,
      height,
    };
  });
}

function getEnemyPartImageRecord(partIndex) {
  const records = world.enemyPartBlackImages?.length ? world.enemyPartBlackImages : world.enemyPartImages;
  if (!records?.length) {
    return null;
  }
  return records[partIndex % records.length] || null;
}

function renderBossComposite(record, centerX, centerY, scale, options = {}) {
  if (!record?.parts?.length || !world.enemyPartImages?.length) {
    return false;
  }

  const now = performance.now() / 1000;
  const rotation = options.rotation || 0;
  const flipX = Boolean(options.flipX);
  const pulseTime = options.pulseTime ?? now;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.scale(flipX ? -1 : 1, 1);

  for (const part of record.parts) {
    const imageRecord = getEnemyPartImageRecord(part.imageIndex);
    const image = imageRecord?.image;
    if (!image) {
      continue;
    }

    const wobbleAngle = Math.sin(pulseTime * 0.6 + (part.phase || 0)) * (part.wobble || 0);
    const pulseOffset = Math.sin(pulseTime * (part.pulseSpeed || 1) + (part.phase || 0)) * (part.pulseAmplitude || 0);
    const localX = part.x * scale;
    const localY = (part.y + pulseOffset) * scale;
    const drawWidth = imageRecord.width * part.scale * scale;
    const drawHeight = imageRecord.height * part.scale * scale;

    ctx.save();
    ctx.translate(localX, localY);
    ctx.rotate(part.rotation + wobbleAngle);
    ctx.drawImage(image, -drawWidth * 0.5, -drawHeight * 0.5, drawWidth, drawHeight);
    ctx.restore();
  }

  ctx.restore();
  return true;
}

function renderBossPreview() {
  const encounter = world.bossEncounter;
  if (!encounter || encounter.phase !== "preview") {
    return;
  }

  const boss = encounter.bossRecord;
  const renderedComposite = renderBossComposite(
    boss,
    encounter.previewX,
    encounter.previewY,
    encounter.previewScale,
    { flipX: true },
  );
  if (!renderedComposite && boss.image) {
    ctx.save();
    ctx.globalAlpha = 1;
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
}

function renderWrecks() {
  for (const wreck of world.wrecks) {
    ctx.save();
    ctx.translate(wreck.x, wreck.y);
    ctx.rotate(wreck.rotation || 0);

    if (wreck.kind === "boss") {
      const renderedComposite = renderBossComposite(wreck, 0, 0, wreck.scale || 1, {
        flipX: wreck.flipX,
      });
      if (!renderedComposite && wreck.image) {
        ctx.scale(wreck.flipX ? -1 : 1, 1);
        ctx.drawImage(wreck.image, -wreck.width * 0.5, -wreck.height * 0.5, wreck.width, wreck.height);
      }
      ctx.restore();
      continue;
    }

    if (wreck.kind === "player" && wreck.image) {
      ctx.drawImage(wreck.image, -wreck.width * 0.5, -wreck.height * 0.5, wreck.width, wreck.height);
    }
    ctx.restore();
  }
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
    if (enemy.type !== "boss" && enemy.type !== "enemy-ship" && !image) {
      continue;
    }
    if (enemy.type === "enemy-ship" && !image && !enemy.parts?.length) {
      continue;
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.rotation || 0);

    if (enemy.type === "boss") {
      const bounds = getBossBounds(enemy);
      const renderedComposite = renderBossComposite(enemy, 0, 0, bounds.scale, {
        flipX: enemy.flipX,
        rotation: enemy.rotation || 0,
        pulseTime: enemy.floatTime || 0,
      });
      if (!renderedComposite && image) {
        ctx.scale(enemy.flipX ? -1 : 1, 1);
        ctx.drawImage(image, -bounds.width * 0.5, -bounds.height * 0.5, bounds.width, bounds.height);
      }
      ctx.restore();
      renderBossSpawnerPoints(enemy);
      continue;
    }

    if (enemy.type === "enemy-ship") {
      const scale = getEnemyShipScale(enemy);
      const renderedComposite = enemy.parts?.length
        ? renderBossComposite(enemy, 0, 0, scale, {
          flipX: false,
          rotation: 0,
          pulseTime: enemy.phase || 0,
        })
        : false;
      if (!renderedComposite) {
        const width = enemy.width * scale;
        const height = enemy.height * scale;
        ctx.drawImage(image, -width * 0.5, -height * 0.5, width, height);
      }
      ctx.restore();
      renderEnemyShipEmitterPoints(enemy);
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
  const emitterPoints = getBossEmitterPoints(enemy);
  if (!image || !emitterPoints?.length) {
    return;
  }

  const bounds = getBossBounds(enemy);
  const size = Math.max(18, Math.min(34, bounds.width * 0.06));

  emitterPoints.forEach((point, index) => {
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

function renderEnemyShipEmitterPoints(enemy) {
  if (!enemy?.weaponMounts?.length || !(enemy.isStageBackbone || enemy.isStageMidLarge)) {
    return;
  }

  const image = world.enemySpawnerImage;
  const scale = getEnemyShipScale(enemy);
  const size = image ? Math.max(12, Math.min(20, enemy.radius * 0.22)) : 0;

  enemy.weaponMounts.forEach((mount, index) => {
    const mountPos = getEnemyMountWorldPosition(mount.hardpoint, enemy);
    if (image) {
      ctx.save();
      ctx.translate(mountPos.x, mountPos.y);
      ctx.rotate((enemy.phase || 0) * 0.85 + index * 0.5);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
      ctx.globalAlpha = 1;
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(mountPos.x, mountPos.y, Math.max(3, 4.5 * scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 1.2;
    ctx.stroke();
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
      ? world.enemyShotImages?.[projectile.projectileSpriteId] || world.projectileSpriteImages?.[projectile.projectileSpriteId]
      : null;
    if (projectileImage) {
      const size = projectile.projectileSize || Math.max(16, projectile.radius * 4.5);
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.rotation + (projectile.spriteRotation || 0) + (projectile.sparkleAngleOffset || 0));
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

function renderWardens() {
  if (world.scene !== "running") {
    return;
  }

  const image = world.weaponImages?.warden;
  for (const warden of world.wardens) {
    ctx.save();
    ctx.translate(warden.x, warden.y);
    ctx.rotate(warden.rotation);

    if (image) {
      const size = 30;
      ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, warden.radius * 0.66, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#050505";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
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
    if (particle.kind === "enemy-part" && world.enemyPartImages?.length) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation || 0);
      const imageRecord = getEnemyPartImageRecord(particle.partIndex);
      const image = imageRecord?.image;
      if (image) {
        const size = particle.size || 24;
        ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
      }
      ctx.restore();
      continue;
    }

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

    if (particle.kind === "smoke") {
      ctx.fillStyle = `${particle.color}${toAlphaHex(alpha * 0.8)}`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (0.65 + alpha * 0.55), 0, Math.PI * 2);
      ctx.fill();
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
  world.wardens = [];
  world.enemies = [];
  world.wrecks = [];
  world.particles = [];
  world.drops = [];
  world.bossEncounter = null;
  world.stageIndex = 0;
  world.stagePhase = "hazard";
  world.stageHazardType = "mine";
  world.stageHazardsRemaining = 0;
  world.stageEnemyShipsRemaining = 0;
  world.stageEnemyArchetype = null;
  world.stageMidLargeArchetype = null;
  world.stageMidLargeSpawned = false;
  world.stageEnemySpawnCount = 0;
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
  world.playerWreckExited = false;
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
  skipBossButton?.classList.remove("is-visible");
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
  spawnPlayerDeathWreck();
}

function getDeathProgress() {
  if (world.scene !== "dying") {
    return 0;
  }

  const elapsed = performance.now() - world.deathStartedAt;
  return Math.max(0, Math.min(1, elapsed / world.deathDuration));
}

function renderDeathFade() {
  // Death uses wreck drift sequence; no full-screen fade.
}

function returnToIntro() {
  world.scene = "intro";
  world.deathStartedAt = 0;
  resetGameplayState();
  keys.clear();
  introScreen.classList.remove("is-hidden");
  menuButton.classList.remove("is-visible");
  skipBossButton?.classList.remove("is-visible");
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
  updateWardens(deltaSeconds);
  if (world.currentShip) {
    updateWeaponAim(world.currentShip);
  }
  updateProjectiles(deltaSeconds);
  updateBeams(deltaSeconds);
  updateWrecks(deltaSeconds);
  updateParticles(deltaSeconds);
  updateDrops(deltaSeconds);

  renderBackground();
  renderBossPreview();
  renderEnemies();
  renderWrecks();
  renderDrops();

  if (world.currentShip && world.scene === "running") {
    renderShip(world.currentShip);
  }

  renderLaunchSequence();

  renderWardens();
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
    skipBossButton?.classList.add("is-visible");
    scoreDisplay.classList.add("is-visible");
  }

  if (
    world.scene === "dying"
    && (performance.now() - world.deathStartedAt) / 1000 >= 6.5
    && !world.wrecks.some((wreck) => wreck.kind === "player")
  ) {
    returnToIntro();
  }
  if (world.scene === "dying" && world.playerWreckExited) {
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
  skipBossButton?.addEventListener("click", skipToBossEncounter);
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
    enemyPartImages,
    weaponImages,
    enemyShotImages,
    projectileSpriteImages,
    soundPools,
  } = await loadGameAssets();

  world.bosses = bosses;
  world.enemyShips = enemyShips;
  world.mineImage = mineImage;
  world.sporeImage = sporeImage;
  world.enemySpawnerImage = enemySpawnerImage;
  world.partImages = partImages;
  world.enemyPartImages = enemyPartImages;
  world.enemyPartBlackImages = buildBlackEnemyPartImages(enemyPartImages);
  world.weaponImages = weaponImages;
  world.enemyShotImages = enemyShotImages;
  world.projectileSpriteImages = projectileSpriteImages;
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
