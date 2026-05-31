// app/(tabs)/_layout.tsx
import React, { memo } from "react";
import { Tabs, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Colors,
  Typography,
  Gradients,
  Radius,
  Spacing,
  Shadow,
  Fonts,
  AppBarTheme,
  TabBarTheme,
} from '@/constants/theme';
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";

/** Opens the dedicated Settings screen (language, reports, logout, etc.). */
const SettingsHeaderButton = memo(() => {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <View style={{ marginRight: Spacing.md }}>
      <TouchableOpacity
        onPress={() => router.push("/settings")}
        style={styles.langTrigger}
        accessibilityLabel={t("settings_title")}
      >
        <Ionicons
          name="settings-outline"
          size={20}
          color={Colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
});

/**
 * TabIcon - Memoized tab icon with active state indicators.
 */
const TabIcon = memo(
  ({
    name,
    focused,
    color,
  }: {
    name: keyof typeof Ionicons.glyphMap;
    focused: boolean;
    color: string;
  }) => {
    return (
      <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {focused && (
          <LinearGradient
            colors={[Colors.amber + "22", Colors.amber + "08"]}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.sm }]}
          />
        )}
        <Ionicons
          name={name}
          size={22}
          color={focused ? Colors.amber : color}
        />
      </View>
    );
  },
);

/**
 * TabLayout - Main tab navigation configuration.
 * Handles role-based tab visibility and global tab styling.
 */
export default function TabLayout() {
  const { t, localeRevision } = useLanguage();
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        key={`tabs-${localeRevision}`}
        screenOptions={{
          headerStyle: AppBarTheme.headerStyle,
          headerTintColor: AppBarTheme.tintColor,
          headerTitleStyle: AppBarTheme.titleStyle,
          headerShadowVisible: AppBarTheme.headerShadowVisible,
          headerTitleAlign: AppBarTheme.headerTitleAlign,
          tabBarStyle: TabBarTheme.style,
          tabBarActiveTintColor: TabBarTheme.activeTintColor,
          tabBarInactiveTintColor: TabBarTheme.inactiveTintColor,
          tabBarLabelStyle: TabBarTheme.labelStyle,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("home_tab"),
            tabBarAccessibilityLabel: "Home Dashboard",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? "grid" : "grid-outline"}
                focused={focused}
                color={color}
              />
            ),
            headerTitle: () => (
              <Text style={styles.brandText}>
                WholeSale <Text style={{ color: Colors.amber }}>Admin</Text>
              </Text>
            ),
            headerRight: () => <SettingsHeaderButton />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: t("orders_tab"),
            tabBarAccessibilityLabel: "Order Management",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? "receipt" : "receipt-outline"}
                focused={focused}
                color={color}
              />
            ),
            headerTitle: t("orders_tab"),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: t("clients_tab"),
            tabBarAccessibilityLabel: "Client Directory",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? "people" : "people-outline"}
                focused={focused}
                color={color}
              />
            ),
            headerTitle: t("clients_tab"),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: t("products_tab"),
            tabBarAccessibilityLabel: "Product Catalog",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? "cube" : "cube-outline"}
                focused={focused}
                color={color}
              />
            ),
            headerTitle: t("products_tab"),
          }}
        />
        <Tabs.Screen
          name="salesmen"
          options={{
            title: t("staff_tab"),
            tabBarAccessibilityLabel: "Staff and Salesmen Management",
            href: (isOwner ? "/(tabs)/salesmen" : null) as any,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? "briefcase" : "briefcase-outline"}
                focused={focused}
                color={color}
              />
            ),
            headerTitle: t("staff_tab"),
          }}
        />
        {/* Hidden from tab bar — custom ScreenLayout header with back button */}
        <Tabs.Screen name="inventory" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="ledger" options={{ href: null, headerShown: false }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.sm,
  },
  tabIconFocused: {
    borderWidth: 1,
    borderColor: Colors.amber + "33",
  },
  brandText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tight,
  },
  langTrigger: {
    padding: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
});
