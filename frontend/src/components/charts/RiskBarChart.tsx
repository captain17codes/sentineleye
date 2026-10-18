import React from 'react';
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

interface RiskBarChartProps {
  data: ZoneRiskStat[];
}

export function RiskBarChart({ data }: RiskBarChartProps) {
  const chartData =
    data && data.length > 0
      ? data.slice(0, 8).map((z) => ({
          name: z.name.length > 14 ? z.name.slice(0, 12) + '...' : z.name,
          fullName: z.name,
          risk_score: z.risk_score || z.alert_count * 2,
          risk_level: z.risk_level,
          alert_count: z.alert_count,
        }))
      : [
          { name: 'Aravalli Alpha', fullName: 'Aravalli Biodiversity Park', risk_score: 24, risk_level: 'critical', alert_count: 8 },
          { name: 'Yamuna Flood', fullName: 'Yamuna Floodplain Corridor', risk_score: 18, risk_level: 'high', alert_count: 6 },
          { name: 'Delhi Ridge', fullName: 'Delhi Southern Ridge', risk_score: 15, risk_level: 'critical', alert_count: 5 },
          { name: 'Mangar Bani', fullName: 'Mangar Bani Sacred Grove', risk_score: 12, risk_level: 'high', alert_count: 4 },
          { name: 'Sariska B', fullName: 'Sariska Buffer North', risk_score: 9, risk_level: 'high', alert_count: 3 },
          { name: 'Ranthambore', fullName: 'Ranthambore Ecological Belt', risk_score: 6, risk_level: 'medium', alert_count: 2 },
          { name: 'Haryana Res', fullName: 'Haryana Reserve Forest', risk_score: 4, risk_level: 'medium', alert_count: 2 },
          { name: 'Bhindawas', fullName: 'Bhindawas Wildlife Sanctuary', risk_score: 2, risk_level: 'low', alert_count: 1 },
        ];

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
