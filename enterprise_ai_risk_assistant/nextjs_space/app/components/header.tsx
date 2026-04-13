'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Shield, LogOut, LayoutDashboard, History, Home, Activity, User } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
  const { data: session, status } = useSession() || {};
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || status !== 'authenticated') return null;

  const isAdmin = (session?.user as any)?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-[#1e293b]">
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
            AI Risk Assistant
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavButton href="/dashboard" icon={<Home className="w-4 h-4" />} label="Dashboard" />
          <NavButton href="/query" icon={<Activity className="w-4 h-4" />} label="Query" />
          <NavButton href="/history" icon={<History className="w-4 h-4" />} label="History" />
          {isAdmin && (
            <NavButton href="/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Admin" />
          )}
          <div className="flex items-center gap-2 ml-3 pl-3 border-l border-[#1e293b]">
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{session?.user?.name ?? session?.user?.email ?? 'User'}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}
