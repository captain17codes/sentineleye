import React, { createContext, useContext, useState, useMemo } from 'react';

export type JurisdictionOption = 'all' | 'delhi' | 'up' | 'haryana';

interface JurisdictionContextType {
  jurisdiction: JurisdictionOption;
  setJurisdiction: (j: JurisdictionOption) => void;
  selectedZoneId: number | null;
  setSelectedZoneId: (id: number | null) => void;
  mapCenter: [number, number];
  mapZoom: number;
}

const JurisdictionContext = createContext<JurisdictionContextType | null>(null);

export const JURISDICTION_CONFIG: Record<
  JurisdictionOption,
  { label: string; center: [number, number]; zoom: number; zoneIds: number[] }
> = {
  all: {
    label: 'All Jurisdictions',
    center: [28.55, 77.10],
    zoom: 9,
    zoneIds: [],
  },
  delhi: {
    label: 'NCT of Delhi',
    center: [28.6139, 77.2090],
    zoom: 11,
    zoneIds: [101, 103, 104], // Delhi Ridge, Yamuna Floodplain, Asola Bhatti
  },
  up: {
    label: 'Rajasthan & Yamuna Periphery',
    center: [27.34, 76.85],
    zoom: 9,
    zoneIds: [103, 106], // Yamuna Floodplain, Sariska Buffer
  },
  haryana: {
    label: 'Haryana Ecological Belt',
    center: [28.60, 76.80],
    zoom: 10,
    zoneIds: [102, 105, 107, 108], // Mangar Bani, Aravalli Forest, Bhindawas, Haryana Agri Reserve
  },
};

export function JurisdictionProvider({ children }: { children: React.ReactNode }) {
  const [jurisdiction, setJurisdiction] = useState<JurisdictionOption>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  const config = JURISDICTION_CONFIG[jurisdiction];

  const value = useMemo(
    () => ({
      jurisdiction,
      setJurisdiction: (j: JurisdictionOption) => {
        setJurisdiction(j);
        setSelectedZoneId(null);
      },
      selectedZoneId,
      setSelectedZoneId,
      mapCenter: config.center,
      mapZoom: config.zoom,
    }),
    [jurisdiction, selectedZoneId, config]
  );

  return (
    <JurisdictionContext.Provider value={value}>
      {children}
    </JurisdictionContext.Provider>
  );
}

export function useJurisdiction() {
  const ctx = useContext(JurisdictionContext);
  if (!ctx) {
    throw new Error('useJurisdiction must be used within JurisdictionProvider');
  }
  return ctx;
}
