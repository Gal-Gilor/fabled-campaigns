import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserSettings, getUserTier, upsertUserSettings } from '@/db';
import { auth } from '@/auth';
import { IMAGE_SIZES, DEFAULT_IMAGE_SIZE, sizesForTier } from '../../lib/config';

const patchSchema = z.object({ imageSize: z.enum(IMAGE_SIZES) });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ settings: { imageSize: DEFAULT_IMAGE_SIZE, tier: 'free' } });
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

  const tier = await getUserTier(session.user.id);
  if (!sizesForTier(tier).includes(parsed.data.imageSize)) {
    return NextResponse.json({ error: 'Maximum (4K) is part of Grandmaster.' }, { status: 403 });
  }

  const settings = await upsertUserSettings(session.user.id, parsed.data);
  return NextResponse.json({ settings });
}
