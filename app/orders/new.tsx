import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, FlatList, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FormField } from '@/lib/common/components/FormField';
import { OrderDiscountSection } from '@/lib/common/components/OrderDiscountSection';
import { ProductFilterBar } from '@/lib/common/components/ProductFilterBar';
import { ProductCard } from '@/lib/common/components/ProductCard';
import { CategoryBadge } from '@/lib/common/components/CategoryBadge';
import { QuantitySelector } from '@/lib/common/components/QuantitySelector';
import { Colors, Spacing, Radius, formatCurrency, Typography, Layout } from '@/constants/theme';
import { SearchBar, Button } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import { orderRepository, CreateOrderItemInput } from '@/lib/data/repositories/orderRepository';
import {
  cartItemCount,
  recalcLine,
  removeFromCart,
  updateCartQuantity,
  type CartLineInput,
} from '@/lib/common/utils/cart';
import {
  computeCartBreakdown,
  validateOrderDiscount,
  type OrderDiscountType,
} from '@/lib/common/utils/orderDiscount';
import type { Category, Client, Product, ProductSortField, SortDirection } from '@/lib/domain/models';

const STEP_TITLES = ['select_client_step', 'select_products_step', 'order_summary_step', 'confirm_order_step'] as const;

function clientDiscountToForm(client: Client): { type: OrderDiscountType; value: string } {
  const type = client.default_discount_type ?? 'percent';
  const val = client.default_discount_value;
  return {
    type,
    value: val > 0 ? String(val) : '',
  };
}

