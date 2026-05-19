import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { registerAppDialog } from '@/lib/common/utils/appAlert';

export type DialogVariant = 'info' | 'success' | 'error' | 'warning' | 'confirm';

export interface DialogButton {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'text';
  loading?: boolean;
}

export interface DialogConfig {
  title: string;
  message?: string;
  variant?: DialogVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  buttons?: DialogButton[];
  dismissable?: boolean;
}

interface DialogState extends DialogConfig {
  visible: boolean;
  resolve?: (index: number) => void;
}

interface AppDialogContextValue {
  show: (config: DialogConfig) => Promise<number>;
  alert: (title: string, message?: string, variant?: DialogVariant) => Promise<void>;
  confirm: (title: string, message?: string) => Promise<boolean>;
  hide: () => void;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

const VARIANT_META: Record<
  DialogVariant,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  info: { icon: 'information-circle', color: Colors.info, bg: Colors.infoBg },
  success: { icon: 'checkmark-circle', color: Colors.success, bg: Colors.successBg },
  error: { icon: 'close-circle', color: Colors.danger, bg: Colors.dangerBg },
  warning: { icon: 'warning', color: Colors.amberDim, bg: Colors.amberBg },
  confirm: { icon: 'help-circle', color: Colors.amber, bg: Colors.amberBg },
};

function AppDialogModal({
  state,
  onClose,
  onButton,
}: {
  state: DialogState;
  onClose: () => void;
  onButton: (index: number, btn: DialogButton) => void;
}) {
  const { t } = useLanguage();
  const variant = state.variant ?? 'info';
  const meta = VARIANT_META[variant];
  const iconName = state.icon ?? meta.icon;

  const buttons: DialogButton[] =
    state.buttons ??
    (variant === 'confirm'
      ? [
          { label: t('cancel'), variant: 'secondary' },
          { label: t('confirm'), variant: 'primary' },
        ]
      : [{ label: t('ok') || 'OK', variant: 'primary' }]);

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (state.dismissable !== false) onClose();
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (state.dismissable !== false) onClose();
        }}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
            <Ionicons name={iconName} size={32} color={meta.color} />
          </View>
          <Text style={styles.title}>{state.title}</Text>
          {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
          <View style={styles.actions}>
            {buttons.map((btn, index) => {
              const isPrimary = btn.variant === 'primary' || (!btn.variant && index === buttons.length - 1);
              const isDanger = btn.variant === 'danger';
              const isSecondary = btn.variant === 'secondary' || btn.variant === 'text';
              return (
                <Pressable
                  key={`${btn.label}-${index}`}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    isPrimary && styles.actionPrimary,
                    isDanger && styles.actionDanger,
                    isSecondary && styles.actionSecondary,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => onButton(index, btn)}
                  disabled={btn.loading}
                >
                  {btn.loading ? (
                    <ActivityIndicator size="small" color={isPrimary || isDanger ? Colors.white : Colors.amber} />
                  ) : (
                    <Text
                      style={[
                        styles.actionText,
                        isPrimary && styles.actionTextPrimary,
                        isDanger && styles.actionTextPrimary,
                        isSecondary && styles.actionTextSecondary,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [state, setState] = useState<DialogState | null>(null);

  const hide = useCallback(() => {
    setState((s) => (s ? { ...s, visible: false } : null));
    setTimeout(() => setState(null), 220);
  }, []);

  const show = useCallback((config: DialogConfig): Promise<number> => {
    return new Promise((resolve) => {
      setState({
        ...config,
        visible: true,
        dismissable: config.dismissable ?? true,
        resolve,
      });
    });
  }, []);

  const alert = useCallback(
    async (title: string, message?: string, variant: DialogVariant = 'info') => {
      await show({
        title,
        message,
        variant,
        buttons: [{ label: t('ok') || 'OK', variant: 'primary' }],
      });
    },
    [show, t],
  );

  const confirm = useCallback(
    async (title: string, message?: string) => {
      const index = await show({
        title,
        message,
        variant: 'confirm',
        buttons: [
          { label: t('cancel'), variant: 'secondary' },
          { label: t('confirm'), variant: 'primary' },
        ],
      });
      return index === 1;
    },
    [show, t],
  );

  const handleButton = useCallback(
    (index: number, btn: DialogButton) => {
      btn.onPress?.();
      state?.resolve?.(index);
      hide();
    },
    [state, hide],
  );

  const handleClose = useCallback(() => {
    state?.resolve?.(-1);
    hide();
  }, [state, hide]);

  const value = useMemo(
    () => ({ show, alert, confirm, hide }),
    [show, alert, confirm, hide],
  );

  React.useEffect(() => {
    registerAppDialog({ alert, confirm });
    return () => registerAppDialog(null);
  }, [alert, confirm]);

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      {state ? (
        <AppDialogModal state={state} onClose={handleClose} onButton={handleButton} />
      ) : null}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog(): AppDialogContextValue {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 28,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadow.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
    paddingHorizontal: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    width: '100%',
  },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  actionPrimary: {
    backgroundColor: Colors.amber,
    ...Shadow.sm,
  },
  actionDanger: {
    backgroundColor: Colors.danger,
  },
  actionSecondary: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  actionTextPrimary: {
    color: Colors.white,
  },
  actionTextSecondary: {
    color: Colors.textSecondary,
  },
});
