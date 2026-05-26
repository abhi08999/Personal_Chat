/**
 * Custom Next.js server with Socket.IO attached.
 * Run: npm run dev   |   npm start
 *
 * IMPORTANT: This server NEVER sees plaintext messages. It only relays
 * ciphertext envelopes between the two authenticated users.
 */
import { createServer } from 'http';
import next from 'next';
import { Server as IOServer, Socket } from 'socket.io';
import { parse as parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import 'dotenv/config'; // loads .env
import { connectDB } from './src/lib/mongo';
import { Message } from './src/models/Message';
import { User } from './src/models/User';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

interface AuthedSocket extends Socket {
  userId?: string;
  handle?: string;
}

async function main() {
  await app.prepare();
  await connectDB();

  const httpServer = createServer((req, res) => handle(req, res));
  const io = new IOServer(httpServer, {
    cors: { origin: process.env.APP_URL, credentials: true },
    maxHttpBufferSize: 20 * 1024 * 1024, // 20MB for encrypted media envelopes
  });

  // ---- Socket auth via session cookie (JWT) ----
  io.use(async (socket: AuthedSocket, nextFn) => {
    try {
      const raw = socket.handshake.headers.cookie || '';
      const cookies = parseCookie(raw);
      const token = cookies[process.env.SESSION_COOKIE_NAME || 'am_session'];
      if (!token) return nextFn(new Error('unauthorized'));
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; handle: string };
      const user = await User.findById(payload.sub).lean();
      if (!user) return nextFn(new Error('unauthorized'));
      socket.userId = String(user._id);
      socket.handle = user.handle;
      nextFn();
    } catch {
      nextFn(new Error('unauthorized'));
    }
  });

  const ROOM = 'private-room'; // exactly one room for two users
  const presence = new Map<string, Set<string>>(); // userId -> socket ids

  io.on('connection', (socket: AuthedSocket) => {
    const uid = socket.userId!;
    socket.join(ROOM);
    if (!presence.has(uid)) presence.set(uid, new Set());
    presence.get(uid)!.add(socket.id);
    io.to(ROOM).emit('presence', { online: [...presence.keys()] });

    // Send an encrypted envelope. Server stores ciphertext as-is.
    socket.on('message:send', async (env, ack) => {
      try {
        const doc = await Message.create({
          from: uid,
          ciphertext: env.ciphertext,
          nonce: env.nonce,
          contentType: env.contentType, // 'text' | 'image'
          mediaUrl: env.mediaUrl || null,
          mediaNonce: env.mediaNonce || null,
          mediaKeyCiphertext: env.mediaKeyCiphertext || null,
          clientId: env.clientId,
          createdAt: new Date(),
        });
        const payload = {
          _id: String(doc._id),
          from: uid,
          ciphertext: doc.ciphertext,
          nonce: doc.nonce,
          contentType: doc.contentType,
          mediaUrl: doc.mediaUrl,
          mediaNonce: doc.mediaNonce,
          mediaKeyCiphertext: doc.mediaKeyCiphertext,
          clientId: doc.clientId,
          createdAt: doc.createdAt,
          status: 'delivered',
        };
        io.to(ROOM).emit('message:new', payload);
        ack?.({ ok: true, message: payload });
      } catch (e: any) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on('message:read', async ({ ids }: { ids: string[] }) => {
      if (!Array.isArray(ids) || ids.length === 0) return;
      await Message.updateMany(
        { _id: { $in: ids }, from: { $ne: uid }, readAt: null },
        { $set: { readAt: new Date() } }
      );
      io.to(ROOM).emit('message:read', { ids, by: uid, at: new Date() });
    });

    socket.on('message:react', async ({ id, emoji }: { id: string; emoji: string }) => {
      if (!id || !emoji) return;
      await Message.updateOne({ _id: id }, { $set: { [`reactions.${uid}`]: emoji } });
      io.to(ROOM).emit('message:reaction', { id, by: uid, emoji });
    });

    socket.on('typing', (isTyping: boolean) => {
      socket.to(ROOM).emit('typing', { from: uid, isTyping });
    });

    socket.on('disconnect', () => {
      const set = presence.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) presence.delete(uid);
      }
      io.to(ROOM).emit('presence', { online: [...presence.keys()] });
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n💜 @bhi & Mommy chat ready on http://localhost:${port}\n`);
  });
}

// Tiny dotenv shim (only if dotenv not installed; harmless if it is)
declare module 'dotenv/config' {}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

// graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.disconnect();
  process.exit(0);
});
