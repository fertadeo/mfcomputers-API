// =====================================================
// ENTITIES - ORDERS MODULE
// =====================================================

export interface Order {
  id: number;
  order_number: string;
  woocommerce_order_id?: number | null;
  client_id: number;
  status: 'pendiente_preparacion' | 'listo_despacho' | 'pagado' | 'aprobado' | 'en_proceso' | 'completado' | 'cancelado';
  total_amount: number;
  order_date: string;
  delivery_date?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  transport_company?: string;
  transport_cost?: number;
  notes?: string;
  remito_status?: 'sin_remito' | 'remito_generado' | 'remito_despachado' | 'remito_entregado';
  stock_reserved?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderWithDetails extends Order {
  client_name?: string;
  client_code?: string;
  client_email?: string;
  client_phone?: string;
  items?: OrderItem[];
  remito_id?: number;
  remito_number?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_number?: string;
  notes?: string;
  stock_reserved?: boolean;
  created_at: string;
}

export interface CreateOrderData {
  client_id: number;
  order_number?: string; // Número de pedido personalizado (ej: de WooCommerce)
  woocommerce_order_id?: number; // ID del pedido en WooCommerce (para evitar duplicados)
  status?: 'pendiente_preparacion' | 'listo_despacho' | 'pagado' | 'aprobado';
  delivery_date?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  transport_company?: string;
  transport_cost?: number;
  notes?: string;
  items: CreateOrderItemData[];
}

export interface CreateOrderItemData {
  product_id: number;
  quantity: number;
  unit_price: number;
  batch_number?: string;
  notes?: string;
}

export interface UpdateOrderData {
  status?: 'pendiente_preparacion' | 'listo_despacho' | 'pagado' | 'aprobado' | 'en_proceso' | 'completado' | 'cancelado';
  delivery_date?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  transport_company?: string;
  transport_cost?: number;
  notes?: string;
  remito_status?: 'sin_remito' | 'remito_generado' | 'remito_despachado' | 'remito_entregado';
  stock_reserved?: boolean;
}

export interface UpdateOrderItemData {
  quantity?: number;
  unit_price?: number;
  batch_number?: string;
  notes?: string;
  stock_reserved?: boolean;
}

export interface OrderFilters {
  status?: string;
  client_id?: number;
  remito_status?: string;
  date_from?: string;
  date_to?: string;
  stock_reserved?: boolean;
  has_remito?: boolean;
  page?: number;
  limit?: number;
}

export interface OrderStats {
  total_orders: number;
  pending_preparation: number;
  ready_for_dispatch: number;
  in_process: number;
  completed: number;
  cancelled: number;
  total_value: number;
  average_order_value: number;
  orders_without_remito: number;
  orders_with_stock_reserved: number;
}

