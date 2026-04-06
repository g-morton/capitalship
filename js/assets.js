import {
  BOSS_FILES,
  ENEMY_FILES,
  ENEMY_EXPLODE_SOUNDS,
  getDefaultWeaponIdForHardpoint,
  getShipMaxHitPoints,
  getShipRepairRate,
  getShipThrust,
  HIT_BIG_SOUNDS,
  HIT_SMALL_SOUNDS,
  MINE_FILE,
  PART_FILES,
  SHIP_FILES,
  SPORE_FILE,
  WEAPON_DEFS,
} from "./data.js";
import { createSound, preloadSoundPools } from "./audio.js";

function parseTranslate(transformText) {
  if (!transformText) {
    return { x: 0, y: 0 };
  }

  const match = transformText.match(/translate\(([-\d.]+)(?:[ ,]+([-\d.]+))?\)/);
  if (!match) {
    return { x: 0, y: 0 };
  }

  return {
    x: Number(match[1] || 0),
    y: Number(match[2] || 0),
  };
}

function isWhiteFill(fill) {
  return ["#fff", "#ffffff", "white"].includes((fill || "").toLowerCase());
}

function collectHardpoints(node, inheritedOffset, hardpoints, inheritedFill = "") {
  const ownOffset = parseTranslate(node.getAttribute?.("transform"));
  const offset = {
    x: inheritedOffset.x + ownOffset.x,
    y: inheritedOffset.y + ownOffset.y,
  };
  const effectiveFill = node.getAttribute?.("fill") || inheritedFill;

  const tagName = node.tagName?.toLowerCase();

  if ((tagName === "circle" || tagName === "ellipse") && isWhiteFill(effectiveFill)) {
    const radiusX = Number(node.getAttribute("r") || node.getAttribute("rx") || 0);
    const radiusY = Number(node.getAttribute("r") || node.getAttribute("ry") || 0);
    hardpoints.push({
      type: "light",
      x: offset.x + Number(node.getAttribute("cx") || 0),
      y: offset.y + Number(node.getAttribute("cy") || 0),
      radiusX,
      radiusY,
    });
  }

  if (tagName === "rect" && isWhiteFill(effectiveFill)) {
    const width = Number(node.getAttribute("width") || 0);
    const height = Number(node.getAttribute("height") || 0);

    if (width <= 32 && height <= 32) {
      hardpoints.push({
        type: "heavy",
        x: offset.x + width * 0.5,
        y: offset.y + height * 0.5,
      });
    }
  }

  for (const child of Array.from(node.children || [])) {
    collectHardpoints(child, offset, hardpoints, effectiveFill);
  }
}

function buildSvgRecord(definition, svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;
  const viewBox = (svg.getAttribute("viewBox") || "0 0 100 100").split(/\s+/).map(Number);
  const [, , width, height] = viewBox;

  const hardpoints = [];
  collectHardpoints(svg, { x: 0, y: 0 }, hardpoints);

  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const imageUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.src = imageUrl;

  return new Promise((resolve, reject) => {
    image.onload = () => resolve({
      ...definition,
      image,
      imageUrl,
      width,
      height,
      hardpoints,
      lightHardpoints: hardpoints.filter((point) => point.type === "light"),
      heavyHardpoints: hardpoints.filter((point) => point.type === "heavy"),
    });
    image.onerror = reject;
  });
}

async function buildSvgFromFallback(definition) {
  const image = await loadImageAsset(definition.path);
  const hardpoints = definition.hardpoints || [];
  return {
    ...definition,
    image,
    width: definition.width || image.naturalWidth || 100,
    height: definition.height || image.naturalHeight || 100,
    hardpoints,
    lightHardpoints: hardpoints.filter((point) => point.type === "light"),
    heavyHardpoints: hardpoints.filter((point) => point.type === "heavy"),
  };
}

export function createWeaponMounts(ship) {
  ship.lastReplacementByType = {};
  return ship.hardpoints.map((hardpoint) => ({
    hardpoint,
    weaponId: getDefaultWeaponIdForHardpoint(ship, hardpoint.type),
    cooldownUntil: 0,
    burstShotsRemaining: 0,
    burstCooldownUntil: 0,
    angle: 0,
  }));
}

