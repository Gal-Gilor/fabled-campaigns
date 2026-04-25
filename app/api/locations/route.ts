import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createLocation } from '@/db';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, collectionId, sessionId, name } = await req.json();
  if (!id || !collectionId || !name) {
    return NextResponse.json({ error: 'id, collectionId, name required' }, { status: 400 });
  }
  const location = await createLocation({ id, collectionId, sessionId: sessionId ?? null, name });
  return NextResponse.json(location, { status: 201 });
}
