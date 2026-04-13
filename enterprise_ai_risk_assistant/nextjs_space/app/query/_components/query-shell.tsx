'use client';
import Header from '../../components/header';
import QueryInterface from './query-interface';

export default function QueryShell() {
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Header />
      <QueryInterface />
    </div>
  );
}
