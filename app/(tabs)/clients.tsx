import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ListCard } from '@/lib/common/components/ListCard';
import { appConfirm } from '@/lib/common/utils/appAlert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, formatCurrency, Layout } from '@/constants/theme';
import { SearchBar, EmptyState } from '@/components/ui';
import { FAB } from '@/lib/common/components/FAB';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import type { Client } from '@/lib/domain/models';

export default function ClientsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady, refreshKey } = useDatabase();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const data = await clientRepository.findAll(search);
    setClients(data);
    setLoading(false);
  }, [isReady, search, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCall = (mobile: string) => Linking.openURL(`tel:${mobile}`);
  const handleWhatsApp = (mobile: string) => Linking.openURL(`https://wa.me/${mobile.replace(/\D/g, '')}`);

  const handleDelete = async (client: Client) => {
    const yes = await appConfirm(t('delete'), `${t('delete')} ${client.name}?`);
    if (!yes) return;
    await clientRepository.delete(client.id);
    await load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('search_clients')}
          accessibilityLabel={t('search_clients')}
        />
      </View>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<EmptyState icon="people-outline" message={t('no_clients')} />}
        renderItem={({ item }) => (
          <ListCard
            title={item.name}
            subtitle={item.address ?? undefined}
            meta={item.mobile}
            rightText={item.pending_amount > 0 ? formatCurrency(item.pending_amount) : undefined}
            rightSubtext={item.pending_amount > 0 ? t('pending') : undefined}
            icon="person"
            iconColor={Colors.info}
            iconBg={Colors.infoBg}
            accentColor={item.pending_amount > 0 ? Colors.danger : Colors.info}
            onPress={() => router.push(`/clients/${item.id}`)}
            trailing={
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleCall(item.mobile)} style={styles.actionBtn}>
                  <Ionicons name="call" size={18} color={Colors.success} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleWhatsApp(item.mobile)} style={styles.actionBtn}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void handleDelete(item)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            }
          />
        )}
      />
      <FAB onPress={() => router.push('/clients/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchWrap: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  list: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Layout.screenPaddingBottom },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8 },
});
