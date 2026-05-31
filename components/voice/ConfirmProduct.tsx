// components/voice/ConfirmProduct.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Gradients, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';

interface ConfirmProductProps {
  transcript: string;
  productData: { name: string; unit: string; price: number; remark?: string };
  onUpdate: (data: Partial<{ name: string; unit: string; price: number; remark?: string }>) => void;
}

/**
 * ConfirmProduct - Verification screen for AI-extracted products
 * Allows manual adjustment of matched data before creating a new material entry.
 */
export const ConfirmProduct = React.memo(({ transcript, productData, onUpdate }: ConfirmProductProps) => {
  const { t } = useLanguage();
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <View style={styles.transcriptBox}>
        <Ionicons name="mic-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.transcriptText}>{transcript}</Text>
      </View>

      <LinearGradient colors={Gradients.card} style={styles.section}>
        <Text style={styles.sLabel}>PRODUCT DETAILS</Text>
        
        {/* Name Field */}
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={14} color={Colors.purple} />
          <Text style={styles.dLabel}>Name</Text>
          <TextInput
            style={styles.dInput}
            value={productData.name}
            onChangeText={(v) => onUpdate({ name: v })}
            placeholder={t('ph_product_name')}
            accessibilityLabel={t('ph_product_name')}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Unit Field */}
        <View style={styles.detailRow}>
          <Ionicons name="scale-outline" size={14} color={Colors.purple} />
          <Text style={styles.dLabel}>Unit</Text>
          <TextInput
            style={styles.dInput}
            value={productData.unit}
            onChangeText={(v) => onUpdate({ unit: v })}
            placeholder={t('ph_unit')}
            accessibilityLabel={t('ph_unit')}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Price Field */}
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={14} color={Colors.purple} />
          <Text style={styles.dLabel}>Price</Text>
          <View style={styles.priceInputBox}>
            <Text style={styles.unitText}>₹</Text>
            <TextInput
              style={styles.dInput}
              value={productData.price?.toString()}
              onChangeText={(v) => onUpdate({ price: parseFloat(v) || 0 })}
              placeholder={t('ph_selling_price')}
              accessibilityLabel={t('ph_selling_price')}
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Remark Field */}
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="document-text-outline" size={14} color={Colors.purple} />
          <Text style={styles.dLabel}>Remark</Text>
          <TextInput
            style={styles.dInput}
            value={productData.remark}
            onChangeText={(v) => onUpdate({ remark: v })}
            placeholder={t('notes_placeholder')}
            accessibilityLabel={t('notes_optional')}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </LinearGradient>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  transcriptBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md, marginVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border, width: '100%' },
  transcriptText: { flex: 1, fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  section:  { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sLabel:   { fontSize: 10, fontFamily: Fonts.bold, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderColor: Colors.border + '44' },
  dLabel:    { fontSize: Typography.xs, color: Colors.textMuted, width: 60, fontFamily: Fonts.semibold },
  dInput:    { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary, fontFamily: Fonts.semibold, backgroundColor: Colors.surface2, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border + '44' },
  priceInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  unitText: { fontSize: Typography.sm, color: Colors.textSecondary, fontFamily: Fonts.semibold },
});
