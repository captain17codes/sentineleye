import { GeoJSON } from 'react-leaflet';
import { ZoneCollection, ZoneFeature } from '../../types/zone.types';
import { riskLevelColor } from '../../utils/riskColors';
import { PathOptions } from 'leaflet';

interface ZoneLayerProps {
  data: ZoneCollection;
  onZoneSelect?: (zone: ZoneFeature) => void;
}

export function ZoneLayer({ data, onZoneSelect }: ZoneLayerProps) {
  const styleFeature = (feature: any): PathOptions => {
    const risk = feature?.properties?.risk_level || 'medium';
    const color = (riskLevelColor as any)[risk] || '#00ff9d';

    return {
      color: color,
      weight: 2,
      opacity: 0.8,
      fillColor: color,
      fillOpacity: 0.15,
      dashArray: risk === 'critical' ? '4, 4' : undefined,
    };
  };

  const onEachFeature = (feature: ZoneFeature, layer: any) => {
    const props = feature.properties;
    layer.bindTooltip(
      `<strong>${props.code || `Z-${props.id}`}: ${props.name}</strong><br/>Risk Level: <span style="text-transform:uppercase">${props.risk_level}</span>`,
      { sticky: true, className: 'leaflet-zone-tooltip' }
    );

    layer.on({
      click: () => {
        if (onZoneSelect) onZoneSelect(feature);
      },
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.35, weight: 3 });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle(styleFeature(feature));
      },
    });
  };

  return (
    <GeoJSON
      key={JSON.stringify(data.features.map(f => f.properties.id))}
      data={data as any}
      style={styleFeature}
      onEachFeature={onEachFeature as any}
    />
  );
}
