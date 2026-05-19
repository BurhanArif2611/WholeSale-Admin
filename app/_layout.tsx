import React, { useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { LanguageProvider } from '@/hooks/useLanguage';
import { AppDialogProvider } from '@/lib/common/components/AppDialog';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { DatabaseProvider } from '@/hooks/useDatabase';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { DashboardSkeleton } from '@/components/ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';

// Prevent splash screen from hiding until fonts/auth are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress known non-critical logs for cleaner production monitoring
LogBox.ignoreLogs(['Setting a timer', 'AsyncStorage has been extracted']);

/**
 * RootLayout - Bootstraps the application.
 * Handles font loading, system-level providers, and prevents splash screen flicker.
 */
export default function RootLayout() {
  console.log('🚀 [RootLayout] Mounting...');
  const [fontsLoaded, fontError] = Font.useFonts({ ...Ionicons.font });

  useEffect(() => {
    if (fontError) {
      console.warn('[RootLayout] Font loading error:', fontError);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      <AuthProvider>
        <DatabaseProvider>
          <LanguageProvider>
            <AppDialogProvider>
              <RootLayoutNav />
            </AppDialogProvider>
          </LanguageProvider>
        </DatabaseProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

/**
 * RootLayoutNav - Central Navigation Gate.
 * Enforces role-based access control and session management via router redirects.
 */
function RootLayoutNav() {
  const { session, profile, loading, hasConfirmedRole, hasCompletedProfileSetup, user, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
     if (isInitialized && !isReady) {
       SplashScreen.hideAsync().catch(() => {});
       setIsReady(true);
     }
  }, [isInitialized, isReady]);

  useEffect(() => {
    if (!isInitialized) return;

    const firstSegment = segments[0] as string;
    const authScreens = new Set(['login', 'auth-callback', 'onboarding', 'auth', 'profile-setup']);
    const isAuthScreen = authScreens.has(firstSegment);

    if (!session) {
      if (!isAuthScreen || firstSegment === 'profile-setup') {
        router.replace('/login');
      }
      return;
    }

    const hasValidRole = !!(profile && profile.id === user?.id && hasConfirmedRole);

    if (!hasValidRole) {
      if (firstSegment !== 'onboarding' && firstSegment !== 'auth-callback') {
        router.replace('/onboarding');
      }
      return;
    }

    if (!hasCompletedProfileSetup) {
      if (firstSegment !== 'profile-setup') {
        router.replace('/profile-setup');
      }
      return;
    }

    if (isAuthScreen && firstSegment !== 'auth-callback') {
      router.replace('/(tabs)');
    }
  }, [isInitialized, session, profile, hasConfirmedRole, hasCompletedProfileSetup, segments, user, router]);

  const showBootOverlay = !isInitialized;
    
  return (
    <View style={styles.container}>
      <Stack 
        screenOptions={{ 
            headerShown: false, 
            contentStyle: { backgroundColor: Colors.bg },
            animation: 'slide_from_right' 
        }}
      >
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile-setup" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth-callback" options={{ presentation: 'transparentModal' }} />
        <Stack.Screen name="clients/new" />
        <Stack.Screen name="clients/[id]" />
        <Stack.Screen name="products/new" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="orders/new" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="categories/index" />
        <Stack.Screen name="categories/new" />
        <Stack.Screen name="categories/[id]" />
        <Stack.Screen name="settings" />
      </Stack>
      
      {showBootOverlay && (
        <View style={styles.loadingOverlay}>
           <DashboardSkeleton message="Restoring your session..." />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingOverlay: { 
      ...StyleSheet.absoluteFillObject, 
      backgroundColor: Colors.bg, 
      justifyContent: 'center', 
      alignItems: 'center', 
      zIndex: 9999 
  }
});
