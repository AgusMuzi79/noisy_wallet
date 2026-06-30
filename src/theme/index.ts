// NoisyDev design system tokens — dark default
export const C = {
  bg: '#16131D',
  bgElev: '#1C1826',
  surface: '#221D2E',
  surface2: '#2A2438',
  surfaceInset: '#120F19',

  border: 'rgba(236, 233, 242, 0.12)',
  borderStrong: 'rgba(236, 233, 242, 0.22)',
  borderViolet: 'rgba(155, 124, 240, 0.45)',

  text: '#F1EFF6',
  textMuted: '#A59CC0',
  textSubtle: '#8B83A6',

  primary: '#9B7CF0',
  primaryContrast: '#16131D',
  primarySoft: 'rgba(155, 124, 240, 0.16)',

  accent: '#9FE870',
  accentContrast: '#16131D',
  accentSoft: 'rgba(159, 232, 112, 0.16)',
  accentGlow: 'rgba(159, 232, 112, 0.6)',

  danger: '#E5604A',
  dangerSoft: 'rgba(229, 96, 74, 0.18)',

  teal: '#2BA597',
  mustard: '#E0A52E',
  hazard: '#F5D020',

  ink600: '#4E4668',
  ink400: '#8B83A6',
} as const;

// Font family names — must match names registered via useFonts
export const F = {
  display: 'DMSerifDisplay_400Regular',
  sans: 'SpaceGrotesk_400Regular',
  sansMedium: 'SpaceGrotesk_500Medium',
  sansSemibold: 'SpaceGrotesk_600SemiBold',
  sansBold: 'SpaceGrotesk_700Bold',
  mono: 'SpaceMono_400Regular',
} as const;

export const hexAlpha = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

export const fmtARS = (n: number) =>
  Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function fmtMovDate(isoDate: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (isoDate === todayStr) return 'Hoy';
  if (isoDate === yesterdayStr) return 'Ayer';
  const d = new Date(isoDate + 'T12:00:00');
  const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
