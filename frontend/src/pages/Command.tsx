import { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { ScenePanel } from '../components/command/ScenePanel';
import { CloudSlider } from '../components/command/CloudSlider';
import { DetectionCanvas } from '../components/command/DetectionCanvas';
import { ClassifierOutput } from '../components/command/ClassifierOutput';
import { MetricCard } from '../components/command/MetricCard';
import { AlertFeed } from '../components/command/AlertFeed';
import { SimulationBadge } from '../components/ui/SimulationBadge';
import { useDetectionWorker } from '../hooks/useDetectionWorker';
import { useZones } from '../hooks/useZones';
import { useAlerts } from '../hooks/useAlerts';
import { scansApi } from '../api/scans.api';
import { SceneType } from '../types/scan.types';
import { Satellite, Play, CheckCircle2, AlertTriangle, Activity, Database } from 'lucide-react';

export function Command() {
  const { zones, loading: zonesLoading } = useZones();
  const { refreshAlerts } = useAlerts();
  const { runDetection, isRunning, progress, result } = useDetectionWorker();

  const [selectedZoneId, setSelectedZoneId] = useState<number>(1);
  const [sceneType, setSceneType] = useState<SceneType>('fused');
  const [cloudCoverage, setCloudCoverage] = useState<number>(20);
  const [savingScan, setSavingScan] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Set default selected zone when zones load
  useEffect(() => {
    if (zones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(zones[0].properties.id);
    }
  }, [zones, selectedZoneId]);

  const activeZone = zones.find((z) => z.properties.id === selectedZoneId) || zones[0];

  const handleRunDetection = () => {
    const coords = activeZone?.geometry?.coordinates?.[0]?.[0] || [77.08, 28.52];
    runDetection({
      zone_id: selectedZoneId,
      scene_type: sceneType,
      cloud_coverage: cloudCoverage,
      lng: coords[0],
      lat: coords[1],
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
        raw_classes: result.raw_classes,
        validated_classes: result.validated_classes,
        change_score: result.change_score,
        lng: coords[0],
        lat: coords[1],
      });

      if (res.alertCreated) {
        setSaveStatus(`Scan saved. Alert #${res.alertId} generated automatically!`);
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
    <PageWrapper className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Satellite className="w-6 h-6 text-neon" />
              Orbital Command & Anomaly Processing
            </h1>
            <SimulationBadge />
          </div>
          <p className="font-mono text-xs text-muted mt-1">
            Browser Web Worker Detection Engine • Multi-Spectral Synthetic Pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NeonButton
            onClick={handleRunDetection}
            disabled={isRunning || zonesLoading}
            loading={isRunning}
            size="md"
            variant="neon"
          >
            <Play className="w-4 h-4 fill-current" />
            Run Detection Engine
          </NeonButton>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Anomaly Change Score"
          value={result ? `${(result.change_score * 100).toFixed(1)}%` : '--'}
          subtext={
            result?.change_score && result.change_score >= 0.35
              ? 'Above Alert Threshold (0.35)'
              : 'Nominal Baseline'
          }
          icon={Activity}
          glow={result && result.change_score >= 0.35 ? 'red' : 'none'}
        />

        <MetricCard
          label="Validated Threat Vectors"
          value={result ? result.validated_classes.length : '--'}
          subtext="Filtered False Alarms"
          icon={AlertTriangle}
          glow="cyan"
        />

        <MetricCard
          label="Raw Detected Patches"
          value={result ? result.raw_classes.length : '--'}
          subtext="16 Total Spectral Patches"
          icon={Satellite}
        />

        <MetricCard
          label="Active Monitored Sector"
          value={activeZone ? activeZone.properties.name.split(' ')[0] : 'Alpha'}
          subtext={`Risk Level: ${activeZone?.properties?.risk_level || 'Medium'}`}
          icon={Database}
          glow="neon"
        />
      </div>

      {/* Main Grid: Control Panel + Detection View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <GlassCard className="p-5 flex flex-col gap-5">
            {/* Sector Selector */}
            <div className="flex flex-col gap-2">
              <label className="label-mono">Target Geographic Sector</label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                disabled={isRunning}
                className="w-full bg-space/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon"
              >
                {zones.map((z) => (
                  <option key={z.properties.id} value={z.properties.id}>
                    {z.properties.code || `Z-${z.properties.id}`}: {z.properties.name} ({z.properties.risk_level.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Sensor Band Selection */}
            <ScenePanel value={sceneType} onChange={setSceneType} disabled={isRunning} />

            {/* Cloud Coverage Slider */}
            <CloudSlider value={cloudCoverage} onChange={setCloudCoverage} disabled={isRunning} />

            {/* Run Button */}
            <NeonButton
              onClick={handleRunDetection}
              disabled={isRunning || zonesLoading}
              loading={isRunning}
              size="lg"
              variant="neon"
              className="w-full"
            >
              <Play className="w-4 h-4 fill-current mr-1" />
              Execute Neural Scan
            </NeonButton>
          </GlassCard>

          {/* Classifier Output Grid */}
          {result && (
            <GlassCard className="p-5">
              <ClassifierOutput classes={result.raw_classes} />
            </GlassCard>
          )}
        </div>

        {/* Right Canvas & Feed (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GlassCard className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                Multi-Spectral Scene Simulation
              </h3>
              <div className="flex items-center gap-2">
                <SimulationBadge size="xs" />
                {result && (
                  <button
                    type="button"
                    onClick={handleSaveScan}
                    disabled={savingScan}
                    className="px-3 py-1 rounded-lg bg-neon/15 hover:bg-neon/25 text-neon border border-neon/40 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {savingScan ? 'Transmitting...' : 'Save Scan to Backend'}
                  </button>
                )}
              </div>
            </div>

            {saveStatus && (
              <div className="p-2.5 rounded-lg bg-white/5 border border-neon/30 text-neon font-mono text-xs">
                {saveStatus}
              </div>
            )}

            <DetectionCanvas result={result} isRunning={isRunning} progress={progress} />
          </GlassCard>

          {/* Live Alerts Feed */}
          <GlassCard className="p-5">
            <AlertFeed />
          </GlassCard>
        </div>
      </div>
    </PageWrapper>
  );
}
