export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Design System B: Severity colors only on badges and polygons
export const severityColor: Record<Severity, string> = {
  LOW: '#64748b',
  MEDIUM: '#eab308',
  HIGH: '#f59e0b',
  CRITICAL: '#ef4444',
};

export const severityBg: Record<Severity, string> = {
  LOW: 'rgba(100, 116, 139, 0.12)',
  MEDIUM: 'rgba(234, 179, 8, 0.12)',
  HIGH: 'rgba(245, 158, 11, 0.12)',
  CRITICAL: 'rgba(239, 68, 68, 0.12)',
};

export const riskLevelColor: Record<RiskLevel, string> = {
  low: '#64748b',
  medium: '#eab308',
  high: '#f59e0b',
  critical: '#ef4444',
};

export const classColors: Record<string, string> = {
  'Deforestation': '#ef4444',
  'Unauthorized Construction': '#f59e0b',
  'Mining': '#eab308',
  'Land Encroachment': '#22c55e',
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
  return classColors[encroachmentClass] || '#22c55e';
}
