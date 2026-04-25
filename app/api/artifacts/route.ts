import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createArtifact } from '@/db';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { locationId, blobUrl, prompt, mediaType } = await req.json();
  if (!locationId || !blobUrl) {
    return NextResponse.json({ error: 'locationId, blobUrl required' }, { status: 400 });
  }
  const artifact = await createArtifact(locationId, { blobUrl, prompt, mediaType });
  return NextResponse.json(artifact, { status: 201 });
}
