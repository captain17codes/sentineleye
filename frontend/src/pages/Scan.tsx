import React, { useState, useEffect, useMemo } from 'react';
import { ScenePanel } from '../components/command/ScenePanel';
import { CloudSlider } from '../components/command/CloudSlider';
import { DetectionCanvas } from '../components/command/DetectionCanvas';
import { ClassifierOutput } from '../components/command/ClassifierOutput';
import { ValidationPanel } from '../components/command/ValidationPanel';
import { useDetectionWorker } from '../hooks/useDetectionWorker';
import { useZones } from '../hooks/useZones';
import { useAlerts } from '../hooks/useAlerts';
import { useJurisdiction, JURISDICTION_CONFIG } from '../context/JurisdictionContext';
import { scansApi } from '../api/scans.api';
import { SceneType, DataSourceMode } from '../types/scan.types';
import { ThresholdSettings } from '../engine/scan/metrics';
import { THRESHOLDS } from '../engine/config';
import { Play, Check, Radar, Layers, CheckCircle2, Shield, Info, AlertCircle, Satellite } from 'lucide-react';

export function Scan() {
  const { zones, loading: zonesLoading } = useZones();
  const { refreshAlerts } = useAlerts();
  const { jurisdiction } = useJurisdiction();
  const { runDetection, isRunning, progress, currentStage, result } = useDetectionWorker();

  const [selectedZoneId, setSelectedZoneId] = useState<number>(102);
  const [dataSource, setDataSource] = useState<DataSourceMode>('calibration');
  const [sceneType, setSceneType] = useState<SceneType>('fused');
  const [cloudCoverage, setCloudCoverage] = useState<number>(15);
  const [savingScan, setSavingScan] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<ThresholdSettings>({
    ndviChange: THRESHOLDS.NDVI_CHANGE,
    sarChangeDb: THRESHOLDS.SAR_CHANGE_DB,
  });

  // Filter zones by currently active jurisdiction from top bar
  const jurisdictionConfig = JURISDICTION_CONFIG[jurisdiction];
  const filteredZones = useMemo(() => {
    if (!zones || zones.length === 0) return [];
    if (jurisdiction === 'all' || !jurisdictionConfig || jurisdictionConfig.zoneIds.length === 0) {
      return zones;
    }
    return zones.filter((z) => jurisdictionConfig.zoneIds.includes(z.properties.id));
  }, [zones, jurisdiction, jurisdictionConfig]);

  // Synchronize zone selection with top-bar jurisdiction
  useEffect(() => {
    if (filteredZones.length > 0) {
      const isCurrentInFiltered = filteredZones.some((z) => z.properties.id === selectedZoneId);
      if (!isCurrentInFiltered) {
        setSelectedZoneId(filteredZones[0].properties.id);
      }
    }
  }, [filteredZones, selectedZoneId]);

  const activeZone =
    filteredZones.find((z) => z.properties.id === selectedZoneId) ||
    filteredZones[0] ||
    zones[0];

  const handleRunScan = () => {
    const coords = activeZone?.geometry?.coordinates?.[0]?.[0] || [77.08, 28.52];
    runDetection({
      zone_id: selectedZoneId,
      scene_type: sceneType,
      cloud_coverage: cloudCoverage,
      lng: coords[0],
      lat: coords[1],
      data_source: dataSource,
      thresholds,
    });
    setSaveStatus(null);
  };

  const handleSaveScan = async () => {
    if (!result) return;
    setSavingScan(true);
    try {
      const coords = activeZone?.geometry?.coordinates?.[0]?.[0] || [77.08, 28.52];
      const res: any = await scansApi.create({
        zone_id: selectedZoneId,
        scene_type: sceneType,
        cloud_coverage: cloudCoverage,
        raw_count: result.raw_count,
        validated_count: result.validated_count,
        change_score: result.change_score,
        blobs: result.blobs,
        raw_classes: result.raw_classes,
        validated_classes: result.validated_classes,
        before_img: result.blobs[0]?.beforeCrop,
        after_img: result.blobs[0]?.afterCrop,
        lng: coords[0],
        lat: coords[1],
      });

      if (res.alertCreated) {
        setSaveStatus(`Scan saved. Alert #${res.alertId} generated and recorded in ledger.`);
        refreshAlerts();
      } else {
        setSaveStatus('Scan record logged to database (below alert threshold).');
      }
    } catch (err: any) {
      setSaveStatus(`Save failed: ${err.message}`);
    } finally {
      setSavingScan(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none">
      {/* Page Header with Single Green Run Scan Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a3832]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-[#f1f5f3]">Orbital scan & anomaly detection</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-[#16201c] border border-[#2a3832] text-[#b4c2bb]">
              {dataSource === 'calibration'
                ? 'Data source: Calibration scenes (synthetic, ground truth known)'
                : 'Data source: Real Sentinel replay (Element 84 STAC AWS Sentinel-2 + Sentinel-1)'}
            </span>
          </div>
          <p className="text-xs text-[#b4c2bb] mt-0.5">
            Bitemporal radar and optical fusion with automated false-alarm rejection & statutory classification
          </p>
        </div>

        {/* ONE single green button in the header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunScan}
            disabled={isRunning || zonesLoading || !activeZone}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? `Running scan (${progress}%)` : 'Run scan'}</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid (equal height columns with items-stretch) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Scan Parameters (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5 h-full">
          <div className="p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#b4c2bb]">
                Scan parameters
              </h2>
              <span className="text-[11px] text-[#22c55e] font-mono">
                {jurisdictionConfig?.label || 'All jurisdictions'}
              </span>
            </div>

            {/* Data Source Selector Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#f1f5f3]">
                Telemetry Data Source
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#0b0f0e] border border-[#2a3832]">
                <button
                  type="button"
                  onClick={() => setDataSource('calibration')}
                  disabled={isRunning}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    dataSource === 'calibration'
                      ? 'bg-[#16201c] text-[#22c55e] border border-[#22c55e]/50 font-semibold shadow-sm'
                      : 'text-[#b4c2bb] hover:text-[#f1f5f3]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Calibration (synthetic)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDataSource('real')}
                  disabled={isRunning}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    dataSource === 'real'
                      ? 'bg-[#16201c] text-[#22c55e] border border-[#22c55e]/50 font-semibold shadow-sm'
                      : 'text-[#b4c2bb] hover:text-[#f1f5f3]'
                  }`}
                >
                  <Satellite className="w-3.5 h-3.5" />
                  <span>Real Sentinel (replay)</span>
                </button>
              </div>
              <span className="text-[10px] text-[#b4c2bb] font-mono">
                {dataSource === 'calibration'
                  ? 'Controlled seeds with simulated cloud masks & known ground truth.'
                  : 'Element 84 STAC AWS Sentinel-2 L2A + Sentinel-1 C-SAR with SCL cloud mask.'}
              </span>
            </div>

            {/* Zone Selector Filtered to Active Jurisdiction */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#f1f5f3]">
                Protected Sector Target ({filteredZones.length} available)
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                disabled={isRunning}
                className="w-full bg-[#0b0f0e] border border-[#2a3832] rounded-lg px-3 py-2 text-xs text-[#f1f5f3] focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e] cursor-pointer"
                style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}
              >
                {filteredZones.map((z) => (
                  <option
                    key={z.properties.id}
                    value={z.properties.id}
                    style={{ backgroundColor: '#0b0f0e', color: '#f1f5f3' }}
                  >
                    {z.properties.code || `Z-${z.properties.id}`}: {z.properties.name} ({z.properties.risk_level})
                    {dataSource === 'real' && [102, 103, 105, 107].includes(z.properties.id) ? ' • [Real AOI]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Constellation Specs Callout */}
            <div className="p-2.5 rounded bg-[#16201c] border border-[#2a3832] text-[11px] text-[#b4c2bb] font-mono leading-relaxed">
              <span className="text-[#22c55e] font-semibold block">Copernicus Constellation Telemetry</span>
              Sentinel-2: 5-day nominal revisit; Sentinel-1: 6-day (C+D). Resolution: ~10 m pixel spacing.
            </div>

            {/* Sensor Band Toggle: 3 equal cards */}
            <ScenePanel value={sceneType} onChange={setSceneType} disabled={isRunning} />

            {/* Cloud Coverage Slider (disabled in real replay mode as SCL mask is used) */}
            {dataSource === 'calibration' ? (
              <CloudSlider value={cloudCoverage} onChange={setCloudCoverage} disabled={isRunning} />
            ) : (
              <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between text-[#b4c2bb]">
                  <span className="font-semibold text-[#f1f5f3]">Scene Classification Layer (SCL)</span>
                  <span className="text-[10px] font-mono text-[#22c55e]">Active</span>
                </div>
                <p className="text-[11px] text-[#b4c2bb] leading-relaxed">
                  Real Sentinel-2 Level-2A SCL mask automatically filters cirrus clouds (SCL 10), high-probability clouds (SCL 9), and cloud shadows (SCL 3) directly from spectral telemetry.
                </p>
              </div>
            )}
          </div>

          {/* Detections Breakdown (when scan finishes) */}
          {result && (
            <div className="p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a3832]">
                <h3 className="text-xs font-semibold text-[#f1f5f3]">Detected anomalies</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#16201c] border border-[#22c55e] text-[#22c55e] font-semibold">
                  {result.validated_count} validated / {result.raw_count} raw detections
                </span>
              </div>
              <ClassifierOutput
                blobs={result.blobs}
                rawCount={result.raw_count}
                validatedCount={result.validated_count}
                falsePositivesFiltered={result.false_positives_filtered}
              />
            </div>
          )}
        </div>

        {/* Right Column: Imagery Canvas & Actions (7 Cols, fills vertical space) */}
        <div className="lg:col-span-7 flex flex-col h-full">
          <div className="p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col flex-1 gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a3832]">
              <div>
                <h3 className="text-sm font-semibold text-[#f1f5f3]">Change detection</h3>
                <p className="text-xs text-[#b4c2bb]">
                  Bitemporal comparison • {activeZone?.properties?.name || 'Protected corridor'}
                </p>
              </div>

              {result && (
                <button
                  type="button"
                  onClick={handleSaveScan}
                  disabled={savingScan}
                  className="px-3.5 py-1.5 rounded-lg bg-[#16201c] hover:bg-[#111816] border border-[#22c55e] text-[#22c55e] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingScan ? 'Saving...' : 'Save scan'}</span>
                </button>
              )}
            </div>

            {saveStatus && (
              <div className="p-3 rounded-lg bg-[#16201c] border border-[#22c55e] text-[#22c55e] text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{saveStatus}</span>
              </div>
            )}

            {/* Real Telemetry Metadata Badge if Replay Mode Active */}
            {result?.scene_metadata && (
              <div className="p-3 rounded-lg bg-[#16201c] border border-[#22c55e]/40 flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#22c55e] font-semibold flex items-center gap-1.5">
                    <Satellite className="w-3.5 h-3.5" />
                    Real Sentinel Telemetry Provenance
                  </span>
                  {result.scene_metadata.isControl && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 font-bold">
                      VERIFIED NEGATIVE CONTROL
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#b4c2bb] pt-1 border-t border-[#2a3832]">
                  <div>
                    <span className="text-white block font-medium">T0 Optical Baseline:</span>
                    <span className="truncate block">{result.scene_metadata.t0SceneId}</span>
                    <span className="text-[10px] text-muted">{new Date(result.scene_metadata.t0Date).toUTCString()}</span>
                  </div>
                  <div>
                    <span className="text-white block font-medium">T1 Optical Detection:</span>
                    <span className="truncate block">{result.scene_metadata.t1SceneId}</span>
                    <span className="text-[10px] text-muted">{new Date(result.scene_metadata.t1Date).toUTCString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State when no scan has run */}
            {!result && !isRunning ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#2a3832] rounded-lg bg-[#16201c]/40 min-h-[360px]">
                <div className="w-12 h-12 rounded-full bg-[#111816] border border-[#2a3832] flex items-center justify-center mb-3">
                  <Radar className="w-6 h-6 text-[#22c55e]" />
                </div>
                <h4 className="text-sm font-semibold text-[#f1f5f3] mb-1">
                  No scan executed for this zone yet
                </h4>
                <p className="text-xs text-[#b4c2bb] max-w-sm">
                  Select {dataSource === 'real' ? 'a real Sentinel replay target' : 'parameters'} and click Run scan.
                </p>
              </div>
            ) : (
              /* Canvas with side-by-side scenes and overlay */
              <div className="flex flex-col gap-4">
                <DetectionCanvas
                  result={result}
                  isRunning={isRunning}
                  progress={progress}
                  currentStage={currentStage}
                />

                {/* Metrics Footer with 4 Real Counters */}
                {result && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#2a3832]">
                    <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col">
                      <span className="text-[11px] text-[#b4c2bb]">Raw detections</span>
                      <span className="text-base font-semibold font-mono text-[#f1f5f3]">
                        {result.raw_count}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col">
                      <span className="text-[11px] text-[#b4c2bb]">Rejected (False+)</span>
                      <span className="text-base font-semibold font-mono text-amber-400">
                        {result.false_positives_filtered}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col">
                      <span className="text-[11px] text-[#b4c2bb]">Validated alerts</span>
                      <span className="text-base font-semibold font-mono text-[#22c55e]">
                        {result.validated_count}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col">
                      <span className="text-[11px] text-[#b4c2bb]">Sub-threshold (&lt;35%)</span>
                      <span className="text-base font-semibold font-mono text-[#8fa097]">
                        {result.belowThresholdCount ?? 0}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empirical Validation & Model Sensitivity Panel */}
      <ValidationPanel
        zoneId={selectedZoneId}
        liveDetections={result?.blobs}
        onThresholdsChange={setThresholds}
      />

      {/* Limitations Panel: Transparent & Honest Remote Sensing Constraints */}
      <div className="p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#2a3832]">
          <Info className="w-4 h-4 text-[#22c55e]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f1f5f3]">
            Physical Detection Limitations & Evidentiary Methodology
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#b4c2bb] leading-relaxed">
          <div className="p-3 rounded-md bg-[#16201c] border border-[#2a3832]">
            <span className="text-white font-semibold block mb-1">Spatial Resolution Cutoff</span>
            Sentinel-2 MSI pixel size is 10 m (100 m² per pixel). Connected-component detections below 5 contiguous pixels (&lt;500 m²) are automatically filtered to suppress sensor noise and minor agricultural tilling.
          </div>
          <div className="p-3 rounded-md bg-[#16201c] border border-[#2a3832]">
            <span className="text-white font-semibold block mb-1">Dual-Sensor Radar Requirement</span>
            Optical vegetation loss (ΔNDVI &lt; -0.25) alone cannot differentiate legal seasonal crop harvest from illegal clearing. Sentinel-1 C-SAR radar backscatter (+dB) is required to identify rigid double-bounce masonry or quarry gouging.
          </div>
          <div className="p-3 rounded-md bg-[#16201c] border border-[#2a3832]">
            <span className="text-white font-semibold block mb-1">Candidate Evidentiary Status</span>
            Orbital detections are algorithmic candidates for human administrative verification. Under Section 63 BSA, automated alerts must be confirmed by an authorized officer prior to executing statutory demolition or eviction orders.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Scan;
