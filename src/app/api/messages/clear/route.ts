import { getCurrentUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongo';
import { Message } from '@/models/Message';

// Called via navigator.sendBeacon on pagehide — erases all messages (ephemeral design)
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 204 });

  await connectDB();
  await Message.deleteMany({});
  return new Response(null, { status: 204 });
}
