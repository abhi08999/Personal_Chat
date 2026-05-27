import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongo';
import { Message } from '@/models/Message';
import { getCurrentUser } from '@/lib/auth';
import { getPusherServer, PUSHER_CHANNEL } from '@/lib/pusher-server';

const Body = z.object({
  id: z.string().min(1).max(128),
  ciphertext: z.string().min(1).max(65536),
  nonce: z.string().min(1).max(512),
});

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid input' }, { status: 400 }); }

  await connectDB();
  const doc = await Message.findOneAndUpdate(
    { _id: body.id, from: me.id, contentType: 'text' },
    { $set: { ciphertext: body.ciphertext, nonce: body.nonce, editedAt: new Date() } },
    { new: true },
  ).lean() as any;

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const payload = {
    _id: String(doc._id),
    from: String(doc.from),
    ciphertext: doc.ciphertext,
    nonce: doc.nonce,
    contentType: doc.contentType,
    senderPublicKey: doc.senderPublicKey ?? null,
    editedAt: doc.editedAt,
    replyToId: doc.replyToId ?? null,
    mediaUrl: doc.mediaUrl ?? null,
    mediaNonce: doc.mediaNonce ?? null,
    mediaKeyCiphertext: doc.mediaKeyCiphertext ?? null,
    mediaKeyNonce: doc.mediaKeyNonce ?? null,
    clientId: doc.clientId ?? null,
    reactions: doc.reactions ? Object.fromEntries(doc.reactions instanceof Map ? doc.reactions : Object.entries(doc.reactions)) : {},
    readAt: doc.readAt ?? null,
    createdAt: doc.createdAt,
  };

  await getPusherServer().trigger(PUSHER_CHANNEL, 'message:edit', payload);

  return NextResponse.json({ ok: true });
}
