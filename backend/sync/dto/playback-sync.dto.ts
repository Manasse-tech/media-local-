/**
 * NestJS Data Transfer Object (DTO)
 * Playback State Synchronization
 */
export class PlaybackSyncDto {
  deviceId!: string;
  trackId?: string | null;
  trackTitle?: string | null;
  trackArtist?: string | null;
  currentTime!: number;
  duration!: number;
  isPlaying!: boolean;
  volume!: number;
  eqPreset?: string;
  spatial3DEnabled?: boolean;
  updatedAt!: number;
}
