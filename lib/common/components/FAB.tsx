import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadow, Gradients } from '@/constants/theme';

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FAB({ onPress, icon = 'add' }: FABProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] }]}>
      <LinearGradient colors={Gradients.amber} style={styles.btn}>
        <Ionicons name={icon} size={28} color={Colors.white} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20, bottom: 24, zIndex: 100, ...Shadow.md },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
