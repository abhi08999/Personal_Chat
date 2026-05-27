import mongoose, { Schema, models, model } from 'mongoose';

const MessageSchema = new Schema({
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contentType: { type: String, enum: ['text', 'image'], default: 'text' },
  ciphertext: { type: String, required: true }, // base64 — server never decrypts
  nonce: { type: String, required: true },
  mediaUrl: { type: String, default: null },
  mediaNonce: { type: String, default: null },
  mediaKeyCiphertext: { type: String, default: null },
  mediaKeyNonce: { type: String, default: null },
  clientId: { type: String, default: null }, // for optimistic dedup
  senderPublicKey: { type: String, default: null }, // used by receiver to decrypt
  reactions: { type: Map, of: String, default: {} },
  replyToId: { type: String, default: null },
  editedAt: { type: Date, default: null },
  // TTL: deleted 12 hours after the receiver marks it read
  readAt: { type: Date, default: null, expires: 43200 },
  // Fallback TTL: unread messages expire after 24 hours
  createdAt: { type: Date, default: Date.now, expires: 86400 },
});

export const Message = (models.Message as mongoose.Model<any>) || model('Message', MessageSchema);
