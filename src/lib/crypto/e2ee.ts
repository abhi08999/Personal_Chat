import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export type KeyPair = { publicKey: Uint8Array; privateKey: Uint8Array };

// ---------- sodium (dynamic import — loads WASM lazily in browser) ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sodium: any = null;
let _initPromise: Promise<void> | null = null;

async function getSodium(): Promise<any> {
  if (_sodium) return _sodium;
  if (!_initPromise) {
    _initPromise = import('libsodium-wrappers').then(async (mod) => {
      const lib = mod.default ?? mod;
      await lib.ready;
      _sodium = lib;
    });
  }
  await _initPromise;
  return _sodium;
}

export function sodiumReady(): Promise<void> {
  return getSodium().then(() => undefined);
}

export function b64(u: Uint8Array): string {
  return _sodium.to_base64(u, _sodium.base64_variants.ORIGINAL);
}
export function fromB64(s: string): Uint8Array {
  return _sodium.from_base64(s, _sodium.base64_variants.ORIGINAL);
}

// ---------- IndexedDB ----------
const PRIV_KEY_BLOB = 'am.priv.v1';

export async function storeSealedPrivateKey(blob: object) {
  await idbSet(PRIV_KEY_BLOB, blob);
}
export async function loadSealedPrivateKey(): Promise<any | null> {
  return (await idbGet(PRIV_KEY_BLOB)) ?? null;
}
export async function wipeSealedPrivateKey() {
  await idbDel(PRIV_KEY_BLOB);
}

// ---------- Key sealing — Web Crypto (PBKDF2 + AES-GCM, no WASM) ----------
function toB64Str(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  bytes.forEach((b) => { str += String.fromCharCode(b); });
  return btoa(str);
}
function fromB64Str(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function sealPrivateKeyWithPassword(privateKey: Uint8Array, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveAesKey(password, salt);
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, privateKey);
  return { salt: toB64Str(salt), nonce: toB64Str(iv), ciphertext: toB64Str(ct) };
}

export async function openPrivateKeyWithPassword(
  blob: { salt: string; nonce: string; ciphertext: string },
  password: string,
): Promise<Uint8Array> {
  const salt = fromB64Str(blob.salt);
  const iv   = fromB64Str(blob.nonce);
  const key  = await deriveAesKey(password, salt);
  const pt   = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, fromB64Str(blob.ciphertext),
  );
  return new Uint8Array(pt);
}

// ---------- Key generation ----------
export async function generateKeyPair(): Promise<KeyPair> {
  const sodium = await getSodium();
  const kp = sodium.crypto_box_keypair();
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

// Derive the public key from a secret key so we can verify they match the server's record
export async function derivePublicKey(sk: Uint8Array): Promise<string> {
  const sodium = await getSodium();
  const pk = sodium.crypto_scalarmult_base(sk);
  return sodium.to_base64(pk, sodium.base64_variants.ORIGINAL);
}

// ---------- Message encryption ----------
export async function encryptText(plaintext: string, peerPubB64: string, mySecret: Uint8Array) {
  const sodium = await getSodium();
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const ct = sodium.crypto_box_easy(
    sodium.from_string(plaintext), nonce, fromB64(peerPubB64), mySecret,
  );
  return { ciphertext: b64(ct), nonce: b64(nonce) };
}

export async function decryptText(
  ciphertextB64: string, nonceB64: string, senderPubB64: string, mySecret: Uint8Array,
): Promise<string> {
  const sodium = await getSodium();
  const pt = sodium.crypto_box_open_easy(
    fromB64(ciphertextB64), fromB64(nonceB64), fromB64(senderPubB64), mySecret,
  );
  return sodium.to_string(pt);
}

// ---------- Media encryption ----------
export async function encryptBytesForPeer(
  bytes: Uint8Array, peerPubB64: string, mySecret: Uint8Array,
) {
  const sodium = await getSodium();
  const mediaKey   = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
  const mediaNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const mediaCt    = sodium.crypto_secretbox_easy(bytes, mediaNonce, mediaKey);
  const keyNonce   = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const sealedKey  = sodium.crypto_box_easy(mediaKey, keyNonce, fromB64(peerPubB64), mySecret);
  return {
    mediaCiphertext:    mediaCt,
    mediaNonce:         b64(mediaNonce),
    mediaKeyCiphertext: b64(sealedKey),
    mediaKeyNonce:      b64(keyNonce),
  };
}

export async function decryptBytesFromPeer(
  mediaCiphertext: Uint8Array, mediaNonceB64: string,
  sealedKeyB64: string, sealedKeyNonceB64: string,
  senderPubB64: string, mySecret: Uint8Array,
): Promise<Uint8Array> {
  const sodium = await getSodium();
  const mediaKey = sodium.crypto_box_open_easy(
    fromB64(sealedKeyB64), fromB64(sealedKeyNonceB64), fromB64(senderPubB64), mySecret,
  );
  return sodium.crypto_secretbox_open_easy(mediaCiphertext, fromB64(mediaNonceB64), mediaKey);
}
