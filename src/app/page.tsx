import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const me = await getCurrentUser();
  redirect(me ? '/chat' : '/lock');
}
