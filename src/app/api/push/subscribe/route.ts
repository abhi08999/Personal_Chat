import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const subscription = await req.json();
  await connectDB();
  await User.updateOne({ _id: me.id }, { $set: { pushSubscription: subscription } });
  return NextResponse.json({ ok: true });
}
