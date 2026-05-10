import { useEffect } from 'react';

import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { playSoundSafely, resetSoundSafely } from '@/components/game/game-audio';
import type { GameState } from '@/components/game/game-logic';

type UseGameAudioArgs = {
  gameState: GameState;
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  stage: number;
};

export function useGameAudio({
  gameState,
  isMusicEnabled,
  isSfxEnabled,
  stage,
}: UseGameAudioArgs) {
  const firePlayer = useAudioPlayer(require('../assets/sounds/Blaster1.wav'));
  const pulsePlayer = useAudioPlayer(require('../assets/sounds/Pulseattack.wav'));
  const boostPlayer = useAudioPlayer(require('../assets/sounds/Boost.wav'));
  const movePlayer = useAudioPlayer(require('../assets/sounds/Move.wav'));
  const destroyPlayer = useAudioPlayer(require('../assets/sounds/Destroy1.wav'));
  const bossPlayer = useAudioPlayer(require('../assets/sounds/Boss1.wav'));
  const bossDestroyedPlayer = useAudioPlayer(require('../assets/sounds/Bossdestroyed.wav'));
  const playerDeathPlayer = useAudioPlayer(require('../assets/sounds/Playerdeath.mp3'));
  const wavePlayer = useAudioPlayer(require('../assets/sounds/Waveattack.wav'));
  const menuMusicPlayer = useAudioPlayer(require('../assets/sounds/Mainmenusong.mp3'));
  const stageOneMusicPlayer = useAudioPlayer(require('../assets/sounds/Stage1song.mp3'));
  const stageTwoMusicPlayer = useAudioPlayer(require('../assets/sounds/Stage2song.mp3'));

  useEffect(() => {
    firePlayer.volume = 0.55;
    pulsePlayer.volume = 0.45;
    boostPlayer.volume = 0.4;
    movePlayer.volume = 0.28;
    destroyPlayer.volume = 0.38;
    bossPlayer.volume = 0.5;
    bossDestroyedPlayer.volume = 0.58;
    playerDeathPlayer.volume = 0.52;
    wavePlayer.volume = 0.24;
    menuMusicPlayer.volume = 0.22;
    stageOneMusicPlayer.volume = 0.12;
    stageTwoMusicPlayer.volume = 0.14;
    menuMusicPlayer.loop = true;
    stageOneMusicPlayer.loop = true;
    stageTwoMusicPlayer.loop = true;
  }, [
    bossPlayer,
    bossDestroyedPlayer,
    boostPlayer,
    destroyPlayer,
    firePlayer,
    menuMusicPlayer,
    movePlayer,
    playerDeathPlayer,
    pulsePlayer,
    stageOneMusicPlayer,
    stageTwoMusicPlayer,
    wavePlayer,
  ]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isMusicEnabled) {
      void resetSoundSafely(menuMusicPlayer);
      void resetSoundSafely(stageOneMusicPlayer);
      void resetSoundSafely(stageTwoMusicPlayer);
      return;
    }

    if (gameState === 'menu') {
      void resetSoundSafely(stageOneMusicPlayer);
      void resetSoundSafely(stageTwoMusicPlayer);
      void playSoundSafely(menuMusicPlayer, true, false, false);
      return;
    }

    void resetSoundSafely(menuMusicPlayer);
    if (gameState !== 'playing') {
      void resetSoundSafely(stageOneMusicPlayer);
      void resetSoundSafely(stageTwoMusicPlayer);
      return;
    }

    if (stage >= 2) {
      void resetSoundSafely(stageOneMusicPlayer);
      void playSoundSafely(stageTwoMusicPlayer, true, false, false);
      return;
    }

    void resetSoundSafely(stageTwoMusicPlayer);
    void playSoundSafely(stageOneMusicPlayer, true, false, false);
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
      void resetSoundSafely(pulsePlayer);
      void resetSoundSafely(destroyPlayer);
      void resetSoundSafely(bossPlayer);
      void resetSoundSafely(bossDestroyedPlayer);
      void resetSoundSafely(playerDeathPlayer);
      void resetSoundSafely(wavePlayer);
    }
  }, [
    bossPlayer,
    bossDestroyedPlayer,
    boostPlayer,
    destroyPlayer,
    firePlayer,
    isSfxEnabled,
    movePlayer,
    playerDeathPlayer,
    pulsePlayer,
    wavePlayer,
  ]);

  return {
    bossPlayer,
    bossDestroyedPlayer,
    boostPlayer,
    destroyPlayer,
    firePlayer,
    menuMusicPlayer,
    movePlayer,
    playerDeathPlayer,
    pulsePlayer,
    stageOneMusicPlayer,
    stageTwoMusicPlayer,
    wavePlayer,
  };
}
