import { NextRequest, NextResponse } from 'next/server';
import { SyncController } from '@/backend/sync/sync.controller';

const controller = new SyncController();

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ deviceId: string }> }
) {
  try {
    const params = await props.params;
    const res = await controller.pollHandoff(params.deviceId);
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
