'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MediaItem, RepeatMode, VisualizerMode } from '@/types/media';
import { useLibrary } from './LibraryContext';
import { audioEngine } from '@/lib/audio-engine';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface PlayerContextType {
  currentMedia: MediaItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  speed: number;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: MediaItem[];
  queueIndex: number;
  isQueueOpen: boolean;
  isNowPlayingOpen: boolean;
  isVideoPlayerOpen: boolean;
  isEqualizerOpen: boolean;
  activeMediaInfoItem: MediaItem | null;
  visualizerMode: VisualizerMode;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  // Handlers for manual media element sync
  handleTimeUpdate: (time: number) => void;
  handleDurationChange: (dur: number) => void;
  // Actions
  playMedia: (media: MediaItem, newQueue?: MediaItem[], options?: { autoOpenModal?: boolean }) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  seekRelative: (offsetSeconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setSpeed: (spd: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (media: MediaItem) => void;
  addToQueueNext: (media: MediaItem) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  clearQueue: () => void;
  setIsQueueOpen: (open: boolean) => void;
  setIsNowPlayingOpen: (open: boolean) => void;
  setIsVideoPlayerOpen: (open: boolean) => void;
  setIsEqualizerOpen: (open: boolean) => void;
  setActiveMediaInfoItem: (item: MediaItem | null) => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  stopPlayback: () => void;
  toggleFavorite: (id?: string) => Promise<void>;
  volumeNormalization: boolean;
  toggleVolumeNormalization: () => void;
  // Video to Audio mode transition
  isVideoAudioMode: boolean;
  goToAudioMode: (mediaId?: string) => void;
  goToVideoMode: () => void;
  // Sleep Timer & Crossfade
  sleepTimerRemaining: number | null;
  setSleepTimer: (seconds: number | null) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (sec: number) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { mediaList, recordPlayback, updateResumePosition, toggleFavorite: libToggleFavorite } = useLibrary();

  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useLocalStorage<number>('app_player_volume', 0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeedState] = useLocalStorage<number>('app_player_speed', 1);
  const [shuffle, setShuffle] = useLocalStorage<boolean>('app_player_shuffle', false);
  const [repeat, setRepeat] = useLocalStorage<RepeatMode>('app_player_repeat', 'off');
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [volumeNormalization, setVolumeNormalizationState] = useLocalStorage<boolean>('app_player_volume_normalization', false);
  const [isVideoAudioMode, setIsVideoAudioMode] = useState(false);

  // Crossfade & Sleep Timer
  const [crossfadeDuration, setCrossfadeState] = useLocalStorage<number>('app_crossfade_duration', 0);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  // Modals / Panels
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [activeMediaInfoItem, setActiveMediaInfoItem] = useState<MediaItem | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sleep Timer Countdown Effect
  useEffect(() => {
    if (sleepTimerRemaining === null || sleepTimerRemaining <= 0 || !isPlaying) return;

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Time expired: pause playback
          const el = getActiveElement();
          if (el) el.pause();
          setIsPlaying(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemaining, isPlaying]);

  const setSleepTimer = useCallback((seconds: number | null) => {
    setSleepTimerRemaining(seconds);
  }, []);

  const setCrossfadeDuration = useCallback((sec: number) => {
    const clamped = Math.max(0, Math.min(10, sec));
    setCrossfadeState(clamped);
  }, [setCrossfadeState]);

  // Derive synced currentMedia & queue with latest library state (e.g. isFavorite, title)
  const syncedCurrentMedia = useMemo(() => {
    if (!currentMedia) return null;
    const match = mediaList.find((m) => m.id === currentMedia.id);
    return match ? { ...currentMedia, ...match } : currentMedia;
  }, [currentMedia, mediaList]);

  const syncedQueue = useMemo(() => {
    if (queue.length === 0) return queue;
    return queue.map((item) => {
      const match = mediaList.find((m) => m.id === item.id);
      return match ? { ...item, ...match } : item;
    });
  }, [queue, mediaList]);

  // Toggle favorite with instant library persistence
  const toggleFavorite = useCallback(
    async (id?: string) => {
      const targetId = id || syncedCurrentMedia?.id;
      if (!targetId) return;

      await libToggleFavorite(targetId);
    },
    [syncedCurrentMedia, libToggleFavorite]
  );

  const toggleVolumeNormalization = useCallback(() => {
    setVolumeNormalizationState((prev) => {
      const next = !prev;
      audioEngine.setVolumeNormalization(next);
      return next;
    });
  }, []);

  // Get active HTML media element
  const getActiveElement = useCallback((): HTMLMediaElement | null => {
    if (!currentMedia) return null;
    return currentMedia.type === 'video' ? videoRef.current : audioRef.current;
  }, [currentMedia]);

  const handleTimeUpdate = useCallback((time: number) => {
    setPosition(time);
  }, []);

  const handleDurationChange = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  // Sync volume & speed to active element
  useEffect(() => {
    const el = getActiveElement();
    if (el) {
      el.volume = isMuted ? 0 : volume;
      el.playbackRate = speed;
    }
  }, [volume, isMuted, speed, getActiveElement]);

  // Attach Web Audio to audio element on play
  const ensureAudioEngine = useCallback(() => {
    if (audioRef.current && currentMedia?.type === 'audio') {
      audioEngine.init(audioRef.current);
      audioEngine.resume();
    }
  }, [currentMedia]);

  // Play a specific media item with optional crossfade transition
  const playMedia = useCallback(
    async (media: MediaItem, newQueue?: MediaItem[], options?: { autoOpenModal?: boolean }) => {
      if (newQueue) {
        setQueue(newQueue);
        const idx = newQueue.findIndex((m) => m.id === media.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      } else {
        setQueue((prev) => {
          if (!prev.some((m) => m.id === media.id)) {
            return [...prev, media];
          }
          return prev;
        });
      }

      // Mutual exclusivity: pause the other media type element to prevent simultaneous playback
      if (media.type === 'audio') {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }

      // Apply audio crossfade if enabled and currently playing audio
      if (crossfadeDuration > 0 && currentMedia && currentMedia.type === 'audio' && isPlaying) {
        await audioEngine.crossfadeTo(0, crossfadeDuration / 2);
      }

      setCurrentMedia(media);
      setIsPlaying(true);
      setPosition(0);
      setDuration(media.duration || 0);

      // Do NOT forcefully push the Now Playing modal if autoOpenModal is false (e.g. automatic track progression)
      if (media.type === 'video') {
        if (options?.autoOpenModal ?? true) {
          setIsVideoPlayerOpen(true);
          setIsNowPlayingOpen(false);
        }
      } else {
        if (options?.autoOpenModal) {
          setIsNowPlayingOpen(true);
        }
      }

      // Resume position if exists
      const targetTime = media.resumePosition && media.resumePosition > 5 && media.resumePosition < (media.duration - 5)
        ? media.resumePosition
        : 0;

      setTimeout(async () => {
        const el = media.type === 'video' ? videoRef.current : audioRef.current;
        if (el) {
          if (targetTime > 0) el.currentTime = targetTime;
          try {
            if (crossfadeDuration > 0 && media.type === 'audio') {
              await audioEngine.crossfadeTo(0, 0);
              await el.play();
              await audioEngine.crossfadeTo(isMuted ? 0 : volume, crossfadeDuration / 2);
            } else {
              await el.play();
            }
          } catch (e) {
            console.warn('Autoplay prevented:', e);
          }
          if (media.type === 'audio') {
            ensureAudioEngine();
            audioEngine.setMasterGain(isMuted ? 0 : volume);
          }
        }
      }, 50);

      recordPlayback(media, targetTime);
    },
    [ensureAudioEngine, recordPlayback, crossfadeDuration, currentMedia, isPlaying, volume, isMuted]
  );

  const togglePlay = useCallback(() => {
    const el = getActiveElement();
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => {
          setIsPlaying(true);
          ensureAudioEngine();
        })
        .catch((e) => console.warn('Play error:', e));
    }
  }, [getActiveElement, isPlaying, ensureAudioEngine]);

  const pause = useCallback(() => {
    const el = getActiveElement();
    if (el) {
      el.pause();
      setIsPlaying(false);
    }
  }, [getActiveElement]);

  const resume = useCallback(() => {
    const el = getActiveElement();
    if (el) {
      el.play()
        .then(() => {
          setIsPlaying(true);
          ensureAudioEngine();
        })
        .catch((e) => console.warn('Play error:', e));
    }
  }, [getActiveElement, ensureAudioEngine]);

  const seek = useCallback(
    (seconds: number) => {
      const el = getActiveElement();
      if (el) {
        el.currentTime = Math.max(0, Math.min(seconds, duration));
        setPosition(el.currentTime);
      }
    },
    [getActiveElement, duration]
  );

  const seekRelative = useCallback(
    (offsetSeconds: number) => {
      const el = getActiveElement();
      if (el) {
        const newTime = Math.max(0, Math.min(el.currentTime + offsetSeconds, duration || 99999));
        el.currentTime = newTime;
        setPosition(newTime);
      }
    },
    [getActiveElement, duration]
  );

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    const el = getActiveElement();
    if (el) {
      el.volume = clamped;
      el.muted = clamped === 0;
    }
    audioEngine.setMasterGain(clamped === 0 ? 0 : clamped);
  }, [getActiveElement, setVolumeState]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const el = getActiveElement();
      const targetVol = next ? 0 : (volume > 0 ? volume : 0.5);
      if (el) {
        el.muted = next;
        if (!next && el.volume === 0) {
          el.volume = targetVol;
          setVolumeState(targetVol);
        }
      }
      audioEngine.setMasterGain(next ? 0 : targetVol);
      return next;
    });
  }, [getActiveElement, volume, setVolumeState]);

  const setSpeed = useCallback((spd: number) => {
    setSpeedState(spd);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  // Next track
  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    if (repeat === 'one' && currentMedia) {
      seek(0);
      resume();
      return;
    }

    let nextIdx = queueIndex + 1;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    }

    if (nextIdx >= queue.length) {
      if (repeat === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    setQueueIndex(nextIdx);
    const nextMedia = queue[nextIdx];
    if (nextMedia) {
      playMedia(nextMedia, undefined, { autoOpenModal: false });
    }
  }, [queue, queueIndex, repeat, currentMedia, shuffle, seek, resume, playMedia]);

  // Previous track
  const playPrevious = useCallback(() => {
    const el = getActiveElement();
    if (el && el.currentTime > 3) {
      seek(0);
      return;
    }

    if (queue.length === 0) return;

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeat === 'all' ? queue.length - 1 : 0;
    }

    setQueueIndex(prevIdx);
    const prevMedia = queue[prevIdx];
    if (prevMedia) {
      playMedia(prevMedia, undefined, { autoOpenModal: false });
    }
  }, [getActiveElement, queue, queueIndex, repeat, seek, playMedia]);

  // Queue manipulation
  const addToQueue = useCallback((media: MediaItem) => {
    setQueue((prev) => [...prev, media]);
  }, []);

  const addToQueueNext = useCallback(
    (media: MediaItem) => {
      setQueue((prev) => {
        const next = [...prev];
        next.splice(queueIndex + 1, 0, media);
        return next;
      });
    },
    [queueIndex]
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueue((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (index < queueIndex) {
          setQueueIndex((curr) => Math.max(0, curr - 1));
        } else if (index === queueIndex && next.length > 0) {
          const newIdx = Math.min(queueIndex, next.length - 1);
          setQueueIndex(newIdx);
          playMedia(next[newIdx]);
        }
        return next;
      });
    },
    [queueIndex, playMedia]
  );

  const reorderQueue = useCallback((startIndex: number, endIndex: number) => {
    setQueue((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue(currentMedia ? [currentMedia] : []);
    setQueueIndex(0);
  }, [currentMedia]);

  const goToAudioMode = useCallback((mediaId?: string) => {
    setIsVideoAudioMode(true);
    setIsVideoPlayerOpen(false);
    setIsNowPlayingOpen(true);
  }, []);

  const goToVideoMode = useCallback(() => {
    setIsVideoAudioMode(false);
    setIsNowPlayingOpen(false);
    setIsVideoPlayerOpen(true);
  }, []);

  const stopPlayback = useCallback(() => {
    const el = getActiveElement();
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setIsPlaying(false);
    setIsVideoAudioMode(false);
    setCurrentMedia(null);
    setIsNowPlayingOpen(false);
    setIsVideoPlayerOpen(false);
  }, [getActiveElement]);

  // Synchronize events from video element if active
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onTime = () => {
      if (currentMedia?.type === 'video') {
        setPosition(el.currentTime);
      }
    };
    const onDur = () => {
      if (currentMedia?.type === 'video') {
        setDuration(el.duration || 0);
      }
    };
    const onVol = () => {
      if (currentMedia?.type === 'video') {
        const v = el.volume;
        const m = el.muted || v === 0;
        setVolumeState(v);
        setIsMuted(m);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => {
      if (repeat === 'one') {
        seek(0);
        resume();
      } else {
        playNext();
      }
    };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('durationchange', onDur);
    el.addEventListener('volumechange', onVol);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnd);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('durationchange', onDur);
      el.removeEventListener('volumechange', onVol);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnd);
    };
  }, [currentMedia, repeat, seek, resume, playNext]);

  // Media Session API synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentMedia) {
      return;
    }

    try {
      const artwork = currentMedia.thumbnail
        ? [{ src: currentMedia.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentMedia.title,
        artist: currentMedia.artist,
        album: currentMedia.album,
        artwork,
      });

      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekbackward', () => seekRelative(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => seekRelative(10));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
    } catch (e) {
      console.warn('MediaSession handler error:', e);
    }
  }, [currentMedia, pause, resume, playNext, playPrevious, seek, seekRelative]);

  // Sync playbackState to MediaSession
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Periodic resume position save for video
  useEffect(() => {
    if (!currentMedia || !isPlaying) return;

    const interval = setInterval(() => {
      const el = getActiveElement();
      if (el && !el.paused) {
        updateResumePosition(currentMedia.id, el.currentTime);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentMedia, isPlaying, getActiveElement, updateResumePosition]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          if (isVideoPlayerOpen) {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          }
          break;
        case 'KeyL':
          cycleRepeat();
          break;
        case 'KeyS':
          toggleShuffle();
          break;
        case 'KeyQ':
          setIsQueueOpen((prev) => !prev);
          break;
        case 'Escape':
          if (isVideoPlayerOpen) setIsVideoPlayerOpen(false);
          else if (isNowPlayingOpen) setIsNowPlayingOpen(false);
          else if (isQueueOpen) setIsQueueOpen(false);
          else if (isEqualizerOpen) setIsEqualizerOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    seekRelative,
    setVolume,
    volume,
    toggleMute,
    isVideoPlayerOpen,
    isNowPlayingOpen,
    isQueueOpen,
    isEqualizerOpen,
    cycleRepeat,
    toggleShuffle,
  ]);

  return (
    <PlayerContext.Provider
      value={{
        currentMedia: syncedCurrentMedia,
        isPlaying,
        position,
        duration,
        volume,
        isMuted,
        speed,
        shuffle,
        repeat,
        queue: syncedQueue,
        queueIndex,
        isQueueOpen,
        isNowPlayingOpen,
        isVideoPlayerOpen,
        isEqualizerOpen,
        activeMediaInfoItem,
        visualizerMode,
        audioRef,
        videoRef,
        handleTimeUpdate,
        handleDurationChange,
        playMedia,
        togglePlay,
        pause,
        resume,
        seek,
        seekRelative,
        setVolume,
        toggleMute,
        setSpeed,
        toggleShuffle,
        cycleRepeat,
        playNext,
        playPrevious,
        addToQueue,
        addToQueueNext,
        removeFromQueue,
        reorderQueue,
        clearQueue,
        setIsQueueOpen,
        setIsNowPlayingOpen,
        setIsVideoPlayerOpen,
        setIsEqualizerOpen,
        setActiveMediaInfoItem,
        setVisualizerMode,
        stopPlayback,
        toggleFavorite,
        volumeNormalization,
        toggleVolumeNormalization,
        isVideoAudioMode,
        goToAudioMode,
        goToVideoMode,
        sleepTimerRemaining,
        setSleepTimer,
        crossfadeDuration,
        setCrossfadeDuration,
      }}
    >
      {/* Hidden Global Audio Element */}
      <audio
        ref={audioRef}
        src={currentMedia?.type === 'audio' ? currentMedia.objectUrl : undefined}
        onTimeUpdate={() => {
          if (audioRef.current && currentMedia?.type === 'audio') {
            setPosition(audioRef.current.currentTime);
          }
        }}
        onDurationChange={() => {
          if (audioRef.current && currentMedia?.type === 'audio') {
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onVolumeChange={() => {
          if (audioRef.current && currentMedia?.type === 'audio') {
            const v = audioRef.current.volume;
            const m = audioRef.current.muted || v === 0;
            if (v !== volume) setVolumeState(v);
            if (m !== isMuted) setIsMuted(m);
          }
        }}
        onEnded={() => {
          if (repeat === 'one') {
            seek(0);
            resume();
          } else {
            playNext();
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="auto"
      />

      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
