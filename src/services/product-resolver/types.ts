/**
 * Resultado de búsqueda de producto por código de barras
 */
export interface ProductResult {
  title: string;
  description?: string;
  brand?: string;
  images?: string[];
  source: string;
  suggested_price?: number; // Precio sugerido si está disponible
  category_suggestion?: string; // Categoría sugerida
  provider_response_time?: number; // Tiempo de respuesta del provider en ms
}

/**
 * Interfaz que deben implementar todos los providers de búsqueda
 */
export interface ProductProvider {
  name: string;
  search(barcode: string): Promise<ProductResult | null>;
}

/**
 * Respuesta completa del lookup de barcode
 */
export interface BarcodeLookupResponse {
  title: string;
  description?: string;
  brand?: string;
  images?: string[];
  source: string;
  suggested_price?: number;
  category_suggestion?: string;
  exists_as_product?: boolean;
  product_id?: number;
  cached_at?: string;
  provider_response_time?: number;
  preview_message?: string;
  available_actions: {
    accept: boolean;
    modify: boolean;
    ignore: boolean;
  };
}
