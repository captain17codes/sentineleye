import React, { Suspense, useState } from 'react';
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
  Satellite,
  CloudOff,
  Leaf,
  MapPin,
  UserCheck,
  Github,
} from 'lucide-react';

const OrbitBackdrop = React.lazy(() => import('../components/landing/OrbitBackdrop'));

// Deterministic starfield as layered radial gradients (no images, no runtime cost).
const STARS = (() => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: string[] = [];
  for (let i = 0; i < 160; i++) {
    const r = rnd() < 0.85 ? 0.6 : 1.1;
    out.push(`radial-gradient(${r}px ${r}px at ${(rnd() * 100).toFixed(2)}% ${(rnd() * 100).toFixed(2)}%, rgba(255,255,255,${(0.3 + rnd() * 0.6).toFixed(2)}), transparent 100%)`);
  }
  return out.join(',');
})();

const glass = 'rounded-2xl border border-white/[0.08] bg-[#0b1020]/65 backdrop-blur-md';
const kicker = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-[#facc15]';
const heading = 'font-display font-light text-3xl sm:text-[2.6rem] leading-[1.1] text-[#f5f5f0]';

export function Landing() {
  const { user, login, register, logout } = useAuth();
  const navigate = useNavigate();

  // Auth Card State
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [showAuth, setShowAuth] = useState(false);
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

  const fillDemoAccount = async (target: string = '/overview') => {
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
      navigate(target, { replace: true });
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

  const projectStatus = [
    { name: 'Detection engine (NDVI, fusion, polygons, boundary overlap, classification)', pct: 100, note: 'Working, tested' },
    { name: 'Evidence ledger (SHA-256 chain, ECDSA signatures, tamper detection)', pct: 100, note: 'Working, tested' },
    { name: 'Draft notice PDF with Section 63 BSA certificate and verify page', pct: 100, note: 'Working' },
    { name: 'Web application (dashboard, map, scan, alerts, ledger)', pct: 95, note: 'Deployed' },
    { name: 'Database (Supabase: PostgreSQL + PostGIS)', pct: 85, note: 'Live: alerts, append-only ledger, zones' },
    { name: 'Real Sentinel-2 imagery', pct: 65, note: '2 sites + 3 court-documented cases' },
    { name: 'Automatic periodic image fetching', pct: 40, note: 'Script + workflow, not scheduled yet' },
    { name: 'Official zone boundaries', pct: 30, note: 'Indicative polygons for now' },
    { name: 'Validation on documented real cases', pct: 45, note: 'Khori Gaon matched; 2 failure modes found' },
    { name: 'Real Sentinel-1 radar for real sites', pct: 20, note: 'Calibration scenes only' },
  ];

  const trustPoints = [
    'Every image is named by its Copernicus scene ID, so anyone can download the same picture',
    'Every alert keeps its before and after images and the exact numbers behind it',
    'The database refuses edits and deletes of evidence records',
    'Tested on a Supreme Court demolition case: the largest change was found within 177 m'
  ];

  const goConsole = (target: string) => (user ? navigate(target) : fillDemoAccount(target));

  const features = [
    { icon: Satellite, title: 'Free satellite images', body: '10 m pixels of every protected zone, a new Sentinel-2 image about every 5 days, from the public Copernicus archive.' },
    { icon: CloudOff, title: 'Clouds removed', body: "The satellite's own scene classification marks cloud, shadow and haze; those pixels are left out of the comparison." },
    { icon: Leaf, title: 'Change detection', body: 'Vegetation (NDVI), bare soil (BSI) and surface colour are compared between two images of the same season.' },
    { icon: MapPin, title: 'Boundary check', body: 'A change becomes an alert only if at least 35% of it lies inside the protected zone. PostGIS checks it again in the database.' },
    { icon: UserCheck, title: 'Officer review', body: 'Every alert is a candidate. An officer compares the before and after images and confirms or rejects it.' },
    { icon: Lock, title: 'Tamper-evident record', body: 'Each step is a signed block in a SHA-256 chain, copied to an append-only database table that refuses edits.' },
  ];

  const khori = [
    { label: 'Largest cleared patch', value: '31.6 ha', pct: 100 },
    { label: 'Distance from the documented site', value: '177 m', pct: 18 },
    { label: 'Size vs. a no-change control site', value: '2.8×', pct: 74 },
  ];

  const stats = [
    { value: '10 m', label: 'Pixel size (Sentinel-2)' },
    { value: '5 days', label: 'Between new images of a zone' },
    { value: '8', label: 'Protected zones in Delhi NCR' },
    { value: '50', label: 'Automated tests passing' },
  ];

  return (
    <div className="relative min-h-screen bg-[#05070c] text-[#f5f5f0] selection:bg-[#facc15]/20 selection:text-white overflow-x-hidden">
      {/* fixed space backdrop: stars, guides, Earth */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: STARS, opacity: 0.7 }} />
      <div className="fixed inset-0 z-0 pointer-events-none">
        {[0.25, 0.5, 0.75].map((x) => (
          <span key={x} className="absolute top-0 bottom-0 w-px bg-white/[0.035]" style={{ left: `${x * 100}%` }} />
        ))}
      </div>
      <Suspense fallback={null}>
        <OrbitBackdrop />
      </Suspense>
      <div className="fixed inset-x-0 top-0 h-48 z-0 pointer-events-none bg-gradient-to-b from-[#05070c] to-transparent" />

      {/* fixed pill navigation */}
      <header className="fixed top-0 inset-x-0 z-40 flex justify-center pt-4 px-4">
        <nav className="flex items-center gap-1 p-1.5 rounded-full border border-white/10 bg-[#0b1020]/70 backdrop-blur-md shadow-[0_0_40px_rgba(250,204,21,0.06)]">
          <a href="#top" className="flex items-center gap-2 pl-1.5 pr-3">
            <span className="w-7 h-7 rounded-full bg-[#facc15] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#0a0a0a]" />
            </span>
            <span className="font-display text-sm tracking-wide text-[#f5f5f0]">SentinelEye</span>
          </a>
          {[
            { href: '#features', label: 'Product' },
            { href: '#case', label: 'Real case' },
            { href: '#how', label: 'How it works' },
            { href: '#status', label: 'Status' },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden md:inline-flex px-3.5 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-[0.14em] text-[#b5b5ad] hover:text-[#f5f5f0] hover:bg-white/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => (user ? navigate('/overview') : setShowAuth(true))}
            className="ml-1 inline-flex px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0a0a0a] bg-[#facc15] hover:bg-[#fde047] transition-colors"
          >
            {user ? 'Open dashboard' : 'Sign in'}
          </button>
        </nav>
      </header>

      <main className="relative z-10">
        {/* ── Hero ── */}
        <section id="top" data-orbit="hero" className="relative min-h-screen px-6 sm:px-10 lg:px-14 pt-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <h1 className="font-display font-light text-5xl sm:text-6xl lg:text-[4.4rem] leading-[1.04] tracking-tight">
                Watch protected land
                <span className="block text-[#a8a8a0]">from orbit</span>
              </h1>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => goConsole('/overview')}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#facc15] text-[#0a0a0a] text-sm font-semibold shadow-[0_0_30px_rgba(250,204,21,0.35)] hover:bg-[#fde047] transition-colors disabled:opacity-60"
                >
                  {user ? 'Open dashboard' : loading ? 'Signing in…' : 'Sign in as field operator'}
                  <span className="w-1.5 h-1.5 rounded-full border border-[#0a0a0a]" />
                </button>
                <a href="#case" className="inline-flex items-center px-6 py-3 rounded-full border border-white/15 bg-[#0b1020]/40 backdrop-blur text-sm font-medium hover:bg-white/5 transition-colors">
                  See a real case
                </a>
              </div>
            </div>
            <p className="lg:col-span-3 lg:pt-3 text-[15px] leading-relaxed text-[#b5b5ad] max-w-sm">
              SentinelEye compares free Sentinel-2 images of protected zones taken years apart, flags clearing and
              construction inside the boundary, and seals every finding in a tamper-evident record.
            </p>
            <ul className="lg:col-span-4 flex flex-col gap-7 lg:items-end lg:pt-2">
              {[
                { icon: Radar, label: 'Pixel detail', value: '10 m, every 5 days' },
                { icon: Scale, label: 'Validated on a court case', value: 'Khori Gaon, within 177 m' },
                { icon: Lock, label: 'Evidence', value: 'Append-only, Section 63 BSA' },
              ].map((st, i) => (
                <li key={st.label} className="flex items-center gap-3 min-w-[230px]" style={{ marginRight: `${(2 - i) * 1.5}rem` }}>
                  <span className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center">
                    <st.icon className="w-3.5 h-3.5 text-[#d6d6cf]" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs text-[#a8a8a0]">{st.label}</span>
                    <span className="text-sm font-semibold">{st.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <span className="pointer-events-none select-none absolute left-4 sm:left-10 bottom-4 font-display font-light text-[13vw] leading-none tracking-[0.06em] text-white/[0.035]">
            SENTINELEYE
          </span>
          <div className="absolute left-6 sm:left-10 lg:left-14 bottom-24 hidden md:flex flex-col items-center gap-3 pointer-events-none">
            <span className="text-[10px] tracking-[0.35em] text-[#8f8f86] [writing-mode:vertical-rl]">SCROLL</span>
            <span className="w-px h-14 bg-gradient-to-b from-[#8f8f86] to-transparent" />
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          {/* ── Features ── */}
          <section id="features" data-orbit="left" className="py-28 scroll-mt-16">
            <div className="text-center max-w-2xl mx-auto">
              <p className={kicker}>Everything in one system</p>
              <h2 className={`${heading} mt-4`}>
                From a satellite image
                <span className="block text-[#a8a8a0]">to a signed notice</span>
              </h2>
              <p className="text-[15px] text-[#b5b5ad] mt-5 leading-relaxed">
                Instead of officers checking every zone on foot, the system looks at every zone from space and only
                sends them the places that really changed.
              </p>
            </div>
            <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <div key={f.title} className={`${glass} p-6 hover:border-[#facc15]/30 transition-colors`}>
                  <span className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-[#facc15]" />
                  </span>
                  <h3 className="mt-5 text-lg font-medium">{f.title}</h3>
                  <p className="mt-2 text-sm text-[#a9adb8] leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Real court case ── */}
          <section id="case" data-orbit="sat" className="py-28 scroll-mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5">
                <p className={kicker}>Tested on a real court case</p>
                <h2 className={`${heading} mt-4`}>
                  Khori Gaon, Faridabad
                  <span className="block text-[#a8a8a0]">found within 177 m</span>
                </h2>
                <p className="text-[15px] text-[#b5b5ad] mt-5 leading-relaxed">
                  In 2021 the Supreme Court ordered the demolition of structures on protected Aravalli land at Khori
                  Gaon. We gave the engine Sentinel-2 images from March 2021 and March 2022 without telling it where to
                  look. Its largest change was the demolished area.
                </p>
                <button
                  type="button"
                  onClick={() => goConsole('/cases')}
                  className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#facc15] text-[#0a0a0a] text-sm font-semibold hover:bg-[#fde047] transition-colors"
                >
                  Open the case study <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className={`lg:col-span-7 ${glass} p-5`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Khori Gaon · Sentinel-2 L2A</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#86efac]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Real data
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { src: '/real/cases/khori-gaon/t0_rgb.png', label: '20 March 2021' },
                    { src: '/real/cases/khori-gaon/t1_rgb.png', label: '30 March 2022' },
                  ].map((im) => (
                    <figure key={im.src}>
                      <img src={im.src} alt={`Khori Gaon, ${im.label}`} loading="lazy" className="w-full aspect-square object-cover rounded-lg border border-white/10" />
                      <figcaption className="mt-1.5 text-[11px] text-[#a9adb8]">{im.label}</figcaption>
                    </figure>
                  ))}
                </div>
                <ul className="mt-5 flex flex-col gap-3">
                  {khori.map((k) => (
                    <li key={k.label} className="grid grid-cols-12 items-center gap-3 text-xs">
                      <span className="col-span-5 text-[#a9adb8]">{k.label}</span>
                      <span className="col-span-5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <span className="block h-full rounded-full bg-[#facc15]" style={{ width: `${k.pct}%` }} />
                      </span>
                      <span className="col-span-2 text-right font-medium">{k.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── Stats ── */}
          <section data-orbit="stats" className="pb-28">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className={`${glass} p-6`}>
                  <p className="font-display font-light text-4xl">{s.value}</p>
                  <p className="mt-2 text-xs text-[#a9adb8]">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Mangar Bani example ── */}
          <section id="example" data-orbit="zones" className="py-28 scroll-mt-16">
            <div className={`${glass} p-6 sm:p-10`}>
              <div className="max-w-3xl mx-auto text-center">
                <p className={kicker}>Real Sentinel-2 data</p>
                <h2 className={`${heading} mt-4`}>
                  Mangar Bani sacred grove<span className="block text-[#a8a8a0]">2022 vs 2026</span>
                </h2>
                <p className="text-[15px] text-[#b5b5ad] mt-5 leading-relaxed">
                  Two Sentinel-2 images of the same 2.6 × 2.6 km area, taken in the same season four years apart.
                  Green is dense vegetation, brown is bare ground. On the right, red marks pixels where vegetation
                  dropped sharply.
                </p>
              </div>
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { src: '/evidence/real/z102_t0_ndvi.png', label: '30 March 2022', sub: 'S2B_43RGM_20220330' },
                  { src: '/evidence/real/z102_t1_ndvi.png', label: '5 April 2026', sub: 'S2A_43RGM_20260405' },
                  { src: '/evidence/real/z102_change.png', label: 'Vegetation loss', sub: 'NDVI drop greater than 0.25' },
                ].map((img) => (
                  <figure key={img.src} className="flex flex-col gap-2">
                    <img
                      src={img.src}
                      alt={`${img.label}, Mangar Bani`}
                      className="w-full aspect-square object-cover rounded-lg border border-white/10"
                      style={{ imageRendering: 'pixelated' }}
                      loading="lazy"
                    />
                    <figcaption className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{img.label}</span>
                      <span className="text-[11px] font-mono text-[#8f8f86]">{img.sub}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="mt-6 text-sm text-[#b5b5ad] leading-relaxed">
                About 3.7 hectares of pixels lost vegetation, mostly around the existing settlement in the middle of the
                image. The system reports these as candidates for an officer to check, not as confirmed violations.
              </p>
            </div>
          </section>

          {/* ── How it works ── */}
          <section id="how" data-orbit="left2" className="py-28 scroll-mt-16 flex flex-col gap-16">
            <div>
              <div className="text-center max-w-2xl mx-auto">
                <p className={kicker}>How it works</p>
                <h2 className={`${heading} mt-4`}>
                  From orbit<span className="block text-[#a8a8a0]">to evidence</span>
                </h2>
              </div>
              <ol className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pipelineSteps.map((step, idx) => (
                  <li key={step.name} className={`${glass} flex gap-3 p-5`}>
                    <span className="w-8 h-8 flex-shrink-0 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center font-mono text-xs text-[#facc15]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step.name}</p>
                      <p className="text-xs text-[#a9adb8] mt-0.5 leading-relaxed">{step.sub}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="text-center max-w-2xl mx-auto">
                <h3 className="font-display font-light text-2xl sm:text-3xl">From alert to notice</h3>
                <p className="text-[15px] text-[#b5b5ad] mt-3">The software prepares the case. People make the decisions.</p>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {escalationTimeline.map((item) => (
                  <div key={item.time} className={`${glass} p-6 flex flex-col gap-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#8f8f86]">{item.time}</span>
                      <span className="text-[11px] text-[#facc15]">{item.badge}</span>
                    </div>
                    <h4 className="text-base font-medium">{item.title}</h4>
                    <p className="text-sm text-[#a9adb8] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'What it can do', items: canDo, mark: '✓', cls: 'text-[#facc15]' },
                { title: 'Why the result can be trusted', items: trustPoints, mark: '✓', cls: 'text-[#facc15]' },
              ].map((col) => (
                <div key={col.title} className={`${glass} p-6`}>
                  <h3 className="text-base font-medium mb-3">{col.title}</h3>
                  <ul className="flex flex-col gap-2 text-sm text-[#b5b5ad]">
                    {col.items.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className={col.cls}>{col.mark}</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* ── Project status ── */}
          <section id="status" data-orbit="right2" className="py-28 scroll-mt-16">
            <div className={`${glass} p-6 sm:p-10 flex flex-col gap-8`}>
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <p className={kicker}>Where it stands</p>
                  <h2 className={`${heading} mt-4`}>Project status</h2>
                </div>
                <span className="text-sm text-[#b5b5ad]">
                  Core system complete · <span className="text-[#facc15] font-semibold">50</span> automated tests passing
                </span>
              </div>
              <ul className="flex flex-col gap-3">
                {projectStatus.filter((m) => m.pct >= 90).map((m) => (
                  <li key={m.name} className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-center">
                    <span className="sm:col-span-6 text-sm">{m.name}</span>
                    <div className="sm:col-span-4 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                      <div className="h-full rounded-full bg-[#facc15]" style={{ width: `${m.pct}%` }} />
                    </div>
                    <span className="sm:col-span-2 text-xs text-[#b5b5ad]">
                      <span className="text-[#f5f5f0] font-medium">{m.pct}%</span> · {m.note}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── CTA ── */}
          <section data-orbit="cta" className="py-28">
            <div className={`${glass} px-6 py-16 text-center`}>
              <p className={kicker}>Ready when you are</p>
              <h2 className={`${heading} mt-4`}>
                Try it on<span className="block text-[#a8a8a0]">real satellite data</span>
              </h2>
              <p className="text-[15px] text-[#b5b5ad] mt-5 max-w-xl mx-auto leading-relaxed">
                Sign in as a field operator, run a scan on a protected zone, review the alerts and check the evidence
                record. Nothing to install.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => goConsole('/overview')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#facc15] text-[#0a0a0a] text-sm font-semibold hover:bg-[#fde047] transition-colors"
                >
                  {user ? 'Open dashboard' : 'Sign in as field operator'} <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => (user ? navigate('/overview') : setShowAuth(true))}
                  className="inline-flex items-center px-6 py-3 rounded-full border border-white/15 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Sign in with email
                </button>
              </div>
            </div>
          </section>

          {/* ── Footer ── */}
          <footer data-orbit="end" className="mb-6 px-6 sm:px-8 pt-8 pb-8 rounded-2xl border border-white/[0.08] bg-[#05070c]/80 backdrop-blur-md grid grid-cols-1 md:grid-cols-12 gap-8 text-sm">
            <div className="md:col-span-5">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#facc15] flex items-center justify-center">
                  <Shield className="w-3 h-3 text-[#0a0a0a]" />
                </span>
                <span className="font-display">SentinelEye</span>
              </span>
              <p className="mt-3 text-xs text-[#8f8f86] max-w-xs leading-relaxed">
                Land encroachment monitoring prototype for protected zones in Delhi NCR.
              </p>
            </div>
            {[
              { title: 'Product', links: [['Features', '#features'], ['Real case', '#case'], ['How it works', '#how']] },
              { title: 'Data', links: [['Copernicus Sentinel-2', 'https://dataspace.copernicus.eu'], ['Earth Search STAC', 'https://earth-search.aws.element84.com/v1'], ['Status', '#status']] },
              { title: 'Project', links: [['Source code', 'https://github.com/captain17codes/sentineleye']] },
            ].map((c) => (
              <div key={c.title} className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8f8f86]">{c.title}</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-[#b5b5ad] hover:text-[#f5f5f0] inline-flex items-center gap-1.5" {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
                        {label === 'Source code' && <Github className="w-3.5 h-3.5" />}
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="md:col-span-12 text-[11px] text-[#6f7380]">
              Contains modified Copernicus Sentinel data (2021–2026). Zone boundaries are indicative. Not an official government system.
            </p>
          </footer>
        </div>
      </main>
      {showAuth && !user && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowAuth(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
            <div className="w-full max-w-[400px] rounded-xl bg-[#121212] border border-[#2e2e2e] p-6 sm:p-7 shadow-2xl flex flex-col">
              {user ? (
                /* Active Session State: Instant 1-Click Access to Console */
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2e2e2e]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#facc15] animate-pulse" />
                      <span className="text-xs font-semibold text-[#f5f5f0]">Active Session</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/30">
                      {user.role}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex flex-col gap-1">
                    <span className="text-[11px] text-[#b5b5ad]">Signed in as:</span>
                    <span className="text-xs font-mono font-bold text-[#f5f5f0] truncate">{user.email}</span>
                  </div>

                  <button
                    onClick={() => navigate('/overview')}
                    className="w-full py-3 rounded-lg bg-[#facc15] text-[#0a0a0a] font-bold text-xs hover:bg-[#eab308] flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
                  >
                    <span>Open dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2e2e2e]">
                    <button
                      type="button"
                      onClick={() => fillDemoAccount()}
                      className="py-2 px-2 rounded-md bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#facc15] text-[#f5f5f0] text-xs font-medium text-center transition-colors"
                    >
                      Reset workspace
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className="py-2 px-2 rounded-md bg-[#1a1a1a] border border-[#2e2e2e] hover:text-[#ef4444] text-[#b5b5ad] text-xs font-medium text-center transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                /* Unauthenticated Login Form */
                <>
                  {/* Tab Selector: Sign in / Create account */}
                  <div className="grid grid-cols-2 p-1 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('signin');
                        setErrorMessage(null);
                        setFieldErrors({});
                      }}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                        tab === 'signin'
                          ? 'bg-[#1a1a1a] text-[#f5f5f0] border border-[#2e2e2e]'
                          : 'text-[#b5b5ad] hover:text-[#f5f5f0]'
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
                          ? 'bg-[#1a1a1a] text-[#f5f5f0] border border-[#2e2e2e]'
                          : 'text-[#b5b5ad] hover:text-[#f5f5f0]'
                      }`}
                    >
                      Create account
                    </button>
                  </div>

                  {/* Form Heading */}
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-[#f5f5f0]">
                      {tab === 'signin' ? 'Sign in' : 'Register operator account'}
                    </h2>
                    <p className="text-xs text-[#b5b5ad] mt-0.5">
                      {tab === 'signin'
                        ? 'Enter your credentials to access surveillance operations.'
                        : 'Create a operator account with cadastral monitoring clearance.'}
                    </p>
                  </div>

                  {/* Error Alert Box */}
                  {errorMessage && (
                    <div className="mb-4 p-3 rounded-lg bg-[#1a1a1a] border border-critical text-critical text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-medium text-[#f5f5f0] mb-1.5 block">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#b5b5ad] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                          }}
                          placeholder="operator@sentineleye.com"
                          className={`w-full bg-[#0a0a0a] border ${
                            fieldErrors.email ? 'border-critical' : 'border-[#2e2e2e]'
                          } rounded-md pl-9 pr-3 py-2 text-xs text-[#f5f5f0] placeholder-[#8a9a93] focus:outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <span className="text-[11px] text-critical mt-1 block">{fieldErrors.email}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[#f5f5f0] mb-1.5 block">
                        Password
                      </label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-[#b5b5ad] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                          }}
                          placeholder="••••••••••••"
                          className={`w-full bg-[#0a0a0a] border ${
                            fieldErrors.password ? 'border-critical' : 'border-[#2e2e2e]'
                          } rounded-md pl-9 pr-9 py-2 text-xs text-[#f5f5f0] placeholder-[#8a9a93] focus:outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b5b5ad] hover:text-[#f5f5f0]"
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
                      className="w-full py-2.5 rounded-md bg-[#facc15] text-[#0a0a0a] font-semibold text-xs hover:bg-[#eab308] disabled:opacity-50 transition-colors mt-1"
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
                  <div className="mt-4 pt-4 border-t border-[#2e2e2e] flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemoAccount()}
                      className="w-full py-2 px-3 rounded-md bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#facc15] text-[#f5f5f0] text-xs font-medium text-center transition-colors"
                    >
                      Sign in as field operator
                    </button>
                    <div className="text-[11px] text-[#b5b5ad] text-center font-mono">
                      operator@sentineleye.com / operator123
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Landing;
