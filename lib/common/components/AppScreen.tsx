import React, { ReactNode } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, RefreshControl, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Typography, Layout, Fonts } from '@/constants/theme';

interface AppScreenProps {
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  padding?: boolean;
  statusBarStyle?: 'auto' | 'light' | 'dark';
}

export function AppScreen({
  children,
  loading,
  error,
  onRefresh,
  refreshing,
  scroll = false,
  padding = true,
  statusBarStyle = 'dark',
}: AppScreenProps) {
  if (loading) {
    return (
      <View style={styles.flex}>
        <StatusBar style={statusBarStyle} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.amber} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.flex}>
        <StatusBar style={statusBarStyle} />
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const content = (
    <View style={[styles.inner, padding && styles.padded]}>{children}</View>
  );

  if (scroll) {
    return (
      <View style={styles.flex}>
        <StatusBar style={statusBarStyle} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.amber} /> : undefined
          }
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar style={statusBarStyle} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1 },
  padded: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md },
  scrollContent: { flexGrow: 1, paddingBottom: Layout.screenPaddingBottom },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, padding: Spacing.xl },
  loadingText: { marginTop: Spacing.md, color: Colors.textMuted, fontSize: Typography.sm },
  errorTitle: { fontSize: Typography.lg, fontFamily: Fonts.bold, color: Colors.danger, marginBottom: 8 },
  errorText: { color: Colors.textSecondary, textAlign: 'center' },
});
