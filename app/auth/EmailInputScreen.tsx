import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, Alert, Pressable, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function EmailInputScreen() {
  const { sendEmailOTP, signInWithGoogle } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendOtp = async () => {
    if (!email || !validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    setLoading(true);
    try {
      await sendEmailOTP(email.trim().toLowerCase());
      // On success, navigate to OTPVerifyScreen passing email
      router.push({
        pathname: '/auth/OTPVerifyScreen',
        params: { email: email.trim().toLowerCase() }
      });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, Shadow.md]}>
              <LinearGradient colors={['#FFB300', '#FFA000']} style={styles.logoGradient}>
                <Ionicons name="mail" size={54} color={Colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.brandTitle}>
              WholeSale <Text style={{ color: '#FFA000' }}>Admin</Text>
            </Text>
            <Text style={styles.brandTagline}>FREE EMAIL OTP LOGIN</Text>
          </View>

          {/* Action Section */}
          <View style={styles.actionSection}>
            <Text style={styles.welcomeText}>Login or Register</Text>
            <Text style={styles.subText}>
              Enter your email to receive a 6-digit verification code.
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="at" size={20} color="#90A4AE" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor="#90A4AE"
                />
              </View>

              <Pressable 
                onPress={handleSendOtp}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { opacity: loading ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Send OTP</Text>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.line} />
              </View>

              <Pressable 
                onPress={handleGoogleLogin} 
                disabled={googleLoading}
                style={({ pressed }) => [
                  styles.googleBtn,
                  { 
                    backgroundColor: pressed ? '#F5F5F5' : '#FFFFFF',
                    transform: [{ scale: pressed ? 0.98 : 1 }]
                  }
                ]}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#FFA000" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#EA4335" />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>By continuing, you agree to our Terms of Service.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 32, justifyContent: 'space-around', alignItems: 'center' },
  
  logoSection: { alignItems: 'center', marginTop: 20 },
  logoCircle: { 
    width: 120, height: 120, borderRadius: 60, 
    marginBottom: 20, backgroundColor: Colors.white, 
    padding: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  logoGradient: { flex: 1, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: 32, fontWeight: '900', color: '#263238', letterSpacing: -0.5 },
  brandTagline: { fontSize: 10, color: '#90A4AE', marginTop: 4, letterSpacing: 1.2, fontWeight: '700', textTransform: 'uppercase' },

  actionSection: { width: '100%', alignItems: 'center' },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#263238', marginBottom: 8 },
  subText: { fontSize: 14, color: '#78909C', textAlign: 'center', marginBottom: 32, paddingHorizontal: 20, lineHeight: 20 },
  
  inputContainer: { width: '100%', paddingHorizontal: 10 },
  
  inputWrapper: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },

  primaryBtn: {
    width: '100%',
    height: 60,
    backgroundColor: '#FFA000',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#FFA000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryBtnText: { fontSize: 18, fontWeight: '800', color: Colors.white },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
  },
  line: { flex: 1, height: 1, backgroundColor: '#ECEFF1' },
  dividerText: { marginHorizontal: 16, color: '#90A4AE', fontWeight: '700', fontSize: 12 },

  googleBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: '#455A64' },

  footer: { paddingBottom: 20, marginTop: 40 },
  footerText: { fontSize: 10, color: '#CFD8DC', textAlign: 'center' },
});
