import { DeviceRegisterDto } from './dto/device-register.dto';
import { SyncService, syncServiceInstance } from './sync.service';

/**
 * NestJS Controller: DevicesController
 * Route: /api/devices
 * Exposes device discovery, registration, and heartbeat operations.
 */
export class DevicesController {
  constructor(private readonly syncService: SyncService = syncServiceInstance) {}

  /**
   * GET /api/devices
   */
  async getDevices(currentDeviceId?: string) {
    const devices = this.syncService.listDevices(currentDeviceId);
    return {
      success: true,
      count: devices.length,
      devices,
    };
  }

  /**
   * POST /api/devices/register (or /api/devices)
   */
  async register(dto: DeviceRegisterDto) {
    const device = this.syncService.registerDevice(dto);
    return {
      success: true,
      device,
    };
  }

  /**
   * DELETE /api/devices/:id
   */
  async remove(id: string) {
    const removed = this.syncService.removeDevice(id);
    return {
      success: removed,
    };
  }
}
