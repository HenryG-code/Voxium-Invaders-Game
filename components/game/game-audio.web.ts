export type BrowserSound = HTMLAudioElement | HTMLAudioElement[];

const soundPoolIndexes = new WeakMap<HTMLAudioElement[], number>();

function chooseSound(sound: BrowserSound) {
  if (!Array.isArray(sound)) {
    return sound;
  }

  const idleSound = sound.find((candidate) => candidate.paused || candidate.ended);
  if (idleSound) {
    return idleSound;
  }

  const nextIndex = soundPoolIndexes.get(sound) ?? 0;
  soundPoolIndexes.set(sound, (nextIndex + 1) % Math.max(1, sound.length));
  return sound[nextIndex % Math.max(1, sound.length)];
}

export async function playSoundSafely(
  sound: BrowserSound | null,
  isSfxEnabled: boolean,
  respectSfxSetting = true,
  restartFromBeginning = true,
) {
  if (!sound || (respectSfxSetting && !isSfxEnabled)) {
    return;
  }

  const playableSound = chooseSound(sound);
  if (!playableSound) {
    return;
  }

  if (!restartFromBeginning && !playableSound.paused) {
    return;
  }

  try {
    if (restartFromBeginning) {
      playableSound.currentTime = 0;
    }
    await playableSound.play();
  } catch {}
}

export async function resetSoundSafely(sound: BrowserSound | null) {
  if (!sound) {
    return;
  }

  const sounds = Array.isArray(sound) ? sound : [sound];
  for (const singleSound of sounds) {
    try {
      singleSound.pause();
      singleSound.currentTime = 0;
    } catch {}
  }
}
