import { HIT_BIG_SOUNDS, HIT_SMALL_SOUNDS } from "./data.js";
import { playRandomSound } from "./audio.js";

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const nearestX = x1 + dx * t;
  const nearestY = y1 + dy * t;
  return Math.hypot(px - nearestX, py - nearestY);
}

function getEnemyHitCircles(enemy) {
  if (enemy.type === "boss" && enemy.hitCircles?.length) {
    return enemy.hitCircles;
  }

  return [{ x: enemy.x, y: enemy.y, radius: enemy.radius }];
}

export function emitSparks(world, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 150;
    world.particles.push({
      kind: "spark",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2 + Math.random() * 0.22,
      maxLife: 0.42,
      size: 1.8 + Math.random() * 2.5,
      color: "#050505",
    });
  }
}

export function emitExplosion(world, x, y) {
  for (let i = 0; i < 28; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 220;
    world.particles.push({
      kind: "explosion",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.4,
      maxLife: 0.85,
      size: 3 + Math.random() * 8,
      color: Math.random() > 0.5 ? "#050505" : "#4a4a4a",
    });
  }

  emitShipParts(world, x, y, 3 + Math.floor(Math.random() * 3), {
    minSpeed: 50,
    maxSpeed: 140,
    spread: Math.PI * 1.7,
  });
}

export function emitDebris(world, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 180;
    world.particles.push({
      kind: "debris",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.8,
      maxLife: 1.35,
      size: 2 + Math.random() * 5,
      color: Math.random() > 0.5 ? "#2d2d2d" : "#7f7f7f",
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 6,
    });
  }
}

export function emitShipParts(world, x, y, count, options = {}) {
  const partPoolSize = Math.max(1, world.partImages?.length || 10);
  const direction = options.direction ?? -Math.PI;
  const spread = options.spread ?? Math.PI * 1.1;

  for (let i = 0; i < count; i += 1) {
    const angle = direction + (Math.random() - 0.5) * spread;
    const speed = (options.minSpeed || 55) + Math.random() * (options.maxSpeed || 150);
    world.particles.push({
      kind: "part",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.75 + Math.random() * 1.4,
      maxLife: 2.2,
      size: 16 + Math.random() * 12,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 7.5,
      partIndex: Math.floor(Math.random() * partPoolSize),
    });
  }
}

export function emitRocketTrail(world, x, y) {
  world.particles.push({
    kind: "trail",
    x: x - 4 + (Math.random() - 0.5) * 4,
    y: y + (Math.random() - 0.5) * 4,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 12,
    life: 0.18 + Math.random() * 0.08,
    maxLife: 0.26,
    size: 2.5 + Math.random() * 2.5,
    color: Math.random() > 0.45 ? "#1c1c1c" : "#8b8b8b",
  });
}

function applyExplosionDamage({ world, x, y, radius, damage, onEnemyDestroyed }) {
  for (const enemy of world.enemies) {
    if (enemy.hitPoints <= 0) {
      continue;
    }
    if (enemy.spawnGraceUntil && performance.now() < enemy.spawnGraceUntil) {
      continue;
    }

    const hitCircles = getEnemyHitCircles(enemy);
    let nearestDistance = Infinity;

    for (const circle of hitCircles) {
      const distance = Math.hypot(circle.x - x, circle.y - y);
      if (distance <= radius + circle.radius) {
        nearestDistance = Math.min(nearestDistance, distance);
      }
    }

    if (!Number.isFinite(nearestDistance)) {
      continue;
    }

    const representativeRadius = Math.max(...hitCircles.map((circle) => circle.radius));
    const falloff = Math.max(0.35, 1 - nearestDistance / (radius + representativeRadius));
    const impactDamage = damage * falloff;
    enemy.hitPoints -= impactDamage;
    emitSparks(world, enemy.x, enemy.y, 10);
    if (enemy.type === "boss") {
      emitShipParts(world, enemy.x, enemy.y, Math.max(1, Math.round(impactDamage / 10)), {
        minSpeed: 40,
        maxSpeed: 110,
      });
    }
    playRandomSound(world, HIT_BIG_SOUNDS, { volume: 0.28 });

    if (enemy.hitPoints <= 0) {
      enemy.hitPoints = 0;
      onEnemyDestroyed(enemy);
    }
  }
}

export function applyBeamDamage({ world, beam, damage, onEnemyDestroyed }) {
  for (const enemy of world.enemies) {
    if (enemy.hitPoints <= 0) {
      continue;
    }
    if (enemy.spawnGraceUntil && performance.now() < enemy.spawnGraceUntil) {
      continue;
    }

    const hitCircles = getEnemyHitCircles(enemy);
    const hitCircle = hitCircles.find((circle) => {
      const distance = distanceToSegment(circle.x, circle.y, beam.x1, beam.y1, beam.x2, beam.y2);
      return distance <= circle.radius + beam.width * 0.5;
    });
    if (!hitCircle) {
      continue;
    }

    enemy.hitPoints -= damage;
    emitSparks(world, hitCircle.x, hitCircle.y, beam.weaponId === "large-railgun" ? 14 : 5);
    if (enemy.type === "boss") {
      emitShipParts(world, hitCircle.x, hitCircle.y, Math.max(1, Math.round(damage / 12)), {
        minSpeed: 35,
        maxSpeed: 95,
      });
    }
    playRandomSound(world, beam.width >= 10 ? HIT_BIG_SOUNDS : HIT_SMALL_SOUNDS, {
      volume: beam.width >= 10 ? 0.4 : 0.26,
    });

    if (enemy.hitPoints <= 0) {
      enemy.hitPoints = 0;
      onEnemyDestroyed(enemy);
    }
  }
}

