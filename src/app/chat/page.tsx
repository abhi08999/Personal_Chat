import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongo';
import { User } from '@/models/User';
import { ChatClient } from './ChatClient';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/lock');

  await connectDB();
  const peerDoc = await User.findOne({ _id: { $ne: me.id } }).lean();
  const peer = peerDoc ? {
    id: String(peerDoc._id),
    handle: peerDoc.handle,
    displayName: peerDoc.displayName,
    publicKey: peerDoc.publicKey || null,
  } : null;

  return <ChatClient me={me} peer={peer} />;
}
