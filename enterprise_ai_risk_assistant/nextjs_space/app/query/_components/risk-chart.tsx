'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface Feature {
  feature: string;
  impact: string;
  value: number;
}

export default function RiskChart({ features }: { features: Feature[] }) {
  const data = (features ?? []).map((f: any) => {
    const feature = f?.feature ?? 'N/A';
    let normalizedValue = 0;
    if (feature === 'Credit Score') normalizedValue = ((f?.value ?? 650) - 300) / 550 * 100;
    else if (feature === 'Debt-to-Income') normalizedValue = (f?.value ?? 0.3) * 100;
    else if (feature === 'Annual Income') normalizedValue = ((f?.value ?? 60000) - 30000) / 170000 * 100;
    else if (feature === 'Loan Amount') normalizedValue = ((f?.value ?? 20000) - 5000) / 45000 * 100;
    else if (feature === 'Years at Job') normalizedValue = ((f?.value ?? 3) / 40) * 100;
    return {
      name: feature?.replace(/\s+/g, '\n')?.substring(0, 12) ?? '',
      value: Math.round(normalizedValue),
      fill: f?.impact === 'Negative' ? '#ef4444' : '#10b981',
    };
  });

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <XAxis
            dataKey="name"
            tickLine={false}
            tick={{ fontSize: 9, fill: '#64748b' }}
            axisLine={{ stroke: '#1e293b' }}
          />
          <YAxis
            tickLine={false}
            tick={{ fontSize: 9, fill: '#64748b' }}
            axisLine={{ stroke: '#1e293b' }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{ background: '#1a2332', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 11 }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
