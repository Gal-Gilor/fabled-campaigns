import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserSettings, upsertUserSettings } from '@/db';
import { auth } from '@/auth';
import { IMAGE_SIZES, DEFAULT_IMAGE_SIZE } from '../../lib/config';

const patchSchema = z.object({ imageSize: z.enum(IMAGE_SIZES) });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ settings: { imageSize: DEFAULT_IMAGE_SIZE } });
  }

  const settings = await getUserSettings(session.user.id);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid image size' }, { status: 400 });
  }

  const settings = await upsertUserSettings(session.user.id, parsed.data);
  return NextResponse.json({ settings });
}
