import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Mail, AlertCircle } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/overview';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-140px)] p-4 select-none">
      <div className="p-8 w-full max-w-md rounded-lg bg-panel border border-border flex flex-col shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center text-bg mb-3">
            <Shield className="w-5 h-5 text-bg" />
          </div>
          <h1 className="text-xl font-semibold text-text">Sign in to SentinelEye</h1>
          <p className="text-xs text-muted mt-1">Planetary intelligence for land protection</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-critical/10 border border-critical/30 flex items-center gap-2 text-critical text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-text mb-1.5 block">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@sentineleye.com"
                className="w-full bg-panel-light border border-border rounded-md pl-9 pr-3 py-2 text-xs text-text placeholder-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1.5 block">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-panel-light border border-border rounded-md pl-9 pr-3 py-2 text-xs text-text placeholder-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-accent text-bg font-semibold text-xs hover:bg-accent/90 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign in'}
          </button>
        </form>

        {/* Demo Credentials Shortcuts */}
        <div className="mt-6 pt-5 border-t border-border flex flex-col gap-2">
          <span className="text-[11px] font-medium text-muted text-center">Quick demo accounts:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('operator@sentineleye.com', 'operator123')}
              className="p-2 rounded-md bg-panel-light border border-border hover:border-accent/40 text-left transition-colors text-xs"
            >
              <div className="text-accent font-medium">Operator</div>
              <div className="text-muted text-[10px] font-mono truncate">operator@sentineleye.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@sentineleye.com', 'admin123')}
              className="p-2 rounded-md bg-panel-light border border-border hover:border-accent/40 text-left transition-colors text-xs"
            >
              <div className="text-accent font-medium">Admin</div>
              <div className="text-muted text-[10px] font-mono truncate">admin@sentineleye.com</div>
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/register" className="text-xs text-muted hover:text-text transition-colors">
            Need an account? Register here →
          </Link>
        </div>
      </div>
    </div>
  );
}
