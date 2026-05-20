import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';

export interface OrderFlowStepConfig {
  key: string;
  label: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DEFAULT_STEPS: OrderFlowStepConfig[] = [
  { key: 'client', label: 'Client', shortLabel: 'Client', icon: 'person-outline' },
  { key: 'products', label: 'Products', shortLabel: 'Items', icon: 'cart-outline' },
  { key: 'review', label: 'Review', shortLabel: 'Review', icon: 'document-text-outline' },
  { key: 'confirm', label: 'Confirm', shortLabel: 'Pay', icon: 'checkmark-circle-outline' },
];

interface OrderFlowStepperProps {
  currentStep: number;
  totalSteps?: number;
  steps?: OrderFlowStepConfig[];
  onStepPress?: (step: number) => void;
  canNavigateTo?: (step: number) => boolean;
}

export const ORDER_FLOW_STEPPER_HEIGHT = 56;

export function OrderFlowStepper({
  currentStep,
  totalSteps = 4,
  steps = DEFAULT_STEPS,
  onStepPress,
  canNavigateTo,
}: OrderFlowStepperProps) {
  const { width } = useWindowDimensions();
  const compactLabels = width < 380;
  const progress = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const target = totalSteps <= 1 ? 0 : (currentStep - 1) / (totalSteps - 1);
    Animated.timing(progress, {
      toValue: target,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps, progress]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, trackWidth)],
  });

  const displaySteps = steps.slice(0, totalSteps);

  return (
    <View style={styles.wrap}>
      <View style={styles.trackRow} onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}>
        <View style={styles.trackBg} />
        <Animated.View style={[styles.trackFill, { width: fillWidth }]} />
      </View>

      <View style={styles.stepsRow}>
        {displaySteps.map((cfg, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const canTap =
            !!onStepPress &&
            stepNum !== currentStep &&
            (canNavigateTo ? canNavigateTo(stepNum) : isCompleted);

          return (
            <Pressable
              key={cfg.key}
              style={styles.stepCell}
              onPress={canTap ? () => onStepPress(stepNum) : undefined}
              disabled={!canTap}
            >
              <View
                style={[
                  styles.dot,
                  isCompleted && styles.dotCompleted,
                  isActive && styles.dotActive,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                ) : (
                  <Ionicons
                    name={cfg.icon}
                    size={isActive ? 14 : 12}
                    color={isActive ? Colors.white : Colors.textMuted}
                  />
                )}
              </View>
              {!compactLabels || isActive ? (
                <Text
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                    isCompleted && styles.labelCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {isActive ? cfg.label : cfg.shortLabel}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: ORDER_FLOW_STEPPER_HEIGHT,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  trackRow: {
    height: 3,
    marginBottom: 6,
    marginHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  trackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.amber,
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepCell: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surface2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dotCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dotActive: {
    backgroundColor: Colors.amber,
    borderColor: Colors.amber,
    transform: [{ scale: 1.08 }],
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  labelActive: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.amberDim,
  },
  labelCompleted: {
    color: Colors.success,
  },
});
