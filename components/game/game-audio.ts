import type { AudioPlayer } from 'expo-audio';

const soundQueues = new WeakMap<AudioPlayer, Promise<void>>();

async function runSerialized(
  player: AudioPlayer,
  task: () => Promise<void>,
) {
  const previous = soundQueues.get(player) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  soundQueues.set(player, next.catch(() => {}));
  return next;
}

export async function playSoundSafely(
  player: AudioPlayer,
  isSfxEnabled: boolean,
  respectSfxSetting = true,
  restartFromBeginning = true,
) {
  if (respectSfxSetting && !isSfxEnabled) {
    return;
  }

  await runSerialized(player, async () => {
    try {
      if (restartFromBeginning) {
        await player.seekTo(0);
      } else if (player.playing) {
        return;
      }
    } catch {
      try {
        if (restartFromBeginning) {
          await player.seekTo(0);
        } else if (player.playing) {
          return;
        }
      } catch {}
    }

    try {
      player.play();
    } catch {}
  });
}

export async function resetSoundSafely(player: AudioPlayer) {
  await runSerialized(player, async () => {
    try {
      player.pause();
      await player.seekTo(0);
    } catch {
      try {
        player.pause();
        await player.seekTo(0);
      } catch {}
    }
  });
}
