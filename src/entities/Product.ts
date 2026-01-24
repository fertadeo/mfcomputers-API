export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  category_id?: number | null;
  price: number;
  stock: number;
  min_stock: number;
  max_stock: number;
  is_active: boolean;
  images?: string[] | null; // Array de URLs de imágenes desde WooCommerce
  woocommerce_id?: number | null; // ID del producto en WooCommerce
  woocommerce_json?: any | null; // JSON completo del producto desde WooCommerce (puede ser grande)
  barcode?: string | null;
  qr_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithCategory extends Product {
  category_name?: string;
}

export interface CreateProductData {
  code: string;
  name: string;
  description?: string | null;
  category_id?: number | null;
  price: number;
  stock?: number;
  min_stock?: number;
  max_stock?: number;
  images?: string[] | null; // Array de URLs de imágenes desde WooCommerce
  woocommerce_id?: number | null; // ID del producto en WooCommerce
  woocommerce_json?: any | null; // JSON completo del producto desde WooCommerce
  barcode?: string | null;
  qr_code?: string | null;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  is_active?: boolean;
}
