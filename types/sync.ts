export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'smart_tv';

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  platform: string;
  browser: string;
  location?: string;
  ip?: string;
  isCurrentDevice?: boolean;
  isOnline: boolean;
  lastActive: number;
  batteryLevel?: number;
}

export interface PlaybackSyncState {
  deviceId: string;
  trackId: string | null;
  trackTitle: string | null;
  trackArtist: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  eqPreset: string;
  spatial3DEnabled: boolean;
  updatedAt: number;
  version: number;
}

export interface TransferPlaybackRequest {
  sourceDeviceId: string;
  targetDeviceId: string;
  resumeImmediately?: boolean;
  playbackState?: PlaybackSyncState;
}

export interface TransferEvent {
  id: string;
  targetDeviceId: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  playbackState: PlaybackSyncState;
  createdAt: number;
  handled: boolean;
}
