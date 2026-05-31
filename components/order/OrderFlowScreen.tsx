import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, FlatList, TouchableOpacity, ScrollView, Pressable,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FormField } from '@/lib/common/components/FormField';
import { OrderDiscountSection } from '@/lib/common/components/OrderDiscountSection';
import { CategoryBadge } from '@/lib/common/components/CategoryBadge';
import { FlexibleQuantityInput } from '@/lib/common/components/FlexibleQuantityInput';
import { ProductSelectionStep } from '@/components/order/ProductSelectionStep';
import { OrderFlowStepper } from '@/components/order/OrderFlowStepper';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { QuickAddClientSheet } from '@/lib/common/components/order/QuickAddClientSheet';
import { QuickAddProductSheet } from '@/lib/common/components/order/QuickAddProductSheet';
import { QuickAddTempProductSheet } from '@/lib/common/components/order/QuickAddTempProductSheet';
import { ConfirmOrderStep, ConfirmOrderFooter } from '@/components/order/ConfirmOrderStep';
import type { OrderPreviewInput } from '@/lib/orderInvoicePreview';
import { Colors, Spacing, Radius, formatCurrency, Typography, Layout, Fonts } from '@/constants/theme';
import { SearchBar, Button } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { useOrderDraft, type OrderDraft } from '@/hooks/useOrderDraft';
import { useBusinessCategories } from '@/hooks/useBusinessCategories';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import { orderRepository, CreateOrderItemInput } from '@/lib/data/repositories/orderRepository';
import {
  buildCatalogCartLine,
  buildTempCartLine,
  cartItemCount,
  findCartLineByProductId,
  recalcLine,
  removeFromCart,
  applyCartLineUpdate,
  setCartLineOrderUnit,
  setCartLineQuantity,
  updateCartQuantity,
  type CartLineInput,
} from '@/lib/common/utils/cart';
import { validateLineDiscount } from '@/lib/common/utils/lineDiscount';
import { formatQuantityDisplay } from '@/lib/common/utils/quantity';
import {
  computeCartBreakdown,
  validateOrderDiscount,
  type OrderDiscountType,
} from '@/lib/common/utils/orderDiscount';
import type { Category, Client, Product, ProductSortField, SortDirection } from '@/lib/domain/models';

export type OrderFlowMode = 'standard' | 'instant';

const STEP_KEYS = ['select_client_step', 'select_products_step', 'order_summary_step', 'confirm_order_step'] as const;

function clientDiscountToForm(client: Client): { type: OrderDiscountType; value: string } {
  const type = client.default_discount_type ?? 'percent';
  const val = client.default_discount_value;
  return { type, value: val > 0 ? String(val) : '' };
}

interface OrderFlowScreenProps {
  mode?: OrderFlowMode;
}

