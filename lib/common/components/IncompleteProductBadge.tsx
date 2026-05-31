import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';

interface IncompleteProductBadgeProps {
  compact?: boolean;
  variant?: 'draft' | 'pending';
}

export function IncompleteProductBadge({ compact, variant = 'pending' }: IncompleteProductBadgeProps) {
  const { t } = useLanguage();
  const label = variant === 'draft' ? t('draft_product_badge') : t('details_pending_badge');

  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Ionicons name="alert-circle" size={compact ? 10 : 12} color={Colors.amberDim} />
      <Text style={[styles.text, compact && styles.textCompact]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.amberBg,
    borderWidth: 1,
    borderColor: Colors.amber + '55',
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: Typography.xs,
    fontFamily: Fonts.bold,
    color: Colors.amberDim,
  },
  textCompact: {
    fontSize: 9,
  },
});
