import { useState } from 'react';
import { ZoneFeature } from '../../types/zone.types';
import { Badge } from '../ui/Badge';
import { GlassCard } from '../ui/GlassCard';
import { Layers, MapPin, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MapSidebarProps {
  zones: ZoneFeature[];
  selectedZone: ZoneFeature | null;
  onSelectZone: (zone: ZoneFeature) => void;
  className?: string;
}

export function MapSidebar({ zones, selectedZone, onSelectZone, className }: MapSidebarProps) {
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const filtered = zones.filter((z) => {
    const nameMatch = z.properties.name.toLowerCase().includes(search.toLowerCase());
    const riskMatch = filterRisk === 'all' || z.properties.risk_level === filterRisk;
    return nameMatch && riskMatch;
  });

  return (
    <GlassCard className={cn('flex flex-col h-full p-4 overflow-hidden', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-neon" />
        <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
          Monitored Sectors ({zones.length})
        </h3>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter sectors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-space/70 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-muted focus:outline-none focus:border-neon"
        />
      </div>

      {/* Risk Filter Pills */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-[11px] font-mono">
        {['all', 'critical', 'high', 'medium', 'low'].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setFilterRisk(level)}
            className={cn(
              'px-2.5 py-1 rounded-full uppercase transition-all whitespace-nowrap',
              filterRisk === level
                ? 'bg-neon/20 text-neon border border-neon/40 font-bold'
                : 'text-muted hover:text-white bg-white/5 border border-white/5'
            )}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Zone List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-muted">
            No matching sectors found
          </div>
        ) : (
          filtered.map((zone) => {
            const isSelected = selectedZone?.properties.id === zone.properties.id;
            return (
              <div
                key={zone.properties.id}
                onClick={() => onSelectZone(zone)}
                className={cn(
                  'p-3 rounded-xl border transition-all cursor-pointer select-none',
                  isSelected
                    ? 'bg-neon/10 border-neon shadow-neon-sm'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-white truncate">
                    {zone.properties.name}
                  </span>
                  <Badge variant={zone.properties.risk_level as any} size="xs" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted">
                  <MapPin className="w-3 h-3 text-cyan" />
                  <span>Sector #{zone.properties.id}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
