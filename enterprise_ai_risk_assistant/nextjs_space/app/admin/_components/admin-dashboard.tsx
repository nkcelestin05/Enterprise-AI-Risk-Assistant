'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard, Users, Activity, Shield, AlertTriangle, Clock,
  Brain, FileText, Sparkles, RefreshCw, TrendingUp, Eye
} from 'lucide-react';

const AdminCharts = dynamic(() => import('./admin-charts'), { ssr: false, loading: () => <div className="h-64 shimmer rounded-xl" /> });
const MonitoringCharts = dynamic(() => import('./monitoring-charts'), { ssr: false, loading: () => <div className="h-64 shimmer rounded-xl" /> });

interface AdminStats {
  totalQueries: number;
  totalUsers: number;
  securityEvents: number;
  avgLatency: number;
  recentQueries: any[];
  routeDistribution: { route: string; count: number }[];
  riskDistribution: { level: string; count: number }[];
  securityLogs: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchStats = () => {
    setLoading(true);
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data: any) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <main className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-[#1a2332] rounded shimmer" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i: number) => <div key={i} className="h-24 bg-[#1a2332] rounded-xl shimmer" />)}
          </div>
          <div className="h-64 bg-[#1a2332] rounded-xl shimmer" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-400" /> Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">System performance monitoring and analytics</p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-[#1e293b] transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </motion.div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Queries', value: stats?.totalQueries ?? 0, icon: <Activity className="w-4 h-4" />, color: 'blue' },
          { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: <Users className="w-4 h-4" />, color: 'emerald' },
          { label: 'Security Events', value: stats?.securityEvents ?? 0, icon: <Shield className="w-4 h-4" />, color: 'red' },
          { label: 'Avg Latency', value: `${Math.round(stats?.avgLatency ?? 0)}ms`, icon: <Clock className="w-4 h-4" />, color: 'amber' },
        ].map((s: any, i: number) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b] shadow-lg"
          >
            <div className={`flex items-center gap-2 text-xs mb-2 ${
              s.color === 'blue' ? 'text-blue-400' : s.color === 'emerald' ? 'text-emerald-400' :
              s.color === 'red' ? 'text-red-400' : 'text-amber-400'
            }`}>{s.icon} {s.label}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-[#111827] p-1 rounded-lg inline-flex">
        {['overview', 'queries', 'monitoring', 'security'].map((tab: string) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'queries' ? 'Recent Queries' : tab === 'monitoring' ? 'MLOps Monitoring' : 'Security Logs'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AdminCharts
            routeDistribution={stats?.routeDistribution ?? []}
            riskDistribution={stats?.riskDistribution ?? []}
          />
        </motion.div>
      )}

      {activeTab === 'queries' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#1a2332] rounded-xl border border-[#1e293b] shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[#1e293b]">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" /> Recent Queries
            </h3>
          </div>
          <div className="divide-y divide-[#1e293b]">
            {(stats?.recentQueries ?? []).length === 0 ? (
              <div className="p-8 text-center text-slate-500">No queries yet</div>
            ) : (
              (stats?.recentQueries ?? []).map((q: any, i: number) => (
                <div key={q?.id ?? i} className="p-4 hover:bg-[#1e2a3d] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{q?.queryText ?? ''}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">{q?.userName ?? 'Unknown'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          q?.routeType === 'ml' ? 'bg-blue-500/15 text-blue-400' :
                          q?.routeType === 'rag' ? 'bg-emerald-500/15 text-emerald-400' :
                          q?.routeType === 'both' ? 'bg-purple-500/15 text-purple-400' :
                          'bg-slate-500/15 text-slate-400'
                        }`}>
                          {q?.routeType ?? 'N/A'}
                        </span>
                        <span className="text-xs text-slate-500">{q?.latencyMs ?? 0}ms</span>
                      </div>
                    </div>
                    {q?.riskLevel && (
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        q.riskLevel === 'High' ? 'bg-red-500/15 text-red-400' :
                        q.riskLevel === 'Medium' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-emerald-500/15 text-emerald-400'
                      }`}>{q.riskLevel}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'monitoring' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <MonitoringCharts />
        </motion.div>
      )}

      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#1a2332] rounded-xl border border-[#1e293b] shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[#1e293b]">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" /> Security Event Log
            </h3>
          </div>
          <div className="divide-y divide-[#1e293b]">
            {(stats?.securityLogs ?? []).length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No security events recorded</p>
              </div>
            ) : (
              (stats?.securityLogs ?? []).map((log: any, i: number) => (
                <div key={log?.id ?? i} className="p-4 hover:bg-[#1e2a3d] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      log?.severity === 'critical' ? 'bg-red-400' :
                      log?.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          log?.eventType === 'prompt_injection' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {log?.eventType === 'prompt_injection' ? 'Injection Attempt' : 'PII Detected'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          log?.severity === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>{log?.severity ?? 'info'}</span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{log?.details ?? ''}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {log?.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </main>
  );
}
