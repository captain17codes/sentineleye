import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, ArrowRight, LogIn } from 'lucide-react';

export function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full bg-panel/90 backdrop-blur-md border-b border-border select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-bg font-bold">
            <Shield className="w-4 h-4 text-bg" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-text">
            SentinelEye
          </span>
        </Link>

        {/* Public Nav Links */}
        <nav className="flex items-center gap-6 text-xs font-medium text-muted">
          <Link
            to="/policy"
            className={`transition-colors ${
              location.pathname === '/policy' ? 'text-text font-semibold' : 'hover:text-text'
            }`}
          >
            Policy
          </Link>
          <Link
            to="/faq"
            className={`transition-colors ${
              location.pathname === '/faq' ? 'text-text font-semibold' : 'hover:text-text'
            }`}
          >
            FAQ
          </Link>
        </nav>

        {/* Right CTA / Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/overview"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-bg font-semibold text-xs hover:bg-accent/90 transition-colors"
            >
              <span>Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-text transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-md bg-accent text-bg font-semibold text-xs hover:bg-accent/90 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
