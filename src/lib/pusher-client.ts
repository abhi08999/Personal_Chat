'use client';
import Pusher from 'pusher-js';

let _client: Pusher | null = null;

export function getPusher(): Pusher {
  if (_client) return _client;
  _client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    channelAuthorization: {
      endpoint: '/api/pusher/auth',
      transport: 'ajax',
    },
    forceTLS: true,
  });
  return _client;
}

export const PUSHER_CHANNEL = 'presence-chat';
