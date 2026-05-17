import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, formatCurrency } from '@/constants/theme';
import { createMaterial } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { addMaterialOptimistic } from '@/hooks/useDataStore';
import UnitPickerModal from '@/components/UnitPickerModal';
import type { Material } from '@/types';

/**
 * OrderRow - Local representation for the interactive order builder.
 */
export interface OrderRow {
  id: string; // temp unique id for React keys
  name: string;
  base_price: string;
  unit: string;
  quantity: string;
  material_id?: string;
  is_new?: boolean;
}

interface Props {
  row: OrderRow;
  index: number;
  isLast: boolean;
  materials: Material[];
  multiplier: number;
  onUpdate: (id: string, updates: Partial<OrderRow>) => void;
  onRemove: (id: string) => void;
  onSelectMaterial: (id: string, mat: Material) => void;
  tData: (v: string | null) => string;
  compact?: boolean;
}

export const OrderItemRow = React.memo(({ 
  row, 
  index, 
  isLast, 
  materials, 
  multiplier, 
  onUpdate, 
  onRemove, 
  onSelectMaterial,
  tData,
  compact = false
}: Props) => {
  const unitPrice = Math.round((Number(row.base_price) || 0) * multiplier);
  const subtotal = unitPrice * (Number(row.quantity) || 0);

  const { profile } = useAuth();
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const [creating, setCreating] = React.useState(false);
  const [unitPickerOpen, setUnitPickerOpen] = React.useState(false);

  // Optimization: Filter suggestions only if there is a name typed and no material_id linked yet.
  const suggestions = useMemo(() => {
    if (row.name.length > 0 && !row.material_id) {
        const q = row.name.toLowerCase();
        return materials.filter(m => tData(m.name).toLowerCase().includes(q)).slice(0, 3);
    }
    return [];
  }, [row.name, row.material_id, materials, tData]);

  const exactMatch = useMemo(() => 
    row.name.length > 0 && (row.material_id || materials.some(m => tData(m.name).toLowerCase() === row.name.toLowerCase().trim())),
  [row.name, row.material_id, materials, tData]);

  const handleQuickCreate = async () => {
    if (!ownerId || !row.name.trim()) return;
    
    // 1. SILENT OPTIMISTIC UPDATE:
    // Create a temporary material object to link the row immediately.
    const tempId = `temp-${Date.now()}`;
    const tempMat: Material = {
        id: tempId,
        name: row.name.trim(),
        base_price: 0,
        unit: 'kg',
        remark: null,
        owner_id: ownerId as string,
        created_at: new Date().toISOString()
    };
    
    // Instantly close the suggestion box and link the row
    onSelectMaterial(row.id, tempMat);

    try {
        const newMat = await createMaterial({
            name: row.name.trim(),
            base_price: 0,
            unit: 'kg',
            owner_id: ownerId
        });
        // 2. BACKGROUND SYNC:
        // Replace temp object with the real one from DB
        addMaterialOptimistic(newMat);
        // Correct the row to use the real DB ID
        onSelectMaterial(row.id, newMat);
    } catch (e) {
        console.error('[QuickAdd] Background sync failed:', e);
    }
  };

  return (
    <View style={{ zIndex: 100 - index }}>
      {compact ? (
        <View style={[styles.compactRow, index % 2 === 1 && styles.tableRowAlt]}>
            <View style={styles.compactMain}>
                <TextInput 
                    value={row.name} 
                    onChangeText={(v) => {
                      onUpdate(row.id, { 
                        name: v, 
                        material_id: undefined, 
                        is_new: true 
                      });
                    }}
                    onBlur={() => {
                      if (row.name.trim() && !exactMatch) {
                        handleQuickCreate();
                      }
                    }}
                    placeholder="Product Name..."
                    style={[styles.cellInput, { flex: 1, width: '100%' }, row.is_new && styles.highlightInput]}
                />
                <TouchableOpacity 
                    onPress={() => onRemove(row.id)} 
                    delayPressIn={0}
                    style={styles.inlineRemoveBtn}
                    disabled={isLast && index === 0}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Ionicons 
                        name="close-circle" 
                        size={22} 
                        color={isLast && index === 0 ? Colors.borderLight : Colors.danger} 
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.compactControls}>
                <View style={{ width: 60 }}>
                    <Text style={styles.compactLabel}>Qty</Text>
                    <TextInput 
                        value={row.quantity} 
                        onChangeText={(v) => onUpdate(row.id, { quantity: v })} 
                        placeholder="0"
                        keyboardType="decimal-pad"
                        style={styles.cellInput}
                    />
                </View>
                <View style={{ width: 60 }}>
                    <Text style={styles.compactLabel}>Unit</Text>
                    <TouchableOpacity
                        style={styles.unitBtn}
                        onPress={() => setUnitPickerOpen(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.unitBtnText}>{row.unit || 'kg'}</Text>
                        <Ionicons name="chevron-down" size={10} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.compactLabel}>Price</Text>
                    <TextInput 
                        value={row.base_price} 
                        onChangeText={(v) => onUpdate(row.id, { base_price: v, is_new: true })} 
                        placeholder="0"
                        keyboardType="decimal-pad"
                        style={[styles.cellInput, { textAlign: 'center' }]}
                    />
                </View>
                <View style={{ minWidth: 80, alignItems: 'flex-end', justifyContent: 'center', paddingTop: 14 }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={styles.subtotalText}>
                        {formatCurrency(subtotal)}
                    </Text>
                </View>
            </View>
        </View>
      ) : (
        <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
            <View style={{ flex: 1 }}>
            <TextInput 
                value={row.name} 
                onChangeText={(v) => onUpdate(row.id, { name: v, material_id: undefined, is_new: true })} 
                placeholder="..."
                style={[styles.cellInput, row.is_new && { borderColor: Colors.info + '60', backgroundColor: Colors.info + '05' }]}
            />
            </View>
            
            <View style={{ width: 45 }}>
            <TouchableOpacity
                style={[styles.unitBtn, { marginHorizontal: 1 }, row.is_new && { borderColor: Colors.info + '60' }]}
                onPress={() => setUnitPickerOpen(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.unitBtnText}>{row.unit || 'kg'}</Text>
                <Ionicons name="chevron-down" size={9} color={Colors.textMuted} />
            </TouchableOpacity>
            </View>

            <View style={{ width: 40 }}>
            <TextInput 
                value={row.quantity} 
                onChangeText={(v) => onUpdate(row.id, { quantity: v })} 
                placeholder="0"
                keyboardType="decimal-pad"
                style={[styles.cellInput, { textAlign: 'center' }]}
            />
            </View>

            <View style={{ width: 70 }}>
            <TextInput 
                value={row.base_price} 
                onChangeText={(v) => onUpdate(row.id, { base_price: v, is_new: true })} 
                placeholder="0"
                keyboardType="decimal-pad"
                style={[styles.cellInput, { textAlign: 'center' }, row.is_new && { borderColor: Colors.info + '60' }]}
            />
            </View>

            <View style={{ minWidth: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.subtotalText}>{formatCurrency(subtotal)}</Text>
                <TouchableOpacity 
                    onPress={() => onRemove(row.id)} 
                    delayPressIn={0}
                    style={styles.inlineRemoveBtn}
                    disabled={isLast && index === 0}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                <Ionicons 
                name="close-circle" 
                size={18} 
                color={isLast && index === 0 ? Colors.borderLight : Colors.danger} 
                />
            </TouchableOpacity>
            </View>
        </View>
      )}

      {/* Suggestions Overlay */}
      {(suggestions.length > 0 || (row.name.trim() && !exactMatch)) && (
        <View style={styles.tableSuggestions}>
          {suggestions.map((m) => (
            <TouchableOpacity key={m.id} style={styles.suggestionItem} onPress={() => onSelectMaterial(row.id, m)}>
              <Text style={styles.suggestionText}>{tData(m.name)} ({formatCurrency(m.base_price)})</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Unit Picker */}
      <UnitPickerModal
        visible={unitPickerOpen}
        selected={row.unit}
        onSelect={(unit) => onUpdate(row.id, { unit, is_new: true })}
        onClose={() => setUnitPickerOpen(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 191, 0, 0.02)',
  },
  cellInput: {
    fontSize: 13,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 1,
    color: '#1E293B',
    minWidth: 30,
  },
  highlightInput: { borderColor: Colors.info + '60', backgroundColor: Colors.info + '05' },
  
  compactRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  compactMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  compactControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
    marginLeft: 4,
  },
  subtotalText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
    marginRight: 4,
  },
  inlineRemoveBtn: { padding: 4 },
  tableSuggestions: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: { fontSize: 13, color: '#1E293B' },

  unitBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    marginHorizontal: 1,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
  },
  unitBtnText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
});
