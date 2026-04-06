export function createSound(path, volume = 0.45) {
  const audio = new Audio(path);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

export function preloadSoundPools(soundPools) {
  for (const pool of Object.values(soundPools || {})) {
    for (const audio of pool) {
      audio.load();
    }
  }
}

export async function warmSoundPools(world) {
  if (!world.audioEnabled || world.audioWarmed) {
    return;
  }

  world.audioWarmed = true;
  const warmups = [];

  for (const pool of Object.values(world.soundPools || {})) {
    const audio = pool?.[0];
    if (!audio) {
      continue;
    }

    const previousMuted = audio.muted;
    const previousVolume = audio.volume;
    audio.muted = true;
    audio.volume = 0;
    audio.currentTime = 0;

    const warmed = audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = previousMuted;
        audio.volume = previousVolume;
      })
      .catch(() => {
        audio.muted = previousMuted;
        audio.volume = previousVolume;
      });

    warmups.push(warmed);
  }

  await Promise.allSettled(warmups);
}

export function playSound(world, path, options = {}) {
  if (!world.audioEnabled) {
    return;
  }

  const volume = options.volume ?? 0.45;
  const pool = world.soundPools?.[path];
  if (!pool || pool.length === 0) {
    return;
  }

  const audio = pool.find((candidate) => candidate.paused || candidate.ended) || pool[0];
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
}

export function playRandomSound(world, paths, options = {}) {
  if (!paths || paths.length === 0) {
    return;
  }

  const selected = paths[Math.floor(Math.random() * paths.length)];
  playSound(world, selected, options);
}
