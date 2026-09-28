import { SyncService, syncServiceInstance } from './sync.service';
import { DevicesController } from './devices.controller';
import { SyncController } from './sync.controller';

/**
 * NestJS Module: SyncModule
 * Bundles controllers, services, and domain entities for multi-device sync.
 */
export class SyncModule {
  static controllers = [DevicesController, SyncController];
  static providers = [
    {
      provide: SyncService,
      useValue: syncServiceInstance,
    },
  ];
  static exports = [SyncService];
}
