import { PlaybackSyncDto } from './playback-sync.dto';

/**
 * NestJS Data Transfer Object (DTO)
 * Seamless Playback Handoff Transfer
 */
export class TransferPlaybackDto {
  sourceDeviceId!: string;
  targetDeviceId!: string;
  resumeImmediately?: boolean;
  playbackState?: PlaybackSyncDto;
}
