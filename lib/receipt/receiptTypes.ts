import type { Order, OrderItem, Client } from '@/lib/domain/models';

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
}

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  isTemporary?: boolean;
}

export interface ReceiptData {
  orderId: string;
  invoiceNo: string;
  createdAt: string;
  shop: ShopInfo;
  client: {
    name: string;
    mobile: string;
    address: string | null;
  };
  items: ReceiptLineItem[];
  subtotal: number;
  productDiscount: number;
  taxTotal: number;
  clientDiscount: number;
  grandTotal: number;
  paid: number;
  remaining: number;
  paymentMode: string;
  paymentStatus: string;
  totalItems: number;
  totalQty: number;
  notes?: string | null;
}

export function buildReceiptData(
  order: Order,
  items: OrderItem[],
  client: Client | null,
  shop: ShopInfo,
): ReceiptData {
  const receiptItems: ReceiptLineItem[] = items.map((i) => ({
    name: i.product_name,
    quantity: i.quantity,
    unit: i.unit_type,
    rate: i.unit_price,
    total: i.line_total,
    isTemporary: !i.product_id,
  }));

  return {
    orderId: order.id,
    invoiceNo: order.id.slice(0, 8).toUpperCase(),
    createdAt: order.created_at,
    shop,
    client: {
      name: order.client_name,
      mobile: client?.mobile ?? '—',
      address: client?.address ?? order.delivery_address,
    },
    items: receiptItems,
    subtotal: order.subtotal,
    productDiscount: order.discount_total,
    taxTotal: order.tax_total,
    clientDiscount: order.order_discount_amount,
    grandTotal: order.grand_total,
    paid: order.paid_amount,
    remaining: order.remaining_amount,
    paymentMode: order.payment_mode ?? 'Cash',
    paymentStatus: order.payment_status,
    totalItems: receiptItems.length,
    totalQty: receiptItems.reduce((s, i) => s + i.quantity, 0),
    notes: order.notes,
  };
}

export const DEFAULT_SHOP: ShopInfo = {
  name: 'WholeSale Admin',
  address: '',
  phone: '',
};
