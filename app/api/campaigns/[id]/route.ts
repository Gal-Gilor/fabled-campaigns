import { NextResponse } from 'next/server';
import { updateCampaign, deleteCampaign } from '@/db';
import { auth } from '@/auth';
import { CAMPAIGN_LORE_MAX_CHARS } from '../../../lib/config';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: { name?: string; lore?: string | null } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    patch.name = name;
  }
  if (body.lore !== undefined) {
    const lore = typeof body.lore === 'string' ? body.lore : null;
    if (lore && lore.length > CAMPAIGN_LORE_MAX_CHARS) {
      return NextResponse.json(
        { error: `Lore must be at most ${CAMPAIGN_LORE_MAX_CHARS} characters` },
        { status: 400 }
      );
    }
    patch.lore = lore;
  }

  try {
    const campaign = await updateCampaign(id, userId, patch);
    return NextResponse.json({ campaign });
  } catch {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;
  await deleteCampaign(id, userId);
  return NextResponse.json({ success: true });
}
