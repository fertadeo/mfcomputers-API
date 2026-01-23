// =====================================================
// ENTITIES - SALES MODULE (Point of Sale)
// =====================================================

export interface Sale {
  id: number;
  sale_number: string;
  client_id: number;
  total_amount: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  payment_details?: {
    efectivo?: number;
    tarjeta?: number;
    transferencia?: number;
  } | null;
  sale_date: string;
  woocommerce_order_id?: number | null;
  sync_status: 'pending' | 'synced' | 'error';
  sync_error?: string | null;
  notes?: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface SaleWithDetails extends Sale {
  client_name?: string;
  client_code?: string;
  client_email?: string;
  items?: SaleItem[];
  created_by_name?: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CreateSaleData {
  client_id?: number; // Opcional, si no se envía usar cliente genérico "Consumidor Final"
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
  }>;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  payment_details?: {
    efectivo?: number;
    tarjeta?: number;
    transferencia?: number;
  };
  notes?: string;
  sync_to_woocommerce?: boolean; // Por defecto true
}

export interface UpdateSaleData {
  notes?: string;
  sync_to_woocommerce?: boolean; // Para reintentar sincronización
}

export interface SaleFilters {
  client_id?: number;
  payment_method?: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  sync_status?: 'pending' | 'synced' | 'error';
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface SaleStats {
  total_sales: number;
  total_amount: number;
  average_sale_amount: number;
  sales_by_payment_method: {
    efectivo: { count: number; total: number };
    tarjeta: { count: number; total: number };
    transferencia: { count: number; total: number };
    mixto: { count: number; total: number };
  };
  sales_today: number;
  sales_this_month: number;
  pending_sync: number;
  sync_errors: number;
}
