'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, AlertTriangle, CheckCircle, Brain, FileText, Shield,
  ChevronDown, ChevronUp, Sparkles, ArrowRight, RefreshCw, Sliders
} from 'lucide-react';
import RiskVisualization from './risk-visualization';

interface RiskResult {
  riskProbability: number;
  riskLevel: string;
  recommendation: string;
  featureContributions: { feature: string; impact: string; value: number }[];
  explanation: string;
}

interface QueryResult {
  response: string;
  riskResult: RiskResult | null;
  ragResult: { retrievedChunks: string[] } | null;
  routeDecision: { route: string; reasoning: string };
  security: { piiRedacted: string[] };
  latencyMs: number;
}

const EXAMPLE_QUERIES = [
  { text: 'Assess risk for credit score 580, DTI 0.45, income $50,000, loan $30,000, 2 years at job', type: 'risk' },
  { text: 'What are the credit score requirements for loan approval?', type: 'policy' },
  { text: 'Evaluate risk score for a low-risk applicant with credit score 780 and explain the policy criteria', type: 'both' },
  { text: 'What is the maximum debt-to-income ratio allowed?', type: 'policy' },
];

export default function QueryInterface() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState('');
  const [showFeatures, setShowFeatures] = useState(false);
  const [features, setFeatures] = useState({
    creditScore: 650,
    debtToIncome: 0.35,
    annualIncome: 65000,
    loanAmount: 20000,
    yearsAtJob: 3,
  });
  const responseRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (queryText?: string) => {
    const q = queryText ?? query;
    if (!q?.trim() || loading) return;
    setLoading(true);
    setStreamedText('');
    setResult(null);
    setError('');

    try {
      const response = await fetch('/api/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, userFeatures: showFeatures ? features : undefined }),
      });

      if (!response?.ok) {
        const errData = await response?.json().catch(() => ({}));
        setError(errData?.error ?? `Error: ${response?.status}`);
        setLoading(false);
        return;
      }

      const reader = response?.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines?.pop() ?? '';
        for (const line of (lines ?? [])) {
          if (line?.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'streaming') {
                setStreamedText((prev) => (prev ?? '') + (parsed?.content ?? ''));
              } else if (parsed?.status === 'completed') {
                setResult(parsed as QueryResult);
              } else if (parsed?.status === 'error') {
                setError(parsed?.message ?? 'Unknown error');
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (responseRef?.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamedText]);

  const routeColor = result?.routeDecision?.route === 'ml' ? 'blue' : result?.routeDecision?.route === 'rag' ? 'emerald' : result?.routeDecision?.route === 'both' ? 'purple' : 'slate';

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-400" /> Risk Assessment Query
        </h1>
        <p className="text-slate-400 mb-6">Ask about financial risk scoring, policy requirements, or get comprehensive assessments</p>
      </motion.div>

      {/* Query Input */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b] shadow-lg mb-6"
      >
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={query}
              onChange={(e) => setQuery(e?.target?.value ?? '')}
              onKeyDown={(e) => { if (e?.key === 'Enter' && !e?.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask a risk assessment or policy question..."
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none min-h-[80px] text-sm"
              rows={3}
            />
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !(query?.trim())}
            className="self-end px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg flex items-center gap-2 font-medium disabled:opacity-40 transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Processing' : 'Send'}
          </button>
        </div>

        {/* Feature inputs toggle */}
        <div className="mt-3">
          <button
            onClick={() => setShowFeatures(!showFeatures)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            Custom Financial Profile
            {showFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <AnimatePresence>
            {showFeatures && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                  {[
                    { key: 'creditScore', label: 'Credit Score', min: 300, max: 850, step: 10 },
                    { key: 'debtToIncome', label: 'DTI Ratio', min: 0.1, max: 0.6, step: 0.01 },
                    { key: 'annualIncome', label: 'Annual Income', min: 30000, max: 200000, step: 5000 },
                    { key: 'loanAmount', label: 'Loan Amount', min: 5000, max: 50000, step: 1000 },
                    { key: 'yearsAtJob', label: 'Years at Job', min: 0, max: 40, step: 1 },
                  ].map((f: any) => (
                    <div key={f.key}>
                      <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
                      <input
                        type="number"
                        value={(features as any)?.[f.key] ?? 0}
                        onChange={(e) => setFeatures((prev) => ({ ...(prev ?? {}), [f.key]: parseFloat(e?.target?.value ?? '0') || 0 }))}
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        className="w-full bg-[#111827] border border-[#1e293b] rounded-md px-2.5 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Example queries */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((ex: any, i: number) => (
            <button
              key={i}
              onClick={() => { setQuery(ex.text); handleSubmit(ex.text); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                ex.type === 'risk' ? 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10' :
                ex.type === 'policy' ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10' :
                'border-purple-500/20 text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              {(ex?.text ?? '').length > 60 ? (ex.text.substring(0, 60) + '...') : ex.text}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">Query Error</p>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Streaming Response */}
      {(loading || streamedText || result) && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {/* Route info */}
          {result?.routeDecision && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${
                routeColor === 'blue' ? 'bg-blue-500/15 text-blue-400' :
                routeColor === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' :
                routeColor === 'purple' ? 'bg-purple-500/15 text-purple-400' :
                'bg-slate-500/15 text-slate-400'
              }`}>
                {result.routeDecision.route === 'ml' && <><Brain className="w-3 h-3" /> ML Risk Engine</>}
                {result.routeDecision.route === 'rag' && <><FileText className="w-3 h-3" /> RAG Policy Engine</>}
                {result.routeDecision.route === 'both' && <><Sparkles className="w-3 h-3" /> ML + RAG Combined</>}
                {result.routeDecision.route === 'unknown' && <><AlertTriangle className="w-3 h-3" /> General</>}
              </span>
              {(result?.security?.piiRedacted?.length ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-400">
                  <Shield className="w-3 h-3" /> PII Redacted: {(result?.security?.piiRedacted ?? []).join(', ')}
                </span>
              )}
              <span className="text-xs text-slate-500">{result?.latencyMs ?? 0}ms</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main response */}
            <div className={`${result?.riskResult ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b] shadow-lg h-full">
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  {loading ? 'Generating Response...' : 'AI Response'}
                </h3>
                <div ref={responseRef} className="prose-dark text-sm leading-relaxed max-h-[400px] overflow-y-auto pr-2 whitespace-pre-wrap">
                  {result?.response ?? streamedText ?? ''}
                  {loading && <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />}
                </div>
              </div>
            </div>

            {/* Risk visualization */}
            {result?.riskResult && (
              <div className="lg:col-span-1">
                <RiskVisualization riskResult={result.riskResult} />
              </div>
            )}
          </div>

          {/* RAG sources */}
          {result?.ragResult && (result?.ragResult?.retrievedChunks?.length ?? 0) > 0 && (
            <div className="mt-4 bg-[#1a2332] rounded-xl p-4 border border-[#1e293b] shadow-lg">
              <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Policy Sources Referenced
              </h3>
              <div className="flex flex-wrap gap-2">
                {(result?.ragResult?.retrievedChunks ?? []).map((chunk: string, i: number) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {chunk}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}
