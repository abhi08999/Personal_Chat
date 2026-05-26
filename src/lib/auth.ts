import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { connectDB } from './mongo';
import { User } from '../models/User';

const COOKIE = process.env.SESSION_COOKIE_NAME || 'am_session';
const TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS || '30', 10);

export function signSession(userId: string, handle: string) {
  return jwt.sign({ sub: userId, handle }, process.env.JWT_SECRET!, {
    expiresIn: `${TTL_DAYS}d`,
  });
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

export async function getCurrentUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; handle: string };
    await connectDB();
    const user = await User.findById(payload.sub).lean();
    if (!user) return null;
    return {
      id: String(user._id),
      handle: user.handle,
      displayName: user.displayName,
      publicKey: user.publicKey,
    };
  } catch {
    return null;
  }
}
