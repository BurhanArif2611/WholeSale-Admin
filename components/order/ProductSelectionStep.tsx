import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryChips } from '@/lib/common/components/CategoryChips';
import { CompactProductRow } from '@/components/order/CompactProductRow';
import { OrderCartSheet } from '@/components/order/OrderCartSheet';
import { ProductQtySheet } from '@/components/order/ProductQtySheet';
import { ProductSelectionMoreSheet } from '@/components/order/ProductSelectionMoreSheet';
import { InlineQuickAddProductCard } from '@/components/order/InlineQuickAddProductCard';
import { Colors, Spacing, Radius, Shadow, Gradients, formatCurrency, Typography, Layout, Fonts } from '@/constants/theme';
import {
  findCartLineByProductId,
  type CartLineInput,
} from '@/lib/common/utils/cart';
import { formatQuantityDisplay } from '@/lib/common/utils/quantity';
import type { Category, Client, Product, ProductSortField, SortDirection } from '@/lib/domain/models';

const SORT_OPTIONS: { field: ProductSortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'price', label: 'Price' },
  { field: 'stock', label: 'Stock' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function configureExpandAnimation() {
  LayoutAnimation.configureNext(LayoutAnimation.create(280, 'easeInEaseOut', 'opacity'));
}

interface ProductSelectionStepProps {
  selectedClient: Client | null;
  products: Product[];
  recentProducts: Product[];
  categories: Category[];
  cart: CartLineInput[];
  search: string;
  onSearchChange: (v: string) => void;
  categoryId: string | null;
  onCategorySelect: (id: string | null) => void;
  sortBy: ProductSortField;
  sortDir: SortDirection;
  onSortChange: (field: ProductSortField, dir: SortDirection) => void;
  loading: boolean;
  onRefresh: () => void;
  isInstant: boolean;
  itemsTotal: number;
  totalItems: number;
  onAddToCart: (product: Product) => void;
  onChangeQty: (lineId: string, delta: number) => void;
  onSetLineQty: (
    lineId: string,
    quantity: number,
    orderUnit: CartLineInput['order_unit'],
    discountPercent: number,
    needsApproval: boolean,
  ) => void;
  onRemoveLine: (lineId: string) => void;
  onNext: () => void;
  onShowProductSheet: () => void;
  onQuickAddProduct?: (prefillName?: string) => void;
  onProductCreated?: (product: Product) => void;
  onShowTempSheet: () => void;
  onRepeatLast: () => void;
  noProductsFound: boolean;
  t: (key: string) => string;
  showAllCategories?: boolean;
  onShowAllCategoriesChange?: (value: boolean) => void;
  hasPreferredCategories?: boolean;
}

export function ProductSelectionStep({
  selectedClient,
  products,
  recentProducts,
  categories,
  cart,
  search,
  onSearchChange,
  categoryId,
  onCategorySelect,
  sortBy,
  sortDir,
  onSortChange,
  loading,
  onRefresh,
  isInstant,
  itemsTotal,
  totalItems,
  onAddToCart,
  onChangeQty,
  onSetLineQty,
  onRemoveLine,
  onNext,
  onShowProductSheet,
  onQuickAddProduct,
  onProductCreated,
  onShowTempSheet,
  onRepeatLast,
  noProductsFound,
  t,
  showAllCategories = true,
  onShowAllCategoriesChange,
  hasPreferredCategories = false,
}: ProductSelectionStepProps) {
  const insets = useSafeAreaInsets();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(recentProducts.length > 0);
  const [cartOpen, setCartOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [qtyProduct, setQtyProduct] = useState<Product | null>(null);
  const [qtyLine, setQtyLine] = useState<CartLineInput | null>(null);
  const [inlineQuickAddOpen, setInlineQuickAddOpen] = useState(false);
  const [pendingQtyProduct, setPendingQtyProduct] = useState<Product | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = React.useRef<FlatList<Product>>(null);
  const quickAddOffsetRef = React.useRef(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToQuickAdd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: Math.max(0, quickAddOffsetRef.current - Spacing.xs),
        animated,
      });
    });
  }, []);

  const openInlineQuickAdd = useCallback((prefill?: string) => {
    if (prefill?.trim()) onSearchChange(prefill.trim());
    configureExpandAnimation();
    setInlineQuickAddOpen(true);
    scrollToQuickAdd(true);
  }, [onSearchChange, scrollToQuickAdd]);

  const openQtySheet = useCallback((product: Product) => {
    const line = findCartLineByProductId(cart, product.id);
    if (!line) return;
    setQtyProduct(product);
    setQtyLine(line);
  }, [cart]);

  const cartCount = cart.length;
  const checkoutBottom = insets.bottom + 56;
  const searchTrim = search.trim();
  const hasExactProductMatch =
    searchTrim.length >= 2 &&
    products.some((p) => p.name.toLowerCase() === searchTrim.toLowerCase());
  const showCreateOffer =
    !!onProductCreated && searchTrim.length >= 2 && !hasExactProductMatch;
  const showCreateInHeader = showCreateOffer && products.length > 0;
  const showCreateInEmpty = showCreateOffer && products.length === 0 && !loading;
  const showQuickProductFab = !!onProductCreated && !showCreateOffer && !inlineQuickAddOpen;
  const showQuickAddFormInHeader = inlineQuickAddOpen && !!onProductCreated && !showCreateInEmpty;

  const openQuickAdd = useCallback((prefill?: string) => {
    if (onProductCreated) {
      openInlineQuickAdd(prefill ?? searchTrim);
      return;
    }
    if (onQuickAddProduct) onQuickAddProduct(prefill ?? searchTrim);
    else onShowProductSheet();
  }, [onProductCreated, openInlineQuickAdd, searchTrim, onQuickAddProduct, onShowProductSheet]);

  const handleInlineProductCreated = useCallback((product: Product) => {
    onProductCreated?.(product);
    setInlineQuickAddOpen(false);
    setPendingQtyProduct(product);
    onSearchChange('');
  }, [onProductCreated, onSearchChange]);

  useEffect(() => {
    if (!pendingQtyProduct) return;
    const line = findCartLineByProductId(cart, pendingQtyProduct.id);
    if (line) {
      setQtyProduct(pendingQtyProduct);
      setQtyLine(line);
      setPendingQtyProduct(null);
    }
  }, [cart, pendingQtyProduct]);

  useEffect(() => {
    if (inlineQuickAddOpen && hasExactProductMatch) {
      setInlineQuickAddOpen(false);
    }
  }, [hasExactProductMatch, inlineQuickAddOpen]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const line = findCartLineByProductId(cart, item.id);
      const qty = line?.quantity ?? 0;
      return (
        <CompactProductRow
          product={item}
          cartQty={qty}
          orderUnit={line?.order_unit}
          onAdd={() => onAddToCart(item)}
          onIncrement={() => line && onChangeQty(line.line_id, 1)}
          onDecrement={() => line && onChangeQty(line.line_id, -1)}
          onOpenDetail={() => (line ? openQtySheet(item) : onAddToCart(item))}
        />
      );
    },
    [cart, onAddToCart, onChangeQty, openQtySheet],
  );

  const ListHeader = useMemo(
    () => (
      <>
        {selectedClient ? (
        <Pressable style={styles.clientStrip} onPress={() => setFiltersOpen((v) => !v)}>
          <Ionicons name="person-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.clientName} numberOfLines={1}>
            {selectedClient.name}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
        </Pressable>
      ) : null}

      {hasPreferredCategories && onShowAllCategoriesChange ? (
        <Pressable
          style={styles.showAllRow}
          onPress={() => onShowAllCategoriesChange(!showAllCategories)}
        >
          <Ionicons
            name={showAllCategories ? 'checkbox' : 'square-outline'}
            size={18}
            color={showAllCategories ? Colors.amber : Colors.textMuted}
          />
          <Text style={styles.showAllText}>{t('show_all_categories')}</Text>
        </Pressable>
      ) : null}

      {showCreateInHeader ? (
        <View
          onLayout={(e) => {
            quickAddOffsetRef.current = e.nativeEvent.layout.y;
          }}
        >
          {!inlineQuickAddOpen ? (
            <Pressable style={styles.createInlineRow} onPress={() => openQuickAdd(searchTrim)}>
              <View style={styles.createInlineIcon}>
                <Ionicons name="add-circle" size={24} color={Colors.amber} />
              </View>
              <View style={styles.createInlineText}>
                <Text style={styles.createInlineTitle}>
                  {t('create_product_instantly').replace('{name}', searchTrim)}
                </Text>
                <Text style={styles.createInlineSub}>{t('quick_add_incomplete_hint')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.amber} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showQuickAddFormInHeader ? (
        <View
          onLayout={(e) => {
            quickAddOffsetRef.current = e.nativeEvent.layout.y;
          }}
        >
          <InlineQuickAddProductCard
            expanded={inlineQuickAddOpen}
            initialName={searchTrim}
            onCreated={handleInlineProductCreated}
            onCollapse={() => {
              configureExpandAnimation();
              setInlineQuickAddOpen(false);
            }}
            onExpandComplete={() => scrollToQuickAdd(true)}
            onFieldFocus={() => scrollToQuickAdd(true)}
            t={t}
          />
        </View>
      ) : null}

      {filtersOpen ? (
        <View style={styles.filtersPanel}>
          <CategoryChips
            categories={categories}
            selectedId={categoryId}
            onSelect={onCategorySelect}
            allLabel={t('all_categories')}
          />
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.field;
              return (
                <TouchableOpacity
                  key={opt.field}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  onPress={() =>
                    onSortChange(
                      opt.field,
                      active ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc',
                    )
                  }
                >
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                    {opt.label}
                    {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.chipsOnly}>
          <CategoryChips
            categories={categories}
            selectedId={categoryId}
            onSelect={onCategorySelect}
            allLabel={t('all_categories')}
          />
        </View>
      )}

      {recentOpen && recentProducts.length > 0 ? (
        <View style={styles.recentBar}>
          <Text style={styles.recentLabel}>{t('recent_products')}</Text>
          <FlatList
            horizontal
            data={recentProducts}
            keyExtractor={(p) => `r-${p.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentScroll}
            renderItem={({ item: p }) => (
              <TouchableOpacity style={styles.recentChip} onPress={() => onAddToCart(p)}>
                <Text style={styles.recentName} numberOfLines={1}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={() => setRecentOpen(false)} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : recentProducts.length > 0 ? (
        <TouchableOpacity style={styles.showRecent} onPress={() => setRecentOpen(true)}>
          <Ionicons name="time-outline" size={14} color={Colors.amber} />
          <Text style={styles.showRecentText}>{t('recent_products')}</Text>
        </TouchableOpacity>
      ) : null}
      </>
    ),
    [
      selectedClient,
      filtersOpen,
      hasPreferredCategories,
      onShowAllCategoriesChange,
      showAllCategories,
      showCreateInHeader,
      showQuickAddFormInHeader,
      inlineQuickAddOpen,
      searchTrim,
      handleInlineProductCreated,
      scrollToQuickAdd,
      categories,
      categoryId,
      onCategorySelect,
      sortBy,
      sortDir,
      onSortChange,
      recentOpen,
      recentProducts,
      onAddToCart,
      t,
      openQuickAdd,
    ],
  );

  const listBottomPadding =
    checkoutBottom +
    (showQuickProductFab ? 72 : 0) +
    (inlineQuickAddOpen ? Spacing.xl : 0) +
    (keyboardVisible ? 120 : 0);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 96 : 0}
    >
      {/* Sticky compact toolbar: search + filter + cart */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder={t('search_products')}
            placeholderTextColor={Colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.toolBtn, filtersOpen && styles.toolBtnActive]}
          onPress={() => setFiltersOpen((v) => !v)}
        >
          <Ionicons name="options-outline" size={20} color={filtersOpen ? Colors.amber : Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => setCartOpen(true)}>
          <Ionicons name="cart" size={22} color={Colors.amber} />
          {cartCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Product list — scrollable body includes quick-add form in header */}
      <FlatList
        ref={listRef}
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.amber} style={{ marginTop: 40 }} />
          ) : showCreateInEmpty ? (
            <View
              style={styles.empty}
              onLayout={(e) => {
                quickAddOffsetRef.current = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="alert-circle-outline" size={36} color={Colors.amber} />
              </View>
              <Text style={styles.emptyTitle}>{t('no_product_found_title')}</Text>
              {!inlineQuickAddOpen ? (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => openQuickAdd(searchTrim)}>
                  <Ionicons name="add" size={18} color={Colors.white} />
                  <Text style={styles.emptyBtnText}>
                    {t('create_product_instantly').replace('{name}', searchTrim)}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {inlineQuickAddOpen ? (
                <InlineQuickAddProductCard
                  expanded={inlineQuickAddOpen}
                  initialName={searchTrim}
                  onCreated={handleInlineProductCreated}
                  onCollapse={() => {
                    configureExpandAnimation();
                    setInlineQuickAddOpen(false);
                  }}
                  onExpandComplete={() => scrollToQuickAdd(true)}
                  onFieldFocus={() => scrollToQuickAdd(true)}
                  t={t}
                />
              ) : null}
            </View>
          ) : noProductsFound ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="alert-circle-outline" size={36} color={Colors.amber} />
              </View>
              <Text style={styles.emptyTitle}>{t('no_product_found_title')}</Text>
              <Text style={styles.emptyHint}>{t('no_product_empty_hint')}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{t('no_products')}</Text>
            </View>
          )
        }
        refreshing={loading}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: listBottomPadding, flexGrow: 1 }}
        showsVerticalScrollIndicator
        initialNumToRender={14}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android' && !inlineQuickAddOpen}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      />

      {/* Floating cart pill */}
      {cartCount > 0 ? (
        <Pressable style={[styles.floatingCart, { bottom: checkoutBottom + 8 }]} onPress={() => setCartOpen(true)}>
          <Ionicons name="cart" size={18} color={Colors.white} />
          <Text style={styles.floatingCartText}>
            {cartCount} {t('items_label') || 'items'} · {formatCurrency(itemsTotal)}
          </Text>
          <Ionicons name="chevron-up" size={16} color={Colors.white} />
        </Pressable>
      ) : null}

      {/* Sticky checkout bar */}
      <View style={[styles.checkoutBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <View style={styles.checkoutMeta}>
          <Text style={styles.checkoutItems}>
            {formatQuantityDisplay(totalItems)} {t('items_label') || 'items'}
          </Text>
          <Text style={styles.checkoutTotal}>{formatCurrency(itemsTotal)}</Text>
        </View>
        <Pressable onPress={onNext} disabled={cart.length === 0} style={cart.length === 0 && styles.checkoutDisabled}>
          <LinearGradient
            colors={cart.length === 0 ? [Colors.border, Colors.border] : Gradients.amber}
            style={styles.checkoutBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.checkoutBtnText}>{t('checkout') || 'Checkout'}</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Single Quick Product entry — hidden while search offers inline create */}
      {showQuickProductFab ? (
        <TouchableOpacity
          style={[styles.fabQuick, { bottom: checkoutBottom + 64 }]}
          onPress={() => openInlineQuickAdd(searchTrim)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
          <Text style={styles.fabQuickLabel}>{t('quick_product_fab')}</Text>
        </TouchableOpacity>
      ) : null}

      {/* FAB — more options (non-instant flow only) */}
      {!onProductCreated ? (
        <TouchableOpacity
          style={[styles.fab, { bottom: checkoutBottom + 64 }]}
          onPress={() => setMoreOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={Colors.white} />
        </TouchableOpacity>
      ) : null}

      <OrderCartSheet
        visible={cartOpen}
        cart={cart}
        itemsTotal={itemsTotal}
        onClose={() => setCartOpen(false)}
        onEditLine={(line) => {
          setCartOpen(false);
          const p = products.find((x) => x.id === line.product_id);
          if (p) openQtySheet(p);
        }}
        onRemoveLine={onRemoveLine}
        onCheckout={() => {
          setCartOpen(false);
          onNext();
        }}
        t={t}
      />

      <ProductQtySheet
        visible={!!qtyProduct && !!qtyLine}
        product={qtyProduct}
        line={qtyLine}
        onClose={() => {
          setQtyProduct(null);
          setQtyLine(null);
        }}
        onApply={onSetLineQty}
        onRemove={onRemoveLine}
        t={t}
      />

      {!onProductCreated ? (
        <ProductSelectionMoreSheet
          visible={moreOpen}
          isInstant={isInstant}
          onClose={() => setMoreOpen(false)}
          onAddProduct={onShowProductSheet}
          onAddTemp={onShowTempSheet}
          onRepeatLast={onRepeatLast}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          filtersVisible={filtersOpen}
          t={t}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    paddingVertical: 0,
    marginLeft: Spacing.xs,
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface2,
  },
  toolBtnActive: { backgroundColor: Colors.amberBg, borderWidth: 1, borderColor: Colors.amber + '55' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontFamily: Fonts.bold, color: Colors.white },
  clientStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.surface2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  clientName: { flex: 1, fontSize: Typography.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  showAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  showAllText: { fontSize: Typography.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  chipsOnly: { paddingHorizontal: Spacing.sm, paddingBottom: 2 },
  filtersPanel: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.surface2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.xs },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  sortChipText: { fontSize: 10, color: Colors.textMuted, fontFamily: Fonts.semibold },
  sortChipTextActive: { color: Colors.amberDim },
  recentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.sm,
    paddingVertical: 4,
    gap: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  recentLabel: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.textMuted },
  recentScroll: { gap: 6, paddingRight: Spacing.sm },
  recentChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.full,
    maxWidth: 120,
  },
  recentName: { fontSize: 11, fontFamily: Fonts.semibold, color: Colors.amberDim },
  showRecent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  showRecentText: { fontSize: 11, color: Colors.amber, fontFamily: Fonts.semibold },
  createInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.amber + '88',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  createInlineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createInlineText: { flex: 1 },
  createInlineTitle: { fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.textPrimary },
  createInlineSub: { fontSize: 11, color: Colors.amberDim, marginTop: 2, lineHeight: 15 },
  empty: { alignItems: 'center', padding: Spacing.xl, width: '100%' },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.base,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  emptyText: { color: Colors.textMuted, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: Colors.amber,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    maxWidth: '100%',
  },
  emptyBtnText: { color: Colors.white, fontFamily: Fonts.bold, textAlign: 'center', flexShrink: 1 },
  floatingCart: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  floatingCartText: { color: Colors.white, fontSize: Typography.sm, fontFamily: Fonts.bold },
  checkoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.md,
    gap: Spacing.md,
  },
  checkoutMeta: { flex: 1 },
  checkoutItems: { fontSize: Typography.xs, color: Colors.textMuted },
  checkoutTotal: { fontSize: Typography.md, fontFamily: Fonts.bold, color: Colors.textPrimary },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  checkoutBtnText: { color: Colors.white, fontFamily: Fonts.bold, fontSize: Typography.sm },
  checkoutDisabled: { opacity: 0.5 },
  fabQuick: {
    position: 'absolute',
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.amber,
    ...Shadow.amber,
  },
  fabQuickLabel: {
    fontSize: Typography.xs,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  fab: {
    position: 'absolute',
    right: Spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.amber,
  },
});
