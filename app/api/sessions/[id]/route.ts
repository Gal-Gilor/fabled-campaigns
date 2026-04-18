import { NextResponse } from 'next/server';
import { updateSession, deleteSession } from '../../../lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: { name?: string; messages?: string; starred?: number } = {};

  if (body.name !== undefined) patch.name = body.name;
  if (body.messages !== undefined) patch.messages = JSON.stringify(body.messages);
  if (body.starred !== undefined) patch.starred = body.starred ? 1 : 0;

  const session = updateSession(id, patch);
  return NextResponse.json({ session });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteSession(id);
  return NextResponse.json({ success: true });
}
