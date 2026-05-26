/**
 * Seeds exactly two users. Idempotent. Run: npm run seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/mongo';
import { User } from '../src/models/User';

async function upsert(handle: string, displayName: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ handle });
  if (existing) {
    existing.displayName = displayName;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`↻ updated ${handle}`);
  } else {
    await User.create({ handle, displayName, passwordHash });
    console.log(`✓ created ${handle}`);
  }
}

async function main() {
  await connectDB();
  if (!process.env.USER_A_PASSWORD || !process.env.USER_B_PASSWORD) {
    throw new Error('Set USER_A_PASSWORD and USER_B_PASSWORD in .env');
  }
  await upsert(process.env.USER_A_HANDLE!, process.env.USER_A_DISPLAY!, process.env.USER_A_PASSWORD!);
  await upsert(process.env.USER_B_HANDLE!, process.env.USER_B_DISPLAY!, process.env.USER_B_PASSWORD!);
  await mongoose.disconnect();
  console.log('\n💜 Seed complete. Two users ready.\n');
}
main().catch((e) => { console.error(e); process.exit(1); });
