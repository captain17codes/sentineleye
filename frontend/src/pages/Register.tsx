import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Mail, AlertCircle, Info } from 'lucide-react';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Role is always operator for public enrollment
      await register(email, password, 'operator');
      navigate('/overview');
    } catch (err: any) {
      setError(err.message || 'Registration failed. User may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-140px)] p-4 select-none">
      <div className="p-8 w-full max-w-md rounded-lg bg-panel border border-border flex flex-col shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center text-bg mb-3">
            <Shield className="w-5 h-5 text-bg" />
          </div>
          <h1 className="text-xl font-semibold text-text">Operator registration</h1>
          <p className="text-xs text-muted mt-1">Enroll as a verified observation operator</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-critical/10 border border-critical/30 flex items-center gap-2 text-critical text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Security policy note */}
        <div className="mb-4 p-3 rounded-md bg-panel-light border border-border flex items-start gap-2 text-xs text-muted">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <span>New enrollments are assigned standard Operator permissions. Administrative credentials are provisioned via secure ledger seed.</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-text mb-1.5 block">Official email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@sentineleye.com"
                className="w-full bg-panel-light border border-border rounded-md pl-9 pr-3 py-2 text-xs text-text placeholder-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1.5 block">Password (min. 6 characters)</label>
            <div className="relative">
              <Key className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
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
            {loading ? 'Creating account...' : 'Create operator account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-muted hover:text-text transition-colors">
            Already registered? Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}
