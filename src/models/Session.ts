import mongoose, { Schema, models, model } from 'mongoose';

const SessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userAgent: String,
  ip: String,
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
});

export const Session = (models.Session as mongoose.Model<any>) || model('Session', SessionSchema);
