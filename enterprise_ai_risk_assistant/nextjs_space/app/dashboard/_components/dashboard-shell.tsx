'use client';
import Header from '../../components/header';
import DashboardContent from './dashboard-content';

export default function DashboardShell() {
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Header />
      <DashboardContent />
    </div>
  );
}
