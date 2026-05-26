/**
 * Publish or update the current user's public key (and optional sealed private key blob).
 * Public keys are non-secret. The sealed private key is encrypted with the user's password
 * and is only stored if the user opts in to multi-device sync (off by default).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongo';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

const Body = z.object({
  publicKey: z.string().min(10).max(512),
  sealedPrivateKey: z.object({
    salt: z.string().max(512),
    nonce: z.string().max(512),
    ciphertext: z.string().max(2048),
  }).optional(),
});

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid input' }, { status: 400 }); }

  await connectDB();
  await User.updateOne(
    { _id: me.id },
    { $set: { publicKey: body.publicKey, ...(body.sealedPrivateKey ? { sealedPrivateKey: body.sealedPrivateKey } : {}) } }
  );
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const me2 = await User.findById(me.id).lean();
  return NextResponse.json({
    publicKey: me2?.publicKey || null,
    sealedPrivateKey: me2?.sealedPrivateKey || null,
  });
}
