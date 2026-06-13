import { NextResponse } from 'next/server';
import { updateCampaign, deleteCampaign } from '@/db';
import { auth } from '@/auth';
import { parseCampaignBody } from '../../../lib/campaigns';

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
  const parsed = parseCampaignBody(body, { requireName: false });
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const campaign = await updateCampaign(id, userId, parsed.patch);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  return NextResponse.json({ campaign });
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
