import React from 'react';
import { SceneType } from '../../types/scan.types';
import { Sun, Radio, Layers, Check } from 'lucide-react';

interface ScenePanelProps {
  value: SceneType;
  onChange: (type: SceneType) => void;
  disabled?: boolean;
}

export function ScenePanel({ value, onChange, disabled }: ScenePanelProps) {
  const options: { type: SceneType; label: string; icon: any; desc: string }[] = [
    {
      type: 'optical',
      label: 'Optical',
      icon: Sun,
      desc: 'Visible spectrum bands (Sentinel-2)',
    },
    {
      type: 'sar',
      label: 'SAR',
      icon: Radio,
      desc: 'C-band radar backscatter (Sentinel-1)',
    },
    {
      type: 'fused',
      label: 'Fused',
      icon: Layers,
      desc: 'Synchronized multi-spectral tensor',
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-[#f1f5f3]">Sensor band</label>
      <div className="grid grid-cols-3 gap-2.5">
        {options.map((opt) => {
          const active = value === opt.type;
          const Icon = opt.icon;

          return (
            <button
              key={opt.type}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.type)}
              className={`relative flex flex-col items-start p-3 rounded-lg text-left transition-colors select-none ${
                active
                  ? 'bg-[#16201c] border-2 border-[#22c55e] text-[#f1f5f3]'
                  : 'bg-[#111816] border border-[#2a3832] text-[#f1f5f3] hover:border-[#22c55e]/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Green checkmark on top-right of active card */}
              {active && (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center text-[#0b0f0e]">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-1.5 pr-4">
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#22c55e]' : 'text-[#b4c2bb]'}`} />
                <span className="text-xs font-semibold">{opt.label}</span>
              </div>
              <span className="text-[12px] text-[#b4c2bb] leading-snug">
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ScenePanel;
