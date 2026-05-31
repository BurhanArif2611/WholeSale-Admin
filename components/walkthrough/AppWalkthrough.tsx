import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WalkthroughColors, WalkthroughGradients } from '@/constants/walkthroughTheme';
import { Radius, Spacing, Typography, Fonts } from '@/constants/theme';
import {
  ClientsWalkthroughMockup,
  ProductsWalkthroughMockup,
  OrderWalkthroughMockup,
  LedgerWalkthroughMockup,
} from '@/components/walkthrough/WalkthroughMockups';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface WalkthroughSlide {
  id: string;
  titleKey: string;
  descriptionKey: string;
  features: { icon: keyof typeof Ionicons.glyphMap; labelKey: string }[];
  Illustration: React.ComponentType;
}

export const WALKTHROUGH_SLIDES: WalkthroughSlide[] = [
  {
    id: 'clients',
    titleKey: 'walkthrough_clients_title',
    descriptionKey: 'walkthrough_clients_desc',
    features: [
      { icon: 'person-add-outline', labelKey: 'walkthrough_feat_quick_client' },
      { icon: 'call-outline', labelKey: 'walkthrough_feat_phone' },
      { icon: 'search-outline', labelKey: 'walkthrough_feat_search' },
      { icon: 'repeat-outline', labelKey: 'walkthrough_feat_repeat' },
    ],
    Illustration: ClientsWalkthroughMockup,
  },
  {
    id: 'products',
    titleKey: 'walkthrough_products_title',
    descriptionKey: 'walkthrough_products_desc',
    features: [
      { icon: 'cube-outline', labelKey: 'walkthrough_feat_quick_product' },
      { icon: 'scale-outline', labelKey: 'walkthrough_feat_loose_qty' },
      { icon: 'layers-outline', labelKey: 'walkthrough_feat_inventory' },
      { icon: 'barcode-outline', labelKey: 'walkthrough_feat_product_search' },
    ],
    Illustration: ProductsWalkthroughMockup,
  },
  {
    id: 'orders',
    titleKey: 'walkthrough_orders_title',
    descriptionKey: 'walkthrough_orders_desc',
    features: [
      { icon: 'flash-outline', labelKey: 'walkthrough_feat_instant' },
      { icon: 'cart-outline', labelKey: 'walkthrough_feat_checkout' },
      { icon: 'pricetag-outline', labelKey: 'walkthrough_feat_discount' },
      { icon: 'share-outline', labelKey: 'walkthrough_feat_receipt' },
    ],
    Illustration: OrderWalkthroughMockup,
  },
  {
    id: 'ledger',
    titleKey: 'walkthrough_ledger_title',
    descriptionKey: 'walkthrough_ledger_desc',
    features: [
      { icon: 'time-outline', labelKey: 'walkthrough_feat_payment_history' },
      { icon: 'wallet-outline', labelKey: 'walkthrough_feat_pending' },
      { icon: 'stats-chart-outline', labelKey: 'walkthrough_feat_reports' },
      { icon: 'list-outline', labelKey: 'walkthrough_feat_transactions' },
    ],
    Illustration: LedgerWalkthroughMockup,
  },
];

interface AppWalkthroughProps {
  t: (key: string) => string;
  onComplete: () => void;
  onSkip: () => void;
}

export function AppWalkthrough({ t, onComplete, onSkip }: AppWalkthroughProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === WALKTHROUGH_SLIDES.length - 1;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i >= 0 && i < WALKTHROUGH_SLIDES.length) setIndex(i);
  }, []);

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const progress = (index + 1) / WALKTHROUGH_SLIDES.length;

  const renderSlide = ({ item }: { item: WalkthroughSlide }) => {
    const Illustration = item.Illustration;
    return (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <View style={styles.illustrationWrap}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.12)', 'transparent']}
            style={styles.glowOrb}
          />
          <Illustration />
        </View>
      </View>
    );
  };

  const slide = WALKTHROUGH_SLIDES[index];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={WalkthroughGradients.hero} style={StyleSheet.absoluteFill} />

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.brandRow}>
          <LinearGradient colors={WalkthroughGradients.amber} style={styles.brandIcon}>
            <Ionicons name="storefront" size={18} color={WalkthroughColors.bg} />
          </LinearGradient>
          <Text style={styles.brandText}>Wholesale Admin</Text>
        </View>
        <Pressable onPress={onSkip} hitSlop={12} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('walkthrough_skip')}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={WALKTHROUGH_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.pager}
        getItemLayout={(_, i) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * i,
          index: i,
        })}
      />

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.dots}>
          {WALKTHROUGH_SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <Text style={styles.title}>{t(slide.titleKey)}</Text>
        <Text style={styles.description}>{t(slide.descriptionKey)}</Text>

        <View style={styles.features}>
          {slide.features.map((f) => (
            <View key={f.labelKey} style={styles.featureChip}>
              <Ionicons name={f.icon} size={14} color={WalkthroughColors.amberLight} />
              <Text style={styles.featureText}>{t(f.labelKey)}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.cta} onPress={goNext}>
          <LinearGradient colors={WalkthroughGradients.amber} style={styles.ctaGradient}>
            <Text style={styles.ctaText}>
              {isLast ? t('walkthrough_get_started') : t('walkthrough_next')}
            </Text>
            <Ionicons
              name={isLast ? 'rocket-outline' : 'arrow-forward'}
              size={20}
              color={WalkthroughColors.bg}
            />
          </LinearGradient>
        </Pressable>

        {isLast ? (
          <Text style={styles.loginHint}>{t('walkthrough_login_hint')}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WalkthroughColors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: WalkthroughColors.textPrimary,
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
  },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  skipText: {
    color: WalkthroughColors.textMuted,
    fontSize: Typography.sm,
    fontFamily: Fonts.semibold,
  },
  pager: { flex: 1 },
  slide: { flex: 1 },
  illustrationWrap: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  glowOrb: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    height: 180,
    borderRadius: 90,
  },
  bottom: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: WalkthroughColors.border,
    backgroundColor: WalkthroughColors.glass,
  },
  progressTrack: {
    height: 3,
    backgroundColor: WalkthroughColors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: WalkthroughColors.amber,
    borderRadius: 2,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WalkthroughColors.surfaceElevated,
  },
  dotActive: {
    width: 20,
    backgroundColor: WalkthroughColors.amber,
  },
  title: {
    color: WalkthroughColors.textPrimary,
    fontSize: Typography.lg,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    color: WalkthroughColors.textSecondary,
    fontSize: Typography.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: WalkthroughColors.surface,
    borderWidth: 1,
    borderColor: WalkthroughColors.border,
  },
  featureText: {
    color: WalkthroughColors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.semibold,
  },
  cta: { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.sm },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  ctaText: {
    color: WalkthroughColors.bg,
    fontSize: Typography.md,
    fontFamily: Fonts.bold,
  },
  loginHint: {
    textAlign: 'center',
    color: WalkthroughColors.textMuted,
    fontSize: Typography.xs,
    marginTop: Spacing.xs,
  },
});
