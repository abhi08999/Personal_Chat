import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongo';
import { Message } from '@/models/Message';
import { getCurrentUser } from '@/lib/auth';
import { getPusherServer, PUSHER_CHANNEL } from '@/lib/pusher-server';

const Body = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid input' }, { status: 400 }); }

  await connectDB();
  const now = new Date();
  await Message.updateMany(
    { _id: { $in: body.ids }, from: { $ne: me.id }, readAt: null },
    { $set: { readAt: now } }
  );

  await getPusherServer().trigger(PUSHER_CHANNEL, 'message:read', {
    ids: body.ids,
    by: me.id,
    at: now.toISOString(),
  });

  return NextResponse.json({ ok: true });
}
