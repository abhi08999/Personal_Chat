# 💜 @bhi & Mommy — Private E2EE Chat

A premium, romantic, end-to-end encrypted one-to-one chat web app built just for two.
**No signup. No public users. Server never sees your messages.**

## Highlights

- 🔐 **Real E2EE** with libsodium (X25519 + XChaCha20-Poly1305). The server only ever stores ciphertext.
- 🖼️ **Encrypted image sharing** — bytes are encrypted in the browser before upload; only the recipient decrypts.
- ⚡ **Realtime** via Socket.IO (typing, presence, delivery + read receipts, reactions).
- 🔒 **Private access gate** with a vault passphrase, bcrypt-hashed passwords, JWT session cookies (httpOnly, sameSite, secure in prod), and brute-force rate limiting.
- 💅 **Romantic premium UI** — Blush & Lavender palette, Cormorant Garamond display font, aurora lock screen, smooth Framer Motion animations.
- 📱 **Mobile-first** responsive, safe-area aware.
- 🧠 **Future-ready** architecture for voice/video, push notifications, PWA, self-destruct, search.

## Stack

| Layer       | Tech                                                          |
|-------------|---------------------------------------------------------------|
| Frontend    | Next.js 14 App Router, React 18, TypeScript, Tailwind, Framer |
| Realtime    | Socket.IO (custom Next.js server)                             |
| Backend     | Next.js Route Handlers + Mongoose                             |
| Database    | MongoDB                                                       |
| Crypto      | libsodium-wrappers (NaCl)                                     |
| Auth        | JWT in httpOnly cookies, bcrypt, rate-limiter-flexible        |
| Media       | Local encrypted blob storage (swap for S3/Cloudinary easily)  |

---

## 1. Setup

```bash
# Requires Node 20+, MongoDB running locally (or a connection string)
cp .env.example .env
# edit .env and set strong values for JWT_SECRET, USER_A_PASSWORD, USER_B_PASSWORD, VAULT_PASSPHRASE

npm install
npm run seed     # creates the two users
npm run dev      # starts Next.js + Socket.IO on http://localhost:3000
```

Open http://localhost:3000 — you'll land on the lock screen.

### Critical env vars

| Variable | Why |
|---|---|
| `JWT_SECRET` | Signs session cookies. Use 48+ random bytes. |
| `MONGODB_URI` | e.g. `mongodb://localhost:27017/abhi-mommy-chat` or Atlas URI |
| `USER_A_PASSWORD` / `USER_B_PASSWORD` | The two real login passwords. Used by the seed script. |
| `VAULT_PASSPHRASE` | Optional extra passphrase required on the lock screen for both users. |
| `RELATIONSHIP_START_DATE` | ISO date — powers the cute "day N together" counter. |

> Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## 2. How encryption works

On first successful login on a device:

1. Browser generates an **X25519 key pair**.
2. The **private key is sealed** with Argon2id-derived key from the user's password and stored in **IndexedDB** on that device only.
3. The **public key** is published to the server.

When sending a message:

1. Sender derives a shared secret with `crypto_box(peerPublicKey, mySecretKey)`.
2. Plaintext is encrypted with a fresh 24-byte random nonce.
3. The server receives only `{ ciphertext, nonce, from, timestamps }` and broadcasts it.

When sending an image:

1. Image bytes encrypted with a fresh symmetric key + nonce.
2. That symmetric key is sealed for the peer using `crypto_box`.
3. The encrypted blob is uploaded; only `mediaUrl` + sealed key envelope are stored.

The server admin **cannot** decrypt anything without the recipient's password (and even then, only if they get the sealed private key from that user's device).

### Multi-device note

By default the sealed private key lives only in the browser that created it.
If you log in on a new device, that device will generate **a new key pair** and republish the public key. You'll be able to decrypt new messages from that point onward; older messages will remain unreadable on the new device (true forward-secrecy of past sessions). To enable cross-device sync of old history, opt-in to the (commented) sealed-key escrow in `/api/keys` — the encrypted blob is stored server-side but the server still cannot read it.

---

## 3. Project structure

