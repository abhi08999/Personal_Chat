import { NextResponse } from 'next/server';
import { z } from 'zod';
import webpush from 'web-push';
import { connectDB } from '@/lib/mongo';
import { Message } from '@/models/Message';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { getPusherServer, PUSHER_CHANNEL } from '@/lib/pusher-server';

const DECOYS = [
  { title: 'HDFC Bank', body: 'OTP 638271 for your transaction. Valid 10 min. Do not share.' },
  { title: 'Nykaa', body: 'Items in your wishlist are almost sold out! Shop now 🛍️' },
  { title: 'Amazon', body: 'Your package is out for delivery today.' },
  { title: 'Flipkart', body: 'Extra 20% off your next order. Tap to claim.' },
  { title: 'SBI Bank', body: 'Your account statement for this month is now available.' },
  { title: 'Zomato', body: 'Your order is on the way! ETA: 22 mins 🍕' },
  { title: 'Myntra', body: 'Your wishlist item just came back in stock!' },
  { title: 'ICICI Bank', body: 'Credit card payment of ₹2,499 due in 3 days.' },
  { title: 'PharmEasy', body: 'Reminder: time to reorder your medicines. Free delivery today!' },
  { title: 'Swiggy', body: 'Special offer near you — free delivery on next 3 orders 🎉' },
];

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

  // Send a push notification to the recipient (works even when their browser is closed)
  try {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    if (vapidPublic && vapidPrivate) {
      const recipient = await User.findOne({ _id: { $ne: me.id } }).lean() as any;
      if (recipient?.pushSubscription) {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        const decoy = DECOYS[Math.floor(Math.random() * DECOYS.length)];
        await webpush.sendNotification(
          recipient.pushSubscription as any,
          JSON.stringify(decoy),
        ).catch(() => {/* subscription expired or invalid */});
      }
    }
  } catch { /* non-critical — don't fail the message send */ }

  return NextResponse.json({ ok: true, message: payload });
}
