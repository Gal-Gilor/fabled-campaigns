import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/auth';
import { deleteArtifact } from '@/db';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { blobUrl } = await req.json() as { blobUrl?: string };
  if (blobUrl) await del(blobUrl);
  await deleteArtifact(id);
  return new Response(null, { status: 204 });
}
