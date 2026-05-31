import type { TextStyle } from 'react-native';

/** Registered Poppins font family names (loaded once in app/_layout.tsx). */
export const Fonts = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export type FontWeightKey =
  | keyof typeof Fonts
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | 'normal'
  | 'bold';

const WEIGHT_MAP: Record<string, string> = {
  '300': Fonts.light,
  light: Fonts.light,
  '400': Fonts.regular,
  normal: Fonts.regular,
  regular: Fonts.regular,
  '500': Fonts.medium,
  medium: Fonts.medium,
  '600': Fonts.semibold,
  semibold: Fonts.semibold,
  '700': Fonts.bold,
  bold: Fonts.bold,
  '800': Fonts.bold,
  extrabold: Fonts.bold,
  '900': Fonts.bold,
  black: Fonts.bold,
};

/** Resolve a weight key or numeric weight to a Poppins font family name. */
export function fontForWeight(weight?: FontWeightKey | TextStyle['fontWeight']): string {
  if (weight == null) return Fonts.regular;
  const key = String(weight).toLowerCase();
  return WEIGHT_MAP[key] ?? Fonts.regular;
}

/** Build a text style with explicit Poppins family (avoids fontWeight on Android). */
export function poppinsText(
  size: number,
  weight: FontWeightKey = 'regular',
  color?: string,
  extra?: TextStyle,
): TextStyle {
  return {
    fontFamily: fontForWeight(weight),
    fontSize: size,
    ...(color ? { color } : null),
    ...extra,
  };
}

/** Convert fontWeight in a style object to fontFamily; strips fontWeight. */
export function withPoppins(style: TextStyle): TextStyle {
  const { fontWeight, fontFamily, ...rest } = style;
  if (fontFamily) return style;
  return {
    ...rest,
    fontFamily: fontForWeight(fontWeight),
  };
}
