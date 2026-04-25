import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCollectionsForUser } from '@/db';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const excludeSessionId = searchParams.get('excludeSessionId')?.trim() || null;
  if (!excludeSessionId) return NextResponse.json({ error: 'excludeSessionId is required' }, { status: 400 });
  const collections = await getCollectionsForUser(session.user.id, excludeSessionId);
  return NextResponse.json(collections);
}