```
abhi-mommy-chat/
├── server.ts                    # Next.js + Socket.IO custom server
├── scripts/seed.ts              # Seeds the two users
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # redirect to /lock or /chat
│   │   ├── globals.css
│   │   ├── lock/page.tsx        # premium lock screen
│   │   ├── chat/page.tsx        # server entry
│   │   ├── chat/ChatClient.tsx  # client orchestrator
│   │   └── api/
│   │       ├── auth/{login,logout,me}/route.ts
│   │       ├── keys/route.ts
│   │       ├── keys/peer/route.ts
│   │       ├── messages/route.ts
│   │       └── upload/route.ts          # accepts encrypted bytes only
│   ├── components/              # Avatar, ChatHeader, MessageList, MessageBubble, MessageInput, TypingDots, LinkText
│   ├── hooks/useChat.ts         # socket + crypto orchestration
│   ├── lib/
│   │   ├── mongo.ts
│   │   ├── auth.ts              # JWT + cookies
│   │   ├── ratelimit.ts
│   │   ├── utils.ts
│   │   └── crypto/e2ee.ts       # libsodium wrapper
│   ├── models/{User,Message,Session}.ts
│   └── types/index.ts
└── public/uploads/              # encrypted blob storage
```

---

## 4. Deployment

You **cannot** deploy this to Vercel as-is because of the custom Socket.IO server.
Recommended one-VPS setups:

### Option A: Render / Railway / Fly.io / Heroku-style

1. Set env vars (everything from `.env`).
2. Start command: `npm start` (which runs `tsx server.ts`).
3. Use **MongoDB Atlas** (free tier is plenty for 2 users).
4. Put it behind HTTPS (Render/Railway do this automatically).
5. After first deploy, run `npm run seed` once (Render shell, Railway one-off command).

### Option B: Single VPS (DigitalOcean droplet, etc.)

```bash
# on your server
git clone <your-repo> && cd abhi-mommy-chat
cp .env.example .env && nano .env
npm ci && npm run build && npm run seed
pm2 start "npm start" --name abhi-mommy
# then put Caddy or nginx in front for HTTPS
```

### Option C: Split frontend (Vercel) + socket server (Render)

Doable but more wiring. Keep it simple: deploy the whole repo as one Node service.

### Object storage swap (recommended for production)

`src/app/api/upload/route.ts` writes encrypted blobs to local disk. Swap it for S3 / Cloudflare R2 / Cloudinary — the file content is already ciphertext so any blob store works.

---

## 5. Security checklist

- ✅ Passwords stored with **bcrypt (cost 12)**.
- ✅ Sessions are **JWT in httpOnly + sameSite=lax cookies**; `secure` in production.
- ✅ Login is **rate-limited** (5 attempts / 5 min, 15 min block).
- ✅ Uploads are rate-limited and size-capped (`MAX_UPLOAD_MB`).
- ✅ Socket.IO is **authenticated via the session cookie** — anonymous sockets are rejected.
- ✅ Messages are **encrypted client-side**; server only stores ciphertext.
- ✅ Two-user invariant — there is **no signup endpoint**. Only the seed script creates users.
- ✅ `robots: noindex` on every page.
- ⚠️ Set a **strong** `VAULT_PASSPHRASE`, `JWT_SECRET`, and user passwords before deploying.
- ⚠️ Always serve over **HTTPS** in production.

---

## 6. Roadmap (architecture is ready for these)

- 🎤 Voice notes — record blob → encrypt → upload (same pipeline as images)
- 📞 Voice/video calls — add WebRTC signaling over the existing socket
- 🔔 Push notifications — Web Push subscriptions stored per device
- 📱 PWA install — add `manifest.webmanifest` + service worker
- ⏳ Self-destruct messages — add `expiresAt` to `Message` model + cron sweep
- 🔎 Encrypted search — client-side indexing in IndexedDB
- 🎨 Themes — Tailwind tokens already centralized, swap palette in `tailwind.config.ts`
- 📲 Mobile app — wrap the same routes in Expo Web / Capacitor

Made with 💜.
