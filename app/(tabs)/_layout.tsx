// app/(tabs)/_layout.tsx
import React, { useState, memo } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Gradients, Radius, Spacing, Shadow } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { LANGUAGES } from '@/constants/translations';

/**
 * LangHeaderRight - Memoized settings/language component for the header.
 */
const LangHeaderRight = memo(() => {
  const { t, locale, setLocale } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <View style={{ marginRight: Spacing.md }}>
      <TouchableOpacity
        onPress={() => setShowMenu(true)}
        style={[styles.langTrigger, showMenu && { backgroundColor: Colors.amber + '15', borderColor: Colors.amber }]}
        accessibilityLabel="Open app settings and language selection"
      >
        <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
      </TouchableOpacity>

      <Modal 
        visible={showMenu} 
        transparent 
        animationType="fade" 
        statusBarTranslucent
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.langMenu}>
            <Text style={styles.langMenuTitle}>{t('select_language')}</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[styles.langItem, locale === lang.value && { backgroundColor: Colors.amber + '15' }]}
                onPress={() => {
                  setLocale(lang.value);
                  setShowMenu(false);
                }}
              >
                <Text style={[styles.langText, locale === lang.value && { color: Colors.amber, fontWeight: 'bold' }]}>
                  {lang.label}
                </Text>
                {locale === lang.value && <Ionicons name="checkmark-circle" size={14} color={Colors.amber} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
});

/**
 * TabIcon - Memoized tab icon with active state indicators.
 */
const TabIcon = memo(({ name, focused, color }: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) => {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {focused && (
        <LinearGradient
          colors={[Colors.amber + '22', Colors.amber + '08']}
          style={[StyleSheet.absoluteFill, { borderRadius: Radius.sm }]}
        />
      )}
      <Ionicons name={name} size={22} color={focused ? Colors.amber : color} />
    </View>
  );
});

/**
 * TabLayout - Main tab navigation configuration.
 * Handles role-based tab visibility and global tab styling.
 */
export default function TabLayout() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { 
            fontWeight: Typography.bold as any, 
            fontSize: Typography.base, 
            color: Colors.textPrimary 
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarActiveTintColor: Colors.amber,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.4,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home_tab'),
          tabBarAccessibilityLabel: "Home Dashboard",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} color={color} />,
          headerTitle: () => (
            <Text style={styles.brandText}>WholeSale <Text style={{ color: Colors.amber }}>Admin</Text></Text>
          ),
          headerRight: () => <LangHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('orders_tab'),
          tabBarAccessibilityLabel: "Order Management",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'receipt' : 'receipt-outline'} focused={focused} color={color} />,
          headerTitle: t('orders_tab'),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: t('clients_tab'),
          tabBarAccessibilityLabel: "Client Directory",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} color={color} />,
          headerTitle: t('clients_tab'),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t('products_tab'),
          tabBarAccessibilityLabel: "Product Catalog",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'cube' : 'cube-outline'} focused={focused} color={color} />,
          headerTitle: t('products_tab'),
        }}
      />
      <Tabs.Screen
        name="salesmen"
        options={{
          title: 'Staff',
          tabBarAccessibilityLabel: "Staff and Salesmen Management",
          href: (isOwner ? '/(tabs)/salesmen' : null) as any,
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} color={color} />,
          headerTitle: 'Sales Team',
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  tabIconFocused: {
    borderWidth: 1,
    borderColor: Colors.amber + '33',
  },
  brandText: {
    fontSize: 20, 
    fontWeight: Typography.black as any,
    color: Colors.textPrimary, 
    letterSpacing: -0.5,
  },
  langTrigger: {
    padding: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  langMenu: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    ...Shadow.md,
    width: 180,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langMenuTitle: {
    fontSize: 10, color: Colors.textMuted,
    fontWeight: '800', textTransform: 'uppercase',
    marginBottom: 8, marginLeft: 8, marginTop: 4
  },
  langItem: {
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: Radius.md, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 2
  },
  langText: { fontSize: 14, color: Colors.textSecondary },
});
