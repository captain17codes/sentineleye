import React from 'react';
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

  const navItems = [
    { label: 'Overview', to: '/overview', icon: LayoutDashboard },
    { label: 'Live Map', to: '/map', icon: MapPin },
    { label: 'Alerts', to: '/alerts', icon: AlertTriangle },
    { label: 'Scan', to: '/scan', icon: Radar },
    { label: 'Risk', to: '/risk', icon: BarChart3 },
    { label: 'Ledger', to: '/ledger', icon: Lock },
    { label: 'Policy', to: '/policy', icon: BookOpen },
    { label: 'FAQ', to: '/faq', icon: HelpCircle },
    { label: 'Settings', to: '/settings', icon: Settings },
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
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to === '/overview' && location.pathname === '/command');

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-raised text-text border-l-[3px] border-l-accent border-y-transparent border-r-transparent'
                    : 'text-muted hover:text-text hover:bg-raised border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-muted'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
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
          {/* Left System Telemetry */}
          <div className="flex items-center gap-4 text-muted">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-text font-medium text-xs">System online</span>
            </div>
            <span className="text-border">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
              <Layers className="w-3.5 h-3.5 text-muted" />
              <span>Data: Sentinel-2 L2A + calibration set</span>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-[#facc15] bg-raised border border-[#facc15]/40">
              Prototype
            </span>
          </div>

          {/* Right Controls: Presentation Mode Toggle + Jurisdiction Picker + Ledger Status */}
          <div className="flex items-center gap-3">
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

            <span className="text-border">|</span>

            {/* Jurisdiction Picker (Explicitly styled solid to avoid OS white-on-white) */}
            <div className="relative flex items-center">
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as JurisdictionOption)}
                aria-label="Jurisdiction Selector"
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

            <span className="text-border">|</span>

            {/* Ledger status */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-muted">
              <span>Ledger:</span>
              <span className="text-accent font-semibold">SHA-256 Verified</span>
            </div>
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
        <footer className="h-7 flex-shrink-0 px-4 bg-[#0a0a0a] border-t border-[#2e2e2e] flex items-center justify-between text-[11px] text-[#8f8f86] font-mono select-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#facc15]" />
            <span className="text-[#b5b5ad]">
              Research prototype · runs in your browser · ledger stored locally
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[10px] presentation-hidden">
            <span>Real Sentinel-2 L2A: Z-102, Z-104</span>
            <span>•</span>
            <span>Calibration dataset elsewhere</span>
            <span>•</span>
            <span>Indicative zone polygons</span>
            <span>•</span>
            <span>Section 63 BSA</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
