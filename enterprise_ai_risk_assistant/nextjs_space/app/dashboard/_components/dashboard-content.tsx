'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Shield, Activity, Search, History, Brain, FileText, Lock, Zap,
  ArrowRight, TrendingUp, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';

interface QueryItem {
  id: string;
  queryText: string;
  routeType: string;
  latencyMs: number;
  createdAt: string;
  riskAssessment: { riskLevel: string; riskProbability: number } | null;
}

export default function DashboardContent() {
  const { data: session } = useSession() || {};
  const [recentQueries, setRecentQueries] = useState<QueryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, avgLatency: 0 });

  useEffect(() => {
    fetch('/api/queries/history')
      .then((r) => r.json())
      .then((data: any) => {
        const queries = data?.queries ?? [];
        setRecentQueries(queries.slice(0, 5));
        const totalLatency = queries.reduce((s: number, q: any) => s + (q?.latencyMs ?? 0), 0);
        setStats({
          total: queries?.length ?? 0,
          avgLatency: queries.length > 0 ? Math.round(totalLatency / queries.length) : 0,
        });
      })
      .catch(() => {});
  }, []);

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'there';

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold text-white mb-1">
          Welcome back, <span className="text-blue-400">{userName}</span>
        </h1>
        <p className="text-slate-400 mb-8">AI-powered risk assessment and policy intelligence at your fingertips</p>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { href: '/query', icon: <Search className="w-5 h-5" />, title: 'New Query', desc: 'Ask risk or policy questions', color: 'blue' },
          { href: '/history', icon: <History className="w-5 h-5" />, title: 'Query History', desc: 'View past assessments', color: 'emerald' },
          { href: '/query', icon: <TrendingUp className="w-5 h-5" />, title: 'Risk Assessment', desc: 'Score a financial profile', color: 'amber' },
        ].map((action: any, i: number) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Link href={action.href} className="block group">
              <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b] hover:border-blue-500/30 transition-all shadow-lg hover:shadow-xl hover:shadow-blue-500/5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  action.color === 'blue' ? 'bg-blue-500/15 text-blue-400' :
                  action.color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' :
                  'bg-amber-500/15 text-amber-400'
                }`}>
                  {action.icon}
                </div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  {action.title}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                </h3>
                <p className="text-slate-400 text-sm mt-1">{action.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Queries', value: stats.total, icon: <Activity className="w-4 h-4" /> },
          { label: 'Avg Latency', value: `${stats.avgLatency}ms`, icon: <Clock className="w-4 h-4" /> },
          { label: 'ML Engine', value: 'Active', icon: <Brain className="w-4 h-4" /> },
          { label: 'Security', value: 'Active', icon: <Lock className="w-4 h-4" /> },
        ].map((stat: any, i: number) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
            className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b] shadow-lg"
          >
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              {stat.icon} {stat.label}
            </div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* System Architecture */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-[#1a2332] rounded-xl p-6 border border-[#1e293b] shadow-lg mb-8"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" /> System Architecture
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: <Shield className="w-5 h-5" />, label: 'Security Layer', desc: 'PII redaction & injection defense', color: 'red' },
            { icon: <Brain className="w-5 h-5" />, label: 'Agent Router', desc: 'Intelligent query routing', color: 'purple' },
            { icon: <TrendingUp className="w-5 h-5" />, label: 'ML Risk Engine', desc: 'Financial risk scoring', color: 'blue' },
            { icon: <FileText className="w-5 h-5" />, label: 'RAG Engine', desc: 'Policy document retrieval', color: 'green' },
            { icon: <Activity className="w-5 h-5" />, label: 'Monitoring', desc: 'Logs & analytics', color: 'amber' },
          ].map((item: any) => (
            <div key={item.label} className="bg-[#111827] rounded-lg p-3 border border-[#1e293b]">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2 ${
                item.color === 'red' ? 'bg-red-500/15 text-red-400' :
                item.color === 'purple' ? 'bg-purple-500/15 text-purple-400' :
                item.color === 'blue' ? 'bg-blue-500/15 text-blue-400' :
                item.color === 'green' ? 'bg-emerald-500/15 text-emerald-400' :
                'bg-amber-500/15 text-amber-400'
              }`}>{item.icon}</div>
              <h4 className="text-sm font-medium text-white">{item.label}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Queries */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-[#1a2332] rounded-xl p-6 border border-[#1e293b] shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" /> Recent Queries
          </h2>
          <Link href="/history" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {(recentQueries?.length ?? 0) === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No queries yet. Start by asking a question!</p>
            <Link href="/query" className="inline-flex items-center gap-1 mt-3 text-blue-400 hover:text-blue-300 text-sm">
              New Query <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(recentQueries ?? []).map((q: QueryItem) => (
              <div key={q?.id} className="flex items-center gap-3 p-3 bg-[#111827] rounded-lg border border-[#1e293b] hover:border-blue-500/20 transition-all">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  q?.riskAssessment?.riskLevel === 'High' ? 'bg-red-400' :
                  q?.riskAssessment?.riskLevel === 'Medium' ? 'bg-amber-400' :
                  q?.riskAssessment?.riskLevel === 'Low' ? 'bg-emerald-400' : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{q?.queryText ?? ''}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {q?.routeType?.toUpperCase() ?? 'N/A'} • {q?.latencyMs ?? 0}ms
                  </p>
                </div>
                {q?.riskAssessment && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    q.riskAssessment.riskLevel === 'High' ? 'bg-red-500/15 text-red-400' :
                    q.riskAssessment.riskLevel === 'Medium' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-emerald-500/15 text-emerald-400'
                  }`}>
                    {q.riskAssessment.riskLevel}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </main>
  );
}
