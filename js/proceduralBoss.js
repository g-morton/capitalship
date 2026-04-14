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

function pickEnemyWeaponId(weaponIds, stageIndex) {
  if (!weaponIds?.length) {
    return "enemy-shot-1";
  }

  const contains = (id) => weaponIds.includes(id);
  if (contains("enemy-shot-1") && contains("enemy-shot-2") && contains("enemy-shot-3")) {
    const stage = Math.max(0, stageIndex);
    const weight1 = clamp(1.4 - stage * 0.16, 0.25, 1.4);
    const weight2 = clamp(1.0 + stage * 0.08, 0.6, 1.9);
    const weight3 = clamp(0.6 + stage * 0.16, 0.6, 2.6);
    const total = weight1 + weight2 + weight3;
    const roll = Math.random() * total;
    if (roll < weight1) {
      return "enemy-shot-1";
    }
    if (roll < weight1 + weight2) {
      return "enemy-shot-2";
    }
    return "enemy-shot-3";
  }

  return pickRandom(weaponIds) || "enemy-shot-1";
}

export function generateBossName() {
  const seedNames = [
    "Gravernyx",
    "Velkrion",
    "Oculith",
    "Zeraphyx",
    "Threxion",
    "Umbryth",
    "Karnyxx",
    "Myxoryth",
    "Virelith",
    "Nyxara",
    "Xalvoryx",
    "Drexxith",
    "Vorunyx",
    "Kelthorix",
    "Zynthera",
    "Morvexis",
    "Quarnyx",
    "Lytheron",
    "Voxarith",
    "Kryndyx",
    "Ultherix",
    "Nexoryth",
    "Zalvexon",
    "Pyxolith",
    "Draxenya",
    "Velthoryx",
    "Omnirex",
    "Zyralith",
    "Kethryx",
    "Vornyx",
    "Mythera",
    "Xyrelion",
    "Drovarith",
    "Karnexa",
    "Ulmyx",
    "Zenthoryx",
    "Virexith",
    "Nythorix",
    "Quorynx",
    "Xalthera",
  ];
  const direct = pickRandom(seedNames) || "Zeraphyx";
  if (Math.random() < 0.52) {
    return direct;
  }

  const starts = ["Gra", "Vel", "Ocu", "Zer", "Thr", "Umb", "Kar", "Myx", "Vir", "Nyx", "Xal", "Dre", "Vor", "Kel", "Zyn", "Mor", "Qua", "Lyt", "Vox", "Kryn", "Uth", "Nex", "Zal", "Pyx", "Dra", "Omni", "Zyr", "Ket", "Xyr", "Dro", "Zen", "Ny", "Quo"];
  const mids = ["ver", "kri", "cu", "ra", "xe", "tho", "my", "lith", "vor", "ry", "dra", "nex", "xo", "thy", "vex", "ory", "ryn", "zal", "pha", "rel", "quar", "ul", "keth", "vyr"];
  const ends = ["nyx", "rion", "lith", "phyx", "xion", "ryth", "xith", "rix", "thera", "vex", "nyx", "lyx", "ron", "rex", "xon"];

  const built = `${pickRandom(starts)}${pickRandom(mids)}${pickRandom(ends)}`.replace(/(.)\1\1+/g, "$1$1");
  return built.charAt(0).toUpperCase() + built.slice(1);
}