export function OrderFlowScreen({ mode = 'standard' }: OrderFlowScreenProps) {
  const isInstant = mode === 'instant';
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady } = useDatabase();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
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
  const [showClientSheet, setShowClientSheet] = useState(false);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [productSheetPrefill, setProductSheetPrefill] = useState('');
  const [showTempProductSheet, setShowTempProductSheet] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [clientCreatedInSession, setClientCreatedInSession] = useState(false);
  const debouncedProductSearch = useDebouncedValue(search, 280);
  const {
    filterCategoryList,
    productQueryOptions,
    showAllCategories,
    setShowAllCategories,
    hasPreferences,
  } = useBusinessCategories();

  const draftPayload: OrderDraft | null = useMemo(
    () =>
      cart.length > 0 || selectedClient
        ? {
            clientId: selectedClient?.id ?? null,
            cart,
            paidAmount,
            paymentMode,
            notes,
            discountType,
            discountValue,
            step,
            updatedAt: new Date().toISOString(),
          }
        : null,
    [cart, selectedClient, paidAmount, paymentMode, notes, discountType, discountValue, step],
  );

  const { loadDraft, clearDraft } = useOrderDraft(mode, draftPayload, !placing);

  const loadClients = useCallback(async () => {
    if (!isReady) return;
    setClients(await clientRepository.findAll(search));
  }, [isReady, search]);

  const loadProducts = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const [p, cats, recent] = await Promise.all([
      productRepository.findAll(debouncedProductSearch, categoryId || '', {
        sortBy,
        sortDir,
        ...productQueryOptions(categoryId, debouncedProductSearch),
      }),
      categoryRepository.findAll(),
      productRepository.findRecent(8),
    ]);
    setProducts(p);
    setCategories(filterCategoryList(cats));
    setRecentProducts(recent);
    setLoading(false);
  }, [isReady, debouncedProductSearch, categoryId, sortBy, sortDir, productQueryOptions, filterCategoryList]);

  useEffect(() => {
    if (step === 1) void loadClients();
    if (step === 2) void loadProducts();
  }, [step, loadClients, loadProducts]);

  useEffect(() => {
    if (!isReady || draftRestored) return;
    void (async () => {
      const saved = await loadDraft();
      if (saved?.cart?.length) {
        setCart(saved.cart);
        setPaidAmount(saved.paidAmount ?? '');
        setPaymentMode(saved.paymentMode ?? 'cash');
        setNotes(saved.notes ?? '');
        setDiscountType((saved.discountType as OrderDiscountType) ?? 'percent');
        setDiscountValue(saved.discountValue ?? '');
        if (saved.clientId) {
          const c = await clientRepository.findById(saved.clientId);
          if (c) setSelectedClient(c);
        }
        if (saved.step && saved.step >= 1 && saved.step <= 4) setStep(saved.step);
      }
      setDraftRestored(true);
    })();
  }, [isReady, draftRestored, loadDraft]);

  useEffect(() => {
    if (!isInstant || !isReady || selectedClient) return;
    void clientRepository.getOrCreateWalkInClient().then(setSelectedClient);
  }, [isInstant, isReady, selectedClient]);

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    const { type, value } = clientDiscountToForm(client);
    setDiscountType(type);
    setDiscountValue(value);
    setDiscountFromClient(client.default_discount_value > 0);
    setDiscountTouched(false);
  };

  const getCartQty = (productId: string) =>
    findCartLineByProductId(cart, productId)?.quantity ?? 0;

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = findCartLineByProductId(prev, product.id);
      if (existing) return updateCartQuantity(prev, existing.line_id, 1);
      return [...prev, buildCatalogCartLine({
        product_id: product.id,
        product_name: product.name,
        unit_type: product.unit_type,
        unit_price: product.selling_price,
        purchase_price: product.purchase_price,
        allow_discount: product.allow_discount,
        max_discount_percent: product.max_discount_percent,
        stock_quantity: product.stock_quantity,
        discount_percent: 0,
        tax_percent: product.tax_percent,
      })];
    });
  };

  const applyLineUpdate = (
    lineId: string,
    quantity: number,
    orderUnit: CartLineInput['order_unit'],
    discountPercent: number,
    needsApproval: boolean,
  ) => {
    setCart((prev) => applyCartLineUpdate(prev, lineId, quantity, orderUnit, discountPercent, needsApproval));
  };

  const changeQty = (lineId: string, delta: number) => {
    setCart((prev) => updateCartQuantity(prev, lineId, delta));
  };

  const setLineQty = (lineId: string, quantity: number, orderUnit: CartLineInput['order_unit']) => {
    setCart((prev) => {
      let next = setCartLineQuantity(prev, lineId, quantity);
      const line = next.find((x) => x.line_id === lineId);
      if (line && line.order_unit !== orderUnit) {
        next = setCartLineOrderUnit(next, lineId, orderUnit);
      }
      return next;
    });
  };

  const removeItem = (lineId: string) => {
    setCart((prev) => removeFromCart(prev, lineId));
  };

  const repeatLastItem = () => {
    const last = cart[cart.length - 1];
    if (!last) return;
    if (last.is_temporary) {
      setCart((prev) => [...prev, buildTempCartLine({
        product_name: last.product_name,
        quantity: last.quantity,
        unit_price: last.unit_price,
        unit_type: last.unit_type,
        notes: last.notes,
      })]);
      return;
    }
    if (last.product_id) {
      const p = products.find((x) => x.id === last.product_id);
      if (p) addToCart(p);
    }
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

  const previewInput: OrderPreviewInput | null = useMemo(() => {
    if (!selectedClient) return null;
    return {
      client: selectedClient,
      cart,
      breakdown,
      orderDiscountAmount,
      finalPayable,
      paid,
      remaining,
      paymentMode,
      notes: [notes, deliveryInstructions].filter(Boolean).join(' | ') || undefined,
      deliveryDate: deliveryDate || undefined,
    };
  }, [
    selectedClient, cart, breakdown, orderDiscountAmount, finalPayable,
    paid, remaining, paymentMode, notes, deliveryInstructions, deliveryDate,
  ]);

  const handleSaveDraft = () => {
    Alert.alert(t('save_draft') || 'Draft Saved', t('draft_saved_msg') || 'Your order draft has been saved. You can continue later.');
  };

  const placeOrder = async () => {
    if (!selectedClient || cart.length === 0) return;
    setDiscountTouched(true);
    if (discountValidation.error) {
      Alert.alert(t('required'), t(discountValidation.error));
      return;
    }

    for (const line of cart) {
      if (line.is_temporary) continue;
      const v = validateLineDiscount({
        unitPrice: line.unit_price,
        purchasePrice: line.purchase_price,
        discountPercent: line.discount_percent,
        allowDiscount: line.allow_discount,
        maxDiscountPercent: line.max_discount_percent,
        quantity: line.quantity,
        orderUnit: line.order_unit,
        priceUnit: line.unit_type,
        stockQuantity: line.stock_quantity,
        taxPercent: line.tax_percent,
      });
      if (!v.valid && v.error) {
        const msg =
          v.error === 'err_max_discount'
            ? t('err_max_discount').replace('{max}', String(line.max_discount_percent))
            : t(v.error);
        Alert.alert(t('required'), `${line.product_name}: ${msg}`);
        return;
      }
    }

    const needsApproval = cart.some((l) => l.needs_discount_approval);

    setPlacing(true);
    try {
      const items: CreateOrderItemInput[] = cart.map(({ line_total: _lt, line_id: _lid, is_temporary: _t, purchase_price: _pp, allow_discount: _ad, max_discount_percent: _md, stock_quantity: _sq, needs_discount_approval: _na, ...rest }) => ({
        product_id: rest.product_id,
        product_name: rest.product_name,
        unit_type: rest.unit_type,
        order_unit: rest.order_unit,
        quantity: rest.quantity,
        unit_price: rest.unit_price,
        discount_percent: rest.discount_percent,
        tax_percent: rest.tax_percent,
        notes: rest.notes ?? null,
      }));
      const created = await orderRepository.create({
        client_id: selectedClient.id,
        items,
        paid_amount: paid,
        payment_mode: paymentMode,
        delivery_date: deliveryDate || null,
        notes: [notes, deliveryInstructions].filter(Boolean).join('\n') || null,
        order_discount_type: discountValidation.value > 0 ? discountType : null,
        order_discount_value: discountValidation.value,
        order_discount_amount: orderDiscountAmount,
        save_client_discount: !isInstant,
        discount_approval_status: needsApproval ? 'pending' : 'none',
      });
      await clearDraft();
      router.replace(`/orders/success?id=${created.id}` as Href);
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

  const titleKey = isInstant ? 'instant_purchase_title' : 'new_order_title';
  const headerTitle = t(titleKey);

  const flowSteps = useMemo(
    () => [
      { key: 'client', label: t('step_client') || 'Client', shortLabel: t('step_client_short') || 'Client', icon: 'person-outline' as const },
      { key: 'products', label: t('step_products') || 'Products', shortLabel: t('step_products_short') || 'Items', icon: 'cart-outline' as const },
      { key: 'review', label: t('step_review') || 'Review', shortLabel: t('step_review_short') || 'Review', icon: 'document-text-outline' as const },
      { key: 'confirm', label: t('step_confirm') || 'Confirm', shortLabel: t('step_confirm_short') || 'Pay', icon: 'checkmark-circle-outline' as const },
    ],
    [t],
  );

  const canGoToStep = useCallback(
    (target: number) => {
      if (target >= step) return false;
      if (target >= 2 && !selectedClient) return false;
      if (target >= 3 && cart.length === 0) return false;
      return true;
    },
    [step, selectedClient, cart.length],
  );

  const goToStep = useCallback(
    (target: number) => {
      if (!canGoToStep(target)) return;
      if (target === 2) setSearch('');
      setStep(target);
    },
    [canGoToStep],
  );

  const noClientsFound = clients.length === 0 && search.trim().length > 0;
  const noProductsFound = products.length === 0 && !!(search.trim() || categoryId);

  return (
    <ScreenLayout
      title={headerTitle}
      onBack={handleBack}
      compactHeader
      subHeader={
        <OrderFlowStepper
          currentStep={step}
          steps={flowSteps}
          onStepPress={goToStep}
          canNavigateTo={canGoToStep}
        />
      }
      scroll={step >= 3}
      padded={step !== 2 && step >= 3}
      contentStyle={step === 4 ? { paddingBottom: 24 } : step === 2 ? { paddingTop: 0 } : undefined}
      footer={
        step === 4 && previewInput ? (
          <ConfirmOrderFooter
            placing={placing}
            onConfirm={placeOrder}
            onEdit={() => setStep(3)}
            onSaveDraft={handleSaveDraft}
            previewInput={previewInput}
            t={t}
          />
        ) : undefined
      }
    >
      {step === 1 && (
        <View style={styles.stepContent}>
          {isInstant ? (
            <Pressable
              style={[styles.walkInBtn, selectedClient?.name === 'Walk-in Customer' && styles.rowSelected]}
              onPress={() => void clientRepository.getOrCreateWalkInClient().then(selectClient)}
            >
              <Ionicons name="flash" size={20} color={Colors.amber} />
              <View style={styles.walkInText}>
                <Text style={styles.walkInTitle}>{t('walk_in_sale') || 'Walk-in / Cash Sale'}</Text>
                <Text style={styles.rowMeta}>{t('walk_in_hint') || 'Skip registration — bill instantly'}</Text>
              </View>
            </Pressable>
          ) : null}
          <View style={styles.searchWrap}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={t('search_clients')}
              accessibilityLabel={t('search_clients')}
            />
          </View>
          <TouchableOpacity style={styles.quickAddBtn} onPress={() => setShowClientSheet(true)}>
            <Ionicons name="person-add" size={18} color={Colors.amber} />
            <Text style={styles.quickAddText}>{t('create_new_client')}</Text>
          </TouchableOpacity>
          <FlatList
            data={clients}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyHint}>{t('no_clients_found') || 'No clients found'}</Text>
                {noClientsFound ? (
                  <Button label={t('create_new_client')} onPress={() => setShowClientSheet(true)} />
                ) : null}
              </View>
            }
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

      {step === 2 && selectedClient ? (
        <ProductSelectionStep
          selectedClient={selectedClient}
          products={products}
          recentProducts={recentProducts}
          categories={categories}
          cart={cart}
          search={search}
          onSearchChange={setSearch}
          categoryId={categoryId}
          onCategorySelect={setCategoryId}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(f, d) => {
            setSortBy(f);
            setSortDir(d);
          }}
          loading={loading}
          onRefresh={loadProducts}
          isInstant={isInstant}
          itemsTotal={breakdown.itemsTotal}
          totalItems={totalItems}
          onAddToCart={addToCart}
          onChangeQty={changeQty}
          onSetLineQty={applyLineUpdate}
          onRemoveLine={removeItem}
          onNext={() => setStep(3)}
          onShowProductSheet={() => {
            setProductSheetPrefill(search);
            setShowProductSheet(true);
          }}
          onQuickAddProduct={(prefill) => {
            setProductSheetPrefill(prefill ?? search);
            setShowProductSheet(true);
          }}
          onProductCreated={(product) => {
            setProducts((prev) => [product, ...prev.filter((p) => p.id !== product.id)]);
            addToCart(product);
          }}
          onShowTempSheet={() => setShowTempProductSheet(true)}
          onRepeatLast={repeatLastItem}
          noProductsFound={noProductsFound}
          t={t}
          hasPreferredCategories={hasPreferences}
          showAllCategories={showAllCategories}
          onShowAllCategoriesChange={(v) => void setShowAllCategories(v)}
        />
      ) : null}

      {step === 3 && (
        <>
          {selectedClient ? (
            <Text style={styles.clientBanner}>{selectedClient.name}</Text>
          ) : null}
          {cart.map((item) => (
            <View key={item.line_id} style={styles.cartRow}>
              <View style={styles.cartInfo}>
                <Text style={styles.rowTitle}>
                  {item.product_name}
                  {item.is_temporary ? (
                    <Text style={styles.tempBadge}> · {t('temp_item') || 'Temp'}</Text>
                  ) : null}
                </Text>
                {!item.is_temporary && products.find((p) => p.id === item.product_id) ? (
                  <CategoryBadge
                    name={products.find((p) => p.id === item.product_id)!.category}
                    compact
                  />
                ) : null}
                <Text style={styles.rowMeta}>
                  {formatCurrency(item.unit_price)}/{item.unit_type}
                </Text>
                <Text style={styles.rowAmt}>{formatCurrency(item.line_total)}</Text>
              </View>
              <FlexibleQuantityInput
                quantity={item.quantity}
                orderUnit={item.order_unit}
                priceUnit={item.unit_type}
                unitPrice={item.unit_price}
                lineTotal={item.line_total}
                onQuantityChange={(q) => setCart((prev) => setCartLineQuantity(prev, item.line_id, q))}
                onOrderUnitChange={(u) => setCart((prev) => setCartLineOrderUnit(prev, item.line_id, u))}
                onRemove={() => removeItem(item.line_id)}
              />
            </View>
          ))}

          {isInstant ? (
            <Button
              label={t('add_temp_product') || 'Add Quick Item'}
              onPress={() => setShowTempProductSheet(true)}
              variant="ghost"
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

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

          <FormField label="Paid Amount" value={paidAmount} onChangeText={setPaidAmount} placeholder={t('ph_paid_amount')} hint={t('hint_paid_amount')} keyboardType="decimal-pad" />
          <FormField label="Payment Mode" value={paymentMode} onChangeText={setPaymentMode} placeholder={t('ph_payment_mode')} hint={t('hint_payment_mode')} />
          <FormField label="Delivery Date" value={deliveryDate} onChangeText={setDeliveryDate} placeholder={t('ph_delivery_date')} />
          <FormField label={t('notes_optional')} value={notes} onChangeText={setNotes} placeholder={t('notes_placeholder')} hint={t('hint_notes')} multiline numberOfLines={3} />
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

      {step === 4 && selectedClient ? (
        <ConfirmOrderStep
          client={selectedClient}
          cart={cart}
          breakdown={breakdown}
          orderDiscountAmount={orderDiscountAmount}
          discountType={discountType}
          discountPercentLabel={discountType === 'percent' ? discountValidation.value : undefined}
          finalPayable={finalPayable}
          paid={paid}
          remaining={remaining}
          paymentMode={paymentMode}
          deliveryDate={deliveryDate}
          notes={notes}
          deliveryInstructions={deliveryInstructions}
          onNotesChange={setNotes}
          onDeliveryInstructionsChange={setDeliveryInstructions}
          isInstant={isInstant}
          isNewClient={clientCreatedInSession}
          placing={placing}
          onConfirm={placeOrder}
          onEdit={() => setStep(3)}
          onSaveDraft={handleSaveDraft}
          t={t}
        />
      ) : null}

      <QuickAddClientSheet
        visible={showClientSheet}
        onClose={() => setShowClientSheet(false)}
        onCreated={(client) => {
          setClients((prev) => [client, ...prev.filter((c) => c.id !== client.id)]);
          setClientCreatedInSession(true);
          selectClient(client);
        }}
      />
      <QuickAddProductSheet
        visible={showProductSheet}
        mode="purchase"
        initialName={productSheetPrefill}
        onClose={() => {
          setShowProductSheet(false);
          setProductSheetPrefill('');
        }}
        onCreated={(product) => {
          setProducts((prev) => [product, ...prev.filter((p) => p.id !== product.id)]);
          addToCart(product);
          setSearch('');
        }}
      />
      <QuickAddTempProductSheet
        visible={showTempProductSheet}
        onClose={() => setShowTempProductSheet(false)}
        onAdded={(line) => setCart((prev) => [...prev, line])}
      />
    </ScreenLayout>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={{ color: Colors.textSecondary }}>{label}</Text>
      <Text style={{ fontFamily: bold ? Fonts.bold : Fonts.semibold, color: Colors.textPrimary }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: { flex: 1 },
  searchWrap: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Spacing.sm },
  filterWrap: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Spacing.sm },
  listPad: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: 120 },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Layout.screenPaddingH,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.amber + '55',
  },
  quickAddText: { fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.amberDim },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.screenPaddingH, gap: Spacing.sm, marginBottom: Spacing.sm },
  repeatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  repeatText: { fontSize: Typography.xs, fontFamily: Fonts.semibold, color: Colors.info },
  walkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Layout.screenPaddingH,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  walkInText: { flex: 1 },
  walkInTitle: { fontFamily: Fonts.bold, color: Colors.textPrimary, fontSize: Typography.sm },
  tempAddBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Layout.screenPaddingH,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.soft.amber,
    borderRadius: Radius.lg,
  },
  tempAddText: { flex: 1, fontSize: Typography.sm, fontFamily: Fonts.semibold, color: Colors.amberDim },
  recentSection: { paddingHorizontal: Layout.screenPaddingH, marginBottom: Spacing.sm },
  recentTitle: { fontSize: Typography.xs, fontFamily: Fonts.bold, color: Colors.textMuted, marginBottom: Spacing.xs },
  recentScroll: { gap: Spacing.sm },
  recentChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxWidth: 140,
  },
  recentChipName: { fontSize: Typography.xs, fontFamily: Fonts.bold, color: Colors.textPrimary },
  recentChipPrice: { fontSize: 10, color: Colors.amber, marginTop: 2 },
  row: {
    flexDirection: 'column',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  rowSelected: { borderWidth: 2, borderColor: Colors.amber },
  rowTitle: { fontFamily: Fonts.bold, color: Colors.textPrimary },
  rowMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  discountBadge: { fontSize: Typography.xs, color: Colors.success, fontFamily: Fonts.semibold, marginTop: 4 },
  rowAmt: { fontFamily: Fonts.bold, color: Colors.amber, marginTop: 4 },
  tempBadge: { fontSize: Typography.xs, color: Colors.info, fontFamily: Fonts.semibold },
  clientBanner: {
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  cartRow: {
    flexDirection: 'column',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  cartInfo: { flex: 1 },
  stepFooter: { padding: Layout.screenPaddingH, paddingBottom: Spacing.lg },
  footer: {
    padding: Layout.screenPaddingH,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cartCount: { textAlign: 'center', marginBottom: Spacing.sm, fontFamily: Fonts.bold, color: Colors.textPrimary },
  summaryBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginVertical: Spacing.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  remaining: {
    fontFamily: Fonts.bold,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontSize: Typography.sm,
  },
  confirmText: { fontSize: Typography.sm, color: Colors.textPrimary, marginBottom: 8 },
  emptyBlock: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyHint: { textAlign: 'center', color: Colors.textMuted },
});
