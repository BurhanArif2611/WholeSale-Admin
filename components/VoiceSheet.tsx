// components/VoiceSheet.tsx
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Vibration, PanResponder, TextInput, Animated, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Gradients, Shadow, Fonts } from '@/constants/theme';
import { parseOrderCommand, parseClientCommand, parseProductCommand } from '@/lib/voice';
import { fetchStores, fetchMaterials, createOrder, createStore, createMaterial, resolvePrice } from '@/lib/api';
import type { Store, Material } from '@/types';
import { ModernToast } from './ui';

// New Sub-components & Hooks
import { useVoiceEngine } from '@/hooks/useVoiceEngine';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { MicButton } from './voice/MicButton';
import { Waveform } from './voice/Waveform';
import { ConfirmOrder } from './voice/ConfirmOrder';
import { ConfirmClient } from './voice/ConfirmClient';
import { ConfirmProduct } from './voice/ConfirmProduct';
import { isValidMobile, normalizeMobile } from '@/lib/common/utils/validation';

export type VoiceMode = 'order' | 'client' | 'product';

interface Props {
  visible: boolean;
  mode: VoiceMode;
  initialClient?: Store | null;
  onClose: () => void;
  onBack?: () => void;
  onSuccess: (msg: string) => void;
}

type Screen = 'listen' | 'processing' | 'confirm' | 'not_found' | 'success' | 'error';

function fuzzyMatch(a: string, b: string) {
  if (!a || !b) return false;
  const x = a.toLowerCase().trim(), y = b.toLowerCase().trim();
  return y.includes(x) || x.includes(y) || y.startsWith(x) || x.startsWith(y);
}

