import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { fetchProfile, createProfile, fetchOwnerByFirmCode } from '@/lib/api';
import { Profile, UserRole } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { clearCache } from './useDataStore';

const PROFILE_CACHE_KEY = 'wholesale_profile_cache';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isInitialized: boolean;
  signInWithGoogle: () => Promise<void>;
  sendEmailOTP: (email: string) => Promise<void>;
  verifyEmailOTP: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateRole: (role: UserRole, ownerId?: string) => Promise<void>;
  resetProfile: () => Promise<void>;
  resolveSalesmanFirm: (code: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasConfirmedRole: boolean;
  confirmRole: () => void;
  devBypassLogin: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasConfirmedRole, setHasConfirmedRole] = useState(false);
  const isUpdatingRef = React.useRef(false);
  const syncInProgressRef = React.useRef<string | null>(null);
  const lastSessionUserIdRef = React.useRef<string | null>(null);

  const setProfile = useCallback((p: Profile | null) => {
    setProfileState(p);
    if (p) {
      AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)).catch(e => 
        console.warn('[useAuth] Cache save error:', e)
      );
    } else {
      AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // CONSOLIDATED INITIALIZATION: Cache -> Session -> Listener
    const initializeAuth = async () => {
      const start = Date.now();
      console.log('[useAuth] ⚡ Boot sequence initiated...');

      try {
        // 1. Recover Cache (EXTREMELY FAST ~50ms)
        const cachedProfileStr = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        let localProfile: Profile | null = null;
        
        if (isMounted && cachedProfileStr) {
          localProfile = JSON.parse(cachedProfileStr);
          console.log('[useAuth] 💾 Disk cache found:', localProfile?.role);
          setProfileState(localProfile);
          if (localProfile?.role) setHasConfirmedRole(true);
        }

        // 2. IMMEDIATE UNLOCK: Unblock the Splash Screen AS SOON AS cache is ready
        if (isMounted) {
           console.log('[useAuth] ⚡ Releasing UI lock (Zero-Wait)...');
           setIsInitialized(true); 
           setLoading(false); 
        }

        // 3. BACKGROUND HANDSHAKE: Verify session after UI is unlocked
        void (async () => {
          const timeoutDuration = 12000; // Increased to 12s for mobile dev networks
          const sessionTimeout = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Session recovery timeout')), timeoutDuration)
          );
          
          try {
            const hasEnv = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
            console.log(`[useAuth] 🛰️ Background handshake initiated... (timeout: ${timeoutDuration}ms, env: ${hasEnv ? 'OK' : 'MISSING'})`);
            
            const sessionResult = await Promise.race([
              supabase.auth.getSession(),
              sessionTimeout
            ]) as any;
            const initialSession = sessionResult?.data?.session ?? null;
            
            if (isMounted) {
              setSession(initialSession);
              const currentUser = initialSession?.user ?? null;
              setUser(currentUser);
              
              if (currentUser) {
                 const isCacheValid = !!(localProfile && localProfile.id === currentUser.id);
                 void syncProfile(currentUser.id, 3, 1000, isCacheValid);
              }
              console.log('[useAuth] 🛡️ Handshake complete.');
            }
          } catch (e) {
            console.warn('[useAuth] 🛡️ Background handshake failed:', (e as Error).message);
          }
        })();

      } catch (e) {
        console.warn('[useAuth] ❌ Boot encounter serious error:', e);
        if (isMounted) {
           setLoading(false);
           setIsInitialized(true);
        }
      } finally {
        console.log(`[useAuth] ⏱️ Core boot sequence finished in ${Date.now() - start}ms`);
      }
    };

    initializeAuth();

    // AUTH STATE LISTNER: Handle future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`[useAuth] 🛰️ Auth Event: ${event}`, { userId: newSession?.user?.id });
      
      if (!isMounted) return;

      const newUser = newSession?.user ?? null;
      
      // Update session and user immediately
      setSession(newSession);
      setUser(newUser);
      
      if (event === 'SIGNED_IN' && newUser) {
        const isNewUser = newUser.id !== lastSessionUserIdRef.current;
        if (isNewUser) {
          console.log('[useAuth] 🆕 New user login detected');
          lastSessionUserIdRef.current = newUser.id;
          // Only reset if we don't have a matching profile in state already
          if (profile?.id !== newUser.id) {
            setHasConfirmedRole(false);
            setProfileState(null);
          }
        }
        void syncProfile(newUser.id, 3, 1000, profile?.id === newUser.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('[useAuth] 🚪 User signed out');
        lastSessionUserIdRef.current = null;
        setProfileState(null);
        setHasConfirmedRole(false);
        setLoading(false);
      } else if (event === 'USER_UPDATED' && newUser) {
        void syncProfile(newUser.id);
      }
    });

    const watchdog = setTimeout(() => {
      if (isMounted) {
        setLoading(current => {
          if (current) {
            console.warn('[useAuth] 🛡️ Watchdog: Force-releasing stuck loading');
            return false;
          }
          return current;
        });
        setIsInitialized(current => {
          if (!current) {
            console.warn('[useAuth] 🛡️ Watchdog: Force-releasing stuck initialization');
            return true;
          }
          return current;
        });
      }
    }, 5000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(watchdog);
    };
  }, []);

  const syncProfile = async (userId: string, retries = 3, delay = 1000, isAlreadyHydrated = false) => {
    if (isUpdatingRef.current) return;
    if (syncInProgressRef.current === userId) return;
    
    syncInProgressRef.current = userId;
    
    // NANO-LATENCY: Only show global loading if we don't have a role confirmed yet.
    // AND we haven't already hydrated from cache.
    if (!profile?.role && !hasConfirmedRole && !isAlreadyHydrated) {
      setLoading(true);
    }
    
    console.log('[useAuth] syncProfile triggered for:', userId);

    const fetchPromise = supabase.from('profiles').select('*').eq('id', userId).single();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile sync timeout')), 8000)
    );

    try {
      const { data: p, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error('[useAuth] syncProfile error:', error);
        if (retries > 0) {
          console.log(`[useAuth] Retrying sync... (${retries} left)`);
          setTimeout(() => syncProfile(userId, retries - 1, delay * 1.5), delay);
        }
      } else if (p) {
        console.log('[useAuth] syncProfile success:', p.role);
        setProfile(p);
        if (p.role) setHasConfirmedRole(true);
      } else {
        console.log('[useAuth] No profile found, will create on role selection');
        setProfile(null);
        setHasConfirmedRole(false);
      }
      setLoading(false); // SUCCESS: stop loading
    } catch (e) {
      console.error(`[useAuth] Sync profile error (Retries left: ${retries}):`, e);
      if (retries > 0) {
        // DO NOT set loading false here, we are retrying
        setTimeout(() => {
          syncInProgressRef.current = null; // Reset for retry attempt
          syncProfile(userId, retries - 1, delay * 2);
        }, delay);
      } else {
        setProfile(null);
        setLoading(false); // FAILED: stop loading after all retries
      }
    } finally {
      // ALWAYS reset if we finished (success or final failure)
      if (retries === 0 || !loading) {
         syncInProgressRef.current = null;
      }
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) await syncProfile(user.id);
  }, [user]);

  const signInWithGoogle = React.useCallback(async () => {
    console.log('[useAuth] signInWithGoogle initiated');
    try {
      // PRO-TIP: makeRedirectUri will automatically handle Expo Go vs Native
      // if we don't force the scheme for development
      const redirectUri = makeRedirectUri({
        scheme: 'wholesale-admin',
        path: 'auth-callback'
      });
      
      console.log('[useAuth] Generated Redirect URI:', redirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('[useAuth] Supabase OAuth error:', error);
        throw error;
      }
      
      if (data?.url) {
        console.log('[useAuth] Opening Auth Session with URL:', data.url);
        
        // Use openAuthSessionAsync for consistent behavior across platforms
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        
        console.log('[useAuth] WebBrowser result type:', result.type);

        if (result.type === 'success' && result.url) {
          console.log('[useAuth] Auth Session success, parsing URL...');
          // Support both Fragment (#) and Query (?) styles
          const urlPart = result.url.split(/[?#]/)[1] || '';
          const params = new URLSearchParams(urlPart);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            console.log('[useAuth] Tokens found, setting session...');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) {
              console.error('[useAuth] setSession error:', sessionError);
              throw sessionError;
            }
            console.log('[useAuth] Session set successfully:', sessionData.session?.user?.id);
          } else {
            console.warn('[useAuth] No tokens found in result URL:', result.url);
          }
        } else if (result.type === 'cancel') {
          console.log('[useAuth] User cancelled the auth session');
        } else {
           console.log('[useAuth] WebBrowser result was not success:', result);
        }
      } else {
        console.error('[useAuth] No OAuth URL returned from Supabase');
      }
    } catch (e) {
      console.error('[useAuth] Google Sign-In Error:', e);
      throw e;
    }
  }, []);

  const devBypassLogin = React.useCallback((email: string) => {
    const devUserId = '00000000-0000-0000-0000-000000000001';
    const mockUser = {
      id: devUserId,
      email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;

    const mockSession = {
      access_token: 'dev-bypass',
      refresh_token: 'dev-bypass',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mockUser,
    } as Session;

    const mockProfile: Profile = {
      id: devUserId,
      role: 'owner',
      owner_id: devUserId,
      full_name: email.split('@')[0] || 'Dev User',
      phone: null,
      created_at: new Date().toISOString(),
    };

    lastSessionUserIdRef.current = devUserId;
    setSession(mockSession);
    setUser(mockUser);
    setProfile(mockProfile);
    setHasConfirmedRole(true);
    setLoading(false);
    console.log('[useAuth] devBypassLogin: skipped OTP, entered dashboard as owner');
  }, [setProfile]);

  const sendEmailOTP = React.useCallback(async (email: string) => {
    console.log('[useAuth] sendEmailOTP initiated for:', email);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    });
    if (error) {
      console.error('[useAuth] Email OTP Error:', error);
      throw error;
    }
  }, []);

  const verifyEmailOTP = React.useCallback(async (email: string, token: string) => {
    console.log('[useAuth] verifyEmailOTP initiated for:', email);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      console.error('[useAuth] Email OTP Verification Error:', error);
      throw error;
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    const currentUserId = user?.id;
    console.log('[useAuth] Initiating robust sign out for:', currentUserId);
    
    // 1. CLEAR EVERYTHING LOCALLY FIRST (INSTANT FEEDBACK)
    console.log('[useAuth] Clearing internal state and cache...');
    AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
    clearCache();
    setProfile(null);
    setUser(null);
    setSession(null);
    setHasConfirmedRole(false);
    setLoading(false); // Clear loading to let AuthGuard work immediately
    
    // 2. REDIRECT IMMEDIATELY
    console.log('[useAuth] Sign out initiated. Forcing instant redirect.');
    router.replace('/login' as any);

    // 3. DO NETWORK CLEANUP IN BACKGROUND
    try {
      console.log('[useAuth] Finalizing cloud sign out in background...');
      // No await here means we don't block the UI
      supabase.auth.signOut().then(() => {
        console.log('[useAuth] Cloud sign out final.');
      });
    } catch (e) {
      console.warn('[useAuth] Background sign out error:', e);
    }
  }, [user, router]);

  const updateRole = React.useCallback(async (role: UserRole, ownerId?: string) => {
    try {
      console.log('[useAuth] updateRole: Initiating for role:', role, 'with ownerId:', ownerId);
      
      let currentUser = user;
      if (!currentUser) {
        const { data: { session: s } } = await supabase.auth.getSession();
        currentUser = s?.user ?? null;
      }

      if (!currentUser) {
        const { data } = await supabase.auth.getUser();
        currentUser = data.user;
      }

      if (!currentUser) throw new Error('Authentication session lost. Please sign in again.');

      isUpdatingRef.current = true;
      const payload = {
        id: currentUser.id,
        role,
        owner_id: role === 'owner' ? currentUser.id : (ownerId || null),
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || currentUser.phone || 'User',
      };
      
      const syntheticProfile: Profile = {
        ...payload,
        phone: '',
        area: '',
        margin_percentage: 0,
        total_debt: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile;

      console.log('[useAuth] Verifying database connection...');
      
      // BLOCKING ATTEMPT: We must ensure this succeeds before confirming role
      const savedProfile = await createProfile(payload);
      
      console.log('[useAuth] Profile confirmed by DB. Activating local state.');
      setProfile(savedProfile || syntheticProfile);

      console.log('[useAuth] Profile update complete.');
    } catch (e) {
      console.error('[useAuth] Role update failed:', e);
      throw e; 
    } finally {
      isUpdatingRef.current = false;
    }
  }, [user]);

  const resetProfile = React.useCallback(async () => {
    let currentUser = user;
    if (!currentUser) {
      const { data: { session: s } } = await supabase.auth.getSession();
      currentUser = s?.user ?? null;
    }
    if (!currentUser) {
       const { data } = await supabase.auth.getUser();
       currentUser = data.user;
    }
    if (!currentUser) return;

    try {
      // 1. CLEAR LOCAL STATE IMMEDIATELY (ESCAPE HATCH)
      console.log('[useAuth] resetProfile: Clearing local state...');
      setProfile(null);
      setHasConfirmedRole(false);
      AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
      
      // 2. TRY TO UPDATE REMOTE (FIRE & FORGET)
      void (async () => {
        try {
          await supabase.from('profiles').update({ role: null }).eq('id', currentUser.id);
          console.log('[useAuth] Remote role reset successful');
        } catch (e) {
          console.warn('[useAuth] Remote role reset failed:', e);
        }
      })();
      
      // 3. COMPLETE SIGN OUT (THIS SHOULD REDIRECT)
      await signOut();
    } catch (e) {
      console.error('[useAuth] Reset profile error:', e);
      // Even if network fails, we already cleared local state so signOut should work
      await signOut();
    }
  }, [user, signOut]);

  const resolveSalesmanFirm = React.useCallback(async (code: string) => {
    try {
      const owner = await fetchOwnerByFirmCode(code);
      if (owner) {
        console.log('[useAuth] resolveSalesmanFirm: Success! Updating role...');
        await updateRole('salesman', owner.id);
        
        // Persist for next time
        await AsyncStorage.setItem('wholesale_last_firm_code', code.toUpperCase());
        await AsyncStorage.setItem('wholesale_last_owner_id', owner.id);
      } else {
        console.warn('[useAuth] resolveSalesmanFirm: No owner found for code:', code);
        throw new Error('Invalid Firm Code');
      }
    } catch (e) {
      console.error('[useAuth] resolveSalesmanFirm error:', e);
      throw e;
    }
  }, [updateRole]);

  const confirmRole = React.useCallback(() => {
    setHasConfirmedRole(true);
  }, []);

  const contextValue = React.useMemo(() => ({
    session, user, profile, loading, isInitialized,
    signInWithGoogle, sendEmailOTP, verifyEmailOTP, signOut, updateRole, resetProfile, resolveSalesmanFirm, refreshProfile,
    hasConfirmedRole, confirmRole, devBypassLogin
  }), [
    session, user, profile, loading, isInitialized,
    signInWithGoogle, sendEmailOTP, verifyEmailOTP, signOut, updateRole, resetProfile, resolveSalesmanFirm, refreshProfile,
    hasConfirmedRole, confirmRole, devBypassLogin
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
