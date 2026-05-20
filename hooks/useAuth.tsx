import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { fetchProfile, createProfile, fetchOwnerByFirmCode } from '@/lib/api';
import { updateProfile } from '@/lib/api/profiles';
import { Profile, UserRole } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { clearCache } from './useDataStore';
import {
  type UserProfileData,
  saveUserProfile,
  isProfileSetupComplete,
  markProfileSetupComplete,
  clearUserProfileStorage,
} from '@/lib/auth/userProfile';
import {
  isCategorySetupComplete,
  clearBusinessCategoryStorage,
  saveBusinessCategories,
  saveShowAllCategories,
} from '@/lib/preferences/businessCategories';
import { normalizeMobile } from '@/lib/common/utils/validation';
import {
  saveDevSession,
  loadDevSession,
  clearDevSession,
  isDevBypassSession,
} from '@/lib/auth/sessionStorage';

const PROFILE_CACHE_KEY = 'wholesale_profile_cache';

async function recoverStoredSession(): Promise<{ session: Session | null; user: User | null }> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session?.user) {
      console.log('[useAuth] Supabase session restored');
      return { session, user: session.user };
    }
  } catch (e) {
    console.warn('[useAuth] Supabase getSession failed:', e);
  }

  const dev = await loadDevSession();
  if (dev?.session?.user) {
    console.log('[useAuth] Dev session restored from storage');
    return { session: dev.session, user: dev.user };
  }

  return { session: null, user: null };
}

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
  hasCompletedProfileSetup: boolean;
  hasCompletedCategorySetup: boolean;
  confirmRole: () => void;
  completeProfileSetup: (data: Omit<UserProfileData, 'completedAt' | 'userId'>) => Promise<void>;
  completeCategorySetup: (categoryIds: string[]) => Promise<void>;
  skipCategorySetup: () => Promise<void>;
  updateUserProfile: (data: Omit<UserProfileData, 'completedAt' | 'userId'>) => Promise<void>;
  refreshProfileSetupStatus: () => Promise<void>;
  devBypassLogin: (email: string) => Promise<void>;
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
  const [hasCompletedProfileSetup, setHasCompletedProfileSetup] = useState(false);
  const [hasCompletedCategorySetup, setHasCompletedCategorySetup] = useState(false);
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
    let bootFinished = false;

    const finishBoot = () => {
      if (!isMounted || bootFinished) return;
      bootFinished = true;
      setIsInitialized(true);
      setLoading(false);
    };

    const applySession = (nextSession: Session | null, nextUser: User | null) => {
      setSession(nextSession);
      setUser(nextUser);
      if (nextUser) lastSessionUserIdRef.current = nextUser.id;
    };

    const initializeAuth = async () => {
      const start = Date.now();
      console.log('[useAuth] Boot: restoring cache and session...');

      try {
        const cachedProfileStr = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        let localProfile: Profile | null = null;

        if (cachedProfileStr) {
          localProfile = JSON.parse(cachedProfileStr) as Profile;
          console.log('[useAuth] Profile cache:', localProfile?.role ?? 'no role');
          setProfileState(localProfile);
          if (localProfile?.role) setHasConfirmedRole(true);
          if (localProfile?.id) {
            const [setupDone, catDone] = await Promise.all([
              isProfileSetupComplete(localProfile.id),
              isCategorySetupComplete(localProfile.id),
            ]);
            if (isMounted) {
              setHasCompletedProfileSetup(setupDone);
              setHasCompletedCategorySetup(catDone);
            }
          }
        }

        const { session: restoredSession, user: restoredUser } = await recoverStoredSession();
        if (!isMounted) return;

        applySession(restoredSession, restoredUser);

        if (restoredUser) {
          const cacheValid = !!(localProfile && localProfile.id === restoredUser.id);

          if (isDevBypassSession(restoredSession)) {
            if (!cacheValid) {
              setProfile({
                id: restoredUser.id,
                role: 'owner',
                owner_id: restoredUser.id,
                full_name: restoredUser.email?.split('@')[0] || 'Dev User',
                phone: null,
                created_at: new Date().toISOString(),
              });
              setHasConfirmedRole(true);
            }
            const [setupDone, catDone] = await Promise.all([
              isProfileSetupComplete(restoredUser.id),
              isCategorySetupComplete(restoredUser.id),
            ]);
            if (isMounted) {
              setHasCompletedProfileSetup(setupDone);
              setHasCompletedCategorySetup(catDone);
            }
          } else {
            void syncProfile(restoredUser.id, 3, 1000, cacheValid);
          }
        } else if (localProfile) {
          setProfileState(null);
          setHasConfirmedRole(false);
          setHasCompletedProfileSetup(false);
          setHasCompletedCategorySetup(false);
          AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
        }

        console.log('[useAuth] Boot complete:', restoredUser ? 'signed in' : 'signed out');
      } catch (e) {
        console.warn('[useAuth] Boot error:', e);
      } finally {
        console.log(`[useAuth] Boot finished in ${Date.now() - start}ms`);
        finishBoot();
      }
    };

    let subscription: { unsubscribe: () => void } | undefined;

    void (async () => {
      await initializeAuth();
      if (!isMounted) return;

      const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;
        if (event === 'INITIAL_SESSION') return;

        const activeDev = await loadDevSession();
        if (activeDev && event !== 'SIGNED_OUT') return;

        console.log(`[useAuth] Auth event: ${event}`, { userId: newSession?.user?.id });

        const newUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(newUser);

        if (event === 'SIGNED_IN' && newUser) {
          lastSessionUserIdRef.current = newUser.id;
          void syncProfile(newUser.id, 3, 1000, profile?.id === newUser.id);
        } else if (event === 'SIGNED_OUT') {
          lastSessionUserIdRef.current = null;
          setProfileState(null);
          setHasConfirmedRole(false);
      setHasCompletedProfileSetup(false);
      setHasCompletedCategorySetup(false);
      void clearDevSession();
          AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
        } else if (event === 'USER_UPDATED' && newUser) {
          void syncProfile(newUser.id);
        }
      });
      subscription = data.subscription;
    })();

    const watchdog = setTimeout(() => {
      if (isMounted && !bootFinished) {
        console.warn('[useAuth] Boot watchdog: forcing init complete');
        finishBoot();
      }
    }, 10000);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      clearTimeout(watchdog);
    };
  }, []);

  const syncProfile = async (userId: string, retries = 3, delay = 1000, isAlreadyHydrated = false) => {
    if (userId.startsWith('00000000')) {
      syncInProgressRef.current = null;
      return;
    }
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
        void refreshProfileSetupStatus(userId);
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

  const refreshProfileSetupStatus = useCallback(async (userId?: string) => {
    const id = userId ?? user?.id;
    if (!id) {
      setHasCompletedProfileSetup(false);
      setHasCompletedCategorySetup(false);
      return;
    }
    const [profileDone, catDone] = await Promise.all([
      isProfileSetupComplete(id),
      isCategorySetupComplete(id),
    ]);
    setHasCompletedProfileSetup(profileDone);
    setHasCompletedCategorySetup(catDone);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) void refreshProfileSetupStatus(user.id);
  }, [user?.id, refreshProfileSetupStatus]);

  const persistUserProfile = useCallback(
    async (data: Omit<UserProfileData, 'completedAt'>, markComplete: boolean) => {
      if (!user?.id) throw new Error('Not signed in');
      const payload: UserProfileData = {
        ...data,
        userId: user.id,
        phone: normalizeMobile(data.phone),
        completedAt: markComplete ? new Date().toISOString() : null,
      };
      await saveUserProfile(payload);

      const isDev = user.id.startsWith('00000000');
      if (!isDev) {
        try {
          const updated = await updateProfile(user.id, {
            full_name: payload.fullName,
            phone: payload.phone,
          });
          setProfile(updated);
        } catch (e) {
          console.warn('[useAuth] Remote profile sync failed:', e);
          if (profile) {
            setProfile({ ...profile, full_name: payload.fullName, phone: payload.phone });
          }
        }
      } else if (profile) {
        setProfile({ ...profile, full_name: payload.fullName, phone: payload.phone });
      }

      if (markComplete) {
        await markProfileSetupComplete(user.id);
        setHasCompletedProfileSetup(true);
      }
    },
    [user, profile, setProfile],
  );

  const completeProfileSetup = useCallback(
    async (data: Omit<UserProfileData, 'completedAt' | 'userId'>) => {
      if (!user?.id) throw new Error('Not signed in');
      await persistUserProfile({ ...data, userId: user.id }, true);
      router.replace('/category-setup' as any);
    },
    [persistUserProfile, user, router],
  );

  const completeCategorySetup = useCallback(
    async (categoryIds: string[]) => {
      if (!user?.id) throw new Error('Not signed in');
      if (categoryIds.length < 1) {
        throw new Error('Select at least one category');
      }
      await saveBusinessCategories(user.id, categoryIds, true);
      setHasCompletedCategorySetup(true);
      router.replace('/(tabs)' as any);
    },
    [user, router],
  );

  const skipCategorySetup = useCallback(async () => {
    if (!user?.id) throw new Error('Not signed in');
    await saveBusinessCategories(user.id, [], true);
    await saveShowAllCategories(user.id, true);
    setHasCompletedCategorySetup(true);
    router.replace('/(tabs)' as any);
  }, [user, router]);

  const updateUserProfile = useCallback(
    async (data: Omit<UserProfileData, 'completedAt' | 'userId'>) => {
      if (!user?.id) throw new Error('Not signed in');
      const existing = await isProfileSetupComplete(user.id);
      await persistUserProfile({ ...data, userId: user.id }, existing);
    },
    [persistUserProfile, user],
  );

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

  const devBypassLogin = React.useCallback(async (email: string) => {
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
      expires_in: 60 * 60 * 24 * 90,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
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

    await saveDevSession(mockSession, mockUser);

    lastSessionUserIdRef.current = devUserId;
    setSession(mockSession);
    setUser(mockUser);
    setProfile(mockProfile);
    setHasConfirmedRole(true);
    const [setupDone, catDone] = await Promise.all([
      isProfileSetupComplete(devUserId),
      isCategorySetupComplete(devUserId),
    ]);
    setHasCompletedProfileSetup(setupDone);
    setHasCompletedCategorySetup(catDone);
    setLoading(false);
    console.log('[useAuth] devBypassLogin: session persisted');
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
    if (currentUserId) {
      void clearUserProfileStorage(currentUserId);
      void clearBusinessCategoryStorage(currentUserId);
    }
    void clearDevSession();
    AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
    clearCache();
    setProfile(null);
    setUser(null);
    setSession(null);
    setHasConfirmedRole(false);
    setHasCompletedProfileSetup(false);
    setHasCompletedCategorySetup(false);
    setLoading(false); // Clear loading to let AuthGuard work immediately
    
    // 2. REDIRECT IMMEDIATELY
    console.log('[useAuth] Sign out initiated. Forcing instant redirect.');
    router.replace('/login' as any);

    if (!isDevBypassSession(session)) {
      try {
        console.log('[useAuth] Finalizing cloud sign out in background...');
        void supabase.auth.signOut().then(() => {
          console.log('[useAuth] Cloud sign out final.');
        });
      } catch (e) {
        console.warn('[useAuth] Background sign out error:', e);
      }
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
    hasConfirmedRole, hasCompletedProfileSetup, hasCompletedCategorySetup, confirmRole, completeProfileSetup,
    completeCategorySetup, skipCategorySetup, updateUserProfile,
    refreshProfileSetupStatus, devBypassLogin,
  }), [
    session, user, profile, loading, isInitialized,
    signInWithGoogle, sendEmailOTP, verifyEmailOTP, signOut, updateRole, resetProfile, resolveSalesmanFirm, refreshProfile,
    hasConfirmedRole, hasCompletedProfileSetup, hasCompletedCategorySetup, confirmRole, completeProfileSetup,
    completeCategorySetup, skipCategorySetup, updateUserProfile,
    refreshProfileSetupStatus, devBypassLogin,
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