export default function VoiceSheet({ visible, mode, initialClient, onClose, onBack, onSuccess }: Props) {
  const { t, locale, tData } = useLanguage();
  const [screen, setScreen] = useState<Screen>('listen');
  const [transcript, setTranscript] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirm data
  const [matchedStore, setMatchedStore] = useState<Store | null>(null);
  const [matchedItems, setMatchedItems] = useState<{ material: Material; quantity: number }[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [clientData, setClientData] = useState<{ name: string; phone?: string; area?: string; margin?: number } | null>(null);
  const [productData, setProductData] = useState<{ name: string; unit: string; price: number; remark?: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info'; visible: boolean }>({ msg: '', type: 'success', visible: false });
  const [isEditing, setIsEditing] = useState(false);

  const MODE_CONFIG = useMemo(() => ({
    order: { title: t('new_order'), icon: 'receipt-outline', gradient: Gradients.amber, hint: t('hint_order'), accentColor: Colors.amber },
    client: { title: t('add_client'), icon: 'person-add-outline', gradient: Gradients.info, hint: t('hint_client'), accentColor: Colors.info },
    product: { title: t('add_product'), icon: 'cube-outline', gradient: Gradients.purple, hint: t('hint_product'), accentColor: Colors.purple },
  } as const), [t, mode]); // Added mode to deps for safety
  
  const cfg = MODE_CONFIG[mode];

  // Pre-fetched data
  const storesRef = useRef<Store[]>([]);
  const materialsRef = useRef<Material[]>([]);

  const { profile } = useAuth();
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;

  // Pre-fetch data when visible
  React.useEffect(() => {
    if (visible && ownerId) {
      fetchStores(ownerId).then(s => storesRef.current = s).catch(console.error);
      fetchMaterials(ownerId).then(m => materialsRef.current = m).catch(console.error);
    }
  }, [visible, ownerId]);

  const resetAll = useCallback(() => {
    setScreen('listen'); setTranscript('');
    setMatchedStore(null); setMatchedItems([]); setNotFound([]);
    setClientData(null); setProductData(null);
    setIsEditing(false);
  }, []);

  const processVoice = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setTranscript(text);
    setScreen('processing');
    try {
      if (mode === 'order') {
        const stores = storesRef.current;
        const materials = materialsRef.current;

        // Expanded context for higher precision (Gemini 2.0 Flash is very capable)
        const storeCtx = stores.slice(0, 150).map(s => `ID:${s.id} Name:${s.name}`).join('\n');
        const matCtx = materials.slice(0, 150).map(m => `ID:${m.id} Name:${m.name}`).join('\n');
        const context = `STORES:\n${storeCtx}\n\nMATERIALS:\n${matCtx}`;

        const [action] = await Promise.all([
          parseOrderCommand(text, context, initialClient?.id),
          (stores.length || !ownerId) ? Promise.resolve() : fetchStores(ownerId).then(s => storesRef.current = s),
          (materials.length || !ownerId) ? Promise.resolve() : fetchMaterials(ownerId).then(m => materialsRef.current = m)
        ]);

        if (action.type !== 'create_order') { 
          if (action.type === 'unknown') setTranscript(action.transcript);
          setScreen('error'); 
          return; 
        }

        // Use direct ID matches first, then fuzzy
        let store = initialClient || stores.find((s) => s.id === action.client_id);
        if (!store) store = stores.find((s) => fuzzyMatch(action.client_name, s.name));

        const matched: { material: Material; quantity: number }[] = [];
        const nf: string[] = [];

        for (const item of action.items) {
          let mat = materials.find((m) => m.id === item.material_id);
          if (!mat) mat = materials.find((m) => fuzzyMatch(item.product, m.name));

          if (mat) matched.push({ material: mat, quantity: item.quantity });
          else nf.push(`"${item.product}"`);
        }

        setMatchedStore(store || null);
        setMatchedItems(matched);
        setNotFound(nf);

        // If nothing matched at all, show error. Otherwise, go to confirm (even with missing items)
        if (!store && matched.length === 0) {
            setScreen('not_found');
        } else {
            setScreen('confirm');
        }
      } else if (mode === 'client') {
        const action = await parseClientCommand(text);
        if (action.type !== 'create_client') { 
          if (action.type === 'unknown') setTranscript(action.transcript);
          setScreen('error'); 
          return; 
        }
        setClientData({ name: action.name, phone: action.phone, area: action.area, margin: action.margin });
        setScreen('confirm');
      } else if (mode === 'product') {
        const action = await parseProductCommand(text);
        if (action.type !== 'create_product') { 
          if (action.type === 'unknown') setTranscript(action.transcript); 
          setScreen('error'); 
          return; 
        }
        setProductData({ name: action.name, unit: action.unit, price: action.price, remark: action.remark });
        setScreen('confirm');
      }
    } catch (e) {
      console.error(e);
      setScreen('error');
    }
  }, [mode, ownerId, initialClient]);

  const { isHolding, isAvailable, partialText, scale, glowOpacity, bars, startRecording, handlePressOut } = useVoiceEngine(processVoice);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { void startRecording(); },
      onPanResponderRelease: () => { void handlePressOut(); },
      onPanResponderTerminate: () => { void handlePressOut(); },
    })
  ).current;

  const handleConfirm = async () => {
    if (saving) return;
    if (mode === 'order' && !matchedStore) return Alert.alert('Missing Client', 'Please select a valid client first.');
    
    setSaving(true);
    try {
      if (mode === 'order' && matchedStore && matchedItems.length && ownerId) {
        const prices = matchedItems.map((i) => resolvePrice(i.material.base_price, i.quantity, matchedStore.margin_percentage));
        await createOrder(
          { 
            store_id: matchedStore.id, 
            owner_id: ownerId,
            items: matchedItems.map((i) => ({ 
              material_id: i.material.id, 
              name: i.material.name,
              base_price: i.material.base_price,
              unit: i.material.unit,
              quantity: i.quantity 
            })) 
          },
          prices, Number(matchedStore.extra_charges) || 0,
        );
        Vibration.vibrate([0, 50, 40, 50]);
        onSuccess(`Order placed for ${matchedStore.name}`);
        setScreen('success');
        setTimeout(() => { resetAll(); onClose(); }, 800);
      } else if (mode === 'client' && clientData && ownerId) {
        if (clientData.phone && !isValidMobile(clientData.phone)) {
          Alert.alert('Invalid mobile', 'Please enter a valid 10-digit mobile number.');
          return;
        }
        await createStore({
          name: clientData.name,
          phone: clientData.phone ? normalizeMobile(clientData.phone) : clientData.phone,
          area: clientData.area,
          margin_percentage: clientData.margin ?? 0, extra_charges: 0,
          owner_id: ownerId
        });
        Vibration.vibrate([0, 50, 40, 50]);
        onSuccess(`Client "${clientData.name}" added`);
        setScreen('success');
        setTimeout(() => { resetAll(); onClose(); }, 800);
      } else if (mode === 'product' && productData && ownerId) {
        await createMaterial({ 
          name: productData.name, 
          unit: productData.unit, 
          base_price: productData.price, 
          remark: productData.remark,
          owner_id: ownerId
        });
        Vibration.vibrate([0, 50, 40, 50]);
        onSuccess(`Product "${productData.name}" added`);
        setScreen('success');
        setTimeout(() => { resetAll(); onClose(); }, 800);
      }
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleEditTranscript = (newText: string) => {
    setTranscript(newText);
    setIsEditing(false);
    processVoice(newText);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => { resetAll(); onClose(); }}>
      <Pressable 
        style={styles.overlay} 
        onPress={() => { resetAll(); onClose(); }}
      >
        <ModernToast message={toast.msg} type={toast.type} visible={toast.visible} onHide={() => setToast(t => ({ ...t, visible: false }))} />
        <LinearGradient 
          colors={[Colors.surface, Colors.bg]} 
          style={styles.sheet}
          onStartShouldSetResponder={() => true}
        >

            {/* Header */}
            <View style={styles.header}>
              <LinearGradient colors={cfg.gradient} style={styles.headerIcon}>
                <Ionicons name={cfg.icon as any} size={17} color={mode === 'order' ? Colors.black : Colors.white} />
              </LinearGradient>
              <Text style={styles.headerTitle}>{cfg.title}</Text>

              <TouchableOpacity onPress={() => { resetAll(); onClose(); }} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Locked Store Display */}
            {mode === 'order' && initialClient && (
              <View style={[styles.lockedStoreBar, { borderColor: cfg.accentColor + '30', marginBottom: Spacing.md }]}>
                <View style={styles.lockedStoreInfo}>
                  <View style={[styles.lockedStoreIconWrap, { backgroundColor: cfg.accentColor + '15' }]}>
                    <Ionicons name="storefront" size={14} color={cfg.accentColor} />
                  </View>
                  <View>
                    <Text style={styles.lockedStoreLabel}>{t('selected_client_label')}</Text>
                    <Text style={[styles.lockedStoreName, { color: cfg.accentColor }]}>{tData(initialClient.name)}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                   onPress={() => onBack ? onBack() : (resetAll(), onClose())} 
                  style={[styles.changeBtn, { backgroundColor: cfg.accentColor }]}
                >
                  <Ionicons name="swap-horizontal" size={13} color={mode === 'order' ? Colors.black : Colors.white} />
                  <Text style={[styles.changeBtnText, { color: mode === 'order' ? Colors.black : Colors.white }]}>Change</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── LISTEN SCREEN ── */}
            {screen === 'listen' && (
              <View style={styles.listenScreen}>
                <View style={[styles.hintBox, { borderColor: cfg.accentColor + '33' }]}>
                  <Ionicons name="information-circle-outline" size={15} color={cfg.accentColor} />
                  <Text style={styles.hintText}>
                    {mode === 'order' && initialClient
                      ? t('hint_order_items')
                      : cfg.hint}
                  </Text>
                </View>

                <Waveform isHolding={isHolding} accentColor={cfg.accentColor} bars={bars} />

                {isHolding && (
                  <Animated.View style={[
                    styles.partialBox,
                    {
                      backgroundColor: cfg.accentColor + '10',
                      borderColor: cfg.accentColor + '44',
                      transform: [{ scale }]
                    },
                    Shadow.colored(cfg.accentColor)
                  ]}>
                    <View style={[styles.listenPulse, { backgroundColor: cfg.accentColor }]} />
                    <Text style={styles.partialText} numberOfLines={2}>
                      {partialText || t('listening')}
                    </Text>
                  </Animated.View>
                )}

                <Text style={styles.holdLabel}>
                  {isHolding ? t('recording_release') : t('hold_mic')}
                </Text>

                <MicButton
                  isHolding={isHolding} mode={mode} accentColor={cfg.accentColor}
                  gradient={cfg.gradient} scale={scale} glowOpacity={glowOpacity}
                  panHandlers={panResponder.panHandlers}
                />
              </View>
            )}

            {/* ── PROCESSING ── */}
            {screen === 'processing' && (
              <View style={styles.center}>
                <View style={styles.processingIconBox}>
                  <ActivityIndicator size="large" color={cfg.accentColor} />
                  <View style={[styles.glowRing, { borderColor: cfg.accentColor }]} />
                </View>
                <Text style={[styles.processingText, { color: cfg.accentColor }]}>{t('analyzing')}</Text>
                <View style={styles.transcriptBox}>
                  <Ionicons name="sparkles" size={14} color={cfg.accentColor} />
                  <Text style={styles.transcriptText}>{transcript}</Text>
                </View>
              </View>
            )}

            {/* ── CONFIRMATION SCREENS ── */}
            {screen === 'confirm' && (
              <View style={{ flex: 1 }}>
                {isEditing ? (
                  <View style={styles.editSection}>
                    <Text style={styles.editLabel}>{t('correct_transcript')}:</Text>
                    <View style={styles.editInputBox}>
                      <TextInput
                        style={styles.editInput}
                        value={transcript}
                        onChangeText={setTranscript}
                        multiline
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() => handleEditTranscript(transcript)}
                        style={[styles.saveBtn, { backgroundColor: cfg.accentColor }]}
                      >
                        <Ionicons name="checkmark" size={20} color={mode === 'order' ? Colors.black : Colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setIsEditing(true)} style={styles.tapToEdit}>
                    <Text style={styles.tapToEditText}>Tap to edit transcript</Text>
                    <Ionicons name="pencil-outline" size={12} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}

                <View style={{ flex: 1, marginBottom: Spacing.md }}>
                  {mode === 'order' && (
                    <ConfirmOrder
                      transcript={transcript}
                      matchedStore={matchedStore}
                      matchedItems={matchedItems}
                      onUpdateItems={setMatchedItems}
                      notFound={notFound}
                    />
                  )}
                  {mode === 'client' && clientData && (
                    <ConfirmClient
                      transcript={transcript}
                      clientData={clientData}
                      onUpdate={(d) => setClientData(prev => prev ? { ...prev, ...d } : null)}
                    />
                  )}
                  {mode === 'product' && productData && (
                    <ConfirmProduct
                      transcript={transcript}
                      productData={productData}
                      onUpdate={(d) => setProductData(prev => prev ? { ...prev, ...d } : null)}
                    />
                  )}
                </View>

                <View style={{ paddingBottom: Spacing.md }}>
                  {renderConfirmBtns()}
                </View>
              </View>
            )}

            {/* ── NOT FOUND ── */}
            {screen === 'not_found' && (
              <View style={styles.center}>
                <Ionicons name="search-outline" size={60} color={Colors.textMuted} />
                <Text style={styles.nfTitle}>{t('nothing_matched')}</Text>
                <Text style={styles.nfSub}>{transcript}</Text>
                <TouchableOpacity onPress={resetAll} style={{ marginTop: Spacing.lg }}>
                  <LinearGradient colors={cfg.gradient} style={styles.confirmBtn}><Text style={[styles.confirmText, { color: mode === 'order' ? Colors.black : Colors.white }]}>Try Again</Text></LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* ── SUCCESS ── */}
            {screen === 'success' && (
              <View style={styles.center}>
                <View style={[styles.successRing, { borderColor: Colors.success }]}>
                    <Ionicons name="checkmark" size={50} color={Colors.success} />
                </View>
                <Text style={styles.successText}>{t('done')}</Text>
              </View>
            )}

            {/* ── ERROR ── */}
            {screen === 'error' && (
              <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={60} color={Colors.danger} />
                <Text style={styles.nfTitle}>{t('ai_parsing_failed')}</Text>
                <Text style={styles.nfSub}>{transcript}</Text>
                <TouchableOpacity onPress={resetAll} style={{ marginTop: Spacing.lg }}>
                  <LinearGradient colors={cfg.gradient} style={styles.confirmBtn}><Text style={[styles.confirmText, { color: mode === 'order' ? Colors.black : Colors.white }]}>Try Again</Text></LinearGradient>
                </TouchableOpacity>
              </View>
            )}

          </LinearGradient>
      </Pressable>
    </Modal>
  );

  function renderConfirmBtns() {
    return (
      <View style={styles.btnRow}>
        <TouchableOpacity onPress={resetAll} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleConfirm} disabled={saving} activeOpacity={0.85} style={{ flex: 1 }}>
          <LinearGradient colors={saving ? [Colors.border, Colors.border] : cfg.gradient} style={styles.confirmBtn}>
            {saving ? <ActivityIndicator size="small" color={Colors.white} /> : (
                <Text style={[styles.confirmText, { color: mode === 'order' && !saving ? Colors.black : Colors.white }]}>
                {mode === 'order' ? 'Place Order' : 'Confirm Save'}
                </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  sheet: { 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    paddingHorizontal: Spacing.xl, 
    paddingTop: Spacing.xl, 
    paddingBottom: Spacing.xl, 
    minHeight: 400, 
    maxHeight: '94%',
    overflow: 'visible'
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  headerIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: Typography.lg, fontFamily: Fonts.bold, color: Colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  listenScreen: { alignItems: 'center', overflow: 'visible' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface2, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, marginBottom: Spacing.xl, width: '100%' },
  hintText: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
  holdLabel: { fontSize: Typography.sm, color: Colors.textMuted, marginBottom: Spacing.xl, textAlign: 'center' },
  partialBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, width: '90%', minHeight: 50 },
  partialText: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary, fontStyle: 'italic', lineHeight: 20, textAlign: 'center' },
  listenPulse: { width: 8, height: 8, borderRadius: 4, opacity: 0.8 },
  center: { alignItems: 'center', paddingVertical: Spacing.xl },
  processingIconBox: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, opacity: 0.2 },
  processingText: { fontSize: Typography.lg, fontFamily: Fonts.bold, marginTop: Spacing.md, marginBottom: Spacing.md },
  transcriptBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md, marginVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border, width: '100%' },
  transcriptText: { flex: 1, fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  editSection: { backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  editLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: Spacing.sm, fontFamily: Fonts.bold, textTransform: 'uppercase' },
  editInputBox: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  editInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.sm, backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: Spacing.md, minHeight: 60 },
  saveBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tapToEdit: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: Spacing.sm, alignSelf: 'center' },
  tapToEditText: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic' },
  nfTitle: { fontSize: Typography.lg, fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  nfSub: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.xl },
  nfItem: { backgroundColor: Colors.dangerBg, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, width: '100%', borderWidth: 1, borderColor: Colors.danger + '33' },
  nfText: { fontSize: Typography.sm, color: Colors.danger, fontFamily: Fonts.semibold },
  successText: { fontSize: Typography.xxl, fontFamily: Fonts.bold, color: Colors.textPrimary, marginTop: Spacing.lg },
  successRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  retryBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  retryText: { fontSize: Typography.sm, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.md, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  confirmText: { fontSize: Typography.base, fontFamily: Fonts.bold },

  lockedStoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  lockedStoreInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  lockedStoreIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lockedStoreLabel: { fontSize: 8, fontFamily: Fonts.bold, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 1 },
  lockedStoreName: { fontSize: Typography.base, fontFamily: Fonts.bold, color: Colors.textPrimary },
  changeBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: Spacing.md, 
    paddingVertical: 6, 
    borderRadius: Radius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  changeBtnText: { fontSize: 11, fontFamily: Fonts.bold },
});
