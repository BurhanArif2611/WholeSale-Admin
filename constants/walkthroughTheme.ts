/** Dark premium palette for pre-login walkthrough (MD3-inspired, amber accent) */
export const WalkthroughColors = {
  bg: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  glass: 'rgba(30, 41, 59, 0.85)',
  border: 'rgba(148, 163, 184, 0.2)',
  borderGlow: 'rgba(245, 158, 11, 0.35)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  amber: '#F59E0B',
  amberLight: '#FBBF24',
  success: '#10B981',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
};

export const WalkthroughGradients = {
  hero: ['#1E293B', '#0F172A'] as const,
  card: ['#334155', '#1E293B'] as const,
  amber: ['#FBBF24', '#F59E0B'] as const,
  glow: ['rgba(245, 158, 11, 0.25)', 'transparent'] as const,
};
