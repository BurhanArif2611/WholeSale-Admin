// types/index.ts

export type OrderStatus = 'New' | 'Unpaid' | 'Paid';
export type UserRole = 'owner' | 'salesman';

export const ORDER_STATUSES: OrderStatus[] = ['New', 'Unpaid', 'Paid'];

export interface Store {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  total_debt: number;
  margin_percentage: number;
  extra_charges: number; 
  created_at: string;
  owner_id: string;
  assigned_salesman_id: string | null;
}

export interface Material {
  id: string;
  name: string;
  base_price: number;
  unit: string;
  remark: string | null;
  created_at: string;
  owner_id: string;
}

export interface Order {
  id: string;
  store_id: string;
  date: string;
  grand_total: number;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  owner_id: string;
  stores?: Pick<Store, 'id' | 'name' | 'area' | 'phone' | 'margin_percentage'>;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  material_id: string | null;
  material_name: string;
  name?: string;
  quantity: number;
  price_at_time_of_sale: number;
  subtotal: number;
}

export interface StoreWithLatestOrder extends Store {
  latest_order: Pick<Order, 'id' | 'store_id' | 'date' | 'grand_total' | 'status'> | null;
}

export interface StoreHistory {
  store: Pick<Store, 'id' | 'name' | 'area' | 'phone'>;
  orders: Order[];
  total_orders: number;
  total_revenue: number;
}


export interface CreateOrderPayload {
  store_id: string;
  date?: string;
  notes?: string | null;
  owner_id: string;
  items: Array<{
    material_id?: string;
    name: string;
    base_price: number;
    unit: string;
    quantity: number
  }>;
}

export interface CreateStorePayload {
  name: string;
  phone?: string | null;
  area?: string | null;
  margin_percentage?: number;
  extra_charges?: number;
  owner_id: string;
  assigned_salesman_id?: string | null;
}

export interface CreateMaterialPayload {
  name: string;
  base_price: number;
  unit: string;
  remark?: string | null;
  owner_id: string;
}

export interface Profile {
  id: string;
  role: UserRole | null;
  owner_id: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface CreateProfilePayload {
  id: string;
  role: UserRole | null;
  owner_id?: string | null;
  full_name?: string | null;
  phone?: string | null;
}

export interface UpdateOrderPayload {
  owner_id: string;
  notes?: string | null;
  date?: string;
  items: Array<{
    material_id?: string;
    name: string;
    base_price: number;
    unit: string;
    quantity: number;
    fixed_unit_price?: number; 
  }>;
  store_id?: string;
  adjustment?: number;
}