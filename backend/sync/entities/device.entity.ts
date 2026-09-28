/**
 * NestJS / TypeORM / PostgreSQL Entity
 * Schema for registered devices and sessions
 */
export class DeviceEntity {
  id!: string;
  userId?: string;
  name!: string;
  type!: 'mobile' | 'desktop' | 'tablet' | 'smart_tv';
  platform!: string;
  browser!: string;
  location?: string;
  ip?: string;
  batteryLevel?: number;
  isOnline!: boolean;
  lastActive!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
