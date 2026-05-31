import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Fonts, InputDecorationTheme, Shadow } from '@/constants/theme';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { QUICK_ADD_UNIT_OPTIONS } from '@/lib/common/utils/pricing';
import type { Product, UnitType } from '@/lib/domain/models';

interface InlineQuickAddProductCardProps {
  expanded: boolean;
  initialName?: string;
  onCreated: (product: Product) => void;
  onCollapse?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onExpandComplete?: () => void;
  onFieldFocus?: () => void;
  t: (key: string) => string;
}

export function InlineQuickAddProductCard({
  expanded,
  initialName = '',
  onCreated,
  onCollapse,
  onLayout,
  onExpandComplete,
  onFieldFocus,
  t,
}: InlineQuickAddProductCardProps) {
  const [name, setName] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('piece');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(expanded);

  const nameInputRef = useRef<TextInput>(null);
  const expandAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (expanded) {
      setMounted(true);
      Animated.timing(expandAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) onExpandComplete?.();
      });
    } else {
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [expanded, expandAnim, onExpandComplete]);

  useEffect(() => {
    if (expanded && initialName.trim()) {
      setName(initialName.trim());
    }
  }, [expanded, initialName]);

  useEffect(() => {
    if (!expanded) return;
    focusTimerRef.current = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 320);
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [expanded]);

  const reset = () => {
    setName('');
    setUnitType('piece');
    setPurchasePrice('');
    setSellingPrice('');
    setSubmitted(false);
  };

  const handleSave = async () => {
    setSubmitted(true);
    if (!name.trim()) {
      Alert.alert(t('required'), t('err_product_name'));
      return;
    }
    if (!purchasePrice.trim() || parseFloat(purchasePrice) <= 0) {
      Alert.alert(t('required'), t('err_purchase_price_required'));
      return;
    }
    if (!sellingPrice.trim() || parseFloat(sellingPrice) <= 0) {
      Alert.alert(t('required'), t('err_selling_price'));
      return;
    }

    setSaving(true);
    try {
      const product = await productRepository.createQuickIncomplete({
        name: name.trim(),
        unit_type: unitType,
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
      });
      reset();
      onCreated(product);
      onCollapse?.();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted && !expanded) return null;

  const maxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 720],
  });
  const opacity = expandAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.6, 1],
  });

  return (
    <Animated.View
      style={[styles.animatedWrap, { maxHeight, opacity }]}
      onLayout={onLayout}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Ionicons name="flash" size={16} color={Colors.amber} />
          </View>
          <Text style={styles.cardTitle}>{t('quick_add_product')}</Text>
          {onCollapse ? (
            <Pressable onPress={onCollapse} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.fieldLabel}>{t('product_name_label')}</Text>
        <TextInput
          ref={nameInputRef}
          style={[styles.input, submitted && !name.trim() && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder={t('ph_product_name')}
          placeholderTextColor={InputDecorationTheme.placeholderColor}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onFocus={onFieldFocus}
        />
        {submitted && !name.trim() ? (
          <Text style={styles.errorText}>{t('err_product_name')}</Text>
        ) : null}

        <Text style={styles.fieldLabel}>{t('unit_label')}</Text>
        <View style={styles.unitRow}>
          {QUICK_ADD_UNIT_OPTIONS.map((u) => (
            <Pressable
              key={u.value}
              style={[styles.unitChip, unitType === u.value && styles.unitChipActive]}
              onPress={() => setUnitType(u.value)}
            >
              <Text style={[styles.unitChipText, unitType === u.value && styles.unitChipTextActive]}>
                {u.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>{t('purchase_price_label')}</Text>
        <TextInput
          style={[
            styles.input,
            submitted && (!purchasePrice.trim() || parseFloat(purchasePrice) <= 0) && styles.inputError,
          ]}
          value={purchasePrice}
          onChangeText={setPurchasePrice}
          placeholder={t('ph_purchase_price')}
          placeholderTextColor={InputDecorationTheme.placeholderColor}
          keyboardType="decimal-pad"
          onFocus={onFieldFocus}
        />
        {submitted && (!purchasePrice.trim() || parseFloat(purchasePrice) <= 0) ? (
          <Text style={styles.errorText}>{t('err_purchase_price_required')}</Text>
        ) : null}

        <Text style={styles.fieldLabel}>{t('selling_price_label')}</Text>
        <TextInput
          style={[
            styles.input,
            submitted && (!sellingPrice.trim() || parseFloat(sellingPrice) <= 0) && styles.inputError,
          ]}
          value={sellingPrice}
          onChangeText={setSellingPrice}
          placeholder={t('ph_selling_price')}
          placeholderTextColor={InputDecorationTheme.placeholderColor}
          keyboardType="decimal-pad"
          onFocus={onFieldFocus}
        />
        {submitted && (!sellingPrice.trim() || parseFloat(sellingPrice) <= 0) ? (
          <Text style={styles.errorText}>{t('err_selling_price')}</Text>
        ) : null}

        <Text style={styles.hint}>{t('quick_add_incomplete_hint')}</Text>

        <Pressable
          style={[styles.addBtn, saving && styles.addBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color={Colors.white} />
              <Text style={styles.addBtnText}>{t('add_product_btn')}</Text>
            </>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedWrap: {
    overflow: 'hidden',
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  card: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.amber + '66',
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  closeBtn: { padding: 4 },
  fieldLabel: {
    fontSize: Typography.xs,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: InputDecorationTheme.fontFamily,
    fontSize: InputDecorationTheme.fontSize,
    color: InputDecorationTheme.color,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    marginBottom: Spacing.sm,
  },
  inputError: { borderColor: Colors.danger },
  errorText: {
    fontSize: Typography.xs,
    fontFamily: Fonts.medium,
    color: Colors.danger,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  unitChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  unitChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  unitChipTextActive: { color: Colors.amberDim },
  hint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.amber,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
  },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: {
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
});
