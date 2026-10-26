import { SceneProvenanceCard } from '../components/scan/SceneProvenanceCard';
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
import { Play, Check, Radar, Layers, CheckCircle2, Shield, Info, AlertCircle, Satellite, ArrowRight } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'ingest', step: 1, name: 'Telemetry Ingest', desc: 'Sentinel-1 SAR & Sentinel-2 MSI rasters (10m GSD)' },
  { id: 'atmospheric', step: 2, name: 'Atmospheric Mask', desc: 'Automated SCL cloud, cloud-shadow & haze suppression' },
  { id: 'fusion', step: 3, name: 'Sensor Fusion', desc: 'Bitemporal ΔNDVI vegetation and ΔSAR radar cross-agreement' },
  { id: 'vectorize', step: 4, name: 'Vectorization', desc: 'Connected-component spatial clustering of change rasters' },
  { id: 'cadastral', step: 5, name: 'Cadastral Overlay', desc: 'Protected zone boundary intersection (≥35% statutory cutoff)' },
];

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
      const zoneCoords = activeZone?.geometry?.coordinates?.[0]?.[0] || [77.08, 28.52];
      // Place the alert where the change was detected, not on the zone outline.
      const firstValid = result.blobs.find((b) => b.isValidated);
      const coords = firstValid
        ? [(firstValid.bbox[0] + firstValid.bbox[2]) / 2, (firstValid.bbox[1] + firstValid.bbox[3]) / 2]
        : zoneCoords;
      const meta = result.scene_metadata;
      const res: any = await scansApi.create({
        zone_id: selectedZoneId,
        scene_type: sceneType,
        cloud_coverage: cloudCoverage,
        data_source: dataSource,
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
        is_real_data: meta?.isRealData === true,
        sar_available: meta?.sarAvailable,
        t0_scene_id: meta?.isRealData ? meta.t0SceneId : undefined,
        t1_scene_id: meta?.isRealData ? meta.t1SceneId : undefined,
        t0_timestamp: meta?.isRealData ? meta.t0Date : undefined,
        t1_timestamp: meta?.isRealData ? meta.t1Date : undefined,
        note: firstValid?.note,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2e2e2e]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-[#f5f5f0]">Orbital scan & anomaly detection</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1a1a1a] border border-[#2e2e2e] text-[#b5b5ad]">
              {dataSource === 'calibration'
                ? 'Data source: Calibration scenes (synthetic, ground truth known)'
                : result?.scene_metadata?.isRealData
                  ? 'Data source: REAL Copernicus Sentinel-2 L2A'
                  : 'Data source: Site scenes (real Sentinel-2 where available, otherwise modeled)'}
            </span>
          </div>
          <p className="text-xs text-[#b5b5ad] mt-0.5">
            Bitemporal radar and optical fusion with automated false-alarm rejection & statutory classification
          </p>
        </div>

        {/* ONE single green button in the header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunScan}
            disabled={isRunning || zonesLoading || !activeZone}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#facc15] text-[#0a0a0a] font-semibold text-xs hover:bg-[#eab308] disabled:opacity-50 transition-colors shadow-sm min-h-[38px]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? `Running scan (${progress}%)` : 'Run scan'}</span>
          </button>
        </div>
      </div>

      {/* ── Prominent Pipeline Stage Counters (Big numbers for Raw / Rejected / Validated) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Raw Detections */}
        <div className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#b5b5ad] mb-1">
            <span className="text-xs font-semibold text-[#f5f5f0]">Raw detections</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#93c5fd]" />
          </div>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-[#93c5fd] kpi-number">
            {result ? result.raw_count : '—'}
          </span>
          <p className="text-[11px] text-[#b5b5ad] mt-2 pt-2 border-t border-[#2e2e2e]/60 kpi-subtitle leading-snug">
            Raw detections: Initial candidate pixel clusters flagged by spectral &amp; radar diffs
          </p>
        </div>

        {/* Rejected (False+) */}
        <div className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#b5b5ad] mb-1">
            <span className="text-xs font-semibold text-[#f5f5f0]">Rejected (False+)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
          </div>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-[#fbbf24] kpi-number">
            {result ? result.false_positives_filtered : '—'}
          </span>
          <p className="text-[11px] text-[#b5b5ad] mt-2 pt-2 border-t border-[#2e2e2e]/60 kpi-subtitle leading-snug">
            Rejected: False alarms eliminated by dual-sensor fusion &amp; cloud suppression
          </p>
        </div>

        {/* Validated Alerts */}
        <div className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#b5b5ad] mb-1">
            <span className="text-xs font-semibold text-[#f5f5f0]">Validated alerts</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#facc15]" />
          </div>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-[#facc15] kpi-number">
            {result ? result.validated_count : '—'}
          </span>
          <p className="text-[11px] text-[#b5b5ad] mt-2 pt-2 border-t border-[#2e2e2e]/60 kpi-subtitle leading-snug">
            Validated alerts: Confirmed encroachments exceeding 35% cadastral boundary overlap
          </p>
        </div>

        {/* Sub-threshold */}
        <div className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#b5b5ad] mb-1">
            <span className="text-xs font-semibold text-[#f5f5f0]">Sub-threshold</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
          </div>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-[#94a3b8] kpi-number">
            {result ? (result.belowThresholdCount ?? 0) : '—'}
          </span>
          <p className="text-[11px] text-[#b5b5ad] mt-2 pt-2 border-t border-[#2e2e2e]/60 kpi-subtitle leading-snug">
            Sub-threshold: Minor anomalies located outside or below statutory boundary threshold
          </p>
        </div>
      </div>

      {/* ── Prominent Pipeline Processing Stages ── */}
      <div className="p-4 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-[#facc15]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f0]">
              Orbital Analysis Pipeline Stages
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#facc15] font-semibold">
            {isRunning ? `${progress}% In Progress` : result ? 'Pipeline Pass Verified' : 'Awaiting Execution'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {PIPELINE_STAGES.map((stg) => {
            const isDone = !isRunning && result !== null;
            const isActive = isRunning && (currentStage || '').toLowerCase().includes(stg.id);
            return (
              <div
                key={stg.id}
                className={`p-3 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                  isActive
                    ? 'bg-[#1a1a1a] border-[#facc15] shadow-[0_0_12px_rgba(250, 204, 21,0.3)]'
                    : isDone
                    ? 'bg-[#1a1a1a] border-[#facc15]/50'
                    : 'bg-[#0a0a0a] border-[#2e2e2e] opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#facc15] font-bold">
                    STAGE 0{stg.step}
                  </span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-[#facc15]" />}
                  {isActive && <span className="w-2 h-2 rounded-full bg-[#facc15] animate-ping" />}
                </div>
                <span className="font-semibold text-[13px] text-[#f5f5f0] leading-snug">
                  {stg.name}
                </span>
                <span className="text-[11px] text-[#b5b5ad] leading-tight">
                  {stg.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Layout Grid (equal height columns with items-stretch) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Scan Parameters (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5 h-full">
          <div className="p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2e2e2e]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#b5b5ad]">
                Scan parameters
              </h2>
              <span className="text-[11px] text-[#facc15] font-mono">
                {jurisdictionConfig?.label || 'All jurisdictions'}
              </span>
            </div>

            {/* Data Source Selector Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#f5f5f0]">
                Telemetry Data Source
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e]">
                <button
                  type="button"
                  onClick={() => setDataSource('calibration')}
                  disabled={isRunning}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    dataSource === 'calibration'
                      ? 'bg-[#1a1a1a] text-[#facc15] border border-[#facc15]/50 font-semibold shadow-sm'
                      : 'text-[#b5b5ad] hover:text-[#f5f5f0]'
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
                      ? 'bg-[#1a1a1a] text-[#facc15] border border-[#facc15]/50 font-semibold shadow-sm'
                      : 'text-[#b5b5ad] hover:text-[#f5f5f0]'
                  }`}
                >
                  <Satellite className="w-3.5 h-3.5" />
                  <span>Site scenes (real Sentinel-2 where available)</span>
                </button>
              </div>
              <span className="text-[10px] text-[#b5b5ad] font-mono">
                {dataSource === 'calibration'
                  ? 'Controlled seeds with simulated cloud masks & known ground truth.'
                  : 'Real Copernicus Sentinel-2 L2A imagery for Z-102 and Z-104; other sites use the calibration dataset. The result card says which.'}
              </span>
            </div>

            {/* Zone Selector Filtered to Active Jurisdiction */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#f5f5f0]">
                Protected Sector Target ({filteredZones.length} available)
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                disabled={isRunning}
                className="w-full bg-[#0a0a0a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-xs text-[#f5f5f0] focus:outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15] cursor-pointer"
                style={{ backgroundColor: '#0a0a0a', color: '#f5f5f0' }}
              >
                {filteredZones.map((z) => (
                  <option
                    key={z.properties.id}
                    value={z.properties.id}
                    style={{ backgroundColor: '#0a0a0a', color: '#f5f5f0' }}
                  >
                    {z.properties.code || `Z-${z.properties.id}`}: {z.properties.name} ({z.properties.risk_level})
                    {dataSource === 'real' && [102, 103, 104, 105, 107].includes(z.properties.id) ? ' • [Site scene]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Constellation Specs Callout */}
            <div className="p-2.5 rounded bg-[#1a1a1a] border border-[#2e2e2e] text-[11px] text-[#b5b5ad] font-mono leading-relaxed">
              <span className="text-[#facc15] font-semibold block">Constellation Model Parameters</span>
              Modeled on Sentinel-2 (5-day nominal revisit) and Sentinel-1 C-SAR (~10 m pixel spacing).
            </div>

            {/* Sensor Band Toggle: 3 equal cards */}
            <ScenePanel value={sceneType} onChange={setSceneType} disabled={isRunning} />

            {/* Cloud Coverage Slider (disabled in real replay mode as SCL mask is used) */}
            {dataSource === 'calibration' ? (
              <CloudSlider value={cloudCoverage} onChange={setCloudCoverage} disabled={isRunning} />
            ) : (
              <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between text-[#b5b5ad]">
                  <span className="font-semibold text-[#f5f5f0]">Modeled Scene Classification Layer (SCL)</span>
                  <span className="text-[10px] font-mono text-[#facc15]">Active</span>
                </div>
                <p className="text-[11px] text-[#b5b5ad] leading-relaxed">
                  Modeled atmospheric classification mask automatically filters cirrus clouds (SCL 10), high-probability clouds (SCL 9), and cloud shadows (SCL 3) directly from spectral telemetry.
                </p>
              </div>
            )}
          </div>

          {/* Detections Breakdown (when scan finishes) */}
          {result && (
            <div className="p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2e2e2e]">
                <h3 className="text-xs font-semibold text-[#f5f5f0]">Detected anomalies</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1a1a1a] border border-[#facc15] text-[#facc15] font-semibold">
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
          <div className="p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col flex-1 gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e2e2e]">
              <div>
                <h3 className="text-sm font-semibold text-[#f5f5f0]">Change detection</h3>
                <p className="text-xs text-[#b5b5ad]">
                  Bitemporal comparison • {activeZone?.properties?.name || 'Protected corridor'}
                </p>
              </div>

              {result && (
                <button
                  type="button"
                  onClick={handleSaveScan}
                  disabled={savingScan}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#121212] border border-[#facc15] text-[#facc15] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingScan ? 'Saving...' : 'Save scan'}</span>
                </button>
              )}
            </div>

            {saveStatus && (
              <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#facc15] text-[#facc15] text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{saveStatus}</span>
              </div>
            )}

            {/* Scene provenance: real Copernicus IDs with live archive check, or modeled-site label */}
            {result?.scene_metadata && <SceneProvenanceCard meta={result.scene_metadata} />}

            {/* Empty State when no scan has run */}
            {!result && !isRunning ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#2e2e2e] rounded-lg bg-[#1a1a1a]/40 min-h-[360px]">
                <div className="w-12 h-12 rounded-full bg-[#121212] border border-[#2e2e2e] flex items-center justify-center mb-3">
                  <Radar className="w-6 h-6 text-[#facc15]" />
                </div>
                <h4 className="text-sm font-semibold text-[#f5f5f0] mb-1">
                  No scan executed for this zone yet
                </h4>
                <p className="text-xs text-[#b5b5ad] max-w-sm">
                  Select {dataSource === 'real' ? 'a modeled real target site' : 'parameters'} and click Run scan.
                </p>
              </div>
            ) : (
              /* Canvas with side-by-side scenes and overlay */
              <div className="flex flex-col gap-4">
                <DetectionCanvas
                  sceneType={sceneType}
                  result={result}
                  isRunning={isRunning}
                  progress={progress}
                  currentStage={currentStage}
                />

                {/* Metrics Summary Strip with 4 Counters */}
                {result && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#2e2e2e]">
                    <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex flex-col">
                      <span className="text-[11px] text-[#b5b5ad]">Raw detections</span>
                      <span className="text-xl font-bold font-mono text-[#93c5fd]">
                        {result.raw_count}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex flex-col">
                      <span className="text-[11px] text-[#b5b5ad]">Rejected (False+)</span>
                      <span className="text-xl font-bold font-mono text-[#fbbf24]">
                        {result.false_positives_filtered}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex flex-col">
                      <span className="text-[11px] text-[#b5b5ad]">Validated alerts</span>
                      <span className="text-xl font-bold font-mono text-[#facc15]">
                        {result.validated_count}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex flex-col">
                      <span className="text-[11px] text-[#b5b5ad]">Sub-threshold (&lt;35%)</span>
                      <span className="text-xl font-bold font-mono text-[#94a3b8]">
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
      <div className="p-5 rounded-lg bg-[#121212] border border-[#2e2e2e] flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#2e2e2e]">
          <Info className="w-4 h-4 text-[#facc15]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f0]">
            Physical Detection Limitations & Evidentiary Methodology
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#b5b5ad] leading-relaxed">
          <div className="p-3 rounded-md bg-[#1a1a1a] border border-[#2e2e2e]">
            <span className="text-white font-semibold block mb-1">Spatial Resolution Cutoff</span>
            Sentinel-2 MSI pixel size is 10 m (100 m² per pixel). Connected-component detections below 5 contiguous pixels (&lt;500 m²) are automatically filtered to suppress sensor noise and minor agricultural tilling.
          </div>
          <div className="p-3 rounded-md bg-[#1a1a1a] border border-[#2e2e2e]">
            <span className="text-white font-semibold block mb-1">Dual-Sensor Radar Requirement</span>
            Optical vegetation loss (ΔNDVI &lt; -0.25) alone cannot differentiate legal seasonal crop harvest from illegal clearing. Sentinel-1 C-SAR radar backscatter (+dB) is required to identify rigid double-bounce masonry or quarry gouging.
          </div>
          <div className="p-3 rounded-md bg-[#1a1a1a] border border-[#2e2e2e]">
            <span className="text-white font-semibold block mb-1">Candidate Evidentiary Status</span>
            Orbital detections are algorithmic candidates for human administrative verification. Under Section 63 BSA, automated alerts must be confirmed by an authorized officer prior to executing statutory demolition or eviction orders.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Scan;
