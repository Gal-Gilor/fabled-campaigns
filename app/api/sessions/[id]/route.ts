import { NextResponse } from 'next/server';
import { updateSession, deleteSession, getCampaignById } from '@/db';
import { auth } from '@/auth';

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
  const patch: { name?: string; messages?: string; starred?: number; campaign_id?: string | null } = {};

  if (body.name !== undefined) patch.name = body.name;
  if (body.messages !== undefined) patch.messages = JSON.stringify(body.messages);
  if (body.starred !== undefined) patch.starred = body.starred ? 1 : 0;
  if (body.campaignId !== undefined) {
    if (body.campaignId !== null) {
      // Ownership check — a user can only file sessions into their own campaigns
      const campaign = await getCampaignById(userId, body.campaignId);
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
    }
    patch.campaign_id = body.campaignId;
  }

  const updatedSession = await updateSession(id, userId, patch);
  return NextResponse.json({ session: updatedSession });
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
  await deleteSession(id, userId);
  return NextResponse.json({ success: true });
}
