export const SHIP_FILES = [
  {
    id: "ship-0-millennium-falcon",
    label: "Millennium Falcon",
    scaleLevel: 1,
    displayScale: 0.7,
    stats: {
      maxHitPoints: 110,
      thrust: 660,
      drag: 0.93,
      repairRate: 1.5,
    },
    defaultLightWeaponId: "quadlaser",
    path: "assets/images/ship-0-Millennium-Falcon.svg",
    width: 241,
    height: 65,
    hardpoints: [
      { type: "light", x: 100.5, y: 10.5 },
      { type: "light", x: 100.5, y: 54.5 },
    ],
  },
  {
    id: "ship-1-rocinante",
    label: "Rocinante",
    scaleLevel: 1,
    displayScale: 1,
    stats: {
      maxHitPoints: 100,
      thrust: 418,
      drag: 0.922,
      repairRate: 1.4,
    },
    defaultLightWeaponId: "pd",
    path: "assets/images/ship-1-Rocinante.svg",
    width: 384,
    height: 134,
    hardpoints: [
      { type: "light", x: 199, y: 9 },
      { type: "light", x: 199, y: 117 },
      { type: "light", x: 289, y: 32 },
      { type: "light", x: 289, y: 95 },
      { type: "heavy", x: 320, y: 71 },
    ],
  },
  {
    id: "ship-2-gallimaufry",
    label: "Gallimaufry",
    scaleLevel: 2,
    displayScale: 1,
    stats: {
      maxHitPoints: 120,
      thrust: 376,
      drag: 0.904,
      repairRate: 1.8,
    },
    defaultLightWeaponId: "quadlaser",
    path: "assets/images/ship-2-Gallimaufry.svg",
    width: 422,
    height: 112,
    hardpoints: [
      { type: "light", x: 144, y: 18 },
      { type: "light", x: 160, y: 18 },
      { type: "light", x: 176, y: 18 },
      { type: "light", x: 191, y: 18 },
      { type: "heavy", x: 145, y: 78 },
    ],
  },
  {
    id: "ship-3-yamato",
    label: "Yamato",
    scaleLevel: 3,
    displayScale: 1,
    stats: {
      maxHitPoints: 250,
      thrust: 334,
      drag: 0.886,
      repairRate: 2.2,
    },
    defaultLightWeaponId: "snubcannon",
    path: "assets/images/ship-3-Yamato.svg",
    width: 625,
    height: 204,
    hardpoints: [
      { type: "light", x: 142, y: 96 },
      { type: "light", x: 179, y: 84 },
      { type: "light", x: 280, y: 82 },
      { type: "light", x: 317, y: 94 },
      { type: "light", x: 364, y: 100 },
      { type: "heavy", x: 574, y: 116 },
    ],
  },
  {
    id: "ship-4-galactica",
    label: "Galactica",
    scaleLevel: 4,
    displayScale: 1,
    stats: {
      maxHitPoints: 300,
      thrust: 250,
      drag: 0.868,
      repairRate: 2.7,
    },
    defaultLightWeaponId: "flakcannon",
    path: "assets/images/ship-4-Galactica.svg",
    width: 723,
    height: 106,
    hardpoints: [
      { type: "light", x: 206, y: 77 },
      { type: "light", x: 312, y: 15 },
      { type: "light", x: 332, y: 15 },
      { type: "light", x: 341, y: 84 },
      { type: "light", x: 360, y: 84 },
      { type: "light", x: 492, y: 84 },
      { type: "light", x: 512, y: 84 },
      { type: "light", x: 616, y: 78 },
      { type: "heavy", x: 669, y: 56 },
    ],
  },
  {
    id: "ship-5-stardestroyer",
    label: "Star Destroyer",
    scaleLevel: 5,
    displayScale: 1,
    stats: {
      maxHitPoints: 350,
      thrust: 200,
      drag: 0.85,
      repairRate: 3.2,
    },
    defaultLightWeaponId: "heavyturbolaser",
    path: "assets/images/ship-5-StarDestroyer.svg",
    width: 836,
    height: 306,
    hardpoints: [
      { type: "light", x: 95, y: 182 },
      { type: "light", x: 118, y: 182 },
      { type: "light", x: 140, y: 182 },
      { type: "light", x: 163, y: 182 },
      { type: "light", x: 185, y: 182 },
      { type: "light", x: 208, y: 182 },
      { type: "light", x: 690, y: 178 },
      { type: "light", x: 712, y: 180 },
      { type: "heavy", x: 361, y: 133 },
      { type: "heavy", x: 520, y: 221 },
    ],
  },
];

export const BOSS_FILES = [
  {
    id: "boss-karnyx",
    label: "Karnyx",
    path: "assets/images/enemy-boss-Karnyx.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 5,
  },
  {
    id: "boss-myxolith",
    label: "Myxolith",
    path: "assets/images/enemy-boss-Myxolith.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 5,
  },
  {
    id: "boss-oculyte",
    label: "Oculyte",
    path: "assets/images/enemy-boss-Oculyte.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 3,
  },
  {
    id: "boss-umbryx",
    label: "Umbryx",
    path: "assets/images/enemy-boss-Umbryx.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 5,
  },
  {
    id: "boss-virexon",
    label: "Virexon",
    path: "assets/images/enemy-boss-Virexon.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 4,
  },
];

