import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { ShieldAlert } from 'lucide-react';

interface RequireRoleProps {
  role: 'operator' | 'admin';
  children: JSX.Element;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user || (role === 'admin' && user.role !== 'admin')) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <GlassCard glow="red" className="p-8 max-w-md text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-alert-red/20 border border-alert-red flex items-center justify-center text-alert-red">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-mono uppercase">Access Restricted</h2>
          <p className="text-sm text-muted">
            This sector requires <span className="text-alert-red font-mono font-bold uppercase">{role}</span> clearance level.
            Your current status is <span className="text-neon font-mono font-bold uppercase">{user?.role || 'None'}</span>.
          </p>
        </GlassCard>
      </div>
    );
  }

  return children;
}
