function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickRandom(list) {
  if (!list?.length) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function pickBackboneWeaponId(weaponIds, stageIndex, mountIndex) {
  if (!weaponIds?.length) {
    return "enemy-shot-1";
  }

  const stage = Math.max(0, stageIndex);
  const contains = (id) => weaponIds.includes(id);

  const choices = [];
  if (contains("enemy-shot-1")) {
    choices.push({ id: "enemy-shot-1", weight: clamp(1.4 - stage * 0.12 + (mountIndex === 0 ? 0.6 : 0), 0.35, 2.2) });
  }
  if (contains("enemy-shot-2")) {
    choices.push({ id: "enemy-shot-2", weight: clamp(0.85 + stage * 0.16 + (mountIndex % 2 === 1 ? 0.25 : 0), 0.45, 2.8) });
  }
  if (contains("enemy-shot-3")) {
    choices.push({ id: "enemy-shot-3", weight: clamp(-0.25 + stage * 0.24 + (mountIndex >= 2 ? 0.3 : 0), 0, 3.1) });
  }

  const weighted = choices.filter((choice) => choice.weight > 0);
  if (!weighted.length) {
    return pickRandom(weaponIds) || "enemy-shot-1";
  }

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.id;
    }
  }

  return weighted[weighted.length - 1].id;
}

function buildStageHardpoints(width, height, stage, maxCount = 4) {
  const count = Math.max(1, Math.min(maxCount, 1 + Math.floor(stage * 0.45)));
  const frontX = width * 0.7;
  const spreadY = height * 0.28;
  const centerY = height * 0.5;
  const points = [];

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const y = centerY + (t - 0.5) * spreadY * 2 + randRange(-5, 5);
    const x = frontX - Math.abs(t - 0.5) * width * 0.2 + randRange(-8, 8);
    points.push({
      type: "light",
      x: clamp(x, 16, width - 16),
      y: clamp(y, 14, height - 14),
    });
  }

  return points.sort((a, b) => b.x - a.x);
}

function buildHardpointsFromParts(parts, width, height, stage, maxCount = 4) {
  if (!parts?.length) {
    return buildStageHardpoints(width, height, stage, maxCount);
  }

  const count = Math.max(1, Math.min(maxCount, 1 + Math.floor(stage * 0.45)));
  const sampledParts = [...parts]
    .sort((a, b) => b.x - a.x)
    .slice(0, Math.max(count + 1, Math.ceil(parts.length * 0.4)));

  const occupied = sampledParts.map((part) => ({
    cx: width * 0.5 + part.x,
    cy: height * 0.5 + part.y,
    radius: 8 + part.scale * 18,
  }));

  const minX = Math.max(14, Math.min(...occupied.map((node) => node.cx - node.radius)));
  const maxX = Math.min(width - 14, Math.max(...occupied.map((node) => node.cx + node.radius)));
  const minY = Math.max(12, Math.min(...occupied.map((node) => node.cy - node.radius)));
  const maxY = Math.min(height - 12, Math.max(...occupied.map((node) => node.cy + node.radius)));

  const hardpoints = [];
  for (let i = 0; i < count; i += 1) {
    const part = sampledParts[i % sampledParts.length];
    const jitterX = randRange(-5, 6);
    const jitterY = randRange(-5, 5);
    const px = width * 0.5 + part.x + jitterX;
    const py = height * 0.5 + part.y + jitterY;

    hardpoints.push({
      type: "light",
      x: clamp(px, minX, maxX),
      y: clamp(py, minY, maxY),
    });
  }

  return hardpoints.sort((a, b) => b.x - a.x);
}

function buildCompositeEnemyParts(enemyPartImages, stage, maxHardpoints = 4) {
  const partCount = Math.round(clamp(2 + stage * 0.22 + randRange(0, 1.8), 2, 6));
  const width = Math.round(clamp(195 + stage * 26 + randRange(-16, 26), 180, 440));
  const height = Math.round(clamp(112 + stage * 15 + randRange(-10, 16), 100, 260));
  const maxX = width * 0.38;
  const maxY = height * 0.34;
  const anchors = [{ x: 0, y: 0 }];
  const parts = [];

  for (let i = 0; i < partCount; i += 1) {
    const anchor = pickRandom(anchors) || { x: 0, y: 0 };
    const angle = randRange(-Math.PI, Math.PI);
    const distance = i === 0 ? 0 : randRange(16, 48);
    const x = clamp(anchor.x + Math.cos(angle) * distance, -maxX, maxX);
    const y = clamp(anchor.y + Math.sin(angle) * distance, -maxY, maxY);
    const imageIndex = Math.floor(Math.random() * enemyPartImages.length);

    parts.push({
      imageIndex,
      x,
      y,
      scale: randRange(0.46, 1.02),
      rotation: randRange(-Math.PI, Math.PI),
      layer: i,
      wobble: randRange(0.006, 0.055),
      pulseAmplitude: randRange(0, 4.2),
      pulseSpeed: randRange(0.7, 1.8),
      phase: randRange(0, Math.PI * 2),
    });
    anchors.push({ x, y });

    if (i > 1 && Math.random() < 0.2) {
      parts.push({
        imageIndex,
        x: clamp(-x + randRange(-10, 10), -maxX, maxX),
        y: clamp(y + randRange(-8, 8), -maxY, maxY),
        scale: randRange(0.42, 0.95),
        rotation: randRange(-Math.PI, Math.PI),
        layer: i + 0.3,
        wobble: randRange(0.006, 0.05),
        pulseAmplitude: randRange(0, 3.8),
        pulseSpeed: randRange(0.7, 1.8),
        phase: randRange(0, Math.PI * 2),
      });
    }
  }

  const hardpoints = buildHardpointsFromParts(parts, width, height, stage, maxHardpoints);

  return { parts, hardpoints, width, height };
}

