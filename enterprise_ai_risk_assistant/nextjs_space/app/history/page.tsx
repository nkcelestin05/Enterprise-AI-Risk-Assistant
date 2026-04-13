import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import HistoryShell from './_components/history-shell';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <HistoryShell />;
}
