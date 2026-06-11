import { NextResponse } from 'next/server';
import { listCampaigns, createCampaign } from '@/db';
import { auth } from '@/auth';
import { CAMPAIGN_LORE_MAX_CHARS } from '../../lib/config';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ campaigns: [] });
  }
  const userId = session.user.id;

  const campaigns = await listCampaigns(userId);
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const lore = typeof body?.lore === 'string' ? body.lore : null;
  if (lore && lore.length > CAMPAIGN_LORE_MAX_CHARS) {
    return NextResponse.json(
      { error: `Lore must be at most ${CAMPAIGN_LORE_MAX_CHARS} characters` },
      { status: 400 }
    );
  }

  const campaign = await createCampaign(userId, { name, lore });
  return NextResponse.json({ campaign }, { status: 201 });
}
