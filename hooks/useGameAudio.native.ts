import { useEffect, useMemo, useState } from 'react';

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

import {
  playSoundSafely,
  resetSoundSafely,
  type GameSound,
} from '../components/game/game-audio.native';
import type { GameState } from '@/components/game/game-logic';

type UseGameAudioArgs = {
  gameState: GameState;
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  stage: number;
};

function useLoadedSound(
  source: number | null,
  volume: number,
  isLooping = false,
) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    if (!source) {
      setSound(null);
      return;
    }

    let isMounted = true;
    let currentSound: Audio.Sound | null = null;

    void (async () => {
      try {
        const result = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
          volume,
          isLooping,
        });

        currentSound = result.sound;

        if (!isMounted) {
          await result.sound.unloadAsync().catch(() => {});
          return;
        }

        setSound(result.sound);
      } catch {
        if (!isMounted) {
          return;
        }

        setSound(null);
      }
    })();

    return () => {
      isMounted = false;
      if (currentSound) {
        void currentSound.unloadAsync().catch(() => {});
      }
    };
  }, [isLooping, source, volume]);

  return sound;
}

function useLoadedSoundPool(
  source: number | null,
  volume: number,
  poolSize: number,
) {
  const [sounds, setSounds] = useState<Audio.Sound[] | null>(null);

  useEffect(() => {
    if (!source) {
      setSounds(null);
      return;
    }

    let isMounted = true;
    const loadedSounds: Audio.Sound[] = [];

    void (async () => {
      try {
        for (let index = 0; index < poolSize; index += 1) {
          const result = await Audio.Sound.createAsync(source, {
            shouldPlay: false,
            volume,
            isLooping: false,
          });
          loadedSounds.push(result.sound);
        }

        if (!isMounted) {
          await Promise.all(loadedSounds.map((sound) => sound.unloadAsync().catch(() => {})));
          return;
        }

        setSounds(loadedSounds);
      } catch {
        await Promise.all(loadedSounds.map((sound) => sound.unloadAsync().catch(() => {})));
        if (isMounted) {
          setSounds(null);
        }
      }
    })();

    return () => {
      isMounted = false;
      void Promise.all(loadedSounds.map((sound) => sound.unloadAsync().catch(() => {})));
    };
  }, [poolSize, source, volume]);

  return useMemo<GameSound | null>(() => sounds, [sounds]);
}

export function useGameAudio({
  gameState,
  isMusicEnabled,
  isSfxEnabled,
  stage,
}: UseGameAudioArgs) {
  const [isAudioReady, setIsAudioReady] = useState(false);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    })
      .catch(() => {})
      .finally(() => setIsAudioReady(true));
  }, []);

  const blasterOneSource = isAudioReady
    ? require('../assets/sounds/Blaster1.wav')
    : null;
  const blasterTwoSource = isAudioReady
    ? require('../assets/sounds/Blaster2.wav')
    : null;
  const blasterThreeSource = isAudioReady
    ? require('../assets/sounds/Blaster3.wav')
    : null;
  const alienBlasterSource = isAudioReady
    ? require('../assets/sounds/Alienblaster1.wav')
    : null;
  const destroySource = isAudioReady
    ? require('../assets/sounds/Destroy1.wav')
    : null;

  const firePlayer = useLoadedSoundPool(
    blasterOneSource,
    0.55,
    4,
  );
  const blasterTwoPlayer = useLoadedSoundPool(
    blasterTwoSource,
    0.46,
    3,
  );
  const blasterThreePlayer = useLoadedSoundPool(
    blasterThreeSource,
    0.44,
    3,
  );
  const pulsePlayer = useLoadedSoundPool(
    isAudioReady ? require('../assets/sounds/Pulseattack.wav') : null,
    0.45,
    2,
  );
  const boostPlayer = useLoadedSound(
    isAudioReady ? require('../assets/sounds/Boost.wav') : null,
    0.4,
  );
  const movePlayer = useLoadedSound(
    isAudioReady ? require('../assets/sounds/Move.wav') : null,
    0.28,
  );
  const destroyPlayer = useLoadedSoundPool(
    destroySource,
    0.38,
    4,
  );
  const blipPlayer = useLoadedSoundPool(
    isAudioReady ? require('../assets/sounds/Blip.wav') : null,
    0.5,
    2,
  );
  const incomingPlayer = useLoadedSoundPool(
    isAudioReady ? require('../assets/sounds/Inctrans.wav') : null,
    0.42,
    2,
  );
  const alienBlasterPlayer = useLoadedSoundPool(
    alienBlasterSource,
    0.48,
    3,
  );
  const bossPlayer = useLoadedSoundPool(
    isAudioReady ? require('../assets/sounds/Boss1.wav') : null,
    0.5,
    2,
  );
  const bossDestroyedPlayer = useLoadedSoundPool(
    isAudioReady ? require('../assets/sounds/Bossdestroyed.wav') : null,
    0.58,
    2,
  );
  const playerDeathPlayer = useLoadedSoundPool(
    isAudioReady ? require('../assets/sounds/Playerdeath.mp3') : null,
    0.52,
    2,
  );
  const wavePlayer = useLoadedSoundPool(
    isAudioReady ? require('../assets/sounds/Waveattack.wav') : null,
    0.24,
    2,
  );
  const menuMusicPlayer = useLoadedSound(
    isAudioReady ? require('../assets/sounds/Mainmenusong.mp3') : null,
    0.32,
    true,
  );
  const stageOneMusicPlayer = useLoadedSound(
    isAudioReady ? require('../assets/sounds/Stage1song.mp3') : null,
    0.22,
    true,
  );
  const stageTwoMusicPlayer = useLoadedSound(
    isAudioReady ? require('../assets/sounds/Stage2song.mp3') : null,
    0.24,
    true,
  );
  const victoryPlayer = useLoadedSoundPool(
    isAudioReady ? require('../assets/sounds/Victory.mp3') : null,
    0.44,
    2,
  );

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

  return {
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
  };
}
