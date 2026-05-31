import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing, Typography, Fonts } from '@/constants/theme';

interface ListCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
  rightText?: string;
  rightSubtext?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}

/** Material-style elevated list row card used across orders, clients, products. */
export function ListCard({
  title,
  subtitle,
  meta,
  trailing,
  rightText,
  rightSubtext,
  icon,
  iconColor = Colors.amber,
  iconBg = Colors.amberBg,
  onPress,
  onLongPress,
  children,
  style,
  accentColor,
}: ListCardProps) {
  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? { onPress, onLongPress, style: ({ pressed }: { pressed: boolean }) => [styles.card, pressed && styles.pressed, style] }
    : { style: [styles.card, style] };

  return (
    <Wrapper {...(wrapperProps as object)}>
      {accentColor ? <View style={[styles.accent, { backgroundColor: accentColor }]} /> : null}
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
        {children}
      </View>
      {(rightText || rightSubtext || trailing) && (
        <View style={styles.right}>
          {trailing}
          {rightText ? <Text style={styles.rightText} numberOfLines={1}>{rightText}</Text> : null}
          {rightSubtext ? <Text style={styles.rightSub} numberOfLines={1}>{rightSubtext}</Text> : null}
        </View>
      )}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.chevron} /> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xl,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },
  meta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    fontFamily: Fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  right: { alignItems: 'flex-end', maxWidth: '36%' },
  rightText: {
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  rightSub: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    marginTop: 3,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  chevron: { marginLeft: -4 },
});
