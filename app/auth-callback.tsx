import React, { useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const { session, loading, refreshProfile, resetProfile } = useAuth();
  const url = Linking.useURL();

  useEffect(() => {
    console.log('[AuthCallback] State:', { 
      hasSession: !!session, 
      loading, 
      hasUrl: !!url 
    });
    
    if (session && !loading) {
      console.log('[AuthCallback] Session confirmed. Instant redirect to /onboarding');
      router.replace('/onboarding');
    }
  }, [session, loading, router]);

  const processUrl = useCallback(async (rawUrl: string | null) => {
    if (!rawUrl) return;
    console.log('[AuthCallback] processUrl triggered with:', rawUrl);
    
    // Check if URL contains tokens (Supabase fragment style)
    if (rawUrl.includes('access_token=') || rawUrl.includes('#')) {
      console.log('[AuthCallback] Fragment tokens detected. Parsing...');
      try {
        const urlPart = rawUrl.split(/[?#]/)[1] || '';
        const params = new URLSearchParams(urlPart);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.error('[AuthCallback] setSession error:', error);
          } else {
            console.log('[AuthCallback] setSession success! Redirecting instantly...');
            // INSTANT REDIRECT
            router.replace('/onboarding');
          }
        }
      } catch (e) {
        console.error('[AuthCallback] Token parsing error:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (url) processUrl(url);
  }, [url, processUrl]);

  useEffect(() => {
    // Safety check for initial URL
    Linking.getInitialURL().then(initial => {
      if (initial && initial !== url) processUrl(initial);
    });
  }, []);

  useEffect(() => {
    // SAFETY TIMEOUT: If after 30s we still don't have a session, go back to login
    const timeout = setTimeout(() => {
      if (!session && !loading) {
        console.log('[AuthCallback] Timeout reached. No session found.');
        router.replace('/login');
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [session, loading]);

  const [showRetry, setShowRetry] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.amber} />
      <Text style={styles.text}>Finalizing secure connection...</Text>
      
      {(session || showRetry) && (
        <View style={{ gap: 10, marginTop: 40, alignItems: 'center' }}>
          <TouchableOpacity 
            style={styles.retryBtn} 
            onPress={() => {
              console.log('[AuthCallback] Manual refresh triggered');
              refreshProfile();
            }}
          >
            <Text style={styles.retryText}>
              {session ? "Click to Refresh Dashboard" : "Taking too long? Tap to Refresh"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.retryBtn, { borderStyle: 'dashed', borderColor: Colors.amber }]} 
            onPress={async () => {
              await resetProfile();
              router.replace('/onboarding');
            }}
          >
            <Text style={[styles.retryText, { color: Colors.amber }]}>Change Role / Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {!session && showRetry && (
        <TouchableOpacity style={[styles.retryBtn, { marginTop: 10 }]} onPress={() => router.replace('/login')}>
          <Text style={styles.retryText}>Back to Login</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  text: {
    marginTop: Spacing.xl,
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 40,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  }
});