export const ENEMY_FILES = [
  {
    id: "enemy-orb",
    label: "Enemy Orb",
    path: "assets/images/enemy-orb.svg",
    width: 101,
    height: 94,
    hardpoints: [
      { type: "light", x: 18, y: 19 },
    ],
  },
];

export const MINE_FILE = "assets/images/mine.svg";
export const CREW_FILE = "assets/images/crew.svg";
export const SPORE_FILE = "assets/images/spore.svg";
export const PART_FILES = Array.from({ length: 10 }, (_, index) => `assets/images/part-${index + 1}.svg`);

export const HIT_SMALL_SOUNDS = [
  "assets/sounds/hit-small-1.wav",
  "assets/sounds/hit-small-2.wav",
  "assets/sounds/hit-small-3.wav",
  "assets/sounds/hit-small-4.wav",
];

export const HIT_BIG_SOUNDS = [
  "assets/sounds/hit-big-1.wav",
  "assets/sounds/hit-big-2.wav",
  "assets/sounds/hit-big-3.wav",
  "assets/sounds/hit-big-4.wav",
];

export const ENEMY_EXPLODE_SOUNDS = [
  "assets/sounds/explode-1.wav",
  "assets/sounds/explode-2.wav",
  "assets/sounds/explode-3.wav",
  "assets/sounds/explode-4.wav",
  "assets/sounds/explode-5.wav",
  "assets/sounds/explode-6.wav",
  "assets/sounds/explode-7.wav",
  "assets/sounds/explode-8.wav",
  "assets/sounds/explode-9.wav",
  "assets/sounds/explode-10.wav",
  "assets/sounds/explode-11.wav",
];

