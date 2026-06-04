/**
 * GET /api/push/test
 * Diagnostic endpoint — sends a test notification to the current user
 * and returns a JSON report of the push configuration.
 * Visit this URL in the browser while logged in to verify push works.
 */
import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { connectDB } from '@/lib/mongo';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Not logged in — open /chat first' }, { status: 401 });

  const report: Record<string, any> = { user: me.handle };

  // Check VAPID keys
  const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  report.vapid = {
    publicKey:  vapidPublic  ? `${vapidPublic.slice(0, 12)}…` : '❌ MISSING — set VAPID_PUBLIC_KEY in Vercel',
    privateKey: vapidPrivate ? '✅ set' : '❌ MISSING — set VAPID_PRIVATE_KEY in Vercel',
    subject:    vapidSubject ? vapidSubject : '❌ MISSING — set VAPID_SUBJECT in Vercel (e.g. mailto:you@example.com)',
  };

  if (!vapidPublic || !vapidPrivate) {
    report.result = '❌ Cannot send — VAPID keys missing from environment variables';
    return NextResponse.json(report);
  }

  // Check subscription
  await connectDB();
  const user = await User.findById(me.id).lean() as any;
  if (!user?.pushSubscription) {
    report.subscription = '❌ No subscription saved — open the app in your PWA and allow notifications';
    report.result = '❌ Cannot send — no push subscription on file';
    return NextResponse.json(report);
  }
  report.subscription = '✅ found';

  // Send test notification to MYSELF
  try {
    webpush.setVapidDetails(
      vapidSubject || 'mailto:admin@example.com',
      vapidPublic,
      vapidPrivate,
    );
    await webpush.sendNotification(
      user.pushSubscription as any,
      JSON.stringify({ title: 'Zomato', body: 'Test notification delivered! Everything is working 🎉' }),
    );
    report.result = '✅ Test notification sent! You should receive it now.';
  } catch (err: any) {
    report.result = `❌ Send failed: ${err?.message ?? err}`;
    report.hint = 'Subscription may be expired. Reload the app (as PWA) to refresh it.';
  }

  return NextResponse.json(report, { headers: { 'Content-Type': 'application/json' } });
}
