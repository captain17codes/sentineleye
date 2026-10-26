import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { SeverityStat } from '../../api/stats.api';
import { severityColor } from '../../utils/riskColors';
import { useAlerts } from '../../hooks/useAlerts';
import { severityDistribution } from '../../engine/selectors';

interface SeverityDonutProps {
  data?: SeverityStat[];
}

export function SeverityDonut({ data: propData }: SeverityDonutProps) {
  const { alerts } = useAlerts();
  const effectiveData = (propData && propData.length > 0) ? propData : severityDistribution(alerts);

  const chartData = effectiveData.map((d) => ({
    name: d.severity,
    value: d.count,
  }));

  return (
    <div className="w-full h-64 flex flex-col items-center justify-between select-none">
      <ResponsiveContainer width="100%" height="78%">
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: '#111826',
              borderColor: '#222c3d',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#e6eaf0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
            formatter={(value: any, name: any) => [`${value} incidents`, `${name}`]}
          />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => {
              const color = severityColor[entry.name as keyof typeof severityColor] || '#64748b';
              return <Cell key={`cell-${entry.name}`} fill={color} stroke="#111826" strokeWidth={2} />;
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 text-xs">
        {chartData.map((item) => {
          const color = severityColor[item.name as keyof typeof severityColor] || '#64748b';
          return (
            <div key={item.name} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[#98a2b3] capitalize">{item.name.toLowerCase()}:</span>
              <span className="font-semibold text-[#e6eaf0] font-mono">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
