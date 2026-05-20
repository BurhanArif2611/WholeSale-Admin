import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryChips } from '@/lib/common/components/CategoryChips';
import { CompactProductRow } from '@/components/order/CompactProductRow';
import { OrderCartSheet } from '@/components/order/OrderCartSheet';
import { ProductQtySheet } from '@/components/order/ProductQtySheet';
import { ProductSelectionMoreSheet } from '@/components/order/ProductSelectionMoreSheet';
import { Colors, Spacing, Radius, Shadow, Gradients, formatCurrency, Typography, Layout } from '@/constants/theme';
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
  onSetLineQty: (lineId: string, quantity: number, orderUnit: CartLineInput['order_unit']) => void;
  onRemoveLine: (lineId: string) => void;
  onNext: () => void;
  onShowProductSheet: () => void;
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

  const openQtySheet = useCallback((product: Product) => {
    const line = findCartLineByProductId(cart, product.id);
    if (!line) return;
    setQtyProduct(product);
    setQtyLine(line);
  }, [cart]);

  const cartCount = cart.length;
  const checkoutBottom = insets.bottom + 56;

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

  const ListHeader = (
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
  );

  return (
    <View style={styles.root}>
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

      {/* Product list — primary focus */}
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.amber} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('no_products_match')}</Text>
              {noProductsFound ? (
                <TouchableOpacity style={styles.emptyBtn} onPress={onShowProductSheet}>
                  <Text style={styles.emptyBtnText}>{t('create_new_product')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
        refreshing={loading}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: checkoutBottom + 72 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
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

      {/* FAB — more options */}
      <TouchableOpacity
        style={[styles.fab, { bottom: checkoutBottom + 64 }]}
        onPress={() => setMoreOpen(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

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
    </View>
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
  badgeText: { fontSize: 9, fontWeight: Typography.black, color: Colors.white },
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
  clientName: { flex: 1, fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  showAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  showAllText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
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
  sortChipText: { fontSize: 10, color: Colors.textMuted, fontWeight: Typography.semibold },
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
  recentLabel: { fontSize: 10, fontWeight: Typography.bold, color: Colors.textMuted },
  recentScroll: { gap: 6, paddingRight: Spacing.sm },
  recentChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.full,
    maxWidth: 120,
  },
  recentName: { fontSize: 11, fontWeight: Typography.semibold, color: Colors.amberDim },
  showRecent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  showRecentText: { fontSize: 11, color: Colors.amber, fontWeight: Typography.semibold },
  empty: { alignItems: 'center', padding: Spacing.xl },
  emptyText: { color: Colors.textMuted, marginBottom: Spacing.md },
  emptyBtn: {
    backgroundColor: Colors.amber,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  emptyBtnText: { color: Colors.white, fontWeight: Typography.bold },
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
  floatingCartText: { color: Colors.white, fontSize: Typography.sm, fontWeight: Typography.bold },
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
  checkoutTotal: { fontSize: Typography.md, fontWeight: Typography.black, color: Colors.textPrimary },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  checkoutBtnText: { color: Colors.white, fontWeight: Typography.black, fontSize: Typography.sm },
  checkoutDisabled: { opacity: 0.5 },
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
