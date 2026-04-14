export const SHIP_FILES = [
  {
    id: "ship-0-millennium-falcon",
    label: "Millennium Falcon",
    scaleLevel: 1,
    displayScale: 0.5,
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
    hitCircles: [
      { x: 34, y: 15, radius: 18 },
      { x: 71, y: 15, radius: 18 },
      { x: 108, y: 15, radius: 18 },
      { x: 145, y: 15, radius: 17 },
      { x: 184, y: 25, radius: 8 },
      { x: 202, y: 25, radius: 8 },
    ],
    hardpoints: [
      { type: "light", x: 100.5, y: 10.5 },
      { type: "light", x: 100.5, y: 54.5 },
    ],
  },
  {
    id: "ship-1-rocinante",
    label: "Rocinante",
    scaleLevel: 1,
    displayScale: 0.7,
    stats: {
      maxHitPoints: 100,
      thrust: 418,
      drag: 0.922,
      repairRate: 1.4,
    },
    defaultLightWeaponId: "pd",
    path: "assets/images/ship-1-rocinante.svg",
    width: 384,
    height: 134,
    hitCircles: [
      { x: 17, y: 36, radius: 28 },
      { x: 75, y: 30, radius: 34 },
      { x: 146, y: 13, radius: 50 },
      { x: 249, y: 30, radius: 34 },
      { x: 318, y: 49, radius: 14 },
    ],
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
    displayScale: 0.8,
    stats: {
      maxHitPoints: 120,
      thrust: 376,
      drag: 0.904,
      repairRate: 1.8,
    },
    defaultLightWeaponId: "quadlaser",
    path: "assets/images/ship-2-gallimaufry.svg",
    width: 422,
    height: 112,
    hitCircles: [
      { x: 52, y: 9, radius: 26 },
      { x: 105, y: 9, radius: 34 },
      { x: 178, y: 9, radius: 34 },
      { x: 248, y: 9, radius: 34 },
      { x: 318, y: 9, radius: 34 },
      { x: 132, y: 56, radius: 18 },
    ],
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
    hitCircles: [
      { x: 52, y: 108, radius: 27 },
      { x: 106, y: 94, radius: 36 },
      { x: 179, y: 52, radius: 59 },
      { x: 298, y: 89, radius: 41 },
      { x: 386, y: 105, radius: 30 },
      { x: 452, y: 100, radius: 33 },
      { x: 519, y: 95, radius: 35 },
      { x: 233, y: 17, radius: 17 },
      { x: 238, y: 170, radius: 14 },
    ],
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
    id: "ship-4-sulaco",
    label: "Sulaco",
    scaleLevel: 4,
    displayScale: 1,
    stats: {
      maxHitPoints: 330,
      thrust: 286,
      drag: 0.876,
      repairRate: 1.8,
    },
    defaultLightWeaponId: "missile",
    path: "assets/images/ship-4-Sulaco.svg",
    width: 668,
    height: 193,
    hitCircles: [
      { x: 30, y: 68, radius: 26 },
      { x: 86, y: 68, radius: 31 },
      { x: 154, y: 68, radius: 35 },
      { x: 232, y: 68, radius: 37 },
      { x: 318, y: 67, radius: 39 },
      { x: 408, y: 68, radius: 38 },
      { x: 498, y: 68, radius: 36 },
      { x: 585, y: 76, radius: 32 },
      { x: 180, y: 102, radius: 20 },
      { x: 254, y: 104, radius: 17 },
    ],
    hardpoints: [
      { type: "light", x: 332, y: 39 },
      { type: "light", x: 300, y: 118 },
      { type: "light", x: 222, y: 118 },
      { type: "light", x: 239, y: 118 },
      { type: "light", x: 256, y: 118 },
      { type: "heavy", x: 367, y: 56 },
      { type: "heavy", x: 529, y: 98 },
      { type: "heavy", x: 289, y: 81 },
    ],
  },
  {
    id: "ship-5-enterprise-d",
    label: "Enterprise-D",
    scaleLevel: 5,
    displayScale: 1,
    stats: {
      maxHitPoints: 260,
      thrust: 236,
      drag: 0.862,
      repairRate: 3.6,
    },
    defaultLightWeaponId: "phaser",
    path: "assets/images/ship-5-enterprise-d.svg",
    width: 668,
    height: 161,
    hitCircles: [
      { x: 38, y: 70, radius: 24 },
      { x: 88, y: 71, radius: 30 },
      { x: 152, y: 70, radius: 34 },
      { x: 226, y: 69, radius: 38 },
      { x: 306, y: 67, radius: 41 },
      { x: 389, y: 65, radius: 40 },
      { x: 471, y: 63, radius: 37 },
      { x: 547, y: 62, radius: 33 },
      { x: 613, y: 64, radius: 24 },
      { x: 338, y: 29, radius: 22 },
      { x: 244, y: 100, radius: 18 },
    ],
    hardpoints: [
      { type: "light", x: 362, y: 31 },
      { type: "light", x: 259, y: 142 },
      { type: "light", x: 85, y: 128 },
      { type: "heavy", x: 322, y: 96 },
    ],
  },
  {
    id: "ship-6-galactica",
    label: "Galactica",
    scaleLevel: 6,
    displayScale: 1,
    stats: {
      maxHitPoints: 340,
      thrust: 220,
      drag: 0.856,
      repairRate: 3.1,
    },
    defaultLightWeaponId: "flakcannon",
    path: "assets/images/ship-6-galactica.svg",
    width: 749,
    height: 106,
    hitCircles: [
      { x: 62, y: 9, radius: 36 },
      { x: 134, y: 9, radius: 36 },
      { x: 213, y: 15, radius: 38 },
      { x: 291, y: 6, radius: 43 },
      { x: 378, y: 12, radius: 37 },
      { x: 456, y: 9, radius: 43 },
      { x: 546, y: 13, radius: 40 },
      { x: 634, y: 27, radius: 26 },
    ],
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
    id: "ship-7-stardestroyer",
    label: "Star Destroyer",
    scaleLevel: 7,
    displayScale: 1,
    stats: {
      maxHitPoints: 370,
      thrust: 190,
      drag: 0.848,
      repairRate: 3.35,
    },
    defaultLightWeaponId: "heavyturbolaser",
    path: "assets/images/ship-7-StarDestroyer.svg",
    width: 836,
    height: 306,
    hitCircles: [
      { x: 34, y: 70, radius: 94 },
      { x: 201, y: 96, radius: 78 },
      { x: 355, y: 132, radius: 52 },
      { x: 470, y: 161, radius: 31 },
      { x: 541, y: 159, radius: 33 },
      { x: 610, y: 168, radius: 25 },
      { x: 674, y: 167, radius: 25 },
      { x: 733, y: 176, radius: 17 },
      { x: 791, y: 179, radius: 13 },
      { x: 117, y: 11, radius: 31 },
    ],
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
    path: "assets/images/enemy/enemy-boss-Karnyx.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 5,
    hitCircles: [
      { x: 37, y: 13, radius: 140 },
      { x: 47, y: 140, radius: 140 },
    ],
  },
  {
    id: "boss-myxolith",
    label: "Myxolith",
    path: "assets/images/enemy/enemy-boss-Myxolith.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 5,
    hitCircles: [
      { x: 161, y: 23, radius: 93 },
      { x: 161, y: 205, radius: 93 },
      { x: 146, y: 369, radius: 104 },
    ],
  },
  {
    id: "boss-oculyte",
    label: "Oculyte",
    path: "assets/images/enemy/enemy-boss-Oculyte.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 3,
    hitCircles: [
      { x: 92, y: 210, radius: 38 },
      { x: 162, y: 176, radius: 40 },
      { x: 228, y: 182, radius: 41 },
      { x: 308, y: 206, radius: 37 },
    ],
  },
  {
    id: "boss-umbryx",
    label: "Umbryx",
    path: "assets/images/enemy/enemy-boss-Umbryx.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 5,
    hitCircles: [
      { x: 82, y: 232, radius: 36 },
      { x: 148, y: 188, radius: 40 },
      { x: 218, y: 182, radius: 42 },
      { x: 286, y: 196, radius: 39 },
      { x: 350, y: 230, radius: 34 },
    ],
  },
  {
    id: "boss-virexon",
    label: "Virexon",
    path: "assets/images/enemy/enemy-boss-Virexon.svg",
    defaultLightWeaponId: "snubcannon",
    sporeSpawnCount: 4,
    hitCircles: [
      { x: 90, y: 228, radius: 35 },
      { x: 156, y: 196, radius: 39 },
      { x: 228, y: 188, radius: 42 },
      { x: 300, y: 206, radius: 38 },
      { x: 362, y: 236, radius: 33 },
    ],
  },
];

