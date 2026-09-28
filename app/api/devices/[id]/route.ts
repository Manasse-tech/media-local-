import { NextRequest, NextResponse } from 'next/server';
import { DevicesController } from '@/backend/sync/devices.controller';

const controller = new DevicesController();

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const res = await controller.remove(params.id);
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
