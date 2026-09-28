import { NextRequest, NextResponse } from 'next/server';
import { DevicesController } from '@/backend/sync/devices.controller';

const controller = new DevicesController();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currentDeviceId = searchParams.get('currentDeviceId') || undefined;
    const res = await controller.getDevices(currentDeviceId);
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await controller.register(body);
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
