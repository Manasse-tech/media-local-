import { PlaybackSyncDto } from './dto/playback-sync.dto';
import { TransferPlaybackDto } from './dto/transfer-playback.dto';
import { SyncService, syncServiceInstance } from './sync.service';

/**
 * NestJS Controller: SyncController
 * Route: /api/sync
 * Exposes playback state synchronization, handoff routing, and session recovery.
 */
export class SyncController {
  constructor(private readonly syncService: SyncService = syncServiceInstance) {}

  /**
   * GET /api/sync/state
   */
  async getState() {
    const state = this.syncService.getPlaybackState();
    return {
      success: true,
      state,
    };
  }

  /**
   * POST /api/sync/state
   */
  async updateState(dto: PlaybackSyncDto) {
    const state = this.syncService.updatePlaybackState(dto);
    return {
      success: true,
      state,
    };
  }

  /**
   * POST /api/sync/transfer
   */
  async transfer(dto: TransferPlaybackDto) {
    const event = this.syncService.transferPlayback(dto);
    return {
      success: true,
      transferEvent: event,
    };
  }

  /**
   * GET /api/sync/poll/:deviceId
   */
  async pollHandoff(deviceId: string) {
    const event = this.syncService.pollPendingTransfer(deviceId);
    return {
      hasTransfer: !!event,
      transferEvent: event,
    };
  }
}
