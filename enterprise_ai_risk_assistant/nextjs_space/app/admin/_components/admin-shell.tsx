'use client';
import Header from '../../components/header';
import AdminDashboard from './admin-dashboard';

export default function AdminShell() {
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Header />
      <AdminDashboard />
    </div>
  );
}
