import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasVault: !!process.env.VAULT_PASSPHRASE,
  });
}