export const ENEMY_FILES = [
  {
    id: "enemy-orb-light",
    label: "Light Orb",
    path: "assets/images/enemy/enemy-orb.svg",
    width: 101,
    height: 94,
    defaultEnemyShotId: "enemy-shot-1",
    spawnWeight: 3,
    hardpoints: [
      { type: "light", x: 18, y: 19 },
    ],
  },
  {
    id: "enemy-orb-heavy",
    label: "Heavy Orb",
    path: "assets/images/enemy/enemy-orb.svg",
    width: 101,
    height: 94,
    defaultEnemyShotId: "enemy-shot-2",
    spawnWeight: 2,
    hardpoints: [
      { type: "light", x: 18, y: 19 },
    ],
  },
  {
    id: "enemy-dart",
    label: "Enemy Dart",
    path: "assets/images/enemy/enemy-dart.svg",
    width: 133,
    height: 79,
    defaultEnemyShotId: "enemy-shot-3",
    spawnWeight: 1,
    hardpoints: [
      { type: "light", x: 77, y: 50 },
    ],
  },
];

export const MINE_FILE = "assets/images/enemy/mine.svg";
export const CREW_FILE = "assets/images/crew.svg";
export const SPORE_FILE = "assets/images/enemy/spore.svg";
export const PART_FILES = Array.from({ length: 10 }, (_, index) => `assets/images/part-${index + 1}.svg`);
export const ENEMY_SHOT_FILES = {
  "enemy-shot-1": "assets/images/enemy/enemy-shot-1.svg",
  "enemy-shot-2": "assets/images/enemy/enemy-shot-2.svg",
  "enemy-shot-3": "assets/images/enemy/enemy-shot-3.svg",
};
export const ENEMY_PART_FILES = Array.from({ length: 40 }, (_, index) => `assets/images/enemy/enemy-part-${index + 1}.svg`);

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

