/**
 * Accepts ALREADY-ENCRYPTED bytes (ciphertext) and stores them in Vercel Blob.
 * The server cannot read the file content.
 */
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getCurrentUser } from '@/lib/auth';
import { uploadLimiter, clientIp } from '@/lib/ratelimit';

const MAX_MB = parseInt(process.env.MAX_UPLOAD_MB || '15', 10);

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try { await uploadLimiter.consume(clientIp(req)); }
  catch { return NextResponse.json({ error: 'Rate limit' }, { status: 429 }); }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) return NextResponse.json({ error: 'Empty' }, { status: 400 });
  if (buf.byteLength > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Max ${MAX_MB}MB` }, { status: 413 });
  }

  const filename = `chat/${Date.now()}-${crypto.randomUUID()}.bin`;
  const { url } = await put(filename, buf, {
    access: 'public',
    contentType: 'application/octet-stream',
  });

  return NextResponse.json({ url });
}
