import React, { useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { LanguageProvider } from '@/hooks/useLanguage';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
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
      <StatusBar style="light" />
      <AuthProvider>
        <LanguageProvider>
          <RootLayoutNav />
        </LanguageProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

/**
 * RootLayoutNav - Central Navigation Gate.
 * Enforces role-based access control and session management via router redirects.
 */
function RootLayoutNav() {
  const { session, profile, loading, hasConfirmedRole, user, isInitialized } = useAuth();
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
    // ⚡ NANO-BOOT: Only block navigation if we're not initialized yet.
    if (!isInitialized) return;

    const firstSegment = segments[0] as string;
    const isAuthBypass = firstSegment === 'login' || firstSegment === 'auth-callback' || firstSegment === 'onboarding' || firstSegment === 'auth';
    
    // NAVIGATION GATEWAY
    if (!session) {
      // Must be logged in to access protected routes
      if (!isAuthBypass) {
        router.replace('/login');
      }
    } else {
      // Logged in session exists
      const hasValidProfile = profile && profile.id === user?.id && hasConfirmedRole;

      if (!hasValidProfile) {
        // Enforce onboarding/role selection if missing
        if (firstSegment !== 'onboarding' && firstSegment !== 'auth-callback') {
          router.replace('/onboarding');
        }
      } else {
        // Fully authenticated and role-confirmed
        // Prevent users from going back to auth screens
        if (isAuthBypass && firstSegment !== 'auth-callback') {
          router.replace('/(tabs)');
        }
      }
    }
  }, [session, profile, loading, hasConfirmedRole, segments, user]);

  const showLoadingOverlay = loading && !session && !isInitialized;
    
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
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth-callback" options={{ presentation: 'transparentModal' }} />
        <Stack.Screen name="clients/new" options={{ 
            headerShown: true, 
            title: 'New Client', 
            headerTintColor: Colors.white,
            headerStyle: { backgroundColor: Colors.surface } 
        }} />
        <Stack.Screen name="clients/[id]" options={{ 
            headerShown: true, 
            title: 'Client Details', 
            headerTintColor: Colors.white,
            headerStyle: { backgroundColor: Colors.surface } 
        }} />
      </Stack>
      
      {showLoadingOverlay && (
        <View style={styles.loadingOverlay}>
           <DashboardSkeleton message={profile ? "Refreshing session..." : "Establishing connection..."} />
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
