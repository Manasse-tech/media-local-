'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceInfo, PlaybackSyncState, DeviceType, TransferEvent } from '@/types/sync';
import { usePlayer } from '@/context/PlayerContext';
import { audioEngine } from '@/lib/audio-engine';

const STORAGE_KEY_DEVICE_ID = 'local_media_device_id';
const STORAGE_KEY_DEVICE_NAME = 'local_media_device_name';
const STORAGE_KEY_AUTO_SYNC = 'local_media_auto_sync_enabled';

function getOrGenerateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
  let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
  if (!id) {
    id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
  }
  return id;
}

function detectDeviceDetails(): {
  name: string;
  type: DeviceType;
  platform: string;
  browser: string;
} {
  if (typeof window === 'undefined') {
    return { name: 'Serveur Web', type: 'desktop', platform: 'Node', browser: 'Next.js' };
  }

  const ua = navigator.userAgent;
  let type: DeviceType = 'desktop';
  if (/iPad|Tablet/i.test(ua)) {
    type = 'tablet';
  } else if (/Mobi|Android|iPhone/i.test(ua)) {
    type = 'mobile';
  }

  let platform = 'Navigateur';
  if (/Mac/i.test(ua)) platform = 'macOS';
  else if (/Win/i.test(ua)) platform = 'Windows';
  else if (/Android/i.test(ua)) platform = 'Android';
  else if (/iPhone|iPad/i.test(ua)) platform = 'iOS';
  else if (/Linux/i.test(ua)) platform = 'Linux';

  let browser = 'Web';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  const customName = localStorage.getItem(STORAGE_KEY_DEVICE_NAME);
  const defaultName = `${browser} sur ${platform} (${type === 'mobile' ? 'Mobile' : 'PC'})`;

  return {
    name: customName || defaultName,
    type,
    platform,
    browser,
  };
}

export function useMultiDeviceSync() {
  const [deviceId] = useState<string>(() => getOrGenerateDeviceId());
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isAutoSync, setIsAutoSync] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY_AUTO_SYNC);
    return stored ? stored === 'true' : true;
  });
  const [incomingTransfer, setIncomingTransfer] = useState<TransferEvent | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const {
    currentMedia,
    position,
    duration,
    isPlaying,
    volume,
    pause,
    resume,
    seek,
    setVolume,
  } = usePlayer();

  const isPlayingRef = useRef(isPlaying);
  const currentTrackRef = useRef(currentMedia);
  const currentTimeRef = useRef(position);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentTrackRef.current = currentMedia;
  }, [currentMedia]);

  useEffect(() => {
    currentTimeRef.current = position;
  }, [position]);

  // Register device and send periodic heartbeat
  const registerHeartbeat = useCallback(async () => {
    if (!deviceId) return;
    try {
      const details = detectDeviceDetails();
      await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deviceId,
          ...details,
          location: 'Abidjan 🇨🇮',
        }),
      });

      // Fetch refreshed device list
      const res = await fetch(`/api/devices?currentDeviceId=${deviceId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.devices)) {
        setDevices(data.devices);
      }
    } catch {
      // ignore transient network errors
    }
  }, [deviceId]);

  // Periodic heartbeat every 20 seconds
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!deviceId) return;
      try {
        const details = detectDeviceDetails();
        await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: deviceId,
            ...details,
            location: 'Abidjan 🇨🇮',
          }),
        });

        const res = await fetch(`/api/devices?currentDeviceId=${deviceId}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.devices)) {
          setDevices(data.devices);
        }
      } catch {
        // ignore
      }
    };

    run();
    const interval = setInterval(run, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [deviceId]);

  // Push playback state when playing or seeking if autoSync is on
  const pushState = useCallback(
    async (overridePlaying?: boolean) => {
      if (!deviceId || !isAutoSync) return;
      try {
        const statePayload = {
          deviceId,
          trackId: currentTrackRef.current?.id || null,
          trackTitle: currentTrackRef.current?.title || null,
          trackArtist: currentTrackRef.current?.artist || null,
          currentTime: currentTimeRef.current,
          duration: duration || 0,
          isPlaying: overridePlaying !== undefined ? overridePlaying : isPlayingRef.current,
          volume: volume,
          spatial3DEnabled: audioEngine.getSpatialConfig().enabled,
          updatedAt: Date.now(),
        };

        await fetch('/api/sync/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statePayload),
        });
      } catch {
        // ignore
      }
    },
    [deviceId, isAutoSync, duration, volume]
  );

  // Poll for incoming handoff transfers targeting this device
  useEffect(() => {
    if (!deviceId) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/poll/${deviceId}`);
        const data = await res.json();
        if (data.hasTransfer && data.transferEvent) {
          setIncomingTransfer(data.transferEvent);
        }
      } catch {
        // ignore
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [deviceId]);

  // Accept incoming transfer handoff
  const acceptTransfer = useCallback(
    (event: TransferEvent) => {
      const state = event.playbackState;
      if (state) {
        if (state.volume !== undefined) setVolume(state.volume);
        if (state.currentTime !== undefined) seek(state.currentTime);
        if (state.isPlaying) {
          resume();
        }
      }
      setIncomingTransfer(null);
    },
    [resume, seek, setVolume]
  );

  const dismissTransfer = useCallback(() => {
    setIncomingTransfer(null);
  }, []);

  // Transfer playback to another device in 1-click
  const transferToDevice = useCallback(
    async (targetDeviceId: string) => {
      if (!deviceId) return;
      setIsSyncing(true);
      try {
        // Pause playback locally during handoff
        pause();

        const state: PlaybackSyncState = {
          deviceId,
          trackId: currentMedia?.id || null,
          trackTitle: currentMedia?.title || null,
          trackArtist: currentMedia?.artist || null,
          currentTime: position,
          duration,
          isPlaying: true, // target device should start playing
          volume,
          eqPreset: 'Studio',
          spatial3DEnabled: audioEngine.getSpatialConfig().enabled,
          updatedAt: Date.now(),
          version: 1,
        };

        await fetch('/api/sync/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceDeviceId: deviceId,
            targetDeviceId,
            resumeImmediately: true,
            playbackState: state,
          }),
        });

        // Re-fetch device list
        registerHeartbeat();
      } catch (err) {
        console.error('Transfer failed:', err);
      } finally {
        setIsSyncing(false);
      }
    },
    [deviceId, currentMedia, position, duration, volume, pause, registerHeartbeat]
  );

  const toggleAutoSync = useCallback(() => {
    setIsAutoSync((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_AUTO_SYNC, String(next));
      return next;
    });
  }, []);

  return {
    deviceId,
    devices,
    isAutoSync,
    toggleAutoSync,
    incomingTransfer,
    acceptTransfer,
    dismissTransfer,
    transferToDevice,
    pushState,
    refreshDevices: registerHeartbeat,
    isSyncing,
  };
}
