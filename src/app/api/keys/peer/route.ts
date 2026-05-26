import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const peer = await User.findOne({ _id: { $ne: me.id } }).lean() as any;
  if (!peer) return NextResponse.json({ peer: null });
  return NextResponse.json({
    peer: {
      id: String(peer._id),
      handle: peer.handle,
      displayName: peer.displayName,
      publicKey: peer.publicKey || null,
    },
  });
}
