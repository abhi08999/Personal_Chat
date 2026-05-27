import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongo';
import { Message } from '@/models/Message';
import { getCurrentUser } from '@/lib/auth';
import { getPusherServer, PUSHER_CHANNEL } from '@/lib/pusher-server';

const Body = z.object({
  ciphertext: z.string().min(1).max(65536),
  nonce: z.string().min(1).max(512),
  contentType: z.enum(['text', 'image']),
  mediaUrl: z.string().url().nullable().optional(),
  mediaNonce: z.string().max(512).nullable().optional(),
  mediaKeyCiphertext: z.string().max(4096).nullable().optional(),
  mediaKeyNonce: z.string().max(512).nullable().optional(),
  clientId: z.string().max(128).nullable().optional(),
});

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid input' }, { status: 400 }); }

  await connectDB();
  const doc = await Message.create({
    from: me.id,
    ciphertext: body.ciphertext,
    nonce: body.nonce,
    contentType: body.contentType,
    mediaUrl: body.mediaUrl ?? null,
    mediaNonce: body.mediaNonce ?? null,
    mediaKeyCiphertext: body.mediaKeyCiphertext ?? null,
    mediaKeyNonce: body.mediaKeyNonce ?? null,
    clientId: body.clientId ?? null,
    senderPublicKey: me.publicKey ?? null,
    createdAt: new Date(),
  });

  const payload = {
    _id: String(doc._id),
    from: me.id,
    ciphertext: doc.ciphertext,
    nonce: doc.nonce,
    contentType: doc.contentType,
    mediaUrl: doc.mediaUrl,
    mediaNonce: doc.mediaNonce,
    mediaKeyCiphertext: doc.mediaKeyCiphertext,
    mediaKeyNonce: doc.mediaKeyNonce,
    clientId: doc.clientId,
    senderPublicKey: doc.senderPublicKey,
    createdAt: doc.createdAt,
    reactions: {},
    readAt: null,
  };

  await getPusherServer().trigger(PUSHER_CHANNEL, 'message:new', payload);
  return NextResponse.json({ ok: true, message: payload });
}
