'use client';
import Header from '../../components/header';
import HistoryContent from './history-content';

export default function HistoryShell() {
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Header />
      <HistoryContent />
    </div>
  );
}
