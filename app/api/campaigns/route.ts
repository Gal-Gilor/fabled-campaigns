import { NextResponse } from 'next/server';
import { listCampaigns, createCampaign } from '@/db';
import { auth } from '@/auth';
import { parseCampaignBody } from '../../lib/campaigns';

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
  const parsed = parseCampaignBody(body, { requireName: true });
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const campaign = await createCampaign(userId, {
    name: parsed.patch.name!,
    lore: parsed.patch.lore,
  });
  return NextResponse.json({ campaign }, { status: 201 });
}
