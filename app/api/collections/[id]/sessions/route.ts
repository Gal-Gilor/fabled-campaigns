import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { linkCollectionToSession, getCollectionById } from '@/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { sessionId } = await req.json() as { sessionId?: string };
  if (!sessionId?.trim()) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

  const collection = await getCollectionById(session.user.id, id);
  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await linkCollectionToSession(id, sessionId);
  return NextResponse.json(collection);
}
