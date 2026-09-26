import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listLocations, getCollectionById } from '@/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const owned = await getCollectionById(session.user.id, id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const locations = await listLocations(id);
  return NextResponse.json(locations);
}