export function buildShipPicker({ container, ships, activeShipIndex, onSelect }) {
  container.innerHTML = "";
  const sortedShips = [...ships]
    .map((ship, index) => ({ ship, index }))
    .sort((left, right) => left.ship.scaleLevel - right.ship.scaleLevel);
  const maxPreviewWidth = Math.max(...ships.map((ship) => ship.width));

  sortedShips.forEach(({ ship, index }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ship-card${index === activeShipIndex ? " is-active" : ""}`;
    const previewScale = Math.max(0.3, ship.width / maxPreviewWidth);
    const hull = getShipMaxHitPoints(ship);
    const thrust = Math.round(getShipThrust(ship));
    const repair = getShipRepairRate(ship).toFixed(1);
    button.innerHTML = `
      <span class="ship-card__art">
        <img src="${ship.path}" alt="${ship.label}" style="width:${(previewScale * 100).toFixed(1)}%">
      </span>
      <span class="ship-card__title">${ship.label}</span>
      <span class="ship-card__stats">Hull ${hull} / Thrust ${thrust} / Repair ${repair}</span>
      <span class="ship-card__stats">${ship.lightHardpoints.length} light / ${ship.heavyHardpoints.length} heavy hardpoints</span>
    `;

    button.addEventListener("click", () => {
      onSelect(index, button);
      for (const card of container.querySelectorAll(".ship-card")) {
        card.classList.remove("is-active");
      }
      button.classList.add("is-active");
    });

    container.appendChild(button);
  });
}

export function loadImageAsset(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = path;
  });
}

export async function loadShips() {
  return loadSvgRecords(SHIP_FILES);
}

export async function loadBosses() {
  return loadSvgRecords(BOSS_FILES);
}

export async function loadEnemyShips() {
  return loadSvgRecords(ENEMY_FILES);
}

async function loadSvgRecords(definitions) {
  const shipRecords = await Promise.all(
    definitions.map(async (definition) => {
      try {
        const response = await fetch(definition.path);
        if (!response.ok) {
          throw new Error(`Failed to load ${definition.path}`);
        }

        const svgText = await response.text();
        return buildSvgRecord(definition, svgText);
      } catch (error) {
        console.warn(`Using fallback svg metadata for ${definition.id}`, error);
        return buildSvgFromFallback(definition);
      }
    }),
  );

  return shipRecords;
}

export async function loadGameAssets() {
  const [ships, bosses, enemyShips, mineImage, sporeImage, enemySpawnerImage, partImages, weaponImages] = await Promise.all([
    loadShips(),
    loadBosses(),
    loadEnemyShips(),
    loadImageAsset(MINE_FILE),
    loadImageAsset(SPORE_FILE),
    loadImageAsset("assets/images/weapon-enemy-spawner.svg"),
    Promise.all(PART_FILES.map((path) => loadImageAsset(path))),
    Promise.all(
      Object.values(WEAPON_DEFS).map(async (weapon) => [weapon.id, await loadImageAsset(weapon.path)]),
    ).then((entries) => Object.fromEntries(entries)),
  ]);

  const soundPaths = [
    ...new Set([
      ...Object.values(WEAPON_DEFS).map((weapon) => weapon.soundPath).filter(Boolean),
      ...HIT_SMALL_SOUNDS,
      ...HIT_BIG_SOUNDS,
      ...ENEMY_EXPLODE_SOUNDS,
    ]),
  ];

  const soundPools = {};
  for (const soundPath of soundPaths) {
    soundPools[soundPath] = [
      createSound(soundPath, 0.45),
      createSound(soundPath, 0.45),
      createSound(soundPath, 0.45),
    ];
  }

  preloadSoundPools(soundPools);

  return {
    ships,
    bosses,
    enemyShips,
    mineImage,
    sporeImage,
    enemySpawnerImage,
    partImages,
    weaponImages,
    soundPools,
  };
}
