import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ZoneLayer } from '../components/map/ZoneLayer';
import { AlertClusterGroup } from '../components/map/AlertClusterGroup';
import { SurveillanceFeed } from '../components/map/SurveillanceFeed';
import { DossierDrawer } from '../components/map/DossierDrawer';
import { useZones } from '../hooks/useZones';
import { useAlerts } from '../hooks/useAlerts';
import { useJurisdiction } from '../context/JurisdictionContext';
import { Alert } from '../types/alert.types';
import { ZoneFeature } from '../types/zone.types';
import { severityColor } from '../utils/riskColors';

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
    map.invalidateSize();
  }, [center, zoom, map]);

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

export function MapView() {
  const { zones, collection } = useZones();
  const { alerts, refreshAlerts } = useAlerts();
  const { mapCenter, mapZoom, selectedZoneId } = useJurisdiction();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filter alerts by jurisdiction if selectedZoneId is active
  const filteredAlerts = selectedZoneId
    ? alerts.filter((a) => a.zone_id === selectedZoneId)
    : alerts;

  const handleSelectAlert = (alert: Alert) => {
    setSelectedAlert(alert);
  };

  const handleAlertUpdated = (updated: Alert) => {
    setSelectedAlert(updated);
    refreshAlerts();
  };

  return (
    <div className="relative w-full h-[calc(100vh-48px)] overflow-hidden bg-[#0b0f0e]">
      {/* ── Full-height Leaflet with Esri World Imagery tiles (zero gaps) ── */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />

        <MapController center={mapCenter} zoom={mapZoom} />

        {/* GeoJSON Zone Boundary Polygons */}
        {collection && (
          <ZoneLayer
            data={collection}
            onZoneSelect={(zone: ZoneFeature) => {
              const firstInZone = alerts.find((a) => a.zone_id === zone.properties.id);
              if (firstInZone) setSelectedAlert(firstInZone);
            }}
          />
        )}

        {/* Violation Polygons: 2px outline and 25% fill, visible at default zoom */}
        {filteredAlerts.map((alert) => {
          const color = severityColor[alert.severity] || '#ef4444';
          const isSelected = selectedAlert?.id === alert.id;
          const radiusMeters = Math.max(140, Math.min(450, Math.sqrt((alert.area_m2 || 3850) / Math.PI)));

          return (
            <Circle
              key={`poly-${alert.id}`}
              center={[alert.lat, alert.lng]}
              radius={radiusMeters}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.25,
                weight: 2,
              }}
              eventHandlers={{
                click: () => handleSelectAlert(alert),
              }}
            />
          );
        })}

        {/* Marker Clustering with Count Bubbles */}
        <AlertClusterGroup
          alerts={filteredAlerts}
          selectedAlertId={selectedAlert?.id ?? null}
          onSelect={handleSelectAlert}
        />
      </MapContainer>

      {/* ── Floating Left Surveillance Feed (Fixed 360px width, SOLID #111816) ── */}
      <SurveillanceFeed
        alerts={filteredAlerts}
        selectedAlertId={selectedAlert?.id ?? null}
        onSelectAlert={handleSelectAlert}
      />

      {/* ── Map Legend: Solid Pill Bar at bottom-left, colored dots + labels in #f1f5f3 ── */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto px-4 py-2.5 rounded-full bg-[#111816] border border-[#2a3832] text-xs text-[#f1f5f3] flex items-center gap-5 select-none shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-critical" />
          <span className="font-medium text-[#f1f5f3]">Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-high" />
          <span className="font-medium text-[#f1f5f3]">High</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-medium" />
          <span className="font-medium text-[#f1f5f3]">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-low" />
          <span className="font-medium text-[#f1f5f3]">Low</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="font-medium text-[#f1f5f3]">Protected zone</span>
        </div>
      </div>

      {/* Cadastral Boundary Attribution */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto hidden md:flex items-center px-3 py-1.5 rounded-md bg-[#111816]/90 border border-[#2a3832] text-[10px] text-[#b4c2bb] font-mono select-none shadow">
        Indicative zone polygons (generated)
      </div>

      {/* ── Right Slide-in Incident Dossier ── */}
      {selectedAlert && (
        <DossierDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAlertUpdated={handleAlertUpdated}
        />
      )}
    </div>
  );
}
