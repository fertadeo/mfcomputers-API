export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  category_id?: number;
  price: number;
  stock: number;
  min_stock: number;
  max_stock: number;
  is_active: boolean;
  images?: string[]; // Array de URLs de imágenes desde WooCommerce
  created_at: string;
  updated_at: string;
}

export interface ProductWithCategory extends Product {
  category_name?: string;
}

export interface CreateProductData {
  code: string;
  name: string;
  description?: string;
  category_id?: number;
  price: number;
  stock?: number;
  min_stock?: number;
  max_stock?: number;
  images?: string[]; // Array de URLs de imágenes desde WooCommerce
}

export interface UpdateProductData extends Partial<CreateProductData> {
  is_active?: boolean;
}
