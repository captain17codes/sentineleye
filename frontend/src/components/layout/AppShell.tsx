import React from 'react';
import { DbStatusChip } from '../db/DbStatusChip';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useJurisdiction, JURISDICTION_CONFIG, JurisdictionOption } from '../../context/JurisdictionContext';
import { usePresentationMode } from '../../context/PresentationModeContext';
import {
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  Radar,
  BarChart3,
  BookOpen,
  HelpCircle,
  Settings,
  LogOut,
  Shield,
  Layers,
  ChevronDown,
  Lock,
  Tv,
  Gavel,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { jurisdiction, setJurisdiction } = useJurisdiction();
  const { isPresentationMode, togglePresentationMode } = usePresentationMode();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const [guideOpen, setGuideOpen] = React.useState(false);

  const navGroups: { title: string; items: { label: string; hint: string; to: string; icon: any }[] }[] = [
    { title: 'Start', items: [{ label: 'Overview', hint: 'Summary of all zones', to: '/overview', icon: LayoutDashboard }] },
    {
      title: 'Monitor',
      items: [
        { label: 'Scan', hint: 'Compare two satellite dates', to: '/scan', icon: Radar },
        { label: 'Alerts', hint: 'Review and act on findings', to: '/alerts', icon: AlertTriangle },
        { label: 'Live Map', hint: 'See alerts on the map', to: '/map', icon: MapPin },
      ],
    },
    {
      title: 'Proof',
      items: [
        { label: 'Case studies', hint: 'Tested on real court cases', to: '/cases', icon: Gavel },
        { label: 'Ledger', hint: 'Tamper-evident record', to: '/ledger', icon: Lock },
        { label: 'Risk', hint: 'Which zones need attention', to: '/risk', icon: BarChart3 },
      ],
    },
    {
      title: 'Help',
      items: [
        { label: 'Policy', hint: 'Laws and rules used', to: '/policy', icon: BookOpen },
        { label: 'FAQ', hint: 'Common questions', to: '/faq', icon: HelpCircle },
        { label: 'Settings', hint: 'Account and database', to: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text selection:bg-accent/20 selection:text-white">
      {/* ── Left Sidebar (Dark, Flat, Professional) ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-panel border-r border-border select-none">
        {/* Brand Header */}
        <div className="h-14 px-5 flex items-center gap-3 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-bg font-bold text-sm">
            <Shield className="w-4 h-4 text-bg" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-text">SentinelEye</span>
            <span className="text-[10px] text-muted tracking-wide">Land encroachment monitoring</span>
          </div>
        </div>

        {/* User Chip */}
        {user && (
          <div className="p-3 mx-3 mt-3 mb-2 rounded-lg bg-panel-light border border-border flex items-center justify-between">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-medium text-text truncate">{user.email}</span>
              <span className="text-[10px] font-mono text-muted capitalize">{user.role}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold bg-accent-dim text-accent border border-accent/30">
              {user.role}
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-3">
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f6f68]">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.to || (item.to === '/overview' && location.pathname === '/command');
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={item.hint}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors ${
                        isActive
                          ? 'bg-raised text-text border-l-[3px] border-l-accent border-y-transparent border-r-transparent'
                          : 'text-muted hover:text-text hover:bg-raised border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} />
                      <span className="flex flex-col min-w-0 leading-tight">
                        <span className="text-xs font-medium">{item.label}</span>
                        <span className="text-[10px] text-[#7d7d76] truncate">{item.hint}</span>
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted hover:text-critical hover:bg-critical/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area with Top Status Bar ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Slim Top Status Bar */}
        <header className="h-12 flex-shrink-0 px-5 bg-panel border-b border-border flex items-center justify-between gap-4 text-xs select-none">
          {/* Left: status */}
          <div className="flex items-center gap-3 text-muted min-w-0 whitespace-nowrap">
            <div className="flex items-center gap-2" title="The app is running">
              <span className="live-dot" />
              <span className="text-text font-medium text-xs">Online</span>
            </div>
            <span
              className="hidden lg:inline-flex items-center gap-1.5 text-xs text-muted"
              title="Real Sentinel-2 L2A images for the case studies and Z-102 / Z-104; a calibration set (known answers) elsewhere"
            >
              <Layers className="w-3.5 h-3.5 text-muted" />
              Sentinel-2 data
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-[#facc15] bg-raised border border-[#facc15]/40"
              title="Student research prototype, not an official government system"
            >
              Prototype
            </span>
            <DbStatusChip />
          </div>

          {/* Right Controls: Presentation Mode Toggle + Jurisdiction Picker + Ledger Status */}
          <div className="flex items-center gap-3 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#facc15]/50 text-[#facc15] text-xs font-semibold hover:bg-[#facc15]/10 min-h-[36px]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How to use
            </button>
            {/* Presentation Mode Toggle Button */}
            <button
              type="button"
              onClick={togglePresentationMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all min-h-[36px] ${
                isPresentationMode
                  ? 'bg-[#facc15]/20 border-[#facc15] text-[#facc15] shadow-[0_0_12px_rgba(250, 204, 21,0.35)]'
                  : 'bg-[#0a0a0a] border-[#2e2e2e] text-[#b5b5ad] hover:text-[#f5f5f0] hover:border-[#facc15]/50'
              }`}
              title={isPresentationMode ? 'Exit Presentation Mode' : 'Enter Presentation Mode (Projector & High Visibility)'}
              aria-label="Toggle Presentation Mode"
            >
              <Tv className={`w-3.5 h-3.5 ${isPresentationMode ? 'text-[#facc15]' : 'text-[#b5b5ad]'}`} />
              <span className="hidden sm:inline font-medium">Presentation</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isPresentationMode
                    ? 'bg-[#facc15] text-[#0a0a0a]'
                    : 'bg-[#1a1a1a] text-[#8f8f86] border border-[#2e2e2e]'
                }`}
              >
                {isPresentationMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Jurisdiction Picker (Explicitly styled solid to avoid OS white-on-white) */}
            <div className="relative flex items-center">
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as JurisdictionOption)}
                aria-label="Jurisdiction Selector"
                title="Filter everything by area"
                className="appearance-none bg-bg border border-border text-text rounded-md px-3 py-1.5 pr-8 text-xs font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent cursor-pointer shadow-sm"
                style={{ backgroundColor: '#0a0a0a', color: '#f5f5f0' }}
              >
                {Object.entries(JURISDICTION_CONFIG).map(([key, cfg]) => (
                  <option
                    key={key}
                    value={key}
                    style={{ backgroundColor: '#0a0a0a', color: '#f5f5f0' }}
                    className="bg-bg text-text"
                  >
                    {cfg.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted absolute right-2.5 pointer-events-none" />
            </div>

            {/* Ledger status */}
            <NavLink to="/ledger" className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-muted hover:text-text" title="Open the evidence ledger">
              <Lock className="w-3 h-3" />
              <span className="text-accent font-semibold">Ledger</span>
            </NavLink>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main
          className={`flex-1 bg-bg ${
            location.pathname === '/map'
              ? 'p-0 overflow-hidden'
              : 'p-4 sm:p-6 lg:p-7 overflow-y-auto overflow-x-hidden'
          }`}
        >
          {children}
        </main>

        {/* Honest data-provenance footer */}
        <footer className="h-7 flex-shrink-0 px-4 bg-[#0a0a0a] border-t border-[#2e2e2e] flex items-center justify-between gap-4 text-[11px] text-[#8f8f86] font-mono select-none whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] flex-shrink-0" />
            <span className="text-[#b5b5ad] truncate">Research prototype · data saved in your browser and copied to the database</span>
          </div>
          <div className="hidden xl:flex items-center gap-3 text-[10px] presentation-hidden">
            <span>Real Sentinel-2: Z-102, Z-104, 3 case studies</span>
            <span>•</span>
            <span>Zone outlines are approximate</span>
          </div>
        </footer>
        {guideOpen && <QuickGuide onClose={() => setGuideOpen(false)} />}
      </div>
    </div>
  );
}

const GUIDE_STEPS = [
  { n: 1, title: 'Run a scan', body: 'Pick a protected zone and press Run scan. The app compares two satellite images of the same place taken on different dates.', to: '/scan', cta: 'Go to Scan' },
  { n: 2, title: 'Review the alerts', body: 'Each change found inside a zone becomes an alert. Open one to see before/after images, then move it to Verified once checked.', to: '/alerts', cta: 'Go to Alerts' },
  { n: 3, title: 'See it on the map', body: 'The map shows where every alert is, on top of the zone outlines.', to: '/map', cta: 'Open map' },
  { n: 4, title: 'Check the evidence record', body: 'Every action is saved as a linked, signed block. Verify the chain, or compare it with the copy in the database.', to: '/ledger', cta: 'Open Ledger' },
];

function QuickGuide({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label="How to use SentinelEye"
        className="w-full max-w-2xl rounded-2xl border border-[#2e2e2e] bg-[#111] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#facc15]">Quick guide</p>
            <h2 className="mt-1 text-xl font-semibold text-[#f5f5f0]">How to use SentinelEye in 4 steps</h2>
          </div>
          <button onClick={onClose} className="text-[#8f8f86] hover:text-[#f5f5f0] text-sm px-2 py-1 rounded-md border border-[#2e2e2e]">
            Close
          </button>
        </div>
        <ol className="grid sm:grid-cols-2 gap-3">
          {GUIDE_STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#facc15] text-[#0a0a0a] text-xs font-bold flex items-center justify-center">{s.n}</span>
                <span className="text-sm font-semibold text-[#f5f5f0]">{s.title}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#b5b5ad] flex-1">{s.body}</p>
              <button
                onClick={() => {
                  onClose();
                  navigate(s.to);
                }}
                className="mt-3 self-start text-xs font-semibold text-[#facc15] hover:underline"
              >
                {s.cta} →
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12px] text-[#8f8f86]">
          Tip: hover over any menu item for a short description. Case studies shows the method tested on real, documented sites.
        </p>
      </div>
    </div>
  );
}