export function buildProceduralBossRecord({ stageIndex = 0, enemyPartImages = [], enemyWeaponIds = [] } = {}) {
  if (!enemyPartImages.length) {
    return null;
  }

  const stage = Math.max(0, stageIndex);
  const partCount = Math.floor(clamp(randRange(4 + stage * 0.85, 8 + stage * 1.45), 4, 22));
  const width = Math.round(290 + partCount * 44 + randRange(0, 120));
  const height = Math.round(210 + partCount * 26 + randRange(0, 90));
  const minX = -width * 0.43;
  const maxX = width * 0.43;
  const minY = -height * 0.43;
  const maxY = height * 0.43;

  const parts = [];
  const anchors = [{ x: 0, y: 0 }];

  for (let i = 0; i < partCount; i += 1) {
    const anchor = pickRandom(anchors) || { x: 0, y: 0 };
    const angle = randRange(-Math.PI, Math.PI);
    const distance = i === 0 ? 0 : randRange(20, 90);
    const mirrored = Math.random() < 0.34;
    const baseX = clamp(anchor.x + Math.cos(angle) * distance, minX, maxX);
    const baseY = clamp(anchor.y + Math.sin(angle) * distance, minY, maxY);
    const imageIndex = Math.floor(Math.random() * enemyPartImages.length);
    const scale = randRange(0.42, 1.35) * (i < 2 ? 1.28 : 1);
    const rotation = randRange(-Math.PI, Math.PI);
    const wobble = randRange(0.01, 0.08);
    const pulseAmplitude = randRange(0, 7);
    const pulseSpeed = randRange(0.5, 1.7);

    parts.push({
      imageIndex,
      x: baseX,
      y: baseY,
      scale,
      rotation,
      layer: i,
      wobble,
      pulseAmplitude,
      pulseSpeed,
      phase: randRange(0, Math.PI * 2),
      alpha: randRange(0.86, 1),
    });
    anchors.push({ x: baseX, y: baseY });

    if (mirrored) {
      parts.push({
        imageIndex,
        x: clamp(-baseX + randRange(-14, 14), minX, maxX),
        y: clamp(baseY + randRange(-10, 10), minY, maxY),
        scale: scale * randRange(0.86, 1.08),
        rotation: -rotation + randRange(-0.3, 0.3),
        layer: i + 0.25,
        wobble,
        pulseAmplitude,
        pulseSpeed,
        phase: randRange(0, Math.PI * 2),
        alpha: randRange(0.86, 1),
      });
    }
  }

  parts.sort((a, b) => a.layer - b.layer);

  const hitCircles = parts.slice(0, Math.min(16, parts.length)).map((part) => {
    const partImage = enemyPartImages[part.imageIndex];
    const partRadius = clamp(Math.min(partImage.width, partImage.height) * 0.15 * part.scale, 18, 86);
    return {
      x: width * 0.5 + part.x - partRadius,
      y: height * 0.5 + part.y - partRadius,
      radius: partRadius,
    };
  });

  const emitterCount = Math.floor(clamp(randRange(2 + stage * 0.5, 4 + stage * 0.95), 2, 11));
  const emitterAnchors = [...parts]
    .sort((a, b) => Math.abs(b.x) - Math.abs(a.x))
    .slice(0, Math.max(emitterCount, 3));

  const emitterPoints = Array.from({ length: emitterCount }, (_, index) => {
    const anchor = emitterAnchors[index % emitterAnchors.length] || { x: 0, y: 0 };
    return {
      type: "light",
      x: clamp(width * 0.5 + anchor.x + randRange(-20, 20), 18, width - 18),
      y: clamp(height * 0.5 + anchor.y + randRange(-16, 16), 18, height - 18),
    };
  });

  const weaponMounts = emitterPoints.map((hardpoint) => ({
    hardpoint,
    weaponId: pickEnemyWeaponId(enemyWeaponIds, stage),
  }));

  const emitsSpores = Math.random() < clamp(0.42 + stage * 0.08, 0.42, 0.95);
  const sporeSpawnCount = emitsSpores
    ? Math.max(1, Math.floor(clamp(randRange(1 + stage * 0.4, 3 + stage * 0.8), 1, emitterCount)))
    : 0;
  const sporePoints = emitterPoints.slice(0, sporeSpawnCount);

  return {
    id: `proc-boss-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    label: generateBossName(),
    width,
    height,
    parts,
    emitterPoints,
    hitCircles,
    hardpoints: emitterPoints,
    weaponMounts,
    sporePoints,
    emitsSpores,
    sporeSpawnCount,
    sporeCooldown: Math.round(clamp(6100 - stage * 420 + randRange(-500, 700), 1800, 6800)),
    sporeClusterSize: Math.floor(clamp(randRange(1, 1.2 + stage * 0.24), 1, 4)),
    projectileDamageScale: clamp(0.6 + stage * 0.08 + randRange(-0.05, 0.12), 0.6, 2.2),
    projectileSpeedScale: clamp(0.85 + stage * 0.05 + randRange(-0.03, 0.09), 0.75, 1.8),
    projectileCooldownScale: clamp(1.95 - stage * 0.08 + randRange(-0.12, 0.08), 0.62, 2.15),
    maxHitPointsScale: clamp(1 + stage * 0.2 + randRange(0, 0.35), 1, 4.4),
    scoreValueScale: clamp(1 + stage * 0.26 + randRange(0, 0.35), 1, 5.8),
  };
}
