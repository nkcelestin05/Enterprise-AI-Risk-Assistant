'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Gauge, Brain, BarChart3, AlertTriangle, CheckCircle,
  TrendingUp, Clock, Zap, Target, Layers, ShieldAlert, RefreshCw
} from 'lucide-react';
import dynamic from 'next/dynamic';

const MonitoringGraphs = dynamic(() => import('./monitoring-graphs'), {
  ssr: false,
  loading: () => <div className="h-64 shimmer rounded-xl" />,
});

interface MonitoringData {
  latencyPercentiles: {
    p50: number; p95: number; p99: number;
    avg: number; min: number; max: number; count: number;
  };
  latencyTrend: { time: string; p50: number; p95: number; p99: number }[];
  modelPerformance: {
    version: string;
    accuracy: number; precision: number; recall: number;
    f1Score: number; aucRoc: number;
    totalSamples: number; trainingTimeMs: number;
    featureImportance: { feature: string; importance: number }[] | null;
    confusionMatrix: { tp: number; fp: number; tn: number; fn: number } | null;
    trainedAt: string;
  } | null;
  modelHistory: { version: string; accuracy: number; f1Score: number; aucRoc: number; createdAt: string }[];
  throughput: {
    totalAllTime: number; last24h: number; avgPerHour: number;
    trend: { time: string; count: number }[];
  };
  predictionDistribution: {
    riskLevelCounts: { High: number; Medium: number; Low: number };
    totalPredictions: number;
    avgProbability: number;
    avgConfidence: number;
  };
  featureDrift: { feature: string; driftScore: number; status: string; meanBefore: number; meanAfter: number }[];
  errorRate: { totalErrors: number; totalQueries: number; rate: number };
}

