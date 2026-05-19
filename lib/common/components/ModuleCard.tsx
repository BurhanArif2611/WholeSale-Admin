import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';

interface ModuleCardProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  iconColor: string;
  onPress: () => void;
  badge?: string | number;
}

export function ModuleCard({ title, subtitle, icon, color, iconColor, onPress, badge }: ModuleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: color }, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.iconBox, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      {badge !== undefined && badge !== 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    minHeight: 128,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.md,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.danger,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
});
