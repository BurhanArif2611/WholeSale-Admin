// components/voice/Waveform.tsx
import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

interface WaveformProps {
  isHolding: boolean;
  accentColor: string;
  bars: Animated.Value[];
}

/**
 * Waveform - Visual audio visualization
 * Uses scaleY for high-performance native-driver animations.
 */
export const Waveform = React.memo(({ isHolding, accentColor, bars }: WaveformProps) => {
  return (
    <View style={styles.waveContainer}>
      <View style={styles.waveRow}>
        {bars.map((bar, i) => (
          <Animated.View 
            key={i} 
            style={[
              styles.bar, 
              { 
                backgroundColor: isHolding ? accentColor : accentColor + '30',
                transform: [{ scaleY: isHolding ? bar : 0.2 + (i % 3) * 0.1 }] 
              }
            ]} 
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  waveContainer: { height: 56, justifyContent: 'center', marginBottom: Spacing.lg, width: '100%' },
  waveRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48 },
  bar:           { width: 4, borderRadius: 2, height: 36 },
});
