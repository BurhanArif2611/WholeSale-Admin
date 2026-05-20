import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from '@/lib/common/components/ScreenHeader';
import { Colors, Spacing, Typography, Layout } from '@/constants/theme';

interface ScreenLayoutProps {
  title: string;
  children: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: ReactNode;
  scroll?: boolean;
  loading?: boolean;
  error?: string | null;
  statusBarStyle?: 'auto' | 'light' | 'dark';
  onRefresh?: () => void;
  refreshing?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  /** Renders below header, stays fixed (not scrolled with body). */
  subHeader?: ReactNode;
  compactHeader?: boolean;
}

export function ScreenLayout({
  title,
  children,
  showBack = true,
  onBack,
  rightElement,
  scroll = false,
  loading = false,
  error = null,
  statusBarStyle = 'dark',
  onRefresh,
  refreshing,
  padded = true,
  keyboardAvoiding = false,
  footer,
  contentStyle,
  subHeader,
  compactHeader = false,
}: ScreenLayoutProps) {
  const body = loading ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.amber} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  ) : error ? (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  ) : (
    children
  );

  const content = (
    <View style={[styles.content, padded && styles.padded, contentStyle]}>
      {body}
    </View>
  );

  const scrollable = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.amber} />
        ) : undefined
      }
    >
      {content}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{content}</View>
  );

  const main = (
    <>
      <ScreenHeader
        title={title}
        showBack={showBack}
        onBack={onBack}
        rightElement={rightElement}
        compact={compactHeader}
      />
      {subHeader}
      {scrollable}
      {footer}
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar style={statusBarStyle} />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {main}
        </KeyboardAvoidingView>
      ) : (
        main
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: { flex: 1 },
  padded: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingTop: Spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Layout.screenPaddingBottom,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    minHeight: 200,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textMuted,
    fontSize: Typography.sm,
  },
  errorTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.danger,
    marginBottom: Spacing.xs,
  },
  errorText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: Typography.sm,
  },
});
