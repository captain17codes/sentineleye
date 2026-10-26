import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetDemo as resetWorkspace } from '../engine/store/alertStore';
import { restoreTamperedChain } from '../engine/ledger';
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

export function Landing() {
  const { user, login, register, logout } = useAuth();
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
    { name: 'Get images', sub: 'Copernicus Sentinel-2 from the public STAC archive' },
    { name: 'Remove clouds', sub: 'Sentinel-2 scene classification layer' },
    { name: 'Measure vegetation', sub: 'NDVI before vs after' },
    { name: 'Check radar', sub: 'Sentinel-1, where available' },
    { name: 'Find changed areas', sub: 'Group changed pixels into shapes' },
    { name: 'Check the boundary', sub: 'Overlap with the protected zone' },
    { name: 'Record evidence', sub: 'SHA-256 chain + officer signature' },
  ];

  const escalationTimeline = [
    {
      time: 'Step 1',
      title: 'Alert',
      desc: 'A change covering more than 35% inside a protected boundary creates an alert automatically.',
      badge: 'Automatic',
    },
    {
      time: 'Step 2',
      title: 'Officer check',
      desc: 'An officer compares the before and after images and confirms or rejects the alert.',
      badge: 'Human',
    },
    {
      time: 'Step 3',
      title: 'Draft notice',
      desc: 'A draft notice with the evidence hashes and a Section 63 BSA certificate is prepared for the competent authority to sign.',
      badge: 'For signature',
    },
  ];

  const canDo = [
    'Compare free Sentinel-2 images of the same place and season, years apart',
    'Separate crop harvest from construction when radar data is available',
    'Show exactly which images were used, with IDs anyone can look up',
    'Detect if any stored record was changed afterwards',
  ];

  const cannotDo = [
    'See structures smaller than a few 10 m pixels',
    'See under dense tree canopy',
    'Decide guilt: every detection is a candidate for an officer to verify',
    'Replace official survey boundaries (ours are indicative)',
  ];

  return (
    <div className="min-h-screen bg-[#0b0f0e] text-[#f1f5f3] flex flex-col selection:bg-[#22c55e]/20 selection:text-white">
      {/* ── 1. Full-Viewport Entry Screen (Hero + Globe + Auth Card) ── */}
      <section className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden px-6 sm:px-10 lg:px-14 py-6 border-b border-[#1f2a26]">
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
                Land encroachment monitoring
              </span>
            </div>
          </div>

        </header>

        {/* Viewport Center Content: Left Headline & Right Solid Login Card */}
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-8">
          {/* Left Column: plain statement of what the tool does */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <p className="text-xs font-medium uppercase tracking-wider text-[#22c55e] mb-4">
              Protected land around Delhi NCR
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#f1f5f3] leading-[1.15] max-w-2xl">
              Spot illegal construction and clearing in protected land, from satellite images.
            </h1>

            <p className="mt-5 text-base text-[#b4c2bb] max-w-xl leading-relaxed">
              SentinelEye compares Sentinel-2 images of protected zones taken years apart, flags vegetation loss
              and new construction inside the boundary, and keeps a tamper-evident record that an officer can
              take forward as evidence.
            </p>

            <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 text-sm">
              <div>
                <dt className="text-[#8fa097] text-xs">Protected zones</dt>
                <dd className="text-[#f1f5f3] font-semibold mt-0.5">8</dd>
              </div>
              <div>
                <dt className="text-[#8fa097] text-xs">Pixel size</dt>
                <dd className="text-[#f1f5f3] font-semibold mt-0.5">10 m</dd>
              </div>
              <div>
                <dt className="text-[#8fa097] text-xs">New image every</dt>
                <dd className="text-[#f1f5f3] font-semibold mt-0.5">5 days</dd>
              </div>
              <div>
                <dt className="text-[#8fa097] text-xs">Data</dt>
                <dd className="text-[#f1f5f3] font-semibold mt-0.5">Copernicus, free</dd>
              </div>
            </dl>
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
                    <span>Open dashboard</span>
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
                      {tab === 'signin' ? 'Sign in' : 'Register operator account'}
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
                        ? 'Sign in'
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

      {/* ── 2. A real example ── */}
      <section className="w-full max-w-6xl mx-auto px-6 sm:px-10 py-16 flex flex-col gap-16">
        <div className="flex flex-col gap-5">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-[#f1f5f3]">A real example: Mangar Bani sacred grove</h2>
            <p className="text-sm text-[#b4c2bb] mt-2 leading-relaxed">
              Two Sentinel-2 images of the same 2.6 × 2.6 km area, taken in the same season four years apart.
              Colours show vegetation (NDVI): green is dense vegetation, brown is bare ground. On the right, red
              marks pixels where vegetation dropped sharply.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { src: '/evidence/real/z102_t0_ndvi.png', label: '30 March 2022', sub: 'S2B_43RGM_20220330' },
              { src: '/evidence/real/z102_t1_ndvi.png', label: '5 April 2026', sub: 'S2A_43RGM_20260405' },
              { src: '/evidence/real/z102_change.png', label: 'Vegetation loss', sub: 'NDVI drop greater than 0.25' },
            ].map((img) => (
              <figure key={img.src} className="flex flex-col gap-2">
                <img
                  src={img.src}
                  alt={`${img.label}, Mangar Bani`}
                  className="w-full aspect-square object-cover rounded-md border border-[#2a3832]"
                  style={{ imageRendering: 'pixelated' }}
                  loading="lazy"
                />
                <figcaption className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-[#f1f5f3]">{img.label}</span>
                  <span className="text-[11px] font-mono text-[#8fa097]">{img.sub}</span>
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="text-sm text-[#b4c2bb] max-w-3xl leading-relaxed">
            About 3.7 hectares of pixels lost vegetation, mostly around the existing settlement in the middle of
            the image. The system reports these as candidates for an officer to check, not as confirmed violations.
          </p>
        </div>

        {/* ── 3. How it works ── */}
        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-semibold text-[#f1f5f3]">How it works</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
            {pipelineSteps.map((step, idx) => (
              <li key={step.name} className="flex gap-3">
                <span className="font-mono text-sm text-[#22c55e] pt-0.5">{idx + 1}</span>
                <div>
                  <p className="text-sm font-medium text-[#f1f5f3]">{step.name}</p>
                  <p className="text-xs text-[#b4c2bb] mt-0.5 leading-relaxed">{step.sub}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ── 4. From alert to notice ── */}
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold text-[#f1f5f3]">From alert to notice</h2>
            <p className="text-sm text-[#b4c2bb] mt-1">The software prepares the case. People make the decisions.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {escalationTimeline.map((item) => (
              <div key={item.time} className="p-5 rounded-md bg-[#111816] border border-[#2a3832] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8fa097]">{item.time}</span>
                  <span className="text-[11px] text-[#b4c2bb]">{item.badge}</span>
                </div>
                <h3 className="text-base font-semibold text-[#f1f5f3]">{item.title}</h3>
                <p className="text-sm text-[#b4c2bb] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Honest scope ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-base font-semibold text-[#f1f5f3] mb-3">What it can do</h2>
            <ul className="flex flex-col gap-2 text-sm text-[#b4c2bb]">
              {canDo.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-[#22c55e]">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#f1f5f3] mb-3">What it can't do</h2>
            <ul className="flex flex-col gap-2 text-sm text-[#b4c2bb]">
              {cannotDo.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-[#8fa097]">–</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── 6. Footer ── */}
        <footer className="pt-8 border-t border-[#2a3832] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#8fa097]">
          <span>SentinelEye · land encroachment monitoring prototype</span>
          <span>Contains modified Copernicus Sentinel data (2022, 2026). Zone boundaries are indicative.</span>
        </footer>
      </section>
    </div>
  );
}

export default Landing;
