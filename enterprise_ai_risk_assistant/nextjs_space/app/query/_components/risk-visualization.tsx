'use client';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const RiskChart = dynamic(() => import('./risk-chart'), { ssr: false, loading: () => <div className="h-[180px] shimmer rounded-lg" /> });

interface RiskResult {
  riskProbability: number;
  riskLevel: string;
  recommendation: string;
  featureContributions: { feature: string; impact: string; value: number; contribution?: number }[];
  explanation: string;
  modelVersion?: string;
  confidence?: number;
}

export default function RiskVisualization({ riskResult }: { riskResult: RiskResult }) {
  const prob = (riskResult?.riskProbability ?? 0) * 100;
  const level = riskResult?.riskLevel ?? 'Low';
  const levelColor = level === 'High' ? 'red' : level === 'Medium' ? 'amber' : 'emerald';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b] shadow-lg space-y-4"
    >
      <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-400" /> Risk Score
      </h3>

      {/* Score circle */}
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 ${
          levelColor === 'red' ? 'border-red-500/50 bg-red-500/10' :
          levelColor === 'amber' ? 'border-amber-500/50 bg-amber-500/10' :
          'border-emerald-500/50 bg-emerald-500/10'
        }`}>
          <div>
            <div className={`text-2xl font-bold ${
              levelColor === 'red' ? 'text-red-400' :
              levelColor === 'amber' ? 'text-amber-400' : 'text-emerald-400'
            }`}>{prob.toFixed(1)}%</div>
            <div className="text-xs text-slate-500">Probability</div>
          </div>
        </div>
      </div>

      {/* Level badge */}
      <div className="flex items-center justify-center gap-2">
        {level === 'High' && <AlertTriangle className="w-4 h-4 text-red-400" />}
        {level === 'Medium' && <MinusCircle className="w-4 h-4 text-amber-400" />}
        {level === 'Low' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
        <span className={`text-sm font-semibold ${
          levelColor === 'red' ? 'text-red-400' :
          levelColor === 'amber' ? 'text-amber-400' : 'text-emerald-400'
        }`}>{level} Risk</span>
      </div>

      {/* Model info & Confidence */}
      {(riskResult?.modelVersion || riskResult?.confidence) && (
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
          {riskResult?.modelVersion && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              {riskResult.modelVersion}
            </span>
          )}
          {typeof riskResult?.confidence === 'number' && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {(riskResult.confidence * 100).toFixed(1)}% confidence
            </span>
          )}
        </div>
      )}

      {/* Recommendation */}
      <div className={`text-xs text-center px-3 py-2 rounded-lg ${
        levelColor === 'red' ? 'bg-red-500/10 text-red-300' :
        levelColor === 'amber' ? 'bg-amber-500/10 text-amber-300' :
        'bg-emerald-500/10 text-emerald-300'
      }`}>
        {riskResult?.recommendation ?? 'N/A'}
      </div>

      {/* Feature chart */}
      <RiskChart features={riskResult?.featureContributions ?? []} />

      {/* Feature breakdown */}
      <div className="space-y-2">
        {(riskResult?.featureContributions ?? []).map((fc: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{fc?.feature ?? 'N/A'}</span>
            <span className={`flex items-center gap-1 ${
              fc?.impact === 'Negative' ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {fc?.impact === 'Negative' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {fc?.impact ?? 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
