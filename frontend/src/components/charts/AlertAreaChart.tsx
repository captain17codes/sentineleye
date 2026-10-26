import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DayStat } from '../../api/stats.api';

interface AlertAreaChartProps {
  data: DayStat[];
}

export function AlertAreaChart({ data }: AlertAreaChartProps) {
  const chartData =
    data && data.length > 0
      ? data.map((d) => ({
          day: d.day ? d.day.slice(5) : 'Day',
          fullDay: d.day,
          count: d.count,
          area: d.area_m2 ? Math.round(d.area_m2) : undefined,
        }))
      : [
          { day: '10-01', fullDay: '2026-10-01', count: 1 },
          { day: '10-05', fullDay: '2026-10-05', count: 3 },
          { day: '10-09', fullDay: '2026-10-09', count: 2 },
          { day: '10-12', fullDay: '2026-10-12', count: 6 },
          { day: '10-15', fullDay: '2026-10-15', count: 1 },
          { day: '10-18', fullDay: '2026-10-18', count: 7 },
        ];

  return (
    <div className="w-full h-64 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#facc15" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#facc15" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#222c3d" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            stroke="#98a2b3"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#222c3d' }}
          />
          <YAxis
            stroke="#98a2b3"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#222c3d' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111826',
              borderColor: '#222c3d',
              borderRadius: '8px',
              color: '#e6eaf0',
              fontSize: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
            labelStyle={{ color: '#e6eaf0', fontWeight: 600 }}
            formatter={(value: any) => [`${value} incidents`, 'Encroachments']}
            labelFormatter={(label: string) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Encroachments"
            stroke="#facc15"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#areaGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
