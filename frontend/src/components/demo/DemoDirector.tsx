/**
 * DemoDirector.tsx — Interactive 3-Minute Executive Demo Director Panel.
 * Supports step-by-step navigation, presenter talking notes, clock speed toggle,
 * instant sub-2-second demo reset, and keyboard shortcuts (Left/Right arrows).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resetDemo } from '../../engine/store/alertStore';
import { restoreTamperedChain, getLedgerChain } from '../../engine/ledger';
import { getClockSpeed, setClockSpeed, ClockSpeed } from '../../engine/clock';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Minimize2,
  Maximize2,
  Sparkles,
  FastForward,
  CheckCircle,
  Compass,
  FileText,
  ShieldAlert,
  Database,
} from 'lucide-react';

export interface DemoStep {
  id: number;
  title: string;
  route: string;
  actionLabel: string;
  presenterNote: string;
  expectedOutcome: string;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: '1. Executive Overview & Integrity',
    route: '/overview',
    actionLabel: 'Go to Overview',
    presenterNote: 'Show KPIs, severity breakdown (6 Critical, 14 High, 11 Med, 7 Low = 38 alerts), and verified SHA-256 ledger seal.',
    expectedOutcome: 'Zero discrepancy between cards, donut, and tables.',
  },
  {
    id: 2,
    title: '2. Live Protected Zone Telemetry',
    route: '/map',
    actionLabel: 'Open Live Map',
    presenterNote: 'Inspect Zone Z-101 Delhi Ridge. Show cadastral boundary vector overlay and live surveillance incident cluster markers.',
    expectedOutcome: 'Cadastral polygons match statutory boundaries exactly.',
  },
  {
    id: 3,
    title: '3. Multi-Sensor Scan Execution',
    route: '/scan',
    actionLabel: 'Open Scan Engine',
    presenterNote: 'Select Z-101, Fused mode, cloud 40%. Run scan and observe 9 worker stages from cloud mask to cadastral polygon intersection.',
    expectedOutcome: 'Connected-component vectorization detects concrete encroached polygon.',
  },
  {
    id: 4,
    title: '4. Optical vs SAR Cloud Penetration',
    route: '/scan',
    actionLabel: 'Test Optical Mode',
    presenterNote: 'Switch to Optical-only with 40% cloud cover. Point out that cloud hides the building; switch to Fused SAR and show it caught.',
    expectedOutcome: 'Demonstrates why Sentinel-1 C-band SAR radar is legally necessary in India.',
  },
  {
    id: 5,
    title: '5. False-Positive Rejection',
    route: '/overview',
    actionLabel: 'View Spectral Scatter',
    presenterNote: 'Scroll to Spectral Analysis scatter chart. Explain why seasonal crop harvesting is rejected while real structures are flagged.',
    expectedOutcome: 'Seasonal farming drops into low-SAR quadrant and is safely discarded.',
  },
  {
    id: 6,
    title: '6. Accelerated Escalation (960x)',
    route: '/alerts',
    actionLabel: 'Open Alerts Dossier',
    presenterNote: 'Open alert detail and click "Run escalation (accelerated)". Watch T+00:00 -> T+00:15 -> T+04:00 play out live.',
    expectedOutcome: 'Both transitions commit SHA-256 blocks and update audit trail.',
  },
  {
    id: 7,
    title: '7. Section 63 BSA Notice & Public QR',
    route: '/alerts',
    actionLabel: 'Generate Section 63 Notice',
    presenterNote: 'Download client-side Section 63 BSA PDF. Show legal certificate with Part A & Part B, evidence hashes, and click/scan the QR code to open the public verifier.',
    expectedOutcome: 'Public verifier displays green VALID CRYPTOGRAPHIC SEAL without login.',
  },
  {
    id: 8,
    title: '8. Tamper Detection & Self-Healing',
    route: '/ledger',
    actionLabel: 'Open Ledger Explorer',
    presenterNote: 'Click "Simulate tampering" -> re-verify -> show red broken chain at Block #12. Then click "Restore chain" -> green verified.',
    expectedOutcome: 'Proves forensic admissibility under Section 63, Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B, Indian Evidence Act, 1872).',
  },
];

export function DemoDirector() {
  const navigate = useNavigate();
  const location = useLocation();

  const [active, setActive] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [clockSpeed, setSpeed] = useState<ClockSpeed>(getClockSpeed());
  const [resetting, setResetting] = useState(false);

  // Check if ?demo=1 or demo mode is active
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('demo') === '1' || localStorage.getItem('sentineleye_demo_active') === '1') {
      setActive(true);
      localStorage.setItem('sentineleye_demo_active', '1');
    }
  }, [location.search]);

  // Keyboard shortcut listener: Left/Right arrows for steps
  useEffect(() => {
    if (!active || collapsed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, collapsed, currentStepIdx]);

  const step = DEMO_STEPS[currentStepIdx];

  const handleNextStep = () => {
    if (currentStepIdx < DEMO_STEPS.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      navigate(DEMO_STEPS[nextIdx].route);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      navigate(DEMO_STEPS[prevIdx].route);
    }
  };

  const handleJumpToStep = (idx: number) => {
    setCurrentStepIdx(idx);
    navigate(DEMO_STEPS[idx].route);
  };

  const handleSpeedChange = (speed: ClockSpeed) => {
    setSpeed(speed);
    setClockSpeed(speed);
  };

  const handleResetDemo = () => {
    setResetting(true);
    setTimeout(() => {
      resetDemo();
      restoreTamperedChain();
      setCurrentStepIdx(0);
      setResetting(false);
      navigate('/overview?demo=1');
    }, 400);
  };

  if (!active) {
    // Show tiny toggle pill at bottom right to activate demo mode anytime
    return (
      <button
        onClick={() => {
          setActive(true);
          localStorage.setItem('sentineleye_demo_active', '1');
        }}
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-full bg-[#111816] hover:bg-[#16201c] border border-[#22c55e]/40 text-[#22c55e] text-xs font-mono font-semibold shadow-2xl flex items-center gap-1.5 transition-all presentation-hidden min-h-[36px]"
        title="Activate 3-Minute Executive Demo Mode"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />
        <span>Demo Director</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none presentation-hidden">
      {collapsed ? (
        <div className="bg-[#111816] border border-[#22c55e]/60 rounded-lg p-2.5 shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#22c55e]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-bold">Demo Step {step.id}/8</span>
          </div>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 text-[#b4c2bb] hover:text-[#f1f5f3] transition-colors"
            title="Expand Director"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="w-80 sm:w-96 bg-[#111816] border border-[#22c55e]/60 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] p-4 flex flex-col gap-3 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#2a3832]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="font-mono text-xs font-bold text-[#f1f5f3]">Executive Demo Director</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                LIVE
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetDemo}
                disabled={resetting}
                className="p-1 rounded text-[#b4c2bb] hover:text-amber-400 hover:bg-[#16201c] transition-colors"
                title="Reset demo in <2s (clears and reseeds)"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded text-[#b4c2bb] hover:text-[#f1f5f3] hover:bg-[#16201c] transition-colors"
                title="Collapse panel"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Step Banner */}
          <div className="p-3 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#22c55e] font-semibold">
                STEP {step.id} OF 8
              </span>
              <span className="font-mono text-[10px] text-[#b4c2bb]">
                Use [→] to advance
              </span>
            </div>
            <h4 className="text-xs font-bold text-[#f1f5f3]">{step.title}</h4>
            <p className="text-[11px] text-[#b4c2bb] leading-relaxed">
              <span className="text-[#22c55e] font-semibold">Say: </span>
              {step.presenterNote}
            </p>
          </div>

          {/* Clock Speed & Controls */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#b4c2bb] text-[11px] flex items-center gap-1 font-mono">
              <FastForward className="w-3 h-3 text-[#22c55e]" />
              <span>Escalation clock:</span>
            </span>
            <div className="flex items-center gap-1">
              {([1, 60, 960] as ClockSpeed[]).map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    clockSpeed === spd
                      ? 'bg-[#22c55e] text-[#0b0f0e] font-bold'
                      : 'bg-[#16201c] text-[#b4c2bb] hover:text-[#f1f5f3] border border-[#2a3832]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIdx === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#16201c] hover:bg-[#111816] border border-[#2a3832] text-xs text-[#b4c2bb] hover:text-[#f1f5f3] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              onClick={() => navigate(step.route)}
              className="px-2.5 py-1.5 rounded-lg bg-[#16201c] hover:bg-[#111816] border border-[#22c55e]/40 text-xs font-mono text-[#22c55e] transition-colors"
            >
              {step.actionLabel}
            </button>

            <button
              onClick={handleNextStep}
              disabled={currentStepIdx === DEMO_STEPS.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-bold text-xs hover:bg-[#16a34a] disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Archived Ingest Badge */}
          <div className="pt-2 border-t border-[#2a3832] flex items-center justify-between text-[10px] text-[#b4c2bb] font-mono">
            <span>Archived Sentinel scenes — simulated ingest</span>
            <button
              onClick={handleResetDemo}
              className="text-amber-400 hover:underline font-sans"
            >
              Reset demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