export default function NewOrderScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady } = useDatabase();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ProductSortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<CartLineInput[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discountType, setDiscountType] = useState<OrderDiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountFromClient, setDiscountFromClient] = useState(false);
  const [discountTouched, setDiscountTouched] = useState(false);

  const loadClients = useCallback(async () => {
    if (!isReady) return;
    setClients(await clientRepository.findAll(search));
  }, [isReady, search]);

  const loadProducts = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const [p, cats] = await Promise.all([
      productRepository.findAll(search, categoryId || '', { sortBy, sortDir }),
      categoryRepository.findAll(),
    ]);
    setProducts(p);
    setCategories(cats);
    setLoading(false);
  }, [isReady, search, categoryId, sortBy, sortDir]);

  useEffect(() => {
    if (step === 1) void loadClients();
    if (step === 2) void loadProducts();
  }, [step, loadClients, loadProducts]);

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    const { type, value } = clientDiscountToForm(client);
    setDiscountType(type);
    setDiscountValue(value);
    setDiscountFromClient(client.default_discount_value > 0);
    setDiscountTouched(false);
  };

  const getCartQty = (productId: string) =>
    cart.find((x) => x.product_id === productId)?.quantity ?? 0;

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.product_id === product.id);
      if (existing) {
        return updateCartQuantity(prev, product.id, 1);
      }
      return [
        ...prev,
        recalcLine({
          product_id: product.id,
          product_name: product.name,
          unit_type: product.unit_type,
          quantity: 1,
          unit_price: product.selling_price,
          discount_percent: product.discount_percent,
          tax_percent: product.tax_percent,
        }),
      ];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) => updateCartQuantity(prev, productId, delta));
  };

  const removeItem = (productId: string) => {
    setCart((prev) => removeFromCart(prev, productId));
  };

  const breakdown = useMemo(() => computeCartBreakdown(cart), [cart]);
  const discountValidation = useMemo(
    () => validateOrderDiscount(breakdown.itemsTotal, discountType, discountValue),
    [breakdown.itemsTotal, discountType, discountValue],
  );
  const orderDiscountAmount = discountValidation.amount;
  const finalPayable = Math.max(0, breakdown.itemsTotal - orderDiscountAmount);
  const totalItems = cartItemCount(cart);
  const paid = parseFloat(paidAmount) || 0;
  const remaining = Math.max(0, finalPayable - paid);

  const showDiscountError = discountTouched || step >= 4;

  const placeOrder = async () => {
    if (!selectedClient || cart.length === 0) return;
    setDiscountTouched(true);
    if (discountValidation.error) {
      Alert.alert(t('required'), t(discountValidation.error));
      return;
    }

    setPlacing(true);
    try {
      const items: CreateOrderItemInput[] = cart.map(({ line_total: _lt, ...rest }) => rest);
      await orderRepository.create({
        client_id: selectedClient.id,
        items,
        paid_amount: paid,
        payment_mode: paymentMode,
        delivery_date: deliveryDate || null,
        notes: notes || null,
        order_discount_type: discountValidation.value > 0 ? discountType : null,
        order_discount_value: discountValidation.value,
        order_discount_amount: orderDiscountAmount,
        save_client_discount: true,
      });
      Alert.alert('Success', 'Order placed successfully', [{ text: 'OK', onPress: () => router.replace('/(tabs)/orders') }]);
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const headerTitle = `${t('new_order_title')} · ${t(STEP_TITLES[step - 1])}`;

  return (
    <ScreenLayout
      title={headerTitle}
      onBack={handleBack}
      scroll={step >= 3}
      padded={step >= 3}
      footer={
        step === 2 ? (
          <View style={styles.footer}>
            <Text style={styles.cartCount}>
              {totalItems} items · {formatCurrency(breakdown.itemsTotal)}
            </Text>
            <Button label="Next: Summary" onPress={() => setStep(3)} disabled={cart.length === 0} />
          </View>
        ) : undefined
      }
    >
      <View style={styles.steps}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
        ))}
      </View>

      {step === 1 && (
        <View style={styles.stepContent}>
          <View style={styles.searchWrap}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={t('search_clients')}
              accessibilityLabel={t('search_clients')}
            />
          </View>
          <FlatList
            data={clients}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={<Text style={styles.emptyHint}>No clients found</Text>}
            renderItem={({ item: c }) => (
              <TouchableOpacity
                style={[styles.row, selectedClient?.id === c.id && styles.rowSelected]}
                onPress={() => selectClient(c)}
              >
                <Text style={styles.rowTitle}>{c.name}</Text>
                <Text style={styles.rowMeta}>{c.mobile}</Text>
                {c.default_discount_value > 0 && c.default_discount_type ? (
                  <Text style={styles.discountBadge}>
                    {c.default_discount_type === 'percent'
                      ? `${c.default_discount_value}% ${t('discount_label')}`
                      : `${formatCurrency(c.default_discount_value)} ${t('discount_label')}`}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
          <View style={styles.stepFooter}>
            <Button label="Next: Add Products" onPress={() => { setSearch(''); setStep(2); }} disabled={!selectedClient} />
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <View style={styles.filterWrap}>
            <ProductFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('search_products')}
              categories={categories}
              selectedCategoryId={categoryId}
              onCategorySelect={setCategoryId}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={(f, d) => { setSortBy(f); setSortDir(d); }}
            />
          </View>
          <FlatList
            data={products}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.listPad}
            refreshing={loading}
            onRefresh={loadProducts}
            ListEmptyComponent={<Text style={styles.emptyHint}>No products match your search</Text>}
            renderItem={({ item }) => {
              const qty = getCartQty(item.id);
              return (
                <ProductCard
                  product={item}
                  cartQty={qty}
                  onAdd={() => addToCart(item)}
                  onQtyChange={(delta) => changeQty(item.id, delta)}
                  onRemove={() => removeItem(item.id)}
                />
              );
            }}
          />
        </View>
      )}

      {step === 3 && (
        <>
          {selectedClient ? (
            <Text style={styles.clientBanner}>{selectedClient.name}</Text>
          ) : null}
          {cart.map((item) => (
            <View key={item.product_id} style={styles.cartRow}>
              <View style={styles.cartInfo}>
                <Text style={styles.rowTitle}>{item.product_name}</Text>
                {products.find((p) => p.id === item.product_id) && (
                  <CategoryBadge
                    name={products.find((p) => p.id === item.product_id)!.category}
                    compact
                  />
                )}
                <Text style={styles.rowMeta}>
                  {formatCurrency(item.unit_price)}/{item.unit_type}
                </Text>
                <Text style={styles.rowAmt}>{formatCurrency(item.line_total)}</Text>
              </View>
              <QuantitySelector
                value={item.quantity}
                onChange={(delta) => changeQty(item.product_id, delta)}
                onRemove={() => removeItem(item.product_id)}
              />
            </View>
          ))}

          <OrderDiscountSection
            type={discountType}
            onTypeChange={(type) => {
              setDiscountType(type);
              setDiscountFromClient(false);
              setDiscountTouched(true);
            }}
            value={discountValue}
            onValueChange={(v) => {
              setDiscountValue(v);
              setDiscountFromClient(false);
              setDiscountTouched(true);
            }}
            errorKey={showDiscountError ? discountValidation.error : null}
            t={t}
            itemsTotal={breakdown.itemsTotal}
            discountAmount={orderDiscountAmount}
            finalPayable={finalPayable}
            fromClientHint={discountFromClient && discountValidation.value > 0}
          />

          <View style={styles.summaryBox}>
            <SummaryRow label={t('subtotal_label')} value={formatCurrency(breakdown.subtotal)} />
            {breakdown.lineDiscount > 0 ? (
              <SummaryRow label={t('order_product_discount')} value={`−${formatCurrency(breakdown.lineDiscount)}`} />
            ) : null}
            {breakdown.taxTotal > 0 ? (
              <SummaryRow label="Tax" value={formatCurrency(breakdown.taxTotal)} />
            ) : null}
            <SummaryRow label={t('order_items_total')} value={formatCurrency(breakdown.itemsTotal)} />
            {orderDiscountAmount > 0 ? (
              <SummaryRow label={t('order_client_discount')} value={`−${formatCurrency(orderDiscountAmount)}`} />
            ) : null}
            <SummaryRow label={t('grand_total_label')} value={formatCurrency(finalPayable)} bold />
          </View>

          <FormField
            label="Paid Amount"
            value={paidAmount}
            onChangeText={setPaidAmount}
            placeholder={t('ph_paid_amount')}
            hint={t('hint_paid_amount')}
            keyboardType="numeric"
          />
          <FormField
            label="Payment Mode"
            value={paymentMode}
            onChangeText={setPaymentMode}
            placeholder={t('ph_payment_mode')}
            hint={t('hint_payment_mode')}
          />
          <FormField
            label="Delivery Date"
            value={deliveryDate}
            onChangeText={setDeliveryDate}
            placeholder={t('ph_delivery_date')}
          />
          <FormField
            label={t('notes_optional')}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('notes_placeholder')}
            hint={t('hint_notes')}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.remaining}>Remaining: {formatCurrency(remaining)}</Text>
          <Button
            label="Review & Place"
            onPress={() => {
              setDiscountTouched(true);
              if (discountValidation.error) {
                Alert.alert(t('required'), t(discountValidation.error));
                return;
              }
              setStep(4);
            }}
            disabled={cart.length === 0}
          />
        </>
      )}

      {step === 4 && (
        <>
          <Text style={styles.confirmText}>Client: {selectedClient?.name}</Text>
          <Text style={styles.confirmText}>Items: {totalItems} ({cart.length} products)</Text>
          <Text style={styles.confirmText}>Items total: {formatCurrency(breakdown.itemsTotal)}</Text>
          {orderDiscountAmount > 0 ? (
            <Text style={styles.confirmText}>
              {t('order_client_discount')}: −{formatCurrency(orderDiscountAmount)}
              {discountType === 'percent' ? ` (${discountValidation.value}%)` : ''}
            </Text>
          ) : null}
          <Text style={styles.confirmText}>Total: {formatCurrency(finalPayable)}</Text>
          <Text style={styles.confirmText}>Paid: {formatCurrency(paid)}</Text>
          <Text style={styles.confirmText}>Due: {formatCurrency(remaining)}</Text>
          <Button label={placing ? 'Placing...' : 'Place Order'} onPress={placeOrder} loading={placing} disabled={cart.length === 0} />
          <Button label={t('go_back')} onPress={() => setStep(3)} variant="ghost" style={{ marginTop: Spacing.sm }} />
        </>
      )}
    </ScreenLayout>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={{ color: Colors.textSecondary }}>{label}</Text>
      <Text style={{ fontWeight: bold ? Typography.bold : Typography.semibold, color: Colors.textPrimary }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Layout.screenPaddingH,
  },
  stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.amber },
  stepContent: { flex: 1 },
  searchWrap: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Spacing.sm },
  filterWrap: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Spacing.sm },
  listPad: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: 120 },
  row: {
    flexDirection: 'column',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  rowSelected: { borderWidth: 2, borderColor: Colors.amber },
  rowTitle: { fontWeight: Typography.bold, color: Colors.textPrimary },
  rowMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  discountBadge: { fontSize: Typography.xs, color: Colors.success, fontWeight: Typography.semibold, marginTop: 4 },
  rowAmt: { fontWeight: Typography.bold, color: Colors.amber, marginTop: 4 },
  clientBanner: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cartInfo: { flex: 1, paddingRight: Spacing.md },
  stepFooter: { padding: Layout.screenPaddingH, paddingBottom: Spacing.lg },
  footer: {
    padding: Layout.screenPaddingH,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cartCount: { textAlign: 'center', marginBottom: Spacing.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  summaryBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginVertical: Spacing.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  remaining: {
    fontWeight: Typography.bold,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontSize: Typography.sm,
  },
  confirmText: { fontSize: Typography.sm, color: Colors.textPrimary, marginBottom: 8 },
  emptyHint: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.xl },
});
