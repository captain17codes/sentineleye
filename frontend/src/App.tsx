import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { JurisdictionProvider } from './context/JurisdictionContext';
import { PresentationModeProvider } from './context/PresentationModeContext';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './components/guards/RequireAuth';

import { Landing } from './pages/Landing';
import { Overview } from './pages/Overview';
import { Scan } from './pages/Scan';
import { MapView } from './pages/MapView';
import { Alerts } from './pages/Alerts';
import { Risk } from './pages/Risk';
import { Ledger } from './pages/Ledger';
import { PublicVerify } from './pages/PublicVerify';
import { Policy } from './pages/Policy';
import { FAQ } from './pages/FAQ';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';
import { DemoDirector } from './components/demo/DemoDirector';

function LandingRoute() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f0e] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return <Landing />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AlertProvider>
          <JurisdictionProvider>
            <PresentationModeProvider>
              <Routes>
              {/* Entry Page: Landing + Login on One Screen */}
              <Route path="/" element={<LandingRoute />} />
              <Route path="/landing" element={<Landing />} />

              {/* Redirect legacy auth paths to entry page */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />

              {/* Authenticated Routes inside AppShell */}
              <Route
                path="/overview"
                element={
                  <RequireAuth>
                    <AppShell>
                      <Overview />
                    </AppShell>
                  </RequireAuth>
                }
              />
              <Route
                path="/command"
                element={<Navigate to="/overview" replace />}
              />
              <Route
                path="/map"
                element={
                  <RequireAuth>
                    <AppShell>
                      <MapView />
                    </AppShell>
                  </RequireAuth>
                }
              />
              <Route
                path="/alerts"
                element={
                  <RequireAuth>
                    <AppShell>
                      <Alerts />
                    </AppShell>
                  </RequireAuth>
                }
              />
              <Route
                path="/scan"
                element={
                  <RequireAuth>
                    <AppShell>
                      <Scan />
                    </AppShell>
                  </RequireAuth>
                }
              />
              <Route
                path="/risk"
                element={
                  <RequireAuth>
                    <AppShell>
                      <Risk />
                    </AppShell>
                  </RequireAuth>
                }
              />
              <Route
                path="/ledger"
                element={
                  <RequireAuth>
                    <AppShell>
                      <Ledger />
                    </AppShell>
                  </RequireAuth>
                }
              />
              <Route
                path="/policy"
                element={
                  <RequireAuth>
                    <AppShell>
                      <Policy />
                    </AppShell>
                  </RequireAuth>
                }
              />
              <Route
                path="/faq"
                element={
                  <RequireAuth>
                    <AppShell>
                      <FAQ />
                    </AppShell>
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <AppShell>
                      <Settings />
                    </AppShell>
                  </RequireAuth>
                }
              />

              {/* Public Section 65B Cryptographic Proof Page */}
              <Route path="/verify/:hash" element={<PublicVerify />} />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <DemoDirector />
            </PresentationModeProvider>
          </JurisdictionProvider>
        </AlertProvider>
      </AuthProvider>
    </Router>
  );
}
