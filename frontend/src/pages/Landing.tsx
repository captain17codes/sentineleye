import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetDemo as resetWorkspace } from '../engine/store/alertStore';
import { restoreTamperedChain } from '../engine/ledger';
import { GlobeFallback } from '../components/landing/GlobeFallback';
import { EvidenceSlider } from '../components/landing/EvidenceSlider';
import {
  Shield,
  Eye,
  EyeOff,
  Mail,
  Key,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Radar,
  Scale,
  Layers,
} from 'lucide-react';

const HeroGlobe = React.lazy(() => import('../components/landing/HeroGlobe'));

// Lite mode: skip the WebGL globe on slow machines or projector laptops.
// ?lite=1 turns it on (remembered), ?lite=0 turns it off.
function useLiteMode(): boolean {
  const [lite] = useState<boolean>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('lite');
      if (q === '1' || q === '0') localStorage.setItem('sentineleye.lite', q);
      const saved = localStorage.getItem('sentineleye.lite');
      if (saved === '1') return true;
      if (saved === '0') return false;
    } catch {
      /* storage unavailable: fall through to auto-detect */
    }
    const nav = navigator as Navigator & { deviceMemory?: number };
    return (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) || (nav.hardwareConcurrency || 8) <= 4;
  });
  return lite;
}

