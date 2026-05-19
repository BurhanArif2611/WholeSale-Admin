import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, 
  ActivityIndicator, Alert, TextInput, 
  Keyboard, Animated, Dimensions 
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { ModernToast } from '@/components/ui';
import { UserRole } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingScreen() {
  const { profile, updateRole, signOut, resolveSalesmanFirm, confirmRole } = useAuth();
  const { t } = useLanguage();
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', visible: boolean }>({
    message: '', type: 'info', visible: false
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, visible: true });
  };

  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [firmCode, setFirmCode] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pinInputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSelectRole = async (role: UserRole) => {
    if (role === 'salesman' && !showCodeInput) {
      setShowCodeInput(true);
      setTimeout(() => pinInputRef.current?.focus(), 100);
      return;
    }

    setLoading(true);
    try {
      if (role === 'salesman') {
        const cleanCode = firmCode.trim().toLowerCase();
        if (cleanCode.length < 6) {
          showToast('Please enter full 6-digit code', 'info');
          setLoading(false);
          return;
        }

        await resolveSalesmanFirm(cleanCode);
        Alert.alert(
          'SUCCESS', 
          'You have successfully joined the firm!',
          [{ text: 'Open Dashboard', onPress: () => confirmRole() }]
        );
      } else {
        await updateRole('owner');
        confirmRole();
      }
    } catch (e: any) {
      console.error('[Onboarding] Role setup failed:', e);
      Alert.alert('LINKAGE FAILED', e.message || 'Could not connect to database. Please check your internet.');
    } finally {
      setLoading(false);
    }
  };

  const renderPinBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const char = firmCode[i] || '';
      const isFocused = firmCode.length === i;
      boxes.push(
        <View key={i} style={[styles.pinBox, char ? styles.pinBoxFilled : null, isFocused ? styles.pinBoxFocused : null]}>
          <Text style={styles.pinText}>{char}</Text>
          {isFocused && <View style={styles.cursor} />}
        </View>
      );
    }
    return boxes;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={Gradients.header} style={[StyleSheet.absoluteFill, { zIndex: -1 }]} />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome to</Text>
          <Text style={styles.title}>Wholesale Admin</Text>
          <Text style={styles.subtitle}>Select your role to get started</Text>
        </View>

        <View style={styles.roleContainer}>
          <TouchableOpacity 
            style={[styles.roleCard, Shadow.md, showCodeInput && { opacity: 0.4 }]} 
            onPress={() => !showCodeInput && handleSelectRole('owner')}
            disabled={loading || showCodeInput}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#FFF', '#F8F9FA']} style={styles.cardGradient}>
              <View style={[styles.iconBox, { backgroundColor: Colors.amber + '15' }]}>
                <Ionicons name="business" size={32} color={Colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleName}>Establishment Owner</Text>
                <Text style={styles.roleInfo}>Manage inventory, salesmen, and global reports.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleCard, Shadow.md, showCodeInput && styles.roleCardActive]} 
            onPress={() => handleSelectRole('salesman')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#FFF', '#F8F9FA']} style={styles.cardGradient}>
              <View style={[styles.iconBox, { backgroundColor: Colors.info + '15' }]}>
                <Ionicons name="bicycle" size={32} color={Colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleName}>Salesman / Staff</Text>
                <Text style={styles.roleInfo}>Take orders, manage clients, and track daily sales.</Text>
              </View>
              {!showCodeInput && <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
            </LinearGradient>

            {showCodeInput && (
              <View style={styles.pinContainer}>
                <Text style={styles.pinLabel}>{t('pin_label')}</Text>
                <Text style={styles.pinHint}>{t('hint_firm_code')}</Text>
                <View style={styles.pinRow}>
                  {renderPinBoxes()}
                </View>
                <TextInput
                  ref={pinInputRef}
                  value={firmCode}
                  onChangeText={(val) => {
                    const upper = val.toUpperCase();
                    setFirmCode(upper);
                    if (upper.length === 6) {
                      handleSelectRole('salesman');
                    }
                  }}
                  maxLength={6}
                  keyboardType="default"
                  autoCapitalize="characters"
                  style={styles.hiddenInput}
                  caretHidden
                  autoFocus
                />

                <TouchableOpacity 
                   style={styles.submitCodeBtn} 
                   onPress={() => handleSelectRole('salesman')}
                   disabled={firmCode.length < 6 || loading}
                >
                  <LinearGradient colors={Gradients.info} style={styles.submitGradient}>
                    {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.submitText}>Join Firm</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCodeInput(false)} style={{ marginTop: 12 }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {!showCodeInput && (
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={16} color={Colors.danger} />
            <Text style={styles.signOutText}>Sign out and start over</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <ModernToast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
        onHide={() => setToast(prev => ({ ...prev, visible: false }))} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  welcome: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 32, fontWeight: Typography.black, color: Colors.textPrimary, marginTop: 4 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  roleContainer: { gap: Spacing.lg, marginBottom: 40 },
  roleCard: { borderRadius: Radius.xxl, overflow: 'hidden', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  roleCardActive: { borderColor: Colors.info, borderWidth: 2 },
  cardGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: Spacing.lg },
  iconBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  roleName: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  roleInfo: { fontSize: 16, color: Colors.textSecondary, marginTop: 4, lineHeight: 24 },
  pinContainer: { padding: Spacing.xl, paddingTop: 0, alignItems: 'center' },
  pinLabel: { fontSize: 14, fontWeight: '900', color: Colors.info, letterSpacing: 1.5, marginBottom: 8 },
  pinHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: 16, paddingHorizontal: 16, lineHeight: 18 },
  pinRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  pinBox: { width: 40, height: 50, borderRadius: Radius.md, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  pinBoxFilled: { borderColor: Colors.info, backgroundColor: Colors.info + '05' },
  pinBoxFocused: { borderColor: Colors.info, borderWidth: 2, backgroundColor: '#FFF', ...Shadow.sm },
  pinText: { fontSize: 20, fontWeight: Typography.bold, color: Colors.textPrimary },
  cursor: { position: 'absolute', width: 2, height: 20, backgroundColor: Colors.info },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  submitCodeBtn: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', marginTop: 10 },
  submitGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: Colors.white, fontWeight: Typography.bold, fontSize: 15 },
  cancelText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', padding: 10, gap: 6 },
  signOutText: { fontSize: Typography.sm, color: Colors.danger, fontWeight: Typography.bold, textDecorationLine: 'underline' },
});
