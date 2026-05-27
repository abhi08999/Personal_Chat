export type Me = {
  id: string;
  handle: string;
  displayName: string;
  publicKey: string | null;
};

export type Peer = {
  id: string;
  handle: string;
  displayName: string;
  publicKey: string | null;
};

export type WireMessage = {
  _id: string;
  from: string;
  ciphertext: string;
  nonce: string;
  contentType: 'text' | 'image';
  mediaUrl?: string | null;
  mediaNonce?: string | null;
  mediaKeyCiphertext?: string | null;
  mediaKeyNonce?: string | null;
  clientId?: string | null;
  senderPublicKey?: string | null;
  reactions?: Record<string, string>;
  readAt?: string | Date | null;
  createdAt: string | Date;
  replyToId?: string | null;
  editedAt?: string | Date | null;
};

export type DecryptedMessage = WireMessage & {
  plaintext?: string;
  imageObjectUrl?: string;
  failed?: boolean;
  pending?: boolean;
};
