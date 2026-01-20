/**
 * Servicio para interactuar con WooCommerce REST API
 */
export class WooCommerceService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private apiVersion: string;

  constructor() {
    // Obtener configuración desde variables de entorno
    this.baseUrl = process.env.WOOCOMMERCE_URL || '';
    this.consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
    this.consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';
    this.apiVersion = process.env.WOOCOMMERCE_API_VERSION || 'wc/v3';

    // Validar que las credenciales estén configuradas
    if (!this.baseUrl || !this.consumerKey || !this.consumerSecret) {
      console.warn('[WooCommerceService] ⚠️ Credenciales de WooCommerce no configuradas. La sincronización no funcionará.');
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(this.baseUrl && this.consumerKey && this.consumerSecret);
  }

  /**
   * Construye la URL de autenticación básica para WooCommerce REST API
   */
  private getAuthUrl(url: string): string {
    const urlObj = new URL(url);
    urlObj.username = this.consumerKey;
    urlObj.password = this.consumerSecret;
    return urlObj.toString();
  }

  /**
   * Realiza una petición HTTP a WooCommerce REST API
   */
  private async request(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('WooCommerce no está configurado. Verifica las variables de entorno.');
    }

    const url = `${this.baseUrl}/wp-json/${this.apiVersion}${endpoint}`;
    const authUrl = this.getAuthUrl(url);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(authUrl, options);
      const responseText = await response.text();
      
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        throw new Error(`Error parseando respuesta: ${responseText}`);
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.code || `HTTP ${response.status}`;
        const errorDetails = data?.data || {};
        throw new Error(`WooCommerce API Error: ${errorMessage} - ${JSON.stringify(errorDetails)}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error en petición a WooCommerce: ${String(error)}`);
    }
  }

  /**
   * Crea una categoría en WooCommerce
   */
  async createCategory(categoryData: {
    name: string;
    slug?: string;
    parent?: number;
    description?: string;
  }): Promise<{ id: number; name: string; slug: string; parent: number }> {
    const payload: any = {
      name: categoryData.name,
    };

    if (categoryData.slug) {
      payload.slug = categoryData.slug;
    }

    if (categoryData.parent !== undefined && categoryData.parent !== null && categoryData.parent !== 0) {
      payload.parent = categoryData.parent;
    }

    if (categoryData.description) {
      payload.description = categoryData.description;
    }

    console.log('[WooCommerceService] Creando categoría en WooCommerce:', payload);
    const result = await this.request('POST', '/products/categories', payload);
    
    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      parent: result.parent || 0
    };
  }

  /**
   * Actualiza una categoría en WooCommerce
   */
  async updateCategory(
    woocommerceId: number,
    categoryData: {
      name?: string;
      slug?: string;
      parent?: number;
      description?: string;
    }
  ): Promise<{ id: number; name: string; slug: string; parent: number }> {
    const payload: any = {};

    if (categoryData.name !== undefined) {
      payload.name = categoryData.name;
    }

    if (categoryData.slug !== undefined) {
      payload.slug = categoryData.slug;
    }

    if (categoryData.parent !== undefined) {
      payload.parent = categoryData.parent === null || categoryData.parent === 0 ? 0 : categoryData.parent;
    }

    if (categoryData.description !== undefined) {
      payload.description = categoryData.description;
    }

    console.log(`[WooCommerceService] Actualizando categoría ${woocommerceId} en WooCommerce:`, payload);
    const result = await this.request('PUT', `/products/categories/${woocommerceId}`, payload);
    
    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      parent: result.parent || 0
    };
  }

  /**
   * Elimina una categoría en WooCommerce
   */
  async deleteCategory(woocommerceId: number, force: boolean = true): Promise<void> {
    console.log(`[WooCommerceService] Eliminando categoría ${woocommerceId} en WooCommerce (force: ${force})`);
    await this.request('DELETE', `/products/categories/${woocommerceId}?force=${force}`);
  }

  /**
   * Obtiene una categoría por ID de WooCommerce
   */
  async getCategory(woocommerceId: number): Promise<{ id: number; name: string; slug: string; parent: number } | null> {
    try {
      const result = await this.request('GET', `/products/categories/${woocommerceId}`);
      return {
        id: result.id,
        name: result.name,
        slug: result.slug,
        parent: result.parent || 0
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Busca una categoría por nombre en WooCommerce
   */
  async findCategoryByName(name: string): Promise<{ id: number; name: string; slug: string; parent: number } | null> {
    try {
      const result = await this.request('GET', `/products/categories?search=${encodeURIComponent(name)}&per_page=100`);
      
      if (Array.isArray(result) && result.length > 0) {
        // Buscar coincidencia exacta (case-insensitive)
        const exactMatch = result.find((cat: any) => 
          cat.name.toLowerCase() === name.toLowerCase()
        );
        
        if (exactMatch) {
          return {
            id: exactMatch.id,
            name: exactMatch.name,
            slug: exactMatch.slug,
            parent: exactMatch.parent || 0
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('[WooCommerceService] Error buscando categoría por nombre:', error);
      return null;
    }
  }
}
