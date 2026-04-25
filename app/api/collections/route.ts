import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listCollectionsBySession, createCollection, linkCollectionToSession, deleteCollection } from '@/db';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId')?.trim() || null;
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  const collections = await listCollectionsBySession(session.user.id, sessionId);
  return NextResponse.json(collections);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, terrain, setting, ambiance, visualDetails, sessionId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const collection = await createCollection(session.user.id, { name, terrain, setting, ambiance, visualDetails });
  if (sessionId) {
    try {
      await linkCollectionToSession(collection.id, sessionId);
    } catch (err) {
      await deleteCollection(session.user.id, collection.id);
      throw err;
    }
  }
  return NextResponse.json(collection, { status: 201 });
}
