import mongoose, { Schema, models, model } from 'mongoose';

const UserSchema = new Schema({
  handle: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  publicKey: { type: String, default: null }, // base64 X25519 pub key
  sealedPrivateKey: { type: Object, default: null }, // optional cloud-escrow (off by default)
  pushSubscription: { type: Object, default: null }, // Web Push subscription object
  createdAt: { type: Date, default: Date.now },
});

export const User = (models.User as mongoose.Model<any>) || model('User', UserSchema);
