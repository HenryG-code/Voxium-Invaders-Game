import { Asset } from 'expo-asset';
import { useEffect, useMemo, useState } from 'react';

import type { GameState } from '@/components/game/game-logic';
import {
  playSoundSafely,
  resetSoundSafely,
  type BrowserSound,
} from '@/components/game/game-audio.web';

type UseGameAudioArgs = {
  gameState: GameState;
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  stage: number;
};

function useBrowserSound(
  source: number,
  volume: number,
  isLooping = false,
  poolSize = 1,
) {
  const [sound, setSound] = useState<BrowserSound | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const uri = Asset.fromModule(source).uri;
    const sounds = Array.from({ length: poolSize }, () => {
      const audio = new window.Audio(uri);
      audio.preload = 'auto';
      audio.volume = volume;
      audio.loop = isLooping;
      audio.load();
      return audio;
    });

    setSound(poolSize === 1 ? sounds[0] : sounds);

    return () => {
      for (const audio of sounds) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [isLooping, poolSize, source, volume]);

  return sound;
}

export function useGameAudio({
  gameState,
  isMusicEnabled,
  isSfxEnabled,
  stage,
}: UseGameAudioArgs) {
  const firePlayer = useBrowserSound(require('../assets/sounds/Blaster1.wav'), 0.55, false, 4);
  const blasterTwoPlayer = useBrowserSound(require('../assets/sounds/Blaster2.wav'), 0.46, false, 3);
  const blasterThreePlayer = useBrowserSound(require('../assets/sounds/Blaster3.wav'), 0.44, false, 3);
  const pulsePlayer = useBrowserSound(require('../assets/sounds/Pulseattack.wav'), 0.45, false, 2);
  const boostPlayer = useBrowserSound(require('../assets/sounds/Boost.wav'), 0.4);
  const movePlayer = useBrowserSound(require('../assets/sounds/Move.wav'), 0.28);
  const destroyPlayer = useBrowserSound(require('../assets/sounds/Destroy1.wav'), 0.38, false, 4);
  const blipPlayer = useBrowserSound(require('../assets/sounds/Blip.wav'), 0.5, false, 2);
  const incomingPlayer = useBrowserSound(require('../assets/sounds/Inctrans.wav'), 0.42, false, 2);
  const alienBlasterPlayer = useBrowserSound(require('../assets/sounds/Alienblaster1.wav'), 0.48, false, 3);
  const bossPlayer = useBrowserSound(require('../assets/sounds/Boss1.wav'), 0.5, false, 2);
  const bossDestroyedPlayer = useBrowserSound(require('../assets/sounds/Bossdestroyed.wav'), 0.58, false, 2);
  const playerDeathPlayer = useBrowserSound(require('../assets/sounds/Playerdeath.mp3'), 0.52, false, 2);
  const wavePlayer = useBrowserSound(require('../assets/sounds/Waveattack.wav'), 0.24, false, 2);
  const menuMusicPlayer = useBrowserSound(require('../assets/sounds/Mainmenusong.mp3'), 0.32, true);
  const stageOneMusicPlayer = useBrowserSound(require('../assets/sounds/Stage1song.mp3'), 0.22, true);
  const stageTwoMusicPlayer = useBrowserSound(require('../assets/sounds/Stage2song.mp3'), 0.24, true);
  const victoryPlayer = useBrowserSound(require('../assets/sounds/Victory.mp3'), 0.44, false, 2);

  useEffect(() => {
    void (async () => {
      const desiredTrack =
        isMusicEnabled && gameState === 'menu'
          ? menuMusicPlayer
          : isMusicEnabled && gameState === 'playing' && stage >= 2
            ? stageTwoMusicPlayer
            : isMusicEnabled && gameState === 'playing'
              ? stageOneMusicPlayer
              : null;

      const musicTracks = [
        menuMusicPlayer,
        stageOneMusicPlayer,
        stageTwoMusicPlayer,
      ];

      await Promise.all(
        musicTracks
          .filter((track) => track && track !== desiredTrack)
          .map((track) => resetSoundSafely(track)),
      );

      if (desiredTrack) {
        await playSoundSafely(desiredTrack, true, false, false);
      }
    })();
  }, [
    gameState,
    isMusicEnabled,
    menuMusicPlayer,
    stage,
    stageOneMusicPlayer,
    stageTwoMusicPlayer,
  ]);

  useEffect(() => {
    if (!isSfxEnabled) {
      void resetSoundSafely(boostPlayer);
      void resetSoundSafely(movePlayer);
      void resetSoundSafely(firePlayer);
      void resetSoundSafely(blasterTwoPlayer);
      void resetSoundSafely(blasterThreePlayer);
      void resetSoundSafely(pulsePlayer);
      void resetSoundSafely(destroyPlayer);
      void resetSoundSafely(blipPlayer);
      void resetSoundSafely(incomingPlayer);
      void resetSoundSafely(alienBlasterPlayer);
      void resetSoundSafely(bossPlayer);
      void resetSoundSafely(bossDestroyedPlayer);
      void resetSoundSafely(playerDeathPlayer);
      void resetSoundSafely(wavePlayer);
      void resetSoundSafely(victoryPlayer);
    }
  }, [
    alienBlasterPlayer,
    blasterThreePlayer,
    blasterTwoPlayer,
    bossPlayer,
    bossDestroyedPlayer,
    boostPlayer,
    blipPlayer,
    destroyPlayer,
    firePlayer,
    isSfxEnabled,
    incomingPlayer,
    movePlayer,
    playerDeathPlayer,
    pulsePlayer,
    victoryPlayer,
    wavePlayer,
  ]);

  return useMemo(
    () => ({
      alienBlasterPlayer,
      blasterThreePlayer,
      blasterTwoPlayer,
      bossPlayer,
      bossDestroyedPlayer,
      boostPlayer,
      blipPlayer,
      destroyPlayer,
      firePlayer,
      incomingPlayer,
      menuMusicPlayer,
      movePlayer,
      playerDeathPlayer,
      pulsePlayer,
      victoryPlayer,
      stageOneMusicPlayer,
      stageTwoMusicPlayer,
      wavePlayer,
    }),
    [
      alienBlasterPlayer,
      blasterThreePlayer,
      blasterTwoPlayer,
      bossPlayer,
      bossDestroyedPlayer,
      boostPlayer,
      blipPlayer,
      destroyPlayer,
      firePlayer,
      incomingPlayer,
      menuMusicPlayer,
      movePlayer,
      playerDeathPlayer,
      pulsePlayer,
      victoryPlayer,
      stageOneMusicPlayer,
      stageTwoMusicPlayer,
      wavePlayer,
    ],
  );
}
