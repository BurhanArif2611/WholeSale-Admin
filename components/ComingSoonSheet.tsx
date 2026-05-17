import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients } from '@/constants/theme';
import { Button } from './ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ComingSoonSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ComingSoonSheet = React.memo(({ visible, onClose }: ComingSoonSheetProps) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && (opacity as any)._value === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }] },
        ]}
      >
        <LinearGradient
          colors={[Colors.white, '#F8FAFC']}
          style={styles.content}
        >
          <View style={styles.handle} />

          <View style={styles.iconContainer}>
            <LinearGradient
              colors={Gradients.amber}
              style={styles.iconCircle}
            >
              <Ionicons name="sparkles" size={32} color={Colors.black} />
            </LinearGradient>
            <View style={styles.pulseContainer}>
               <Animated.View style={styles.pulseRing} />
            </View>
          </View>

          <Text style={styles.title}>Voice Assistant</Text>
          <Text style={styles.status}>COMING SOON</Text>

          <View style={styles.featureList}>
            <FeatureItem 
              icon="mic-outline" 
              title="Voice Orders" 
              desc="Create full orders just by speaking." 
            />
            <FeatureItem 
              icon="cube-outline" 
              title="Quick Products" 
              desc="Add new inventory items hands-free." 
            />
            <FeatureItem 
              icon="people-outline" 
              title="Smart Search" 
              desc="Find clients and records instantly." 
            />
          </View>

          <Text style={styles.footerText}>
            We're finalizing the AI models to ensure 100% accuracy for your business. Launching in the next major update!
          </Text>

          <Button 
            label="GOT IT" 
            onPress={onClose} 
            variant="primary" 
            style={styles.button}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
});

const FeatureItem = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIconBox}>
      <Ionicons name={icon} size={20} color={Colors.amber} />
    </View>
    <View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...Shadow.colored(Colors.amber),
  },
  pulseContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.amber,
    opacity: 0.2,
  },
  title: {
    fontSize: 24,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  status: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.amber,
    letterSpacing: 2,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.amber + '15',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: Colors.amber + '50',
    textAlign: 'center',
    overflow: 'hidden',
  },
  featureList: {
    width: '100%',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.amber + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  button: {
    width: '100%',
  },
});
