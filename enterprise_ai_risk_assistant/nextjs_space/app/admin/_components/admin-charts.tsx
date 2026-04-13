'use client';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

interface Props {
  routeDistribution: { route: string; count: number }[];
  riskDistribution: { level: string; count: number }[];
}

const ROUTE_COLORS: Record<string, string> = { ml: '#3b82f6', rag: '#10b981', both: '#a855f7', unknown: '#64748b' };
const RISK_COLORS: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

export default function AdminCharts({ routeDistribution, riskDistribution }: Props) {
  const routeData = (routeDistribution ?? []).map((r: any) => ({
    name: (r?.route ?? 'unknown') === 'ml' ? 'ML Risk' : (r?.route ?? '') === 'rag' ? 'RAG Policy' : (r?.route ?? '') === 'both' ? 'Combined' : 'Other',
    value: r?.count ?? 0,
    color: ROUTE_COLORS[r?.route ?? 'unknown'] ?? '#64748b',
  }));

  const riskData = (riskDistribution ?? []).map((r: any) => ({
    name: r?.level ?? 'Unknown',
    value: r?.count ?? 0,
    fill: RISK_COLORS[r?.level ?? ''] ?? '#64748b',
  }));

  const hasRouteData = (routeData?.length ?? 0) > 0 && routeData.some((d: any) => (d?.value ?? 0) > 0);
  const hasRiskData = (riskData?.length ?? 0) > 0 && riskData.some((d: any) => (d?.value ?? 0) > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b] shadow-lg">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Query Route Distribution</h3>
        {hasRouteData ? (
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={routeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  dataKey="value"
                  paddingAngle={3}
                  stroke="none"
                >
                  {routeData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry?.color ?? '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a2332', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
        )}
        {hasRouteData && (
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {routeData.map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d?.color ?? '#64748b' }} />
                <span className="text-slate-400">{d?.name}: {d?.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#1a2332] rounded-xl p-5 border border-[#1e293b] shadow-lg">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Risk Level Distribution</h3>
        {hasRiskData ? (
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#1e293b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#1e293b' }} />
                <Tooltip
                  contentStyle={{ background: '#1a2332', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 11 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
        )}
      </div>
    </div>
  );
}
