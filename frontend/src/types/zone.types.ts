export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ZoneProperties {
  id: number;
  code?: string;
  name: string;
  risk_level: RiskLevel;
  area_m2?: number;
  state?: string;
  created_at?: string;
}

export interface ZoneFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: ZoneProperties;
}

export interface ZoneCollection {
  type: 'FeatureCollection';
  features: ZoneFeature[];
}
