import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, Alert, Pressable, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

export default function OTPVerifyScreen() {
  const { verifyEmailOTP, sendEmailOTP } = useAuth();
  const { t } = useLanguage();
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all filled
    if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length < 6) {
      Alert.alert(t('invalid_otp_title'), t('invalid_otp_msg'));
      return;
    }

    setLoading(true);
    try {
      await verifyEmailOTP(email, code);
      // useAuth listener will handle redirect to (tabs) upon session update
    } catch (e) {
      Alert.alert('Verification Failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setLoading(true);
    try {
      await sendEmailOTP(email);
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Success', 'A new 6-digit verification code has been sent.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
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
                <Ionicons name="shield-checkmark" size={54} color={Colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.brandTitle}>{t('verify_email_title')}</Text>
            <Text style={styles.brandTagline}>{t('code_sent_to')} {email}</Text>
          </View>

          {/* Action Section */}
          <View style={styles.actionSection}>
            <Text style={styles.welcomeText}>{t('enter_code')}</Text>
            <Text style={styles.subText}>{t('otp_subtitle')}</Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                  value={digit}
                  onChangeText={(val) => handleOtpChange(val, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  autoFocus={index === 0}
                  placeholder="·"
                  placeholderTextColor="#CFD8DC"
                  accessibilityLabel={`${t('enter_code')} ${index + 1}`}
                />
              ))}
            </View>

            <Pressable 
              onPress={() => handleVerify()}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                { opacity: loading ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Login</Text>
              )}
            </Pressable>

            <View style={styles.resendContainer}>
              {canResend ? (
                <Pressable onPress={handleResend}>
                  <Text style={styles.resendTextActive}>Resend Code</Text>
                </Pressable>
              ) : (
                <Text style={styles.resendTextDisabled}>Resend in {timer}s</Text>
              )}
            </View>

            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={16} color="#78909C" />
              <Text style={styles.backBtnText}>Change Email</Text>
            </Pressable>
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
  brandTagline: { fontSize: 13, color: '#78909C', marginTop: 8, fontWeight: '600' },

  actionSection: { width: '100%', alignItems: 'center' },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#263238', marginBottom: 8 },
  subText: { fontSize: 14, color: '#90A4AE', textAlign: 'center', marginBottom: 32, paddingHorizontal: 10 },
  
  otpContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginBottom: 40,
    paddingHorizontal: 0
  },
  otpInput: {
    width: 48,
    height: 60,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ECEFF1',
    fontSize: 24,
    fontWeight: '800',
    color: '#263238',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#FFA000',
    backgroundColor: '#FFF8E1',
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

  resendContainer: { marginTop: 24, alignItems: 'center' },
  resendTextDisabled: { color: '#B0BEC5', fontSize: 14, fontWeight: '600' },
  resendTextActive: { color: '#FFA000', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 6,
  },
  backBtnText: { fontSize: 14, color: '#78909C', fontWeight: '600' },
});
