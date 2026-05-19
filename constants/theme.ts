// constants/theme.ts
import { Dimensions } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Colors = {
  bg: '#F2F5F9', // Light, soft background
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  amber: '#F59E0B',
  amberLight: '#fef2c7ff',
  amberDim: '#B45309',
  amberBg: '#FFFBEB',

  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  success: '#10B981',
  successBg: '#F0FDF4',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  purple: '#8B5CF6',
  purpleBg: '#F5F3FF',

  white: '#FFFFFF',
  black: '#000000',

  // Soft palette for cards
  soft: {
    amber: '#FFF4E8',
    purple: '#F3E8FF',
    info: '#EBF5FF',
    success: '#E8F8F5',
    indigo: '#EEF2FF',
  },
  softIcon: {
    amber: '#FFEDE0',
    purple: '#F0E6FF',
    info: '#E1EFFF',
    success: '#E1F7F2',
    indigo: '#E0E7FF',
  }
};

// Gradient presets — [start, end]
export const Gradients = {
  amber: ['#FBBF24', '#F59E0B'] as const,
  amberBg: ['#FFFBEB', '#F2F5F9'] as const,
  card: ['#FFFFFF', '#F8FAFC'] as const,
  danger: ['#F87171', '#EF4444'] as const,
  success: ['#34D399', '#10B981'] as const,
  info: ['#60A5FA', '#3B82F6'] as const,
  purple: ['#A78BFA', '#8B5CF6'] as const,
  dark: ['#334155', '#1E293B'] as const,
  header: ['#FFFFFF', '#F2F5F9'] as const,
  debtBanner: ['#FEF3C7', '#FFFBEB'] as const,
};


export const Typography = {
  xs: 15,
  sm: 17,
  base: 18,
  md: 21,
  lg: 25,
  xl: 30,
  xxl: 38,
  xxxl: 46,

  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,

  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
};

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

/** Shared layout tokens for consistent screen structure */
export const Layout = {
  screenPaddingH: Spacing.lg,
  screenPaddingBottom: 100,
  contentGap: Spacing.md,
  headerHeight: 52,
  iconSize: {
    sm: 18,
    md: 22,
    lg: 28,
  },
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  clay: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)', // Top highlight simulation
  },
  amber: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  }),
};


export const STATUS_CONFIG: Record<string, {
  color: string; bg: string; label: string;
  gradient: readonly [string, string]; icon: string;
}> = new Proxy({
  New:    { color: '#F59E0B', bg: '#FFFBEB', label: 'NEW',    gradient: ['#FBBF24', '#F59E0B'], icon: 'time-outline' },
  Unpaid: { color: '#EF4444', bg: '#FEF2F2', label: 'UNPAID', gradient: ['#F87171', '#EF4444'], icon: 'alert-circle-outline' },
  Paid:   { color: '#10B981', bg: '#F0FDF4', label: 'PAID',   gradient: ['#34D399', '#10B981'], icon: 'checkmark-circle-outline' },
}, {
  get: (target: any, name: string) => {
    if (typeof name !== 'string') return undefined;
    const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    return target[normalized] || target[name] || target.New;
  }
});

export const formatCurrency = (n: number | string): string => {
  const num = Number(n);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
};