export function Landing() {
  const { user, login, register, logout } = useAuth();
  const lite = useLiteMode();
  const navigate = useNavigate();

  // Auth Card State
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setLoading(true);
    try {
      if (tab === 'signin') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, 'operator');
      }
      navigate('/overview', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = async () => {
    setEmail('operator@sentineleye.com');
    setPassword('operator123');
    setFieldErrors({});
    setErrorMessage(null);
    setLoading(true);
    try {
      await login('operator@sentineleye.com', 'operator123');
      // Start every operator session from a clean, verified workspace.
      resetWorkspace();
      restoreTamperedChain();
      navigate('/overview', { replace: true });
    } catch {
      setLoading(false);
    }
  };

  const pipelineSteps = [
    { name: 'Sentinel-1/2 Dual-Band Model', sub: 'Optical + SAR Fusion Engine' },
    { name: 'Storage', sub: 'GeoTIFF / Zarr tensors' },
    { name: 'Orchestration', sub: 'Automated ingest pipeline' },
    { name: 'ML engine', sub: 'Bitemporal change model' },
    { name: 'Legal logic', sub: 'Statutory policy mapping' },
    { name: 'Hash ledger', sub: 'SHA-256 chain of custody' },
    { name: 'Dashboard', sub: 'Operator decision console' },
  ];

  const escalationTimeline = [
    {
      time: 'T+00:00',
      title: 'Alert',
      desc: 'Automated orbital change score exceeds 35% threshold inside protected cadastral zone.',
      badge: 'Automated',
    },
    {
      time: 'T+00:15',
      title: 'Expert verification',
      desc: 'Operator reviews false-alarm rejection filters and cadastral zone intersection overlay.',
      badge: 'Expert review',
    },
    {
      time: 'T+04:00',
      title: 'Legal notice',
      desc: 'Statutory draft notice generated with cryptographic ledger hash and sent to authority.',
      badge: 'Notice issued',
    },
  ];

  const howItWorksSteps = [
    {
      num: '01',
      title: 'Multi-sensor orbital acquisition',
      desc: 'Ingests synchronized optical (Sentinel-2 MSI) and radar (Sentinel-1 C-band SAR) passes across protected ecological corridors.',
    },
    {
      num: '02',
      title: 'Cloud penetration & radiometric calibration',
      desc: 'Suppresses atmospheric cloud occlusions using radar backscatter invariance, preventing weather-induced false detections.',
    },
    {
      num: '03',
      title: 'Bitemporal difference matrix',
      desc: 'Computes normalized pixel-level spectral deltas between historical reference baselines and newly acquired scene tensors.',
    },
    {
      num: '04',
      title: 'Cadastral boundary intersection',
      desc: 'Performs connected-component blob labeling and intersects change footprints with official GeoJSON protected zone perimeters.',
    },
    {
      num: '05',
      title: '4-class encroachment categorization',
      desc: 'Segments validated vectors into Deforestation, Unauthorized Construction, Mining, or Land Encroachment based on multi-spectral signatures.',
    },
    {
      num: '06',
      title: 'Cryptographic ledger immutability',
      desc: 'Commits incident coordinates, bounding boxes, and timestamped operator notes to an unbroken SHA-256 state tree.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f0e] text-[#f1f5f3] flex flex-col selection:bg-[#22c55e]/20 selection:text-white">
      {/* ── 1. Full-Viewport Entry Screen (Hero + Globe + Auth Card) ── */}
      <section className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden px-6 sm:px-10 lg:px-14 py-6 border-b border-[#1f2a26]">
        {/* Globe Background Layer */}
        <div className="absolute inset-0 flex items-center justify-center md:justify-start md:left-[-15%] lg:left-[-5%] pointer-events-none z-0 overflow-hidden">
          {lite ? (
            <GlobeFallback size={880} />
          ) : (
            <Suspense fallback={<GlobeFallback size={880} />}>
              <HeroGlobe size={960} />
            </Suspense>
          )}
        </div>

        {/* Top Bar: Logo Top-Left only (No top nav pill) */}
        <header className="relative z-20 flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e] flex items-center justify-center text-[#0b0f0e] font-bold shadow-sm">
              <Shield className="w-4 h-4 text-[#0b0f0e]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#f1f5f3] font-sans">
                SENTINELEYE
              </span>
              <span className="text-[10px] text-[#b4c2bb] font-sans">
                Planetary Intelligence & Land Protection
              </span>
            </div>
          </div>

          {/* Right Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-[#2a3832] bg-[#111816] text-[11px] text-[#b4c2bb]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span>Telemetry online</span>
          </div>
        </header>

        {/* Viewport Center Content: Left Headline & Right Solid Login Card */}
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-8">
          {/* Left Column: Headline over Globe */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-[#2a3832] bg-[#111816] text-xs text-[#b4c2bb]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              <span className="text-[#f1f5f3] font-medium">Orbital surveillance</span>
              <span className="text-[#2a3832]">|</span>
              <span>Dual Optical + SAR Model</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#f1f5f3] leading-[1.1]">
              <span className="bg-gradient-to-r from-[#22c55e] to-[#06b6d4] bg-clip-text text-transparent">
                Planetary
              </span>{' '}
              Intelligence
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[#b4c2bb] max-w-xl leading-relaxed">
              Satellite-powered land protection, from orbit to enforcement.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[#b4c2bb]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111816] border border-[#2a3832]">
                <Radar className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>SAR + Optical fusion</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111816] border border-[#2a3832]">
                <Lock className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>SHA-256 chain of custody</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111816] border border-[#2a3832]">
                <Scale className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>Section 63 BSA notices</span>
              </div>
            </div>
          </div>

          {/* Right Column: 400px Solid Login Card (NO blur, solid #111816) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="w-full max-w-[400px] rounded-xl bg-[#111816] border border-[#2a3832] p-6 sm:p-7 shadow-2xl flex flex-col">
              {user ? (
                /* Active Session State: Instant 1-Click Access to Console */
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2a3832]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse" />
                      <span className="text-xs font-semibold text-[#f1f5f3]">Active Session</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                      {user.role}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#16201c] border border-[#2a3832] flex flex-col gap-1">
                    <span className="text-[11px] text-[#b4c2bb]">Signed in as:</span>
                    <span className="text-xs font-mono font-bold text-[#f1f5f3] truncate">{user.email}</span>
                  </div>

                  <button
                    onClick={() => navigate('/overview')}
                    className="w-full py-3 rounded-lg bg-[#22c55e] text-[#0b0f0e] font-bold text-xs hover:bg-[#16a34a] flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
                  >
                    <span>Enter Mission Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2a3832]">
                    <button
                      type="button"
                      onClick={fillDemoAccount}
                      className="py-2 px-2 rounded-md bg-[#16201c] border border-[#2a3832] hover:border-[#22c55e] text-[#f1f5f3] text-xs font-medium text-center transition-colors"
                    >
                      Reset workspace
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className="py-2 px-2 rounded-md bg-[#16201c] border border-[#2a3832] hover:text-[#ef4444] text-[#b4c2bb] text-xs font-medium text-center transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                /* Unauthenticated Login Form */
                <>
                  {/* Tab Selector: Sign in / Create account */}
                  <div className="grid grid-cols-2 p-1 rounded-lg bg-[#0b0f0e] border border-[#2a3832] mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('signin');
                        setErrorMessage(null);
                        setFieldErrors({});
                      }}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                        tab === 'signin'
                          ? 'bg-[#16201c] text-[#f1f5f3] border border-[#2a3832]'
                          : 'text-[#b4c2bb] hover:text-[#f1f5f3]'
                      }`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('register');
                        setErrorMessage(null);
                        setFieldErrors({});
                      }}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                        tab === 'register'
                          ? 'bg-[#16201c] text-[#f1f5f3] border border-[#2a3832]'
                          : 'text-[#b4c2bb] hover:text-[#f1f5f3]'
                      }`}
                    >
                      Create account
                    </button>
                  </div>

                  {/* Form Heading */}
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-[#f1f5f3]">
                      {tab === 'signin' ? 'Sign in to console' : 'Register operator account'}
                    </h2>
                    <p className="text-xs text-[#b4c2bb] mt-0.5">
                      {tab === 'signin'
                        ? 'Enter your credentials to access surveillance operations.'
                        : 'Create a operator account with cadastral monitoring clearance.'}
                    </p>
                  </div>

                  {/* Error Alert Box */}
                  {errorMessage && (
                    <div className="mb-4 p-3 rounded-lg bg-[#16201c] border border-critical text-critical text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-medium text-[#f1f5f3] mb-1.5 block">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#b4c2bb] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                          }}
                          placeholder="operator@sentineleye.com"
                          className={`w-full bg-[#0b0f0e] border ${
                            fieldErrors.email ? 'border-critical' : 'border-[#2a3832]'
                          } rounded-md pl-9 pr-3 py-2 text-xs text-[#f1f5f3] placeholder-[#8a9a93] focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e]`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <span className="text-[11px] text-critical mt-1 block">{fieldErrors.email}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[#f1f5f3] mb-1.5 block">
                        Password
                      </label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-[#b4c2bb] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                          }}
                          placeholder="••••••••••••"
                          className={`w-full bg-[#0b0f0e] border ${
                            fieldErrors.password ? 'border-critical' : 'border-[#2a3832]'
                          } rounded-md pl-9 pr-9 py-2 text-xs text-[#f1f5f3] placeholder-[#8a9a93] focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e]`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b4c2bb] hover:text-[#f1f5f3]"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <span className="text-[11px] text-critical mt-1 block">{fieldErrors.password}</span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-md bg-[#22c55e] text-[#0b0f0e] font-semibold text-xs hover:bg-[#16a34a] disabled:opacity-50 transition-colors mt-1"
                    >
                      {loading
                        ? tab === 'signin'
                          ? 'Authenticating...'
                          : 'Creating account...'
                        : tab === 'signin'
                        ? 'Sign in to console'
                        : 'Register as operator'}
                    </button>
                  </form>

                  {/* Operator quick sign-in */}
                  <div className="mt-4 pt-4 border-t border-[#2a3832] flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={fillDemoAccount}
                      className="w-full py-2 px-3 rounded-md bg-[#16201c] border border-[#2a3832] hover:border-[#22c55e] text-[#f1f5f3] text-xs font-medium text-center transition-colors"
                    >
                      Sign in as field operator
                    </button>
                    <div className="text-[11px] text-[#b4c2bb] text-center font-mono">
                      operator@sentineleye.com / operator123
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom indicator for scrolling */}
        <div className="relative z-20 flex items-center justify-between pt-4 border-t border-[#1f2a26] text-xs text-[#b4c2bb]">
          <span>Protected ecological zones • NCT of Delhi</span>
          <span className="text-[#8fa097]">Scroll down to inspect validation pipeline ↓</span>
        </div>
      </section>

      {/* ── 2. Architecture Pipeline Flow Row ── */}
      <section className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-16 flex flex-col gap-12">
        <div className="p-6 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#2a3832]">
            <h2 className="text-xs font-semibold uppercase text-[#b4c2bb] tracking-wider">
              End-to-end data pipeline
            </h2>
            <span className="text-[11px] font-mono text-[#22c55e]">Automated ingestion to ledger</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {pipelineSteps.map((step, idx) => (
              <div
                key={step.name}
                className="p-3 rounded-md bg-[#16201c] border border-[#2a3832] flex flex-col justify-between gap-2"
              >
                <div>
                  <span className="font-mono text-[10px] text-[#22c55e] font-semibold block mb-0.5">
                    0{idx + 1}
                  </span>
                  <span className="text-xs font-medium text-[#f1f5f3] leading-tight block">
                    {step.name}
                  </span>
                </div>
                <span className="text-[10px] text-[#b4c2bb] leading-tight">
                  {step.sub}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Evidence Validation Section ── */}
        <EvidenceSlider />

        {/* ── 4. Rapid Escalation Timeline (3 steps) ── */}
        <div className="p-6 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-[#f1f5f3]">Rapid escalation timeline</h2>
            <p className="text-xs text-[#b4c2bb] mt-1">
              Targeted time-to-enforcement workflow minimizing illegal ground development
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {escalationTimeline.map((item) => (
              <div
                key={item.time}
                className="p-4 rounded-md bg-[#16201c] border border-[#2a3832] flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#22c55e]">
                    {item.time}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#111816] border border-[#2a3832] text-[#b4c2bb]">
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#f1f5f3] mb-1">{item.title}</h3>
                  <p className="text-xs text-[#b4c2bb] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. How It Works & 4-Class Taxonomy ── */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-semibold text-[#f1f5f3]">How it works</h2>
            <p className="text-xs text-[#b4c2bb] mt-1">
              From raw satellite telemetry downlinks to legally defensible enforcement actions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {howItWorksSteps.map((step) => (
              <div
                key={step.num}
                className="p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col gap-2 hover:border-[#22c55e]/50 transition-colors"
              >
                <span className="font-mono text-xs font-semibold text-[#22c55e]">
                  {step.num}
                </span>
                <h3 className="text-sm font-semibold text-[#f1f5f3]">{step.title}</h3>
                <p className="text-xs text-[#b4c2bb] leading-relaxed">{step.desc}</p>
              </div>
            ))}

            {/* 4 Standardized Classes summary card */}
            <div className="p-5 rounded-lg bg-[#111816] border border-[#2a3832] flex flex-col justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-semibold text-[#22c55e]">
                  CLASSIFICATION
                </span>
                <h3 className="text-sm font-semibold text-[#f1f5f3] mt-1">4 validated encroachment classes</h3>
                <p className="text-xs text-[#b4c2bb] mt-1">
                  Automated multi-spectral neural taxonomy verified against protected cadastral zones:
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <span className="p-2 rounded bg-[#16201c] border border-[#2a3832] text-critical">
                  • Deforestation
                </span>
                <span className="p-2 rounded bg-[#16201c] border border-[#2a3832] text-high">
                  • Unauthorized Construction
                </span>
                <span className="p-2 rounded bg-[#16201c] border border-[#2a3832] text-medium">
                  • Mining
                </span>
                <span className="p-2 rounded bg-[#16201c] border border-[#2a3832] text-[#22c55e]">
                  • Land Encroachment
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 6. Footer ── */}
        <footer className="pt-8 border-t border-[#2a3832] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#b4c2bb]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#22c55e]" />
            <span>SentinelEye • Autonomous Planetary Intelligence & Land Protection</span>
          </div>
          <div>Contains modified Copernicus Sentinel data (2022, 2026). Calibration dataset for testing. Indicative boundaries.</div>
        </footer>
      </section>
    </div>
  );
}

export default Landing;