export default function MonitoringCharts() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('latency');

  const fetchData = () => {
    setLoading(true);
    fetch('/api/admin/monitoring')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-[#1a2332] rounded-xl shimmer" />)}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-500 py-12">Failed to load monitoring data</div>;
  }

  const sections = [
    { id: 'latency', label: 'Latency', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'model', label: 'Model', icon: <Brain className="w-3.5 h-3.5" /> },
    { id: 'throughput', label: 'Throughput', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'drift', label: 'Drift', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'errors', label: 'Errors', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  ];

  const mp = data.modelPerformance;
  const cm = mp?.confusionMatrix;

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex gap-1 bg-[#111827] p-1 rounded-lg inline-flex flex-wrap">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeSection === s.id ? 'bg-blue-500/15 text-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
        <button onClick={fetchData} className="ml-2 flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-blue-400 transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* ========== LATENCY ========== */}
      {activeSection === 'latency' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Percentile cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'P50 (Median)', value: `${data.latencyPercentiles.p50}ms`, color: 'emerald' },
              { label: 'P95', value: `${data.latencyPercentiles.p95}ms`, color: 'amber' },
              { label: 'P99', value: `${data.latencyPercentiles.p99}ms`, color: 'red' },
              { label: 'Sample Count', value: data.latencyPercentiles.count, color: 'blue' },
            ].map((c, i) => (
              <div key={i} className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b]">
                <div className={`text-xs mb-1 ${
                  c.color === 'emerald' ? 'text-emerald-400' :
                  c.color === 'amber' ? 'text-amber-400' :
                  c.color === 'red' ? 'text-red-400' : 'text-blue-400'
                }`}>{c.label}</div>
                <div className="text-xl font-bold text-white">{c.value}</div>
              </div>
            ))}
          </div>
          {/* Latency trend chart */}
          <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b]">
            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" /> Latency Trend (7 days)
            </h4>
            <MonitoringGraphs type="latencyTrend" data={data.latencyTrend} />
          </div>
        </motion.div>
      )}

      {/* ========== MODEL PERFORMANCE ========== */}
      {activeSection === 'model' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {mp ? (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Accuracy', value: `${((mp.accuracy ?? 0) * 100).toFixed(1)}%`, color: 'blue' },
                  { label: 'Precision', value: `${((mp.precision ?? 0) * 100).toFixed(1)}%`, color: 'emerald' },
                  { label: 'Recall', value: `${((mp.recall ?? 0) * 100).toFixed(1)}%`, color: 'amber' },
                  { label: 'F1 Score', value: `${((mp.f1Score ?? 0) * 100).toFixed(1)}%`, color: 'purple' },
                  { label: 'AUC-ROC', value: `${((mp.aucRoc ?? 0) * 100).toFixed(1)}%`, color: 'red' },
                ].map((c, i) => (
                  <div key={i} className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b]">
                    <div className={`text-xs mb-1 ${
                      c.color === 'blue' ? 'text-blue-400' :
                      c.color === 'emerald' ? 'text-emerald-400' :
                      c.color === 'amber' ? 'text-amber-400' :
                      c.color === 'purple' ? 'text-purple-400' : 'text-red-400'
                    }`}>{c.label}</div>
                    <div className="text-xl font-bold text-white">{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Confusion Matrix */}
                {cm && (
                  <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b]">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-400" /> Confusion Matrix
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-emerald-400">True Pos</div>
                        <div className="text-lg font-bold text-emerald-300">{cm.tp}</div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-red-400">False Pos</div>
                        <div className="text-lg font-bold text-red-300">{cm.fp}</div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-amber-400">False Neg</div>
                        <div className="text-lg font-bold text-amber-300">{cm.fn}</div>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-blue-400">True Neg</div>
                        <div className="text-lg font-bold text-blue-300">{cm.tn}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Importance */}
                {mp.featureImportance && (
                  <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b]">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" /> Feature Importance
                    </h4>
                    <MonitoringGraphs type="featureImportance" data={mp.featureImportance} />
                  </div>
                )}
              </div>

              {/* Model info */}
              <div className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b]">
                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>Model: <span className="text-white font-medium">{mp.version}</span></span>
                  <span>Samples: <span className="text-white font-medium">{mp.totalSamples}</span></span>
                  <span>Training Time: <span className="text-white font-medium">{mp.trainingTimeMs}ms</span></span>
                  <span>Trained: <span className="text-white font-medium">{new Date(mp.trainedAt).toLocaleString()}</span></span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#1a2332] rounded-xl p-12 border border-[#1e293b] text-center">
              <Brain className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-500">No model training data yet. Run a risk assessment query to train the model.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ========== THROUGHPUT ========== */}
      {activeSection === 'throughput' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Queries', value: data.throughput.totalAllTime, color: 'blue' },
              { label: 'Last 24h', value: data.throughput.last24h, color: 'emerald' },
              { label: 'Avg/Hour (7d)', value: data.throughput.avgPerHour, color: 'amber' },
            ].map((c, i) => (
              <div key={i} className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b]">
                <div className={`text-xs mb-1 ${
                  c.color === 'blue' ? 'text-blue-400' :
                  c.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
                }`}>{c.label}</div>
                <div className="text-xl font-bold text-white">{c.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b]">
            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" /> Throughput Trend (7 days)
            </h4>
            <MonitoringGraphs type="throughputTrend" data={data.throughput.trend} />
          </div>

          {/* Prediction Distribution */}
          <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b]">
            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-400" /> Prediction Distribution
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Total Predictions</div>
                <div className="text-lg font-bold text-white">{data.predictionDistribution.totalPredictions}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Avg Probability</div>
                <div className="text-lg font-bold text-white">{((data.predictionDistribution.avgProbability ?? 0) * 100).toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Avg Confidence</div>
                <div className="text-lg font-bold text-white">{((data.predictionDistribution.avgConfidence ?? 0) * 100).toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-red-400 mb-1">High Risk</div>
                <div className="text-lg font-bold text-red-400">{data.predictionDistribution.riskLevelCounts.High}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========== FEATURE DRIFT ========== */}
      {activeSection === 'drift' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b]">
            <h4 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" /> Feature Drift Detection
            </h4>
            {data.featureDrift.length > 0 ? (
              <div className="space-y-3">
                {data.featureDrift.map((fd, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#111827] border border-[#1e293b]">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      fd.status === 'drift_detected' ? 'bg-red-400' :
                      fd.status === 'warning' ? 'bg-amber-400' :
                      fd.status === 'stable' ? 'bg-emerald-400' : 'bg-slate-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium capitalize">{fd.feature}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          fd.status === 'drift_detected' ? 'bg-red-500/15 text-red-400' :
                          fd.status === 'warning' ? 'bg-amber-500/15 text-amber-400' :
                          fd.status === 'stable' ? 'bg-emerald-500/15 text-emerald-400' :
                          'bg-slate-500/15 text-slate-400'
                        }`}>
                          {fd.status === 'drift_detected' ? 'Drift Detected' :
                           fd.status === 'warning' ? 'Warning' :
                           fd.status === 'stable' ? 'Stable' : 'Insufficient Data'}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-slate-500">
                        <span>Drift Score: <span className="text-slate-300">{(fd.driftScore * 100).toFixed(1)}%</span></span>
                        {fd.status !== 'insufficient_data' && (
                          <>
                            <span>Before: <span className="text-slate-300">{fd.meanBefore}</span></span>
                            <span>After: <span className="text-slate-300">{fd.meanAfter}</span></span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Drift bar */}
                    <div className="w-20 h-2 bg-[#1e293b] rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full rounded-full transition-all ${
                          fd.status === 'drift_detected' ? 'bg-red-400' :
                          fd.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(fd.driftScore * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No drift data available yet. Run some queries to start monitoring.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ========== ERRORS ========== */}
      {activeSection === 'errors' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b]">
              <div className="text-xs text-blue-400 mb-1">Total Queries</div>
              <div className="text-xl font-bold text-white">{data.errorRate.totalQueries}</div>
            </div>
            <div className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b]">
              <div className="text-xs text-red-400 mb-1">Total Errors</div>
              <div className="text-xl font-bold text-white">{data.errorRate.totalErrors}</div>
            </div>
            <div className="bg-[#1a2332] rounded-xl p-4 border border-[#1e293b]">
              <div className="text-xs text-amber-400 mb-1">Error Rate</div>
              <div className="text-xl font-bold text-white">{((data.errorRate.rate ?? 0) * 100).toFixed(2)}%</div>
            </div>
          </div>
          <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b]">
            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" /> Error Rate Analysis
            </h4>
            <div className="flex items-center gap-3">
              {data.errorRate.rate === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">All systems healthy — no errors detected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">
                    {data.errorRate.totalErrors} error{data.errorRate.totalErrors !== 1 ? 's' : ''} detected out of {data.errorRate.totalQueries} total queries
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
