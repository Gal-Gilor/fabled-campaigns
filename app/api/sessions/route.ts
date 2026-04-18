import { NextResponse } from 'next/server';
import { listSessions, createSession } from '../../lib/db';

export async function GET() {
  const sessions = listSessions();
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const session = createSession(body?.name);
  return NextResponse.json({ session }, { status: 201 });
}
