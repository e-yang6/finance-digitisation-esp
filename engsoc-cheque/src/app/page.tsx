import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();
  const role = session?.user?.role;

  if (!role) {
    redirect('/login');
  }

  if (role === 'officer') {
    redirect('/dashboard');
  }

  redirect('/apply');
}
