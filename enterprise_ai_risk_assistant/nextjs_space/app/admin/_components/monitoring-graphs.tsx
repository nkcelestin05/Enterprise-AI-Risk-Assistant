'use client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar,
  CartesianGrid, Area, AreaChart
} from 'recharts';

interface Props {
  type: 'latencyTrend' | 'throughputTrend' | 'featureImportance';
  data: any[];
}

const tooltipStyle = {
  background: '#1a2332',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  fontSize: 11,
};

export default function MonitoringGraphs({ type, data }: Props) {
  if (!data || data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No data available</div>;
  }

  if (type === 'latencyTrend') {
    const chartData = data.map((d: any) => ({
      time: formatTime(d.time),
      P50: d.p50,
      P95: d.p95,
      P99: d.p99,
    }));

    return (
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="P50" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="P95" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="P99" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'throughputTrend') {
    const chartData = data.map((d: any) => ({
      time: formatTime(d.time),
      Queries: d.count,
    }));

    return (
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="Queries" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'featureImportance') {
    const chartData = (data as any[]).map((d: any) => ({
      name: d.feature ?? 'Unknown',
      Importance: Math.round((d.importance ?? 0) * 100),
    }));

    return (
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} width={55} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'Importance']} />
            <Bar dataKey="Importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}

function formatTime(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:00`;
  } catch {
    return isoStr;
  }
}
