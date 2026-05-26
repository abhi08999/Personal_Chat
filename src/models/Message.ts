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
  reactions: { type: Map, of: String, default: {} },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const Message = (models.Message as mongoose.Model<any>) || model('Message', MessageSchema);
