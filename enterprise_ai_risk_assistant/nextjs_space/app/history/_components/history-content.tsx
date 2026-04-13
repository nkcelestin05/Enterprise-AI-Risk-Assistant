'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Brain, FileText, Sparkles, AlertTriangle, Clock, Search, Filter } from 'lucide-react';

interface QueryItem {
  id: string;
  queryText: string;
  routeType: string;
  status: string;
  latencyMs: number;
  createdAt: string;
  riskAssessment: { riskProbability: number; riskLevel: string; recommendation: string } | null;
  ragResult: { retrievedChunks: string; answer: string } | null;
}

export default function HistoryContent() {
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/queries/history')
      .then((r) => r.json())
      .then((data: any) => setQueries(data?.queries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = (queries ?? []).filter((q: QueryItem) => {
    const matchesFilter = filter === 'all' || q?.routeType === filter;
    const matchesSearch = !search || (q?.queryText ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <History className="w-6 h-6 text-blue-400" /> Query History
        </h1>
        <p className="text-slate-400 mb-6">Review past risk assessments and policy queries</p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e?.target?.value ?? '')}
            placeholder="Search queries..."
            className="w-full pl-10 pr-4 py-2 bg-[#1a2332] border border-[#1e293b] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-slate-500 mr-1" />
          {['all', 'ml', 'rag', 'both'].map((f: string) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'bg-[#1a2332] text-slate-400 border border-[#1e293b] hover:border-blue-500/20'
              }`}
            >
              {f === 'all' ? 'All' : f === 'ml' ? 'ML Risk' : f === 'rag' ? 'RAG Policy' : 'Combined'}
            </button>
          ))}
        </div>
      </div>

      {/* Query list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i: number) => (
            <div key={i} className="h-20 bg-[#1a2332] rounded-xl shimmer border border-[#1e293b]" />
          ))}
        </div>
      ) : (filtered?.length ?? 0) === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No queries found</p>
          <p className="text-sm mt-1">Your query history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(filtered ?? []).map((q: QueryItem, i: number) => (
            <motion.div
              key={q?.id ?? i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b] shadow-lg hover:border-blue-500/20 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  q?.routeType === 'ml' ? 'bg-blue-500/15 text-blue-400' :
                  q?.routeType === 'rag' ? 'bg-emerald-500/15 text-emerald-400' :
                  q?.routeType === 'both' ? 'bg-purple-500/15 text-purple-400' :
                  'bg-slate-500/15 text-slate-400'
                }`}>
                  {q?.routeType === 'ml' ? <Brain className="w-4 h-4" /> :
                   q?.routeType === 'rag' ? <FileText className="w-4 h-4" /> :
                   q?.routeType === 'both' ? <Sparkles className="w-4 h-4" /> :
                   <AlertTriangle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{q?.queryText ?? ''}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {q?.createdAt ? new Date(q.createdAt).toLocaleString() : 'N/A'}
                    </span>
                    <span className="text-xs text-slate-500">{q?.latencyMs ?? 0}ms</span>
                    {q?.riskAssessment && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        q.riskAssessment.riskLevel === 'High' ? 'bg-red-500/15 text-red-400' :
                        q.riskAssessment.riskLevel === 'Medium' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {q.riskAssessment.riskLevel} ({((q.riskAssessment?.riskProbability ?? 0) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
