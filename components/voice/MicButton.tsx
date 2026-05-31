// components/voice/MicButton.tsx
import React from 'react';
import { View, Text, Animated, StyleSheet, PanResponderInstance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Gradients, Fonts } from '@/constants/theme';

interface MicButtonProps {
  isHolding: boolean;
  mode: 'order' | 'client' | 'product';
  accentColor: string;
  gradient: readonly [string, string];
  scale: Animated.Value;
  glowOpacity: Animated.AnimatedInterpolation<number | string>;
  panHandlers: PanResponderInstance['panHandlers'];
}

export const MicButton = React.memo(({
  isHolding,
  mode,
  accentColor,
  gradient,
  scale,
  glowOpacity,
  panHandlers,
}: MicButtonProps) => {
  return (
    <View style={styles.micArea}>
      {/* Glow ring - positioned behind button */}
      <View style={styles.glowWrapper}>
        {isHolding && (
          <Animated.View style={[
            styles.glowRing,
            { 
              borderColor: accentColor, 
              opacity: glowOpacity, 
              transform: [{ scale }] 
            }
          ]} />
        )}
      </View>

      <Animated.View style={{ transform: [{ scale: isHolding ? scale : 1 }] }}>
        <View {...panHandlers}>
          <LinearGradient
            colors={isHolding ? Gradients.danger : gradient}
            style={[
              styles.micBtn, 
              { shadowColor: isHolding ? Colors.danger : accentColor },
              isHolding && styles.micBtnActive
            ]}>
            <Ionicons
              name={isHolding ? 'stop' : 'mic'}
              size={42}
              color={mode === 'order' && !isHolding ? Colors.black : Colors.white}
            />
          </LinearGradient>
        </View>
      </Animated.View>

      <Text style={[styles.micLabel, { color: isHolding ? Colors.danger : accentColor }]}>
        {isHolding ? 'Release to process' : 'Hold to record'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  micArea:      { alignItems: 'center', marginTop: Spacing.sm, width: '100%', position: 'relative' },
  glowWrapper:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 40, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  glowRing:     { width: 104, height: 104, borderRadius: 52, borderWidth: 2, backgroundColor: 'transparent' },
  micBtn:       { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 15, elevation: 14 },
  micBtnActive: { elevation: 20 },
  micLabel:     { marginTop: Spacing.lg, fontSize: Typography.sm, fontFamily: Fonts.bold, letterSpacing: 0.5 },
});
