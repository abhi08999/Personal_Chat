import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { getPusherServer, PUSHER_CHANNEL } from '@/lib/pusher-server';

const Body = z.object({ isTyping: z.boolean() });

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid input' }, { status: 400 }); }

  await getPusherServer().trigger(PUSHER_CHANNEL, 'typing', { from: me.id, isTyping: body.isTyping });
  return NextResponse.json({ ok: true });
}
