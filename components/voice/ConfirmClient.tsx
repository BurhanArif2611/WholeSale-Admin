// components/voice/ConfirmClient.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Gradients } from '@/constants/theme';

interface ConfirmClientProps {
  transcript: string;
  clientData: { name: string; phone?: string; area?: string; margin?: number };
  onUpdate: (data: Partial<{ name: string; phone?: string; area?: string; margin?: number }>) => void;
}

/**
 * ConfirmClient - Verification screen for AI-extracted clients
 * Allows manual adjustment of matched data before creating a new store/client entry.
 */
export const ConfirmClient = React.memo(({ transcript, clientData, onUpdate }: ConfirmClientProps) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <View style={styles.transcriptBox}>
        <Ionicons name="mic-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.transcriptText}>{transcript}</Text>
      </View>
      
      <LinearGradient colors={Gradients.card} style={styles.section}>
        <Text style={styles.sLabel}>CLIENT DETAILS</Text>
        
        {/* Name Field */}
        <View style={styles.detailRow}>
          <Ionicons name="storefront-outline" size={14} color={Colors.info} />
          <Text style={styles.dLabel}>Name</Text>
          <TextInput
            style={styles.dInput}
            value={clientData.name}
            onChangeText={(v) => onUpdate({ name: v })}
            placeholder="Client Name"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Area Field */}
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={Colors.info} />
          <Text style={styles.dLabel}>Area</Text>
          <TextInput
            style={styles.dInput}
            value={clientData.area}
            onChangeText={(v) => onUpdate({ area: v })}
            placeholder="Area / Location"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Phone Field */}
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={14} color={Colors.info} />
          <Text style={styles.dLabel}>Phone</Text>
          <TextInput
            style={styles.dInput}
            value={clientData.phone}
            onChangeText={(v) => onUpdate({ phone: v })}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Margin Field */}
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="trending-up-outline" size={14} color={Colors.info} />
          <Text style={styles.dLabel}>Margin</Text>
          <View style={styles.marginInputBox}>
            <TextInput
              style={[styles.dInput, { flex: 1, minWidth: 60 }]}
              value={clientData.margin?.toString()}
              onChangeText={(v) => onUpdate({ margin: parseFloat(v) || 0 })}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.unitText}>%</Text>
          </View>
        </View>
      </LinearGradient>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  transcriptBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md, marginVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border, width: '100%' },
  transcriptText: { flex: 1, fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  section:  { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sLabel:   { fontSize: 10, fontWeight: Typography.black, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderColor: Colors.border + '44' },
  dLabel:    { fontSize: Typography.xs, color: Colors.textMuted, width: 60, fontWeight: Typography.semibold },
  dInput:    { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: Typography.semibold, backgroundColor: Colors.surface2, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border + '44' },
  marginInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  unitText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.semibold },
});
