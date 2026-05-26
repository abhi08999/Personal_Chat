import { NextResponse } from 'next/server';
import { getPusherServer, PUSHER_CHANNEL } from '@/lib/pusher-server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const text = await req.text();
  const params = new URLSearchParams(text);
  const socketId = params.get('socket_id');
  const channelName = params.get('channel_name');

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
  }
  if (channelName !== PUSHER_CHANNEL) {
    return NextResponse.json({ error: 'Forbidden channel' }, { status: 403 });
  }

  const auth = getPusherServer().authorizeChannel(socketId, channelName, {
    user_id: me.id,
    user_info: { handle: me.handle, displayName: me.displayName },
  });

  return NextResponse.json(auth);
}
