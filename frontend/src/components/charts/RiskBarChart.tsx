import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { ZoneRiskStat } from '../../api/stats.api';
import { riskLevelColor } from '../../utils/riskColors';
import { alertsByZone } from '../../engine/selectors';
import { getStore } from '../../engine/store/alertStore';
import { SEEDED_ZONES } from '../../api/seededData';

interface RiskBarChartProps {
  data?: ZoneRiskStat[];
}

export function RiskBarChart({ data }: RiskBarChartProps) {
  const chartData = useMemo(() => {
    const rawList =
      data && data.length > 0
        ? data
        : alertsByZone(getStore().alerts, SEEDED_ZONES);

    return rawList.slice(0, 8).map((z) => ({
      name: z.name.length > 14 ? z.name.slice(0, 12) + '...' : z.name,
      fullName: z.name,
      risk_score: z.risk_score || z.alert_count * 2,
      risk_level: z.risk_level,
      alert_count: z.alert_count,
    }));
  }, [data]);

  return (
    <div className="w-full h-64 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#2a3832" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            stroke="#b4c2bb"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#2a3832' }}
          />
          <YAxis
            stroke="#b4c2bb"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#2a3832' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111816',
              borderColor: '#2a3832',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f1f5f3',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
            formatter={(value: any) => [`${value} pts`, 'Vulnerability Index']}
            labelFormatter={(label: any, payload: any) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullName || label;
              }
              return label;
            }}
          />
          <Bar dataKey="risk_score" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => {
              const color = (riskLevelColor as any)[entry.risk_level] || '#22c55e';
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
