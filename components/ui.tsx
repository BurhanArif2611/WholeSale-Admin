// components/ui.tsx
import React from 'react';
import {
  View, Text, TextInput,
  ActivityIndicator, StyleSheet, ViewStyle, TextStyle, StyleProp,
  Animated, Easing, Platform, TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, STATUS_CONFIG, Gradients } from '@/constants/theme';
import type { OrderStatus } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export const StatusBadge = React.memo(({ status }: { status: OrderStatus }) => {
  const { t } = useLanguage();
  const cfg = STATUS_CONFIG[status] ?? { color: Colors.textSecondary, bg: Colors.surface, label: status, icon: 'ellipse-outline', gradient: [Colors.surface, Colors.surface2] };
  
  const label = t(status.toLowerCase() + '_status');
  const displayLabel = (label === status.toLowerCase() + '_status' || !label) ? cfg.label : label;

  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '10', borderColor: cfg.color + '30' }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{displayLabel.toUpperCase()}</Text>
    </View>
  );
});

// ─── GradientCard ─────────────────────────────────────────────────────────────

export const GradientCard = React.memo(({ children, style, colors }: {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string];
}) => {
  return (
    <LinearGradient
      colors={colors ?? Gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradCard, Shadow.clay, style]}
    >
      {children}
    </LinearGradient>
  );
});

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button = React.memo(({ label, onPress, variant = 'primary', size = 'md', icon, disabled, loading, style, outline }: ButtonProps) => {
  const pad      = { sm: Spacing.sm, md: Spacing.md, lg: Spacing.lg }[size];
  const fontSize = { sm: Typography.xs, md: Typography.sm, lg: Typography.base }[size];
  const iconSize = { sm: 14, md: 16, lg: 18 }[size];

  const handlePress = React.useCallback(() => {
    if (!disabled && !loading) onPress();
  }, [onPress, disabled, loading]);

  if (variant === 'primary') {
    return (
      <TouchableOpacity 
        onPress={handlePress} 
        disabled={disabled || loading} 
        activeOpacity={0.8} 
        style={[
          { opacity: disabled ? 0.5 : 1 }, 
          outline && { 
            borderWidth: 1.5, 
            borderColor: Colors.amber, 
            borderRadius: Radius.lg,
            backgroundColor: 'transparent'
          },
          style
        ]}
      >
        <LinearGradient
          colors={outline ? ['transparent', 'transparent'] : Gradients.amber}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[
            styles.btn, 
            { paddingVertical: pad }, 
            !outline && Shadow.amber,
            outline && { backgroundColor: 'transparent' }
          ]}
        >
          {loading ? <ActivityIndicator size="small" color={outline ? Colors.amber : Colors.white} /> : (
            <View style={styles.btnInner}>
              {icon && <Ionicons name={icon} size={iconSize} color={outline ? Colors.amber : Colors.white} style={{ marginRight: 6 }} />}
              <Text style={[styles.btnText, { color: outline ? Colors.amber : Colors.white, fontSize }]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity 
        onPress={handlePress} 
        disabled={disabled || loading} 
        activeOpacity={0.8} 
        style={[
          { opacity: disabled ? 0.5 : 1 }, 
          outline && { 
            borderWidth: 1.5, 
            borderColor: Colors.danger, 
            borderRadius: Radius.lg,
            backgroundColor: 'transparent'
          },
          style
        ]}
      >
        <LinearGradient
          colors={outline ? ['transparent', 'transparent'] : Gradients.danger}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[
            styles.btn, 
            { paddingVertical: pad }, 
            !outline && Shadow.md,
            outline && { backgroundColor: 'transparent' }
          ]}
        >
          {loading ? <ActivityIndicator size="small" color={outline ? Colors.danger : Colors.white} /> : (
            <View style={styles.btnInner}>
              {icon && <Ionicons name={icon} size={iconSize} color={outline ? Colors.danger : Colors.white} style={{ marginRight: 6 }} />}
              <Text style={[styles.btnText, { color: outline ? Colors.danger : Colors.white, fontSize }]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const bg = variant === 'ghost' ? 'transparent' : Colors.surface;
  const textColor = variant === 'ghost' ? Colors.textSecondary : Colors.textPrimary;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn, 
        { 
          backgroundColor: bg, 
          paddingVertical: pad, 
          borderWidth: variant === 'ghost' ? 0 : 1, 
          borderColor: Colors.border, 
          opacity: disabled ? 0.5 : 1 
        }, 
        variant !== 'ghost' && Shadow.sm,
        style
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={textColor} /> : (
        <View style={styles.btnInner}>
          {icon && <Ionicons name={icon} size={iconSize} color={textColor} style={{ marginRight: 6 }} />}
          <Text style={[styles.btnText, { color: textColor, fontSize }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address' | 'decimal-pad';
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  returnKeyType?: 'done' | 'next' | 'search' | 'send' | 'default';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  accessibilityLabel?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export const Input = React.memo(({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  touched,
  required,
  disabled,
  keyboardType = 'default',
  multiline,
  numberOfLines,
  style,
  containerStyle,
  autoFocus,
  icon,
  autoCapitalize,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  accessibilityLabel,
  onBlur,
  onFocus,
}: InputProps) => {
  const [focused, setFocused] = React.useState(false);
  const showError = !!error && (touched ?? true);

  return (
    <View style={[styles.inputWrapper, containerStyle || style]}>
      {label ? (
        <Text style={styles.inputLabel}>
          {label}
          {required ? <Text style={styles.requiredMark}> *</Text> : null}
        </Text>
      ) : null}
      {hint && !showError ? <Text style={styles.inputHint}>{hint}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          showError && styles.inputRowError,
          disabled && styles.inputRowDisabled,
        ]}
      >
        {icon ? (
          <View style={styles.inputIconBox}>
            <Ionicons name={icon} size={18} color={showError ? Colors.danger : Colors.textSecondary} />
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={!disabled}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled: !!disabled }}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          style={[
            styles.input,
            icon && { paddingLeft: 44 },
            multiline && {
              height: (numberOfLines ?? 3) * (Typography.base + 6),
              textAlignVertical: 'top',
              paddingTop: Spacing.md,
            },
            disabled && styles.inputDisabled,
          ]}
        />
      </View>
      {showError ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
});

// ─── SearchBar ────────────────────────────────────────────────────────────────

export const SearchBar = React.memo(({
  value,
  onChangeText,
  placeholder = 'Search...',
  hint,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  accessibilityLabel?: string;
}) => {
  const [focused, setFocused] = React.useState(false);
  const handleClear = React.useCallback(() => onChangeText(''), [onChangeText]);
  return (
    <View>
      <View style={[styles.searchBar, Shadow.sm, focused && styles.searchBarFocused]}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel={accessibilityLabel ?? placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {hint ? <Text style={styles.searchHint}>{hint}</Text> : null}
    </View>
  );
});

// ─── SectionHeader ────────────────────────────────────────────────────────────

export const SectionHeader = React.memo(({ title, right, icon }: {
  title: string; right?: React.ReactNode; icon?: keyof typeof Ionicons.glyphMap;
}) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        {icon && <Ionicons name={icon} size={18} color={Colors.amber} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

export const EmptyState = React.memo(({ icon, message }: { icon: keyof typeof Ionicons.glyphMap; message: string }) => {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Ionicons name={icon} size={40} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export const Skeleton = React.memo(({ width, height, borderRadius = Radius.sm, style }: {
  width?: any; height?: any; borderRadius?: number; style?: ViewStyle;
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[{
      width: width ?? '100%',
      height: height ?? 20,
      borderRadius,
      backgroundColor: Colors.borderLight,
      opacity,
    }, style]} />
  );
});

const SKELETON_ARRAY_6 = [...Array(6)];

export const ListSkeleton = React.memo(({ count = 6 }: { count?: number }) => {
  const items = count === 6 ? SKELETON_ARRAY_6 : [...Array(count)];
  return (
    <View style={{ padding: Spacing.lg }}>
      {items.map((_, i) => (
        <View key={i} style={[styles.gradCard, { padding: Spacing.md, marginBottom: Spacing.md, borderColor: Colors.border + '33' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
            <Skeleton width="40%" height={18} />
            <Skeleton width="20%" height={18} />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Skeleton width="25%" height={14} />
            <Skeleton width="15%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
});

export const DashboardSkeleton = React.memo(({ message }: { message?: string }) => {
  return (
    <View style={{ flex: 1, padding: Spacing.xl, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadow.md, marginBottom: Spacing.xl }}>
        <ActivityIndicator color={Colors.amber} size="large" />
      </View>
      
      {message && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ 
            color: Colors.textPrimary, 
            fontSize: Typography.base, 
            fontWeight: '800', 
            letterSpacing: 1,
            marginBottom: 8 
          }}>
            {message.toUpperCase()}
          </Text>
          <Text style={{ 
            color: Colors.textMuted, 
            fontSize: Typography.xs,
            textAlign: 'center',
            paddingHorizontal: Spacing.xl 
          }}>
            Setting up your secure workspace
          </Text>
        </View>
      )}
    </View>
  );
});

/** @deprecated Use specialized skeletons instead */
export const LoadingState = React.memo(() => {
  return (
    <View style={styles.emptyState}>
      <ActivityIndicator size="large" color={Colors.amber} />
      <Text style={[styles.emptyText, { marginTop: Spacing.md }]}>Loading...</Text>
    </View>
  );
});

// ─── StatCard ─────────────────────────────────────────────────────────────────

export const StatCard = React.memo(({ label, value, icon, color, gradient }: {
  label: string; value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient?: readonly [string, string];
}) => {
  return (
    <LinearGradient
      colors={gradient ?? [Colors.surface, Colors.surface2]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.statCard}
    >
      <View style={[styles.statIconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );
});

// ─── QuickCreateCard ──────────────────────────────────────────────────────────

interface QuickCreateCardProps {
  title: string;
  searchTerm: string;
  onPress: () => void;
  loading?: boolean;
}

export const QuickCreateCard = React.memo(({ title, searchTerm, onPress, loading }: QuickCreateCardProps) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      delayPressIn={0}
      activeOpacity={1} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={loading}
    >
      <Animated.View style={[styles.quickCreateCard, Shadow.md, { transform: [{ scale }] }]}>
        <LinearGradient 
          colors={Gradients.amber} 
          style={styles.quickCreateIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={20} color={Colors.white} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickCreateTag}>NOT FOUND IN LIST</Text>
          <Text style={styles.quickCreateLabel} numberOfLines={1}>
            Create <Text style={{ color: Colors.amber }}>"{searchTerm}"</Text>
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.amber} />
        ) : (
          <View style={styles.quickCreateBadge}>
            <Text style={styles.quickCreateBadgeText}>QUICK ADD</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.amber} />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── RowItem ──────────────────────────────────────────────────────────────────

export const RowItem = React.memo(({ label, value, valueColor, icon }: {
  label: string; value: string;
  valueColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) => {
  return (
    <View style={styles.rowItem}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        {icon && <Ionicons name={icon} size={15} color={Colors.textMuted} />}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
});

// ─── ModernToast ──────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
}

export const ModernToast = React.memo(({ message, type = 'success', visible, onHide }: ToastProps) => {
  const insets = useSafeAreaInsets();
  const translateY = React.useRef(new Animated.Value(-150)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    let timer: any = null;
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: insets.top + 10, useNativeDriver: true, tension: 40, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      timer = setTimeout(() => {
        hide();
      }, 3500);
    } else {
      hide();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, insets.top]);

  const hide = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -150, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [onHide]);

  if (!visible && (opacity as any)._value === 0) return null;

  const config = {
    success: { colors: Gradients.success, icon: 'checkmark-circle' as const },
    error:   { colors: Gradients.danger,  icon: 'alert-circle' as const },
    info:    { colors: Gradients.info,    icon: 'information-circle' as const },
  }[type];

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY }], opacity }]}>
      <LinearGradient colors={config.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.toast}>
        <Ionicons name={config.icon} size={20} color={Colors.white} />
        <Text style={styles.toastText}>{message}</Text>
      </LinearGradient>
    </Animated.View>
  );
});

// ─── Divider ─────────────────────────────────────────────────────────────────

export const Divider = React.memo(() => {
  return <View style={styles.divider} />;
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  badgeDot:  { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  gradCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: Colors.surface,
  },

  btn: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText:  { fontWeight: Typography.bold, letterSpacing: 0.3 },

  inputWrapper: { marginBottom: Spacing.md },
  inputLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  requiredMark: { color: Colors.danger },
  inputHint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  inputError: {
    fontSize: Typography.xs,
    color: Colors.danger,
    marginTop: Spacing.xs,
    fontWeight: Typography.semibold,
  },
  inputRow: {
    position: 'relative',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputRowFocused: {
    borderColor: Colors.amber,
    borderWidth: 1.5,
  },
  inputRowError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  inputRowDisabled: {
    backgroundColor: Colors.surface2,
    opacity: 0.75,
  },
  inputIconBox: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    minHeight: 48,
  },
  inputDisabled: { color: Colors.textMuted },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.xs,
  },
  searchBarFocused: {
    borderColor: Colors.amber,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary, minHeight: 24 },
  searchHint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tight,
  },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xxxl * 2,
  },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    ...Shadow.sm,
  },
  emptyText: {
    fontSize: Typography.sm, color: Colors.textSecondary,
    textAlign: 'center', letterSpacing: 0.5,
  },


  statCard: {
    flex: 1, borderRadius: Radius.xl, padding: Spacing.lg,
    alignItems: 'flex-start', ...Shadow.clay,
  },
  statIconBox: {
    width: 38, height: 38, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.black, marginBottom: 2 },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, letterSpacing: 0.5 },

  rowItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  rowLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  rowValue: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },

  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.lg },


  toastContainer: {
    position: 'absolute',
    top: 0, left: Spacing.xl, right: Spacing.xl,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 200,
    ...Shadow.md,
  },
  toastText: {
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  quickCreateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 191, 0, 0.2)',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  quickCreateIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  quickCreateTag: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  quickCreateLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  quickCreateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.amber + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  quickCreateBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.amber,
  },
});
