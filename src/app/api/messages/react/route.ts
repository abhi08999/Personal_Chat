import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongo';
import { Message } from '@/models/Message';
import { getCurrentUser } from '@/lib/auth';
import { getPusherServer, PUSHER_CHANNEL } from '@/lib/pusher-server';

const Body = z.object({
  id: z.string().min(1).max(128),
  emoji: z.string().min(1).max(8),
});

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid input' }, { status: 400 }); }

  await connectDB();
  await Message.updateOne(
    { _id: body.id },
    { $set: { [`reactions.${me.id}`]: body.emoji } }
  );

  await getPusherServer().trigger(PUSHER_CHANNEL, 'message:reaction', {
    id: body.id,
    by: me.id,
    emoji: body.emoji,
  });

  return NextResponse.json({ ok: true });
}
