export type UnitType = 'kg' | 'gram' | 'liter' | 'ml' | 'piece' | 'box' | 'packet';
export type OrderDiscountType = 'percent' | 'fixed';
export type PaymentStatus = 'pending' | 'partial' | 'paid';
export type OrderStatus = 'new' | 'confirmed' | 'delivered' | 'cancelled' | 'returned';
export type LedgerType = 'credit' | 'debit';
export type InventoryTxnType = 'stock_in' | 'stock_out' | 'adjustment' | 'sale' | 'return' | 'opening';

export interface Client {
  id: string;
  name: string;
  mobile: string;
  alternate_mobile: string | null;
  address: string | null;
  gst_number: string | null;
  email: string | null;
  notes: string | null;
  credit_limit: number;
  profile_photo_uri: string | null;
  pending_amount: number;
  default_discount_type: OrderDiscountType | null;
  default_discount_value: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  sort_order: number;
  is_preset: boolean;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  category: string;
  sku: string | null;
  barcode: string | null;
  purchase_price: number;
  selling_price: number;
  unit_type: UnitType;
  stock_quantity: number;
  min_stock_alert: number;
  expiry_date: string | null;
  image_uri: string | null;
  tax_percent: number;
  discount_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  client_id: string;
  client_name: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_mode: string | null;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  order_discount_type: OrderDiscountType | null;
  order_discount_value: number;
  order_discount_amount: number;
  grand_total: number;
  paid_amount: number;
  remaining_amount: number;
  delivery_date: string | null;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_type: UnitType;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  notes: string | null;
}

export interface LedgerEntry {
  id: string;
  client_id: string;
  client_name: string;
  order_id: string | null;
  type: LedgerType;
  amount: number;
  balance_after: number;
  payment_mode: string | null;
  notes: string | null;
  due_date: string | null;
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  product_name: string;
  type: InventoryTxnType;
  quantity: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalClients: number;
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  todaySales: number;
  pendingAmount: number;
  lowStockCount: number;
  recentOrders: Order[];
}

export type ProductSortField = 'name' | 'price' | 'stock';
export type SortDirection = 'asc' | 'desc';

export type CreateClientInput = Omit<
  Client,
  'id' | 'pending_amount' | 'created_at' | 'updated_at' | 'default_discount_type' | 'default_discount_value'
> & {
  default_discount_type?: OrderDiscountType | null;
  default_discount_value?: number;
};
export type CreateCategoryInput = {
  name: string;
  description?: string | null;
  sort_order?: number;
  slug?: string | null;
  is_preset?: boolean;
};
export type CreateProductInput = Omit<Product, 'id' | 'category' | 'created_at' | 'updated_at'>;
