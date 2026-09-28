import { DeviceRegisterDto } from './dto/device-register.dto';
import { PlaybackSyncDto } from './dto/playback-sync.dto';
import { TransferPlaybackDto } from './dto/transfer-playback.dto';
import { DeviceInfo, PlaybackSyncState, TransferEvent } from '@/types/sync';

/**
 * NestJS Injectable Service: SyncService
 * Handles multi-device registration, heartbeat tracking,
 * state synchronization with conflict resolution, and seamless playback handoffs.
 */
export class SyncService {
  private devices: Map<string, DeviceInfo> = new Map();
  private playbackState: PlaybackSyncState | null = null;
  private pendingTransfers: TransferEvent[] = [];
  private readonly OFFLINE_THRESHOLD_MS = 60 * 1000; // 60 seconds

  constructor() {
    this.seedDefaultDevices();
  }

  private seedDefaultDevices() {
    // Seed default sample devices representing West African mobile & desktop ecosystem
    const now = Date.now();
    this.devices.set('dev-mobile-abidjan', {
      id: 'dev-mobile-abidjan',
      name: 'Tecno Camon 30 Pro (Abidjan)',
      type: 'mobile',
      platform: 'Android 14',
      browser: 'Chrome Mobile',
      location: 'Cocody, Abidjan 🇨🇮',
      ip: '41.207.210.12',
      isOnline: true,
      lastActive: now,
      batteryLevel: 84,
    });

    this.devices.set('dev-laptop-work', {
      id: 'dev-laptop-work',
      name: 'MacBook Pro M3 Max',
      type: 'desktop',
      platform: 'macOS Sonoma',
      browser: 'Safari 18.0',
      location: 'Plateau, Abidjan 🇨🇮',
      ip: '160.155.194.5',
      isOnline: true,
      lastActive: now - 15000,
      batteryLevel: 98,
    });
  }

  /**
   * List all registered devices, updating online flags based on TTL
   */
  public listDevices(currentDeviceId?: string): DeviceInfo[] {
    const now = Date.now();
    const result: DeviceInfo[] = [];

    for (const dev of this.devices.values()) {
      const isOnline = now - dev.lastActive < this.OFFLINE_THRESHOLD_MS;
      result.push({
        ...dev,
        isOnline,
        isCurrentDevice: currentDeviceId ? dev.id === currentDeviceId : false,
      });
    }

    return result.sort((a, b) => b.lastActive - a.lastActive);
  }

  /**
   * Register or update device heartbeat
   */
  public registerDevice(dto: DeviceRegisterDto): DeviceInfo {
    const now = Date.now();
    const existing = this.devices.get(dto.id);

    const device: DeviceInfo = {
      id: dto.id,
      name: dto.name || (existing ? existing.name : 'Appareil Connecté'),
      type: dto.type || (existing ? existing.type : 'mobile'),
      platform: dto.platform || (existing ? existing.platform : 'Inconnu'),
      browser: dto.browser || (existing ? existing.browser : 'Navigateur'),
      location: dto.location || (existing ? existing.location : 'Côte d’Ivoire 🇨🇮'),
      ip: dto.ip || (existing ? existing.ip : '127.0.0.1'),
      isOnline: true,
      lastActive: now,
      batteryLevel: dto.batteryLevel !== undefined ? dto.batteryLevel : existing?.batteryLevel,
    };

    this.devices.set(dto.id, device);
    return device;
  }

  /**
   * Remove a device from registry
   */
  public removeDevice(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  /**
   * Fetch current unified playback state
   */
  public getPlaybackState(): PlaybackSyncState | null {
    return this.playbackState;
  }

  /**
   * Update synchronized playback state with timestamp conflict resolution
   */
  public updatePlaybackState(dto: PlaybackSyncDto): PlaybackSyncState {
    const now = Date.now();

    if (!this.playbackState || dto.updatedAt >= this.playbackState.updatedAt) {
      this.playbackState = {
        deviceId: dto.deviceId,
        trackId: dto.trackId ?? null,
        trackTitle: dto.trackTitle ?? null,
        trackArtist: dto.trackArtist ?? null,
        currentTime: dto.currentTime,
        duration: dto.duration,
        isPlaying: dto.isPlaying,
        volume: dto.volume,
        eqPreset: dto.eqPreset || 'Flat',
        spatial3DEnabled: dto.spatial3DEnabled || false,
        updatedAt: dto.updatedAt || now,
        version: (this.playbackState?.version || 0) + 1,
      };
    }

    return this.playbackState;
  }

  /**
   * Trigger an instant playback handoff to a target device
   */
  public transferPlayback(dto: TransferPlaybackDto): TransferEvent {
    const sourceDev = this.devices.get(dto.sourceDeviceId);
    const now = Date.now();

    const state: PlaybackSyncState = dto.playbackState
      ? {
          deviceId: dto.sourceDeviceId,
          trackId: dto.playbackState.trackId ?? null,
          trackTitle: dto.playbackState.trackTitle ?? null,
          trackArtist: dto.playbackState.trackArtist ?? null,
          currentTime: dto.playbackState.currentTime,
          duration: dto.playbackState.duration,
          isPlaying: dto.resumeImmediately ?? true,
          volume: dto.playbackState.volume,
          eqPreset: dto.playbackState.eqPreset || 'Flat',
          spatial3DEnabled: dto.playbackState.spatial3DEnabled || false,
          updatedAt: now,
          version: (this.playbackState?.version || 0) + 1,
        }
      : this.playbackState || {
          deviceId: dto.sourceDeviceId,
          trackId: null,
          trackTitle: null,
          trackArtist: null,
          currentTime: 0,
          duration: 0,
          isPlaying: true,
          volume: 1.0,
          eqPreset: 'Flat',
          spatial3DEnabled: false,
          updatedAt: now,
          version: 1,
        };

    this.playbackState = { ...state, deviceId: dto.targetDeviceId };

    const event: TransferEvent = {
      id: `xfer-${now}-${Math.random().toString(36).slice(2, 7)}`,
      targetDeviceId: dto.targetDeviceId,
      sourceDeviceId: dto.sourceDeviceId,
      sourceDeviceName: sourceDev?.name || 'Autre appareil',
      playbackState: this.playbackState,
      createdAt: now,
      handled: false,
    };

    this.pendingTransfers.push(event);

    // Keep queue small (max 50 events)
    if (this.pendingTransfers.length > 50) {
      this.pendingTransfers = this.pendingTransfers.slice(-20);
    }

    return event;
  }

  /**
   * Consume and acknowledge pending handoff event for target device
   */
  public pollPendingTransfer(targetDeviceId: string): TransferEvent | null {
    const eventIndex = this.pendingTransfers.findIndex(
      (e) => e.targetDeviceId === targetDeviceId && !e.handled
    );

    if (eventIndex !== -1) {
      const event = this.pendingTransfers[eventIndex];
      event.handled = true;
      return event;
    }

    return null;
  }
}

// Singleton instance shared across API routes and backend services
export const syncServiceInstance = new SyncService();
