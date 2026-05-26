import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/mongo';
import { User } from '@/models/User';
import { signSession, setSessionCookie } from '@/lib/auth';
import { loginLimiter, clientIp } from '@/lib/ratelimit';

const Body = z.object({
  handle: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  try {
    await loginLimiter.consume(ip);
  } catch {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid input' }, { status: 400 }); }

  await connectDB();
  const user = await User.findOne({ handle: body.handle.toLowerCase() });
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const token = signSession(String(user._id), user.handle);
  setSessionCookie(token);

  return NextResponse.json({
    user: {
      id: String(user._id),
      handle: user.handle,
      displayName: user.displayName,
      publicKey: user.publicKey,
    },
  });
}