export function buildProceduralEnemyArchetype({
  stageIndex = 0,
  enemyShips = [],
  enemyWeaponIds = [],
  enemyPartImages = [],
  sizeClass = "backbone",
} = {}) {
  if (!enemyShips.length) {
    return null;
  }

  const stage = Math.max(0, stageIndex);
  const isMidLarge = sizeClass === "mid-large";
  const baseRecord = pickRandom(enemyShips) || enemyShips[0];
  const useCompositeParts = enemyPartImages.length >= 6;
  const maxMounts = isMidLarge ? 6 : 4;
  const composite = useCompositeParts ? buildCompositeEnemyParts(enemyPartImages, stage, maxMounts) : null;

  const candidatePoints = composite?.hardpoints?.length
    ? composite.hardpoints
    : (baseRecord.lightHardpoints?.length
      ? baseRecord.lightHardpoints
      : (baseRecord.hardpoints || []).filter((point) => point.type === "light"));
  const fallbackLight = [{ type: "light", x: (composite?.width || baseRecord.width) * 0.48, y: (composite?.height || baseRecord.height) * 0.5 }];
  const usablePoints = candidatePoints?.length ? candidatePoints : fallbackLight;
  const mountCount = Math.min(usablePoints.length, Math.max(1, Math.min(maxMounts, 1 + Math.floor(stage * 0.45))));
  const orderedPoints = [...usablePoints].sort((a, b) => b.x - a.x).slice(0, mountCount);
  const weaponMounts = orderedPoints.map((hardpoint, index) => ({
    hardpoint,
    weaponId: pickBackboneWeaponId(enemyWeaponIds, stage, index),
  }));

  return {
    id: `proc-enemy-${stage}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    label: `Stage ${stage + 1} Vanguard`,
    sizeClass,
    baseRecordId: baseRecord.id,
    image: useCompositeParts ? null : baseRecord.image,
    parts: composite?.parts || null,
    width: composite?.width || baseRecord.width,
    height: composite?.height || baseRecord.height,
    hardpoints: usablePoints,
    weaponMounts,
    radius: Math.round(clamp((Math.max(composite?.width || baseRecord.width, composite?.height || baseRecord.height) * (isMidLarge ? 0.285 : 0.22)), isMidLarge ? 110 : 72, isMidLarge ? 280 : 195)),
    hitPoints: Math.round(clamp((isMidLarge ? 380 : 140) + stage * (isMidLarge ? 92 : 56) + randRange(-18, 24), isMidLarge ? 340 : 130, isMidLarge ? 3200 : 1450)),
    collisionDamage: Math.round(clamp((isMidLarge ? 84 : 48) + stage * (isMidLarge ? 12 : 8) + randRange(-6, 10), isMidLarge ? 70 : 36, isMidLarge ? 420 : 280)),
    scoreValue: Math.round(clamp((isMidLarge ? 900 : 320) + stage * (isMidLarge ? 220 : 145) + randRange(-45, 65), isMidLarge ? 760 : 260, isMidLarge ? 12000 : 6200)),
    patrolAmplitude: clamp(28 + stage * 6 + randRange(-4, 12), 24, 140),
    patrolFrequency: clamp(0.52 + stage * 0.05 + randRange(-0.07, 0.11), 0.42, 1.35),
    wobbleAmplitude: clamp(11 + stage * 2 + randRange(-2, 7), 9, 58),
    wobbleFrequency: clamp(0.6 + stage * 0.05 + randRange(-0.08, 0.11), 0.48, 1.45),
    driftResponsiveness: clamp((isMidLarge ? 0.75 : 0.9) + stage * 0.06 + randRange(-0.08, 0.13), 0.7, isMidLarge ? 1.4 : 1.95),
    rotationAmplitude: clamp((isMidLarge ? 0.05 : 0.065) + stage * 0.006 + randRange(-0.01, 0.015), 0.04, 0.23),
  };
}
