import React from 'react';
import { Cloud } from 'lucide-react';

interface CloudSliderProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export function CloudSlider({ value, onChange, disabled }: CloudSliderProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[#e6eaf0] flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5 text-[#98a2b3]" />
          <span>Cloud coverage threshold</span>
        </label>
      </div>

      {/* Slider Container with Floating Value */}
      <div className="relative pt-6 pb-1">
        {/* Floating Value Label directly above thumb */}
        <div
          className="absolute top-0 -translate-x-1/2 pointer-events-none transition-all duration-75"
          style={{ left: `${value}%` }}
        >
          <span className="px-1.5 py-0.5 rounded bg-[#172031] border border-[#222c3d] font-mono text-[11px] font-semibold text-[#facc15] shadow-sm">
            {value}%
          </span>
        </div>

        {/* Custom Range Input */}
        <div className="relative flex items-center w-full h-6">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-[#facc15]"
            style={{
              background: `linear-gradient(to right, #facc15 0%, #facc15 ${value}%, #222c3d ${value}%, #222c3d 100%)`,
            }}
          />
        </div>
      </div>

      {/* Subtle tick hints at 0%, 50%, 100% underneath */}
      <div className="flex justify-between items-center text-[11px] text-[#98a2b3] font-mono px-0.5">
        <span className="flex flex-col items-start">
          <span className="w-0.5 h-1.5 bg-[#222c3d] mb-0.5" />
          <span>0%</span>
        </span>
        <span className="flex flex-col items-center">
          <span className="w-0.5 h-1.5 bg-[#222c3d] mb-0.5" />
          <span>50%</span>
        </span>
        <span className="flex flex-col items-end">
          <span className="w-0.5 h-1.5 bg-[#222c3d] mb-0.5" />
          <span>100%</span>
        </span>
      </div>

      {/* Inline styles for the native slider thumb (18px, round, green, no glow) */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #facc15;
          border: 2px solid #0b1018;
          cursor: pointer;
          box-shadow: none;
        }
        input[type=range]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #facc15;
          border: 2px solid #0b1018;
          cursor: pointer;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}

export default CloudSlider;
