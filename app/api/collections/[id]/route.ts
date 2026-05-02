import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/auth';
import {
  updateCollection,
  deleteCollection,
  countOtherSessionsForCollection,
  deleteLocationsByCollectionAndSession,
  deleteCollectionSessionLink,
  getSessionIdsForCollection,
} from '@/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  const updated = await updateCollection(id, session.user.id, data);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { sessionId, confirmed } = (await req.json()) as { sessionId?: string; confirmed?: boolean };

  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

  if (!confirmed) {
    const otherCount = sessionId ? await countOtherSessionsForCollection(id, sessionId) : 0;
    if (otherCount > 0) {
      // Other sessions still use it — clean up THIS session's data only
      const blobUrls = await deleteLocationsByCollectionAndSession(id, sessionId);
      await Promise.all(blobUrls.map((url) => del(url)));
      await deleteCollectionSessionLink(id, sessionId);
      return NextResponse.json({ deleted: true, reason: 'removed_from_session' });
    }
    // Only this session uses it — require confirmation before full delete
    return NextResponse.json({ deleted: false, reason: 'requires_confirmation' });
  }

  // confirmed: true — full delete: collect all blob URLs from artifacts table across all sessions
  const sessionIds = await getSessionIdsForCollection(id);
  const allBlobUrls = (
    await Promise.all(sessionIds.map((sid) => deleteLocationsByCollectionAndSession(id, sid)))
  ).flat();
  await Promise.all(allBlobUrls.map((url) => del(url)));
  await deleteCollection(id, session.user.id);
  return NextResponse.json({ deleted: true });
}
