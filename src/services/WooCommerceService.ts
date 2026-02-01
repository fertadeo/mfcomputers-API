/**
 * Servicio para interactuar con WooCommerce REST API
 */
export class WooCommerceService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private apiVersion: string;

  /** Usuario y Application Password de WordPress para subir a la galería multimedia (/wp/v2/media) */
  private wpUser: string;
  private wpApplicationPassword: string;

  constructor() {
    // Obtener configuración desde variables de entorno
    this.baseUrl = process.env.WOOCOMMERCE_URL || '';
    this.consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
    this.consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';
    this.apiVersion = process.env.WOOCOMMERCE_API_VERSION || 'wc/v3';
    this.wpUser = process.env.WP_APPLICATION_USER || '';
    this.wpApplicationPassword = process.env.WP_APPLICATION_PASSWORD || '';

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
   * Verifica si hay credenciales de WordPress para subir archivos a la galería multimedia
   */
  isWordPressMediaConfigured(): boolean {
    return !!(this.baseUrl && this.wpUser && this.wpApplicationPassword);
  }

  /**
   * Sube un archivo a la galería multimedia de WordPress (wp/v2/media).
   * Requiere WP_APPLICATION_USER y WP_APPLICATION_PASSWORD en .env.
   * Devuelve el id y source_url para usar en el producto: images: [{ id }]
   */
  async uploadMediaToWordPress(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ id: number; source_url: string }> {
    if (!this.isWordPressMediaConfigured()) {
      throw new Error(
        'WordPress Media no está configurado. Configura WP_APPLICATION_USER y WP_APPLICATION_PASSWORD en .env (usuario de WordPress + Application Password).'
      );
    }

    const url = `${this.baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
    const auth = Buffer.from(`${this.wpUser}:${this.wpApplicationPassword}`, 'utf8').toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Authorization': `Basic ${auth}`,
      },
      body: fileBuffer,
    });

    const responseText = await response.text();
    let data: any;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      throw new Error(`Error parseando respuesta de WordPress Media: ${responseText}`);
    }

    if (!response.ok) {
      const msg = data?.message || data?.code || `HTTP ${response.status}`;
      throw new Error(`WordPress Media Error: ${msg}`);
    }

    const id = typeof data.id === 'number' ? data.id : parseInt(String(data.id), 10);
    const source_url = data.source_url || data.guid?.rendered || '';
    if (!id || !source_url) {
      throw new Error('WordPress no devolvió id o source_url del medio.');
    }

    return { id, source_url };
  }

  /**
   * Header Authorization Basic para WooCommerce REST API (evita credenciales en la URL).
   */
  private getAuthHeader(): string {
    const credentials = `${this.consumerKey}:${this.consumerSecret}`;
    return 'Basic ' + Buffer.from(credentials, 'utf8').toString('base64');
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

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
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

  // =====================================================
  // MÉTODOS PARA PEDIDOS (ORDERS)
  // =====================================================

  /**
   * Mapea el estado del ERP al estado de WooCommerce
   */
  private mapErpStatusToWooCommerce(erpStatus: string): string {
    const statusMap: Record<string, string> = {
      'pendiente_preparacion': 'pending',
      'en_proceso': 'processing',
      'aprobado': 'on-hold',
      'listo_despacho': 'processing',
      'pagado': 'processing',
      'completado': 'completed',
      'cancelado': 'cancelled'
    };
    return statusMap[erpStatus] || 'pending';
  }

  /**
   * Crea un pedido en WooCommerce desde el ERP
   */
  async createOrder(orderData: {
    customer_id?: number;
    billing: {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      address_1: string;
      address_2?: string;
      city: string;
      state?: string;
      postcode?: string;
      country: string;
      company?: string;
    };
    shipping?: {
      first_name: string;
      last_name: string;
      address_1: string;
      address_2?: string;
      city: string;
      state?: string;
      postcode?: string;
      country: string;
      company?: string;
      phone?: string;
    };
    line_items: Array<{
      product_id: number;
      quantity: number;
      price?: number;
      sku?: string;
    }>;
    status?: string;
    currency?: string;
    payment_method?: string;
    payment_method_title?: string;
    customer_note?: string;
    meta_data?: Array<{ key: string; value: any }>;
  }): Promise<{ id: number; number: string; status: string }> {
    const payload: any = {
      status: orderData.status ? this.mapErpStatusToWooCommerce(orderData.status) : 'pending',
      currency: orderData.currency || 'ARS',
      billing: orderData.billing,
      shipping: orderData.shipping || orderData.billing, // Si no hay shipping, usar billing
      line_items: orderData.line_items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price || undefined
      })),
      meta_data: orderData.meta_data || []
    };

    if (orderData.customer_id) {
      payload.customer_id = orderData.customer_id;
    }

    if (orderData.payment_method) {
      payload.payment_method = orderData.payment_method;
      payload.payment_method_title = orderData.payment_method_title || orderData.payment_method;
    }

    if (orderData.customer_note) {
      payload.customer_note = orderData.customer_note;
    }

    console.log('[WooCommerceService] Creando pedido en WooCommerce:', { 
      status: payload.status, 
      line_items_count: payload.line_items.length 
    });
    
    const result = await this.request('POST', '/orders', payload);
    
    return {
      id: result.id,
      number: result.number,
      status: result.status
    };
  }

  /**
   * Actualiza un pedido en WooCommerce
   */
  async updateOrder(
    woocommerceOrderId: number,
    orderData: {
      status?: string;
      billing?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        address_1?: string;
        address_2?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
        company?: string;
      };
      shipping?: {
        first_name?: string;
        last_name?: string;
        address_1?: string;
        address_2?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
        company?: string;
        phone?: string;
      };
      line_items?: Array<{
        id?: number;
        product_id: number;
        quantity: number;
        price?: number;
      }>;
      customer_note?: string;
      meta_data?: Array<{ key: string; value: any }>;
    }
  ): Promise<{ id: number; number: string; status: string }> {
    const payload: any = {};

    if (orderData.status) {
      payload.status = this.mapErpStatusToWooCommerce(orderData.status);
    }

    if (orderData.billing) {
      payload.billing = orderData.billing;
    }

    if (orderData.shipping) {
      payload.shipping = orderData.shipping;
    }

    if (orderData.line_items) {
      payload.line_items = orderData.line_items.map(item => ({
        id: item.id || undefined,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price || undefined
      }));
    }

    if (orderData.customer_note !== undefined) {
      payload.customer_note = orderData.customer_note;
    }

    if (orderData.meta_data) {
      payload.meta_data = orderData.meta_data;
    }

    console.log(`[WooCommerceService] Actualizando pedido ${woocommerceOrderId} en WooCommerce:`, payload);
    const result = await this.request('PUT', `/orders/${woocommerceOrderId}`, payload);
    
    return {
      id: result.id,
      number: result.number,
      status: result.status
    };
  }

  /**
   * Elimina un pedido en WooCommerce (soft delete - lo mueve a trash)
   */
  async deleteOrder(woocommerceOrderId: number, force: boolean = false): Promise<void> {
    console.log(`[WooCommerceService] Eliminando pedido ${woocommerceOrderId} en WooCommerce (force: ${force})`);
    await this.request('DELETE', `/orders/${woocommerceOrderId}?force=${force}`);
  }

  /**
   * Obtiene un pedido de WooCommerce por ID
   */
  async getOrder(woocommerceOrderId: number): Promise<any | null> {
    try {
      const result = await this.request('GET', `/orders/${woocommerceOrderId}`);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Busca un cliente en WooCommerce por email
   */
  async findCustomerByEmail(email: string): Promise<{ id: number; email: string; first_name: string; last_name: string } | null> {
    try {
      const result = await this.request('GET', `/customers?email=${encodeURIComponent(email)}&per_page=1`);
      
      if (Array.isArray(result) && result.length > 0) {
        const customer = result[0];
        return {
          id: customer.id,
          email: customer.email,
          first_name: customer.first_name || '',
          last_name: customer.last_name || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('[WooCommerceService] Error buscando cliente por email:', error);
      return null;
    }
  }

  /**
   * Crea un cliente en WooCommerce
   */
  async createCustomer(customerData: {
    email: string;
    first_name: string;
    last_name: string;
    username?: string;
    phone?: string;
    billing?: {
      first_name?: string;
      last_name?: string;
      company?: string;
      address_1?: string;
      address_2?: string;
      city?: string;
      state?: string;
      postcode?: string;
      country?: string;
      email?: string;
      phone?: string;
    };
  }): Promise<{ id: number; email: string }> {
    const payload: any = {
      email: customerData.email,
      first_name: customerData.first_name,
      last_name: customerData.last_name
    };

    if (customerData.username) {
      payload.username = customerData.username;
    }

    if (customerData.phone) {
      payload.phone = customerData.phone;
    }

    if (customerData.billing) {
      payload.billing = customerData.billing;
    }

    console.log('[WooCommerceService] Creando cliente en WooCommerce:', { email: payload.email });
    const result = await this.request('POST', '/customers', payload);
    
    return {
      id: result.id,
      email: result.email
    };
  }

  /**
   * Busca un producto en WooCommerce por SKU
   */
  async findProductBySku(sku: string): Promise<{ id: number; sku: string; name: string } | null> {
    try {
      const result = await this.request('GET', `/products?sku=${encodeURIComponent(sku)}&per_page=1`);
      
      if (Array.isArray(result) && result.length > 0) {
        const product = result[0];
        return {
          id: product.id,
          sku: product.sku,
          name: product.name
        };
      }
      
      return null;
    } catch (error) {
      console.error('[WooCommerceService] Error buscando producto por SKU:', error);
      return null;
    }
  }

  /**
   * Obtiene un producto de WooCommerce por ID
   */
  async getProduct(woocommerceProductId: number): Promise<any | null> {
    try {
      const result = await this.request('GET', `/products/${woocommerceProductId}`);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Crea un producto en WooCommerce (ERP → WooCommerce)
   */
  async createProduct(productData: {
    name: string;
    sku: string;
    type?: string;
    regular_price: string | number;
    sale_price?: string | number;
    description?: string;
    short_description?: string;
    manage_stock?: boolean;
    stock_quantity?: number;
    stock_status?: 'instock' | 'outofstock';
    status?: 'publish' | 'draft' | 'pending';
    images?: Array<{ id?: number; src?: string }>;
    categories?: Array<{ id?: number; name?: string }>;
    meta_data?: Array<{ key: string; value: string | number }>;
  }): Promise<{ id: number; sku: string; name: string }> {
    const payload: any = {
      name: productData.name,
      type: productData.type || 'simple',
      sku: productData.sku,
      regular_price: String(productData.regular_price),
      manage_stock: productData.manage_stock !== false,
      stock_quantity: productData.stock_quantity ?? 0,
      stock_status: productData.stock_status || (productData.stock_quantity && productData.stock_quantity > 0 ? 'instock' : 'outofstock'),
      status: productData.status || 'publish'
    };

    if (productData.description !== undefined) {
      payload.description = productData.description;
    }
    if (productData.short_description !== undefined) {
      payload.short_description = productData.short_description;
    }
    if (productData.sale_price !== undefined && productData.sale_price !== '') {
      payload.sale_price = String(productData.sale_price);
    }
    if (productData.images && productData.images.length > 0) {
      payload.images = productData.images;
    }
    if (productData.categories && productData.categories.length > 0) {
      payload.categories = productData.categories;
    }
    if (productData.meta_data && productData.meta_data.length > 0) {
      payload.meta_data = productData.meta_data;
    }

    console.log('[WooCommerceService] Creando producto en WooCommerce:', { name: payload.name, sku: payload.sku });
    const result = await this.request('POST', '/products', payload);
    return {
      id: result.id,
      sku: result.sku || payload.sku,
      name: result.name
    };
  }

  /**
   * Actualiza un producto en WooCommerce (ERP → WooCommerce)
   */
  async updateProduct(
    woocommerceProductId: number,
    productData: {
      name?: string;
      sku?: string;
      regular_price?: string | number;
      sale_price?: string | number;
      description?: string;
      short_description?: string;
      manage_stock?: boolean;
      stock_quantity?: number;
      stock_status?: 'instock' | 'outofstock';
      status?: 'publish' | 'draft' | 'pending';
      images?: Array<{ id?: number; src?: string }>;
      categories?: Array<{ id?: number; name?: string }>;
      meta_data?: Array<{ key: string; value: string | number }>;
    }
  ): Promise<{ id: number; sku: string; name: string }> {
    const payload: any = {};

    if (productData.name !== undefined) payload.name = productData.name;
    if (productData.sku !== undefined) payload.sku = productData.sku;
    if (productData.regular_price !== undefined) payload.regular_price = String(productData.regular_price);
    if (productData.sale_price !== undefined) payload.sale_price = String(productData.sale_price);
    if (productData.description !== undefined) payload.description = productData.description;
    if (productData.short_description !== undefined) payload.short_description = productData.short_description;
    if (productData.manage_stock !== undefined) payload.manage_stock = productData.manage_stock;
    if (productData.stock_quantity !== undefined) payload.stock_quantity = productData.stock_quantity;
    if (productData.stock_status !== undefined) payload.stock_status = productData.stock_status;
    if (productData.status !== undefined) payload.status = productData.status;
    if (productData.images !== undefined) payload.images = productData.images;
    if (productData.categories !== undefined) payload.categories = productData.categories;
    if (productData.meta_data !== undefined) payload.meta_data = productData.meta_data;

    console.log('[WooCommerceService] Actualizando producto en WooCommerce:', { id: woocommerceProductId, ...payload });
    const result = await this.request('PUT', `/products/${woocommerceProductId}`, payload);
    return {
      id: result.id,
      sku: result.sku || '',
      name: result.name
    };
  }

  // =====================================================
  // MÉTODOS PARA GESTIÓN DE STOCK
  // =====================================================

  /**
   * Actualiza el stock de un producto en WooCommerce
   * @param woocommerceProductId ID del producto en WooCommerce
   * @param stockQuantity Nueva cantidad de stock
   * @param operation Operación: 'set' (establecer), 'add' (sumar), 'subtract' (restar)
   * @returns Producto actualizado con el nuevo stock
   */
  async updateProductStock(
    woocommerceProductId: number,
    stockQuantity: number,
    operation: 'set' | 'add' | 'subtract' = 'set'
  ): Promise<{ id: number; stock_quantity: number; sku: string }> {
    try {
      // Obtener producto actual para calcular nuevo stock
      const currentProduct = await this.getProduct(woocommerceProductId);
      if (!currentProduct) {
        throw new Error(`Producto con ID ${woocommerceProductId} no encontrado en WooCommerce`);
      }

      let newStock = stockQuantity;
      const currentStock = currentProduct.stock_quantity || 0;

      if (operation === 'add') {
        newStock = currentStock + stockQuantity;
      } else if (operation === 'subtract') {
        newStock = Math.max(0, currentStock - stockQuantity);
      }

      const payload: any = {
        stock_quantity: newStock,
        manage_stock: true
      };

      // Actualizar stock_status si es necesario
      if (newStock > 0) {
        payload.stock_status = 'instock';
      } else {
        payload.stock_status = 'outofstock';
      }

      console.log(`[WooCommerceService] Actualizando stock del producto ${woocommerceProductId}: ${currentStock} → ${newStock} (operación: ${operation})`);
      
      const result = await this.request('PUT', `/products/${woocommerceProductId}`, payload);
      
      return {
        id: result.id,
        stock_quantity: result.stock_quantity || 0,
        sku: result.sku || ''
      };
    } catch (error) {
      console.error(`[WooCommerceService] Error actualizando stock del producto ${woocommerceProductId}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza el stock de múltiples productos en WooCommerce
   * @param updates Array de actualizaciones: [{ productId, stockQuantity, operation }]
   * @returns Array con los resultados de cada actualización
   */
  async updateMultipleProductsStock(
    updates: Array<{
      productId: number;
      stockQuantity: number;
      operation?: 'set' | 'add' | 'subtract';
    }>
  ): Promise<Array<{ productId: number; success: boolean; stock_quantity?: number; error?: string }>> {
    const results: Array<{ productId: number; success: boolean; stock_quantity?: number; error?: string }> = [];

    // Procesar actualizaciones en paralelo (con límite de concurrencia)
    const batchSize = 5; // Procesar 5 productos a la vez para no sobrecargar la API
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(update =>
          this.updateProductStock(
            update.productId,
            update.stockQuantity,
            update.operation || 'set'
          )
        )
      );

      batchResults.forEach((result, index) => {
        const update = batch[index];
        if (result.status === 'fulfilled') {
          results.push({
            productId: update.productId,
            success: true,
            stock_quantity: result.value.stock_quantity
          });
        } else {
          results.push({
            productId: update.productId,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Error desconocido'
          });
        }
      });

      // Pequeña pausa entre lotes para no sobrecargar la API
      if (i + batchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Actualiza el stock de un producto en WooCommerce usando su SKU
   * Útil cuando solo se conoce el SKU del producto
   */
  async updateProductStockBySku(
    sku: string,
    stockQuantity: number,
    operation: 'set' | 'add' | 'subtract' = 'set'
  ): Promise<{ id: number; stock_quantity: number; sku: string }> {
    const product = await this.findProductBySku(sku);
    if (!product) {
      throw new Error(`Producto con SKU ${sku} no encontrado en WooCommerce`);
    }

    return await this.updateProductStock(product.id, stockQuantity, operation);
  }
}
