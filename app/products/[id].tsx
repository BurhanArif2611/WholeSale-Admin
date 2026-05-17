// app/products/[id].tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, formatCurrency } from '@/constants/theme';
import { fetchMaterials, updateMaterial, deleteMaterial } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Input, Button } from '@/components/ui';
import type { Material } from '@/types';


export default function ProductDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router  = useRouter();
  const [product, setProduct] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName,  setEditName]  = useState('');
  const [editUnit,  setEditUnit]  = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const ownerId = profile?.owner_id || profile?.id;
    if (!ownerId) return;
    try {
      const mats = await fetchMaterials(ownerId);
      const found = mats.find((m) => m.id === id);
      if (found) {
        setProduct(found);
        setEditName(found.name);
        setEditUnit(found.unit);
        setEditPrice(String(found.base_price));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    if (!editName.trim()) return Alert.alert('Required', 'Name is required.');
    setSaving(true);
    try {
      await updateMaterial(id, { name: editName.trim(), unit: editUnit.trim(), base_price: Number(editPrice) });
      setEditing(false); void load();
    } catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = () =>
    Alert.alert('Delete Product', `Remove ${product?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteMaterial(id); router.back(); }
        catch (e) { Alert.alert('Error', (e as Error).message); }
      }},
    ]);

  if (loading || !product) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: Colors.textMuted }}>Loading...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.amber}
        onRefresh={() => { setRefreshing(true); void load(); }} />}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, Shadow.clay]}>
        <LinearGradient colors={Gradients.purple} style={styles.productIcon}>
          <Ionicons name="cube" size={28} color={Colors.white} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="scale-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{product.unit}</Text>
            <Ionicons name="cash-outline" size={12} color={Colors.amber} style={{ marginLeft: 10 }} />
            <Text style={[styles.metaText, { color: Colors.amber }]}>Base {formatCurrency(product.base_price)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setEditing(!editing)}>
          <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit form */}
      {editing && (
        <View style={[styles.section, Shadow.clay]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="create-outline" size={16} color={Colors.amber} />
            <Text style={styles.sectionTitle}>Edit Details</Text>
          </View>
          <Input label="Product Name" value={editName} onChangeText={setEditName} placeholder="Product name" />
          <View style={styles.row2}>
            <Input label="Unit" value={editUnit} onChangeText={setEditUnit}
              placeholder="kg / box / pcs" style={{ flex: 1 } as any} />
            <Input label="Base Price" value={editPrice} onChangeText={setEditPrice}
              placeholder="0.00" keyboardType="decimal-pad" style={{ flex: 1 } as any} />
          </View>
          <Button label={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave}
            loading={saving} icon="checkmark-outline" />
        </View>
      )}


      <View style={{ marginTop: Spacing.xl }}>
        <Button label="Delete Product" onPress={handleDelete} variant="danger" icon="trash-outline" />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content:   { padding: Spacing.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.xl, padding: Spacing.xl,
    marginBottom: Spacing.xl, backgroundColor: Colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
  },
  productIcon: { width: 56, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.textPrimary },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText:    { fontSize: Typography.xs, color: Colors.textSecondary },
  editBtn:     { fontSize: Typography.sm, color: Colors.amber, fontWeight: Typography.semibold },

  section: { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, backgroundColor: Colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  row2: { flexDirection: 'row', gap: Spacing.md },


  emptyText: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.md },
});