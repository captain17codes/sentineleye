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
} from 'recharts';

// Multi-spectral scatter signatures:
// NDVI (-0.2 to 0.9) vs SAR Backscatter (dB / normalized 0 to 1)
const SPECTRAL_SIGNATURE_DATA = [
  // Deforestation: Drop in NDVI with moderate/low SAR
  { name: 'Aravalli Ridge', ndvi: 0.12, sar: 0.28, class: 'Deforestation', area: 5400 },
  { name: 'Sariska Corridor', ndvi: 0.15, sar: 0.32, class: 'Deforestation', area: 4200 },
  { name: 'Mangar Bani', ndvi: 0.08, sar: 0.25, class: 'Deforestation', area: 7100 },

  // Unauthorized Construction: Low NDVI, Very High SAR double-bounce
  { name: 'Yamuna Floodplain S', ndvi: 0.05, sar: 0.88, class: 'Unauthorized Construction', area: 3800 },
  { name: 'Delhi Ridge West', ndvi: 0.09, sar: 0.92, class: 'Unauthorized Construction', area: 4900 },
  { name: 'Haryana Reserve E', ndvi: 0.04, sar: 0.85, class: 'Unauthorized Construction', area: 6200 },

  // Mining: Negative/near-zero NDVI, Jagged/Rough SAR
  { name: 'Aravalli S-Buffer', ndvi: -0.05, sar: 0.62, class: 'Mining', area: 8900 },
  { name: 'Sariska Quarry', ndvi: -0.02, sar: 0.68, class: 'Mining', area: 9500 },

  // Land Encroachment: Mixed perimeter footprint
  { name: 'Yamuna Floodplain N', ndvi: 0.22, sar: 0.58, class: 'Land Encroachment', area: 3600 },
  { name: 'Bhindawas Buffer', ndvi: 0.18, sar: 0.54, class: 'Land Encroachment', area: 4400 },
  { name: 'Okhla Bird Sanctuary', ndvi: 0.25, sar: 0.49, class: 'Land Encroachment', area: 3100 },
];

export function SpectralAnalysisChart() {
  return (
    <div className="w-full h-64 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, left: 15, bottom: 20 }}>
          <CartesianGrid stroke="#2a3832" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="ndvi"
            name="NDVI Index"
            domain={[-0.1, 0.4]}
            tickFormatter={(v) => v.toFixed(2)}
            stroke="#b4c2bb"
            fontSize={12}
            tickLine={false}
            label={{ value: 'Normalized NDVI (Vegetation Index)', position: 'insideBottom', offset: -12, fill: '#b4c2bb', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="sar"
            name="SAR Radar Backscatter"
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(1)}
            stroke="#b4c2bb"
            fontSize={12}
            tickLine={false}
            label={{ value: 'SAR Radar Backscatter', angle: -90, position: 'insideLeft', offset: 5, fill: '#b4c2bb', fontSize: 12 }}
          />
          <ZAxis type="number" dataKey="area" range={[50, 180]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="p-3 rounded-md bg-[#111816] border border-[#2a3832] text-xs shadow-xl flex flex-col gap-1 font-mono">
                    <span className="font-semibold text-[#f1f5f3] font-sans">{data.name}</span>
                    <span className="text-[#22c55e] text-xs font-sans">{data.class}</span>
                    <div className="text-[#b4c2bb] text-xs space-y-0.5 pt-1 border-t border-[#2a3832]">
                      <div>NDVI: {data.ndvi.toFixed(2)}</div>
                      <div>SAR Backscatter: {data.sar.toFixed(2)}</div>
                      <div>Area: {data.area.toLocaleString()} m²</div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter
            name="Deforestation"
            data={SPECTRAL_SIGNATURE_DATA.filter((d) => d.class === 'Deforestation')}
            fill="#ef4444"
          />
          <Scatter
            name="Unauthorized Construction"
            data={SPECTRAL_SIGNATURE_DATA.filter((d) => d.class === 'Unauthorized Construction')}
            fill="#f59e0b"
          />
          <Scatter
            name="Mining"
            data={SPECTRAL_SIGNATURE_DATA.filter((d) => d.class === 'Mining')}
            fill="#eab308"
          />
          <Scatter
            name="Land Encroachment"
            data={SPECTRAL_SIGNATURE_DATA.filter((d) => d.class === 'Land Encroachment')}
            fill="#22c55e"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
