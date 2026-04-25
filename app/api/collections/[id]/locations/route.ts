import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listLocations } from '@/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const locations = await listLocations(id);
  return NextResponse.json(locations);
}
