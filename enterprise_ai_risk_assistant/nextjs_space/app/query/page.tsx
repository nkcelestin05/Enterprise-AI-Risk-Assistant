import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import QueryShell from './_components/query-shell';

export const dynamic = 'force-dynamic';

export default async function QueryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <QueryShell />;
}
