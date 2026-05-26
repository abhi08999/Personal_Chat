import mongoose from 'mongoose';

let promise: Promise<typeof mongoose> | null = null;

export async function connectDB() {
  const state = mongoose.connection.readyState;
  if (state === 1) return mongoose; // connected
  if (state === 2 && promise) return promise; // connecting — reuse in-flight promise
  // disconnected (0) or disconnecting (3) — reset and reconnect
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  promise = mongoose.connect(uri);
  return promise;
}
