import { Audio } from 'expo-av';

export type GameSound = Audio.Sound | Audio.Sound[];

const soundQueues = new WeakMap<Audio.Sound, Promise<void>>();
const soundPoolIndexes = new WeakMap<Audio.Sound[], number>();

async function runSerialized(sound: Audio.Sound, task: () => Promise<void>) {
  const previous = soundQueues.get(sound) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  soundQueues.set(sound, next.catch(() => {}));
  return next;
}

async function chooseSound(sound: GameSound) {
  if (!Array.isArray(sound)) {
    return sound;
  }

  for (const candidate of sound) {
    try {
      const status = await candidate.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        return candidate;
      }
    } catch {}
  }

  const nextIndex = soundPoolIndexes.get(sound) ?? 0;
  soundPoolIndexes.set(sound, (nextIndex + 1) % Math.max(1, sound.length));
  return sound[nextIndex % Math.max(1, sound.length)];
}

export async function playSoundSafely(
  sound: GameSound | null,
  isSfxEnabled: boolean,
  respectSfxSetting = true,
  restartFromBeginning = true,
) {
  if (!sound) {
    return;
  }

  if (respectSfxSetting && !isSfxEnabled) {
    return;
  }

  const playableSound = await chooseSound(sound);
  if (!playableSound) {
    return;
  }

  await runSerialized(playableSound, async () => {
    try {
      const status = await playableSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying && !restartFromBeginning) {
        return;
      }
    } catch {}

    try {
      if (restartFromBeginning) {
        await playableSound.setPositionAsync(0);
        await playableSound.playAsync();
      } else {
        const status = await playableSound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await playableSound.playAsync();
        }
      }
    } catch {}
  });
}

export async function resetSoundSafely(sound: GameSound | null) {
  if (!sound) {
    return;
  }

  const sounds = Array.isArray(sound) ? sound : [sound];

  await Promise.all(sounds.map((singleSound) => runSerialized(singleSound, async () => {
    try {
      const status = await singleSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await singleSound.stopAsync();
      }
      await singleSound.setPositionAsync(0);
    } catch {
      try {
        await singleSound.pauseAsync();
        await singleSound.setPositionAsync(0);
      } catch {}
    }
  })));
}
