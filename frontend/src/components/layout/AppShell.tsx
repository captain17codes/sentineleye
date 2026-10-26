import React from 'react';
import { DbStatusChip } from '../db/DbStatusChip';
import { useAlerts } from '../../hooks/useAlerts';
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
  const { alerts } = useAlerts();
  const criticalOpen = alerts.filter((a) => a.severity === 'CRITICAL').length;

  const navGroups: { title: string; items: { label: string; hint: string; to: string; icon: any }[] }[] = [
    {
      title: '',
      items: [
        { label: 'Overview', hint: 'Summary of all zones', to: '/overview', icon: LayoutDashboard },
        { label: 'Scan', hint: 'Compare two satellite dates', to: '/scan', icon: Radar },
        { label: 'Alerts', hint: 'Review and act on findings', to: '/alerts', icon: AlertTriangle },
        { label: 'Live Map', hint: 'See alerts on the map', to: '/map', icon: MapPin },
      ],
    },
    {
      title: 'Analysis',
      items: [
        { label: 'Case Studies', hint: 'Tested on real court cases', to: '/cases', icon: Gavel },
        { label: 'Evidence Ledger', hint: 'Tamper-evident record', to: '/ledger', icon: Lock },
        { label: 'Risk Analysis', hint: 'Which zones need attention', to: '/risk', icon: BarChart3 },
        { label: 'Policy & Rules', hint: 'Laws and rules used', to: '/policy', icon: BookOpen },
      ],
    },
    {
      title: 'Help',
      items: [
        { label: 'FAQ', hint: 'Common questions', to: '/faq', icon: HelpCircle },
        { label: 'Settings', hint: 'Account and database', to: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text selection:bg-accent/20 selection:text-white">
      {/* ── Left Sidebar (Dark, Flat, Professional) ── */}
      <aside className="w-[248px] flex-shrink-0 flex flex-col bg-[#0d131e] border-r border-[#1b2331] select-none">
        <div className="h-16 px-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#0b1018]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-[15px] tracking-tight text-text">SentinelEye</span>
            <span className="text-[11px] text-[#6f7a8c]">Land encroachment monitoring</span>
          </div>
        </div>

        <nav className="flex-1 px-3 pt-3 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi ? 'mt-5 pt-4 border-t border-[#1b2331]' : ''}>
              {group.title && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5d6778]">{group.title}</p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.to || (item.to === '/overview' && location.pathname === '/command');
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={item.hint}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                        isActive
                          ? 'bg-[#172031] text-text font-medium shadow-[inset_2px_0_0_#facc15]'
                          : 'text-[#98a2b3] hover:text-text hover:bg-[#141b28]'
                      }`}
                    >
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#facc15]' : 'text-[#7d8798]'}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.to === '/alerts' && criticalOpen > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-md bg-[#3b1d22] text-[#f87171] text-[11px] font-semibold flex items-center justify-center">
                          {criticalOpen}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {user && (
          <div className="m-3 p-3 rounded-xl bg-[#111826] border border-[#1b2331] flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#1d2636] text-[#c9d1dc] text-xs font-semibold flex items-center justify-center uppercase">
              {(user.email || 'op').slice(0, 2)}
            </span>
            <span className="flex-1 min-w-0 leading-tight">
              <span className="block text-[13px] text-text truncate">{(user.email || '').split('@')[0]}</span>
              <span className="block text-[11px] text-[#6f7a8c] capitalize">{user.role}</span>
            </span>
            <button onClick={handleLogout} title="Sign out" className="p-1.5 rounded-md text-[#7d8798] hover:text-[#f87171] hover:bg-white/5">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Content Area with Top Status Bar ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Slim Top Status Bar */}
        <header className="h-14 flex-shrink-0 px-6 border-b border-[#1b2331] flex items-center justify-between gap-4 text-xs select-none bg-[#0b1018]">
          <div className="flex items-center gap-3 min-w-0 whitespace-nowrap">
            <DbStatusChip />
          </div>
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <div className="relative flex items-center">
              <MapPin className="w-3.5 h-3.5 text-[#7d8798] absolute left-3 pointer-events-none" />
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as JurisdictionOption)}
                aria-label="Jurisdiction Selector"
                title="Filter everything by area"
                className="appearance-none bg-[#111826] border border-[#222c3d] text-text rounded-lg pl-8 pr-8 py-2 text-xs font-medium focus:outline-none focus:border-[#facc15]/50 cursor-pointer"
                style={{ backgroundColor: '#111826', color: '#e6eaf0' }}
              >
                {Object.entries(JURISDICTION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key} style={{ backgroundColor: '#111826', color: '#e6eaf0' }}>
                    {cfg.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#7d8798] absolute right-2.5 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#222c3d] bg-[#111826] text-[#c9d1dc] text-xs font-medium hover:border-[#2f3a4d]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How to use
            </button>
            <button
              type="button"
              onClick={togglePresentationMode}
              className={`p-2 rounded-lg border transition-colors ${
                isPresentationMode ? 'border-[#facc15]/40 text-[#facc15] bg-[#facc15]/10' : 'border-[#222c3d] bg-[#111826] text-[#98a2b3] hover:text-text'
              }`}
              title={isPresentationMode ? 'Exit presentation mode' : 'Presentation mode (larger text for a projector)'}
              aria-label="Toggle Presentation Mode"
            >
              <Tv className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main
          className={`flex-1 bg-bg ${
            location.pathname === '/map'
              ? 'p-0 overflow-hidden'
              : 'p-5 sm:p-7 lg:p-8 overflow-y-auto overflow-x-hidden'
          }`}
        >
          {children}
        </main>

        {/* Honest data-provenance footer */}
        <footer className="h-7 flex-shrink-0 px-4 bg-[#0b1018] border-t border-[#222c3d] flex items-center justify-between gap-4 text-[11px] text-[#6f7a8c] font-mono select-none whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] flex-shrink-0" />
            <span className="text-[#98a2b3] truncate">Research prototype · data saved in your browser and copied to the database</span>
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
        className="w-full max-w-2xl rounded-2xl border border-[#222c3d] bg-[#111] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#facc15]">Quick guide</p>
            <h2 className="mt-1 text-xl font-semibold text-[#e6eaf0]">How to use SentinelEye in 4 steps</h2>
          </div>
          <button onClick={onClose} className="text-[#6f7a8c] hover:text-[#e6eaf0] text-sm px-2 py-1 rounded-md border border-[#222c3d]">
            Close
          </button>
        </div>
        <ol className="grid sm:grid-cols-2 gap-3">
          {GUIDE_STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-[#262626] bg-[#0b1018] p-4 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#facc15] text-[#0b1018] text-xs font-bold flex items-center justify-center">{s.n}</span>
                <span className="text-sm font-semibold text-[#e6eaf0]">{s.title}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#98a2b3] flex-1">{s.body}</p>
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
        <p className="mt-4 text-[12px] text-[#6f7a8c]">
          Tip: hover over any menu item for a short description. Case studies shows the method tested on real, documented sites.
        </p>
      </div>
    </div>
  );
}
