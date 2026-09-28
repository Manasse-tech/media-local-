/**
 * NestJS Data Transfer Object (DTO)
 * Device Registration & Heartbeat
 */
export class DeviceRegisterDto {
  id!: string;
  name!: string;
  type!: 'mobile' | 'desktop' | 'tablet' | 'smart_tv';
  platform!: string;
  browser!: string;
  location?: string;
  ip?: string;
  batteryLevel?: number;
}
