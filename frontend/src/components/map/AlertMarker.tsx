import React from 'react';
import { Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Alert } from '../../types/alert.types';
import { severityColor } from '../../utils/riskColors';

interface AlertMarkerProps {
  alert: Alert;
  isSelected?: boolean;
  onSelect: (alert: Alert) => void;
}

export function AlertMarker({ alert, isSelected, onSelect }: AlertMarkerProps) {
  const color = severityColor[alert.severity] || '#ef4444';

  // Area radius calculation (sqrt(area / pi))
  const radiusMeters = Math.max(80, Math.min(300, Math.sqrt((alert.area_m2 || 3850) / Math.PI)));

  const customIcon = L.divIcon({
    className: 'custom-flat-marker',
    html: `
      <div style="position: relative; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2px solid #0a0a0a;"></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  return (
    <>
      {/* Alert boundary polygon */}
      <Circle
        center={[alert.lat, alert.lng]}
        radius={radiusMeters}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: isSelected ? 0.45 : 0.25,
          weight: isSelected ? 2.5 : 1.5,
        }}
        eventHandlers={{
          click: () => onSelect(alert),
        }}
      />

      {/* Marker Point */}
      <Marker
        position={[alert.lat, alert.lng]}
        icon={customIcon}
        eventHandlers={{
          click: () => onSelect(alert),
        }}
      />
    </>
  );
}
