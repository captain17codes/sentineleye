export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Design System B: Severity colors only on badges and polygons (min 4.5:1 contrast against #0b1018)
export const severityColor: Record<Severity, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#eab308',
  HIGH: '#f59e0b',
  CRITICAL: '#ef4444',
};

export const severityBg: Record<Severity, string> = {
  LOW: 'rgba(148, 163, 184, 0.15)',
  MEDIUM: 'rgba(234, 179, 8, 0.15)',
  HIGH: 'rgba(245, 158, 11, 0.15)',
  CRITICAL: 'rgba(239, 68, 68, 0.15)',
};

export const riskLevelColor: Record<RiskLevel, string> = {
  low: '#94a3b8',
  medium: '#eab308',
  high: '#f59e0b',
  critical: '#ef4444',
};

export const classColors: Record<string, string> = {
  'Deforestation': '#ef4444',
  'Unauthorized Construction': '#f59e0b',
  'Mining': '#eab308',
  'Land Encroachment': '#38bdf8',
};

export function getSeverityClass(severity: string): string {
  const s = severity?.toUpperCase();
  if (s === 'CRITICAL') return 'badge-critical';
  if (s === 'HIGH') return 'badge-high';
  if (s === 'MEDIUM') return 'badge-medium';
  return 'badge-low';
}

export function getRiskColor(riskLevel: string): string {
  return riskLevelColor[riskLevel?.toLowerCase() as RiskLevel] ?? '#64748b';
}

export function getClassColor(encroachmentClass: string): string {
  return classColors[encroachmentClass] || '#facc15';
}
