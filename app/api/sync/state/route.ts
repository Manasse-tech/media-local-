import { NextRequest, NextResponse } from 'next/server';
import { SyncController } from '@/backend/sync/sync.controller';

const controller = new SyncController();

export async function GET() {
  try {
    const res = await controller.getState();
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
    const res = await controller.updateState(body);
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
