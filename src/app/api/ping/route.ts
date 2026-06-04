import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { connectDB } from '@/lib/mongo';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { getPusherServer, PUSHER_CHANNEL } from '@/lib/pusher-server';

// Simple in-memory cooldown — good enough for a 2-person app
const lastPing = new Map<string, number>();
const COOLDOWN_MS = 45_000;

export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = Date.now();
  const last = lastPing.get(me.id) ?? 0;
  if (now - last < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return NextResponse.json({ error: 'Too soon', retryAfter }, { status: 429 });
  }
  lastPing.set(me.id, now);

  // Notify peer in real-time (shows heart burst if they're in the app)
  await getPusherServer().trigger(PUSHER_CHANNEL, 'ping:heart', { from: me.id });

  // Web push (reaches them even when the app is closed)
  try {
    const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    if (vapidPublic && vapidPrivate) {
      await connectDB();
      const recipient = await User.findOne({ _id: { $ne: me.id } }).lean() as any;
      if (recipient?.pushSubscription) {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        await webpush.sendNotification(
          recipient.pushSubscription as any,
          JSON.stringify({ title: 'Amazon', body: 'Someone left a surprise for you 💜' }),
        ).catch(() => {});
      }
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true });
}
