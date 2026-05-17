import { supabase } from '@/lib/supabase';

/**
 * Authentication service for Supabase Email OTP
 */
export const authService = {
  /**
   * Sends a 6-digit OTP code to the provided email address.
   * Works for both login and register.
   */
  async sendEmailOTP(email: string) {
    console.log('[authService] Sending OTP to:', email);
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Supabase handles new vs existing user
      },
    });

    if (error) {
      console.error('[authService] sendEmailOTP error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Verifies the 6-digit OTP code sent to the email.
   * On success, a session is created and the user is signed in.
   */
  async verifyEmailOTP(email: string, token: string) {
    console.log('[authService] Verifying OTP for:', email);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      console.error('[authService] verifyEmailOTP error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Returns the current session state.
   */
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Signs out the user and clears the session.
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};
