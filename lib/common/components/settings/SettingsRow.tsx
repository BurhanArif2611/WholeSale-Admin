import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';

interface SettingsRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  isLast?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
  disabled?: boolean;
}

export function SettingsRow({
  icon,
  iconColor = Colors.amber,
  iconBg = Colors.amber + '18',
  label,
  subtitle,
  value,
  onPress,
  showChevron = true,
  destructive = false,
  isLast = false,
  switchValue,
  onSwitchChange,
  disabled,
}: SettingsRowProps) {
  const rowStyle = [styles.row, !isLast && styles.rowBorder];

  const inner = (
    <>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={[styles.label, destructive && styles.destructive]} numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      {onSwitchChange !== undefined ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: Colors.border, true: Colors.amber + '88' }}
          thumbColor={switchValue ? Colors.amber : Colors.surface}
        />
      ) : showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      ) : null}
    </>
  );

  if (onPress && onSwitchChange === undefined) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={rowStyle}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={rowStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    minHeight: 56,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  label: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary },
  destructive: { color: Colors.danger },
  subtitle: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },
  value: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    maxWidth: 100,
    textAlign: 'right',
  },
});
