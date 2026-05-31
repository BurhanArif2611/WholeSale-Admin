// components/UnitPickerModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Typography, Spacing, Fonts } from '@/constants/theme';

export interface UnitOption {
  label: string; // e.g. "KILOGRAMS"
  abbr: string;  // e.g. "Kg"
}

const DEFAULT_UNITS: UnitOption[] = [
  { label: 'BAGS',         abbr: 'Bag' },
  { label: 'BOTTLES',      abbr: 'Btl' },
  { label: 'BOX',          abbr: 'Box' },
  { label: 'BUNDLES',      abbr: 'Bdl' },
  { label: 'CANS',         abbr: 'Can' },
  { label: 'CARTONS',      abbr: 'Ctn' },
  { label: 'DOZENS',       abbr: 'Dzn' },
  { label: 'GRAMMES',      abbr: 'Gm'  },
  { label: 'KILOGRAMS',    abbr: 'Kg'  },
  { label: 'LITRE',        abbr: 'Ltr' },
  { label: 'METERS',       abbr: 'Mtr' },
  { label: 'MILILITRE',    abbr: 'Ml'  },
  { label: 'NUMBERS',      abbr: 'Nos' },
  { label: 'PACKS',        abbr: 'Pac' },
  { label: 'PAIRS',        abbr: 'Prs' },
  { label: 'PIECES',       abbr: 'Pcs' },
  { label: 'QUINTAL',      abbr: 'Qtl' },
  { label: 'ROLLS',        abbr: 'Rol' },
  { label: 'SQUARE FEET',  abbr: 'Sqf' },
  { label: 'SQUARE METERS',abbr: 'Sqm' },
  { label: 'TABLETS',      abbr: 'Tbs' },
];

interface Props {
  visible: boolean;
  selected: string;
  onSelect: (unit: string) => void;
  onClose: () => void;
}

export default function UnitPickerModal({ visible, selected, onSelect, onClose }: Props) {
  const [customUnits, setCustomUnits] = useState<UnitOption[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAbbr, setNewAbbr] = useState('');

  const allUnits = [...DEFAULT_UNITS, ...customUnits];

  const handleAdd = () => {
    const label = newLabel.trim().toUpperCase();
    const abbr  = newAbbr.trim();
    if (!label || !abbr) {
      Alert.alert('Required', 'Please fill in both unit name and abbreviation.');
      return;
    }
    setCustomUnits(prev => [...prev, { label, abbr }]);
    setNewLabel('');
    setNewAbbr('');
    setShowAddDialog(false);
    onSelect(abbr);
    onClose();
  };

  const handleSelect = (u: UnitOption) => {
    onSelect(u.abbr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Unit</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Add New Unit */}
          <TouchableOpacity style={styles.addNewBtn} onPress={() => setShowAddDialog(true)} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.amber} />
            <Text style={styles.addNewText}>Add New Unit</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Unit List */}
          <FlatList
            data={allUnits}
            keyExtractor={(item) => item.abbr}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = selected === item.abbr;
              return (
                <TouchableOpacity
                  style={[styles.unitRow, active && styles.unitRowActive]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.unitLabel, active && styles.unitLabelActive]}>
                    {item.label} ({item.abbr})
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={18} color={Colors.amber} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Add New Unit Dialog */}
        <Modal visible={showAddDialog} transparent animationType="fade" onRequestClose={() => setShowAddDialog(false)}>
          <View style={styles.dialogOverlay}>
            <View style={styles.dialog}>
              <Text style={styles.dialogTitle}>Add New Unit</Text>

              <Text style={styles.dialogLabel}>Unit Name (e.g. TONNES)</Text>
              <TextInput
                style={styles.dialogInput}
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="e.g. TONNES"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />

              <Text style={styles.dialogLabel}>Abbreviation (e.g. Ton)</Text>
              <TextInput
                style={styles.dialogInput}
                value={newAbbr}
                onChangeText={setNewAbbr}
                placeholder="e.g. Ton"
                placeholderTextColor={Colors.textMuted}
              />

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => { setShowAddDialog(false); setNewLabel(''); setNewAbbr(''); }}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dialogAddBtn} onPress={handleAdd}>
                  <Text style={styles.dialogAddText}>Add Unit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '80%',
    ...Shadow.clay,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  addNewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  addNewText: {
    fontSize: Typography.base,
    color: Colors.amber,
    fontFamily: Fonts.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.xl,
    marginBottom: 4,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  unitRowActive: {
    backgroundColor: Colors.amberBg,
  },
  unitLabel: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  unitLabelActive: {
    fontFamily: Fonts.bold,
    color: Colors.amber,
  },

  // Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.clay,
  },
  dialogTitle: {
    fontSize: Typography.lg,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  dialogLabel: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.xl,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontFamily: Fonts.semibold,
  },
  dialogAddBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.full,
    backgroundColor: Colors.amber,
    alignItems: 'center',
  },
  dialogAddText: {
    fontSize: Typography.base,
    color: Colors.black,
    fontFamily: Fonts.bold,
  },
});
