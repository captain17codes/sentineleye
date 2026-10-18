import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Alert } from '../../types/alert.types';
import { severityColor } from '../../utils/riskColors';

interface AlertClusterGroupProps {
  alerts: Alert[];
  selectedAlertId: number | null;
  onSelect: (alert: Alert) => void;
}

export function AlertClusterGroup({
  alerts,
  selectedAlertId,
  onSelect,
}: AlertClusterGroupProps) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create marker cluster group with dark theme styling
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#111816;border:2px solid #22c55e;color:#f1f5f3;font-family:Inter,sans-serif;font-weight:600;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.6);">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(34, 34),
          iconAnchor: L.point(17, 17),
        });
      },
    });

    alerts.forEach((alert) => {
      const isSelected = selectedAlertId === alert.id;
      const color = severityColor[alert.severity] || '#ef4444';

      const customIcon = L.divIcon({
        className: 'custom-flat-marker',
        html: `
          <div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2px solid ${isSelected ? '#22c55e' : '#0b0f0e'}; box-shadow: 0 0 6px rgba(0,0,0,0.8);"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([alert.lat, alert.lng], { icon: customIcon });
      marker.on('click', () => onSelect(alert));
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, alerts, selectedAlertId, onSelect]);

  return null;
}
