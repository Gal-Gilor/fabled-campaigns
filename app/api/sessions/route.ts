import { NextResponse } from 'next/server';
import { listSessions, createSession } from '@/db';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ sessions: [] });
  }
  const userId = session.user.id;

  const sessions = await listSessions(userId);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => ({}));
  const newSession = await createSession(userId, body?.name);
  return NextResponse.json({ session: newSession }, { status: 201 });
}