const LIMITED_TRACKING_PROFILE = {
  homingDelay: 0.2,
  homingTurnRate: 1.15,
  homingRange: 520,
  homingPathRadius: 160,
  homingForwardOnly: true,
  homingAcquireAngle: 0.5,
};

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
    projectileLife: 0.6,
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
    projectileLife: 1.20,
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
    ...LIMITED_TRACKING_PROFILE,
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
    ...LIMITED_TRACKING_PROFILE,
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
  phaser: {
    id: "phaser",
    label: "Phaser",
    path: "assets/images/weapon-small-phaser.svg",
    soundPath: "assets/sounds/weapon-small-phaser.wav",
    mountType: "light",
    damage: 0,
    turretSize: 30,
    cooldown: 2500,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "beam",
    beamDuration: 2.5,
    beamWidth: 3,
    beamColor: "rgba(255, 255, 255, 0.95)",
    beamDamagePerSecond: 34,
    sustainDurationMs: 2500,
    sustainCooldownMs: 3000,
    bankDamageBonusPerExtra: 0.75,
  },
  warden: {
    id: "warden",
    label: "Warden",
    path: "assets/images/weapon-small-warden.svg",
    soundPath: "assets/sounds/weapon-small-warden.wav",
    mountType: "light",
    damage: 0,
    turretSize: 30,
    cooldown: 4600,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "warden-drone",
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
    beamDamagePerSecond: 50,
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
    beamDuration: 1.0,
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
    damage: 50,
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
    ...LIMITED_TRACKING_PROFILE,
  },
  "large-phototorpedo": {
    id: "large-phototorpedo",
    label: "Photo Torpedo",
    path: "assets/images/weapon-large-photontorpedo.svg",
    soundPath: "assets/sounds/weapon-large-photontorpedo.wav",
    mountType: "heavy",
    damage: 340,
    projectileSpeed: 220,
    projectileLife: 4.2,
    projectileRadius: 8,
    projectileColor: "#f4f4f4",
    turretSize: 35,
    cooldown: 4600,
    burstCount: 1,
    burstSpacing: 0,
    burstPause: 0,
    aimMode: "mouse",
    fireMode: "projectile",
    explosiveRadius: 92,
    projectileSpriteId: "photontorpedo",
    projectileSpritePath: "assets/images/photontorpedo.svg",
    projectileSize: 42,
    ...LIMITED_TRACKING_PROFILE,
  },
};

export const ENEMY_WEAPON_DEFS = {
  "enemy-shot-1": {
    id: "enemy-shot-1",
    label: "Enemy Shot 1",
    projectileSpeed: 330,
    projectileLife: 3.4,
    projectileRadius: 4.2,
    projectileColor: "#b11616",
    projectileSize: 18,
    projectileSpin: 7.2,
    damage: 8,
    cooldown: 950,
  },
  "enemy-shot-2": {
    id: "enemy-shot-2",
    label: "Enemy Shot 2",
    projectileSpeed: 380,
    projectileLife: 3.3,
    projectileRadius: 4.8,
    projectileColor: "#d63d23",
    projectileSize: 21,
    projectileSpin: -6.4,
    damage: 12,
    cooldown: 1200,
  },
  "enemy-shot-3": {
    id: "enemy-shot-3",
    label: "Enemy Shot 3",
    projectileSpeed: 430,
    projectileLife: 3.1,
    projectileRadius: 5.2,
    projectileColor: "#f4ddd1",
    projectileSize: 23,
    projectileSpin: 8.6,
    damage: 16,
    cooldown: 760,
  },
};

export const MINE_HIT_POINTS = 20;
export const MINE_COLLISION_DAMAGE = 50;
export const SPORE_HIT_POINTS = 40;
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

export function getEnemyWeaponDef(weaponId) {
  if (!weaponId) {
    return null;
  }

  return ENEMY_WEAPON_DEFS[weaponId] || null;
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
