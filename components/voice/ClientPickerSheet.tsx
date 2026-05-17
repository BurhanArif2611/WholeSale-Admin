import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, StyleSheet,
  FlatList, ActivityIndicator, Pressable
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { SearchBar } from '../ui';
import type { Store } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';
import { useDataStore } from '@/hooks/useDataStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (store: Store) => void;
}

export function ClientPickerSheet({ visible, onClose, onSelect }: Props) {
  const { t, tData } = useLanguage();
  const { stores, loading } = useDataStore();
  const [search, setSearch] = useState('');

  const filtered = stores.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.area ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('select_client')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <SearchBar 
              value={search} 
              onChangeText={setSearch} 
              placeholder={t('search_placeholder')} 
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.amber} style={styles.loader} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.item}
                  onPress={() => onSelect(item)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{tData(item.name).charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{tData(item.name)}</Text>
                    {item.area && <Text style={styles.itemArea}>{item.area}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { 
    backgroundColor: Colors.white, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '80%',
    paddingBottom: Spacing.xl
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight
  },
  title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  closeBtn: { padding: 4 },
  searchContainer: { padding: Spacing.md },
  loader: { marginVertical: Spacing.xxxl },
  list: { paddingHorizontal: Spacing.md },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.md, 
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: 4
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: Colors.soft.amber, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  avatarText: { color: Colors.amber, fontWeight: Typography.bold },
  itemInfo: { flex: 1 },
  itemName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  itemArea: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
});
