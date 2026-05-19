import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  showBack = true,
  onBack,
  rightElement,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + Spacing.xs }, style]}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.sideBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={Layout.iconSize.md} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.sideBtn} />
        )}

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.sideBtn}>{rightElement}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Layout.screenPaddingH,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.headerHeight,
  },
  sideBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tight,
    paddingHorizontal: Spacing.xs,
  },
});
