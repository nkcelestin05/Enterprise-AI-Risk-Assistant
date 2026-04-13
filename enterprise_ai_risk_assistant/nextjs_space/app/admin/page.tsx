import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import AdminShell from './_components/admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if ((session.user as any)?.role !== 'admin') redirect('/dashboard');
  return <AdminShell />;
}