export function handleProjectileHits({ world, onEnemyDestroyed }) {
  const remainingProjectiles = [];

  for (const projectile of world.projectiles) {
    if (projectile.isEnemy) {
      remainingProjectiles.push(projectile);
      continue;
    }

    let hitEnemy = null;

    for (const enemy of world.enemies) {
      if (enemy.hitPoints <= 0) {
        continue;
      }
      if (enemy.spawnGraceUntil && performance.now() < enemy.spawnGraceUntil) {
        continue;
      }

      const hitCircles = getEnemyHitCircles(enemy);
      const matchedCircle = hitCircles.find((circle) => {
        const dx = projectile.x - circle.x;
        const dy = projectile.y - circle.y;
        const distance = Math.hypot(dx, dy);
        return distance <= circle.radius + (projectile.radius || 0);
      });

      if (matchedCircle) {
        hitEnemy = enemy;
        projectile.impactX = matchedCircle.x;
        projectile.impactY = matchedCircle.y;
        break;
      }
    }

    if (!hitEnemy) {
      remainingProjectiles.push(projectile);
      continue;
    }

    if (projectile.explosiveRadius > 0) {
      applyExplosionDamage({
        world,
        x: projectile.x,
        y: projectile.y,
        radius: projectile.explosiveRadius,
        damage: projectile.damage,
        onEnemyDestroyed,
      });
      emitExplosion(world, projectile.x, projectile.y);
      playRandomSound(world, HIT_BIG_SOUNDS, { volume: 0.34 });
    } else {
      hitEnemy.hitPoints -= projectile.damage;
      emitSparks(world, projectile.impactX ?? projectile.x, projectile.impactY ?? projectile.y, 8);
      if (hitEnemy.type === "boss") {
        emitShipParts(world, projectile.impactX ?? projectile.x, projectile.impactY ?? projectile.y, Math.max(1, Math.round(projectile.damage / 9)), {
          minSpeed: 40,
          maxSpeed: 105,
        });
      }
      playRandomSound(world, projectile.damage >= 18 ? HIT_BIG_SOUNDS : HIT_SMALL_SOUNDS, {
        volume: projectile.damage >= 18 ? 0.32 : 0.24,
      });

      if (hitEnemy.hitPoints <= 0) {
        hitEnemy.hitPoints = 0;
        onEnemyDestroyed(hitEnemy);
      }
    }
  }

  world.projectiles = remainingProjectiles;
}

export function handleEnemyProjectileHits({ world, shipCollisionCircles, onPlayerDamaged }) {
  const remainingProjectiles = [];

  for (const projectile of world.projectiles) {
    if (!projectile.isEnemy) {
      remainingProjectiles.push(projectile);
      continue;
    }

    const hitCircle = (shipCollisionCircles || []).find((circle) => {
      const dx = projectile.x - circle.x;
      const dy = projectile.y - circle.y;
      const distance = Math.hypot(dx, dy);
      return distance <= circle.radius + (projectile.radius || 0);
    });

    if (!hitCircle) {
      remainingProjectiles.push(projectile);
      continue;
    }

    emitSparks(world, projectile.x, projectile.y, 8);
    onPlayerDamaged(projectile.damage, projectile.x, projectile.y);
  }

  world.projectiles = remainingProjectiles;
}

export function handleShipCollisions({ world, shipCollisionCircles, collisionDamage, onPlayerDamaged }) {
  const now = performance.now();
  if (now < world.player.collisionCooldownUntil) {
    return;
  }

  for (const enemy of world.enemies) {
    if (enemy.type === "boss") {
      continue;
    }

    const hitCircle = (shipCollisionCircles || []).find((circle) => {
      const distance = Math.hypot(enemy.x - circle.x, enemy.y - circle.y);
      return distance <= circle.radius + enemy.radius;
    });
    if (!hitCircle) {
      continue;
    }

    enemy.hitPoints = 0;
    emitExplosion(world, enemy.x, enemy.y);
    onPlayerDamaged(enemy.collisionDamage ?? collisionDamage, enemy.x, enemy.y);
    world.player.collisionCooldownUntil = now + 500;
    break;
  }
}

export function damagePlayer({ world, amount, impactX, impactY, onPlayerDeath }) {
  world.player.hitPoints -= amount;
  emitSparks(world, impactX, impactY, 18);
  emitDebris(world, impactX, impactY, 8);
  emitShipParts(world, impactX, impactY, Math.max(1, Math.round(amount / 6)), {
    minSpeed: 55,
    maxSpeed: 130,
  });

  if (world.player.hitPoints <= 0) {
    world.player.hitPoints = 0;
    onPlayerDeath();
  }
}

export function triggerPlayerDeathEffects(world) {
  for (let i = 0; i < 7; i += 1) {
    const offsetX = (Math.random() - 0.5) * 120;
    const offsetY = (Math.random() - 0.5) * 70;
    emitExplosion(world, world.player.x + offsetX, world.player.y + offsetY);
    emitSparks(world, world.player.x + offsetX, world.player.y + offsetY, 24);
    emitShipParts(world, world.player.x + offsetX, world.player.y + offsetY, 5 + Math.floor(Math.random() * 4), {
      minSpeed: 70,
      maxSpeed: 180,
      spread: Math.PI * 1.6,
    });
    emitDebris(world, world.player.x + offsetX, world.player.y + offsetY, 10);
  }
}
