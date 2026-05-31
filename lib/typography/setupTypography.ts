import { Text, TextInput, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/fonts';

let applied = false;

/**
 * Apply Poppins as the default font for all Text and TextInput components.
 * Call once after fonts are loaded in the root layout.
 */
export function setupTypography(): void {
  if (applied) return;
  applied = true;

  const defaultStyle = { fontFamily: Fonts.regular };

  type WithDefaultProps = { defaultProps?: { style?: unknown; allowFontScaling?: boolean; maxFontSizeMultiplier?: number } };

  const textComponent = Text as typeof Text & WithDefaultProps;
  const textDefaults = textComponent.defaultProps ?? {};
  textComponent.defaultProps = {
    ...textDefaults,
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.35,
    style: StyleSheet.flatten([defaultStyle, textDefaults.style]),
  };

  const inputComponent = TextInput as typeof TextInput & WithDefaultProps;
  const inputDefaults = inputComponent.defaultProps ?? {};
  inputComponent.defaultProps = {
    ...inputDefaults,
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.35,
    style: StyleSheet.flatten([defaultStyle, inputDefaults.style]),
  };
}
