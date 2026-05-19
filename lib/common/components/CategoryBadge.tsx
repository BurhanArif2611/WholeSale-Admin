import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

interface CategoryBadgeProps {
  name: string;
  compact?: boolean;
}

export function CategoryBadge({ name, compact }: CategoryBadgeProps) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.purpleBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    maxWidth: '100%',
  },
  badgeCompact: { paddingHorizontal: 6, paddingVertical: 2 },
  text: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.purple,
  },
  textCompact: { fontSize: 10 },
});
