import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAlerts } from '../../hooks/useAlerts';
import { Alert } from '../../types/alert.types';

export interface SpectralAnalysisChartProps {
  alerts?: Alert[];
}

export function SpectralAnalysisChart({ alerts: propAlerts }: SpectralAnalysisChartProps) {
  const { alerts: contextAlerts } = useAlerts();
  const alerts = propAlerts || contextAlerts || [];

  // Generate real points derived from the alert store
  const validPoints = alerts.map((a) => {
    const ndvi = (a as any).ndvi_delta ?? -0.25;
    const sar = (a as any).sar_delta ? ((a as any).sar_delta / 8) : 0.6; // normalized 0..1 for graph
    return {
      name: a.zone_name || `Alert #${a.id}`,
      ndvi: Number(ndvi.toFixed(2)),
      sar: Number(Math.max(0.1, Math.min(0.98, sar)).toFixed(2)),
      class: a.class,
      area: a.area_m2 || 3500,
      rejected: false,
    };
  });

  // Seeded rejected seasonal-farming detections (showing why SAR+NDVI fusion rejects false positives)
  const rejectedPoints = [
    { name: 'Crop Harvest Patch A', ndvi: -0.32, sar: 0.12, class: 'Seasonal Farming (Rejected)', area: 4200, rejected: true },
    { name: 'Fallow Field Beta', ndvi: -0.28, sar: 0.15, class: 'Seasonal Farming (Rejected)', area: 3100, rejected: true },
    { name: 'Seasonal Grazing Land', ndvi: -0.22, sar: 0.18, class: 'Seasonal Farming (Rejected)', area: 2800, rejected: true },
  ];

  return (
    <div className="w-full h-64 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, left: 15, bottom: 20 }}>
          <CartesianGrid stroke="#2e2e2e" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="ndvi"
            name="NDVI Change"
            domain={[-0.6, 0.4]}
            tickFormatter={(v) => v.toFixed(2)}
            stroke="#b5b5ad"
            fontSize={12}
            tickLine={false}
            label={{ value: 'Normalized NDVI Change (Vegetation Index)', position: 'insideBottom', offset: -12, fill: '#b5b5ad', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="sar"
            name="SAR Radar Backscatter"
            domain={[0, 1.1]}
            tickFormatter={(v) => v.toFixed(1)}
            stroke="#b5b5ad"
            fontSize={12}
            tickLine={false}
            label={{ value: 'SAR Radar Backscatter', angle: -90, position: 'insideLeft', offset: 5, fill: '#b5b5ad', fontSize: 12 }}
          />
          <ZAxis type="number" dataKey="area" range={[40, 140]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="p-3 rounded-md bg-[#121212] border border-[#2e2e2e] text-xs shadow-xl flex flex-col gap-1 font-mono">
                    <span className="font-semibold text-[#f5f5f0] font-sans">{data.name}</span>
                    <span className={data.rejected ? 'text-slate-400 font-semibold' : 'text-[#facc15] text-xs font-sans'}>
                      {data.class}
                    </span>
                    <div className="text-[#b5b5ad] text-xs space-y-0.5 pt-1 border-t border-[#2e2e2e]">
                      <div>NDVI Change: {data.ndvi}</div>
                      <div>SAR Backscatter: {data.sar}</div>
                      <div>Area: {data.area.toLocaleString()} m²</div>
                      {data.rejected && <div className="text-amber-400 mt-1">Status: Rejected (Low SAR change)</div>}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: '11px', color: '#b5b5ad' }}
          />
          <Scatter
            name="Deforestation"
            data={validPoints.filter((d) => d.class === 'Deforestation')}
            fill="#ef4444"
          />
          <Scatter
            name="Unauthorized Construction"
            data={validPoints.filter((d) => d.class === 'Unauthorized Construction')}
            fill="#f59e0b"
          />
          <Scatter
            name="Mining"
            data={validPoints.filter((d) => d.class === 'Mining')}
            fill="#eab308"
          />
          <Scatter
            name="Land Encroachment"
            data={validPoints.filter((d) => d.class === 'Land Encroachment')}
            fill="#38bdf8"
          />
          <Scatter
            name="Seasonal Farm (Rejected)"
            data={rejectedPoints}
            fill="#64748b"
            shape="triangle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