export const WEAPON_DEFS = {
  pd: {
    id: "pd",
    label: "PD",
    path: "assets/images/weapon-small-pd.svg",
    soundPath: "assets/sounds/weapon-small-pd.wav",
    mountType: "light",
    damage: 3,
    projectileSpeed: 620,
    projectileLife: 0.90,
    projectileRadius: 1.2,
    projectileColor: "#050505",
    turretSize: 30,
    cooldown: 105,
    burstCount: 3,
    burstSpacing: 60,
    burstPause: 380,
    aimMode: "mouse",
    fireMode: "projectile",
  },
  snubcannon: {
    id: "snubcannon",
    label: "Snub Cannon",
    path: "assets/images/weapon-small-snubcannon.svg",
    soundPath: "assets/sounds/weapon-small-snubcannon.wav",
    mountType: "light",
    damage: 9,
    projectileSpeed: 400,
    projectileLife: 2.50,
    projectileRadius: 3,
    projectileColor: "#050505",
    turretSize: 30,
    cooldown: 520,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "projectile",
  },
  quadlaser: {
    id: "quadlaser",
    label: "Quad Laser",
    path: "assets/images/weapon-small-quadlaser.svg",
    soundPath: "assets/sounds/weapon-small-quadlaser.wav",
    mountType: "light",
    damage: 2.0,
    projectileSpeed: 980,
    projectileLife: 0.5,
    projectileRadius: 1,
    lineLength: 25,
    projectileColor: "#ffffff",
    turretSize: 30,
    cooldown: 95,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "line-projectile",
  },
  heavyturbolaser: {
    id: "heavyturbolaser",
    label: "Heavy Turbolaser",
    path: "assets/images/weapon-small-heavyturbolaser.svg",
    soundPath: "assets/sounds/weapon-small-heavyturbolaser.wav",
    mountType: "light",
    damage: 5,
    projectileSpeed: 660,
    projectileLife: 0.95,
    projectileRadius: 1.4,
    lineLength: 56,
    projectileColor: "#ffffff",
    turretSize: 35,
    cooldown: 860,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "line-projectile",
  },
  torpedo: {
    id: "torpedo",
    label: "Torpedo",
    path: "assets/images/weapon-small-torpedo.svg",
    soundPath: "assets/sounds/weapon-small-torpedo.wav",
    mountType: "light",
    damage: 11,
    projectileSpeed: 310,
    projectileLife: 2.2,
    projectileRadius: 3,
    projectileColor: "#111111",
    turretSize: 30,
    cooldown: 1200,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "lobbed-torpedo",
    rocketTrail: true,
    gravity: 240,
  },
  missile: {
    id: "missile",
    label: "Missile",
    path: "assets/images/weapon-small-missile.svg",
    soundPath: "assets/sounds/weapon-small-missile.wav",
    mountType: "light",
    damage: 15,
    projectileSpeed: 370,
    projectileLife: 1.9,
    projectileRadius: 3.0,
    projectileColor: "#111111",
    turretSize: 30,
    cooldown: 1200,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "projectile",
    rocketTrail: true,
  },
  flakcannon: {
    id: "flakcannon",
    label: "Flak Cannon",
    path: "assets/images/weapon-small-flakcannon.svg",
    soundPath: "assets/sounds/weapon-small-flakcannon.wav",
    mountType: "light",
    damage: 5,
    projectileSpeed: 300,
    projectileLife: 1.80,
    projectileRadius: 1.2,
    projectileColor: "#050505",
    turretSize: 30,
    cooldown: 660,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "spread-projectile",
    spreadCount: 3,
    spreadAngle: 0.16,
  },
  "large-cannon": {
    id: "large-cannon",
    label: "Large Cannon",
    path: "assets/images/weapon-large-cannon.svg",
    soundPath: "assets/sounds/weapon-large-cannon.wav",
    mountType: "heavy",
    damage: 50,
    projectileSpeed: 400,
    projectileLife: 1.9,
    projectileRadius: 4.0,
    projectileColor: "#050505",
    turretSize: 35,
    cooldown: 1180,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "projectile",
    explosiveRadius: 58,
  },
  "large-railgun": {
    id: "large-railgun",
    label: "Large Railgun",
    path: "assets/images/weapon-large-railgun.svg",
    soundPath: "assets/sounds/weapon-large-railgun.wav",
    mountType: "heavy",
    damage: 100,
    turretSize: 40,
    cooldown: 2500,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "forward",
    fireMode: "beam",
    beamDuration: 0.07,
    beamWidth: 5,
    beamColor: "rgba(0, 0, 0, 0.96)",
    beamDamagePerSecond: 0,
  },
  "large-beamer": {
    id: "large-beamer",
    label: "Large Beamer",
    path: "assets/images/weapon-large-beamer.svg",
    soundPath: "assets/sounds/weapon-large-beamer.wav",
    mountType: "heavy",
    damage: 0,
    turretSize: 35,
    cooldown: 1800,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "forward",
    fireMode: "beam",
    beamDuration: 0.95,
    beamWidth: 4,
    beamColor: "rgba(255, 255, 255, 0.9)",
    beamDamagePerSecond: 30,
  },
  "large-wavemotiongun": {
    id: "large-wavemotiongun",
    label: "Wave Motion Gun",
    path: "assets/images/weapon-large-wavemotiongun.svg",
    soundPath: "assets/sounds/weapon-large-wavemotiongun.wav",
    mountType: "heavy",
    damage: 150,
    turretSize: 40,
    cooldown: 5000,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "forward",
    fireMode: "beam",
    beamDuration: 0.80,
    beamWidth: 13,
    beamColor: "rgba(255, 255, 255, 0.97)",
    beamDamagePerSecond: 200,
  },
  "large-missilearray": {
    id: "large-missilearray",
    label: "Missile Array",
    path: "assets/images/weapon-large-missilearray.svg",
    soundPath: "assets/sounds/weapon-large-missilearray.wav",
    mountType: "heavy",
    damage: 40,
    projectileSpeed: 360,
    projectileLife: 3.4,
    projectileRadius: 3.0,
    projectileColor: "#111111",
    turretSize: 35,
    cooldown: 3500,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "up",
    fireMode: "spread-projectile",
    spreadCount: 3,
    spreadAngle: 0.18,
    rocketTrail: true,
    explosiveRadius: 42,
    homingDelay: 0.18,
    homingTurnRate: 4.4,
    homingRange: 800,
  },
};

export const MINE_HIT_POINTS = 50;
export const MINE_COLLISION_DAMAGE = 50;
export const SPORE_HIT_POINTS = 30;
export const SPORE_COLLISION_DAMAGE = 30;

const DEFAULT_SHIP_STATS = {
  maxHitPoints: 250,
  thrust: 334,
  drag: 0.886,
  repairRate: 2.2,
};

export function getShipStats(ship) {
  if (!ship) {
    return DEFAULT_SHIP_STATS;
  }

  return ship.stats || DEFAULT_SHIP_STATS;
}

export function getShipMaxHitPoints(ship) {
  return getShipStats(ship).maxHitPoints;
}

export function getShipThrust(ship) {
  return getShipStats(ship).thrust;
}

export function getShipDrag(ship) {
  return getShipStats(ship).drag;
}

export function getShipRepairRate(ship) {
  return getShipStats(ship).repairRate || 0;
}

export function getWeaponDef(weaponId) {
  if (!weaponId) {
    return null;
  }

  return WEAPON_DEFS[weaponId] || null;
}

export function getDroppableWeapons(ship = null) {
  const droppableWeapons = Object.values(WEAPON_DEFS).filter((weapon) => weapon.id !== "pd");
  if (!ship) {
    return droppableWeapons;
  }

  const supportedMountTypes = new Set((ship.hardpoints || []).map((hardpoint) => hardpoint.type));
  return droppableWeapons.filter((weapon) => supportedMountTypes.has(weapon.mountType));
}

export function getLightWeapons() {
  return Object.values(WEAPON_DEFS).filter((weapon) => weapon.mountType === "light");
}

export function getDefaultWeaponIdForHardpoint(ship, hardpointType) {
  if (hardpointType === "light") {
    return ship.defaultLightWeaponId || "pd";
  }

  return ship.defaultHeavyWeaponId || null;
}
