import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { Message } from '@/models/Message';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200);
  const before = url.searchParams.get('before'); // ISO date

  await connectDB();
  const q: any = {};
  if (before) {
    const d = new Date(before);
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid before parameter' }, { status: 400 });
    q.createdAt = { $lt: d };
  }

  const docs = await Message.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  const messages = docs.reverse().map((d: any) => ({
    _id: String(d._id),
    from: String(d.from),
    ciphertext: d.ciphertext,
    nonce: d.nonce,
    contentType: d.contentType,
    mediaUrl: d.mediaUrl,
    mediaNonce: d.mediaNonce,
    mediaKeyCiphertext: d.mediaKeyCiphertext,
    mediaKeyNonce: d.mediaKeyNonce,
    clientId: d.clientId,
    senderPublicKey: d.senderPublicKey ?? null,
    reactions: d.reactions ? Object.fromEntries(d.reactions instanceof Map ? d.reactions : Object.entries(d.reactions)) : {},
    readAt: d.readAt,
    createdAt: d.createdAt,
  }));
  return NextResponse.json({ messages });
}
