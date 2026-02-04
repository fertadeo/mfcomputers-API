import { ProductRepository } from '../repositories/ProductRepository';
import { Product, ProductWithCategory, CreateProductData, UpdateProductData } from '../entities/Product';
import { WooCommerceService } from './WooCommerceService';

export class ProductService {
  private productRepository: ProductRepository;
  private wooCommerceService: WooCommerceService;

  constructor() {
    this.productRepository = new ProductRepository();
    this.wooCommerceService = new WooCommerceService();
  }

  async getAllProducts(options: {
    page?: number;
    limit?: number;
    category_id?: number;
    search?: string;
    active_only?: boolean;
    all?: boolean;
  } = {}) {
    return await this.productRepository.findAll(options);
  }

  async getStockSummary() {
    return await this.productRepository.getStockSummary();
  }

  async getProductById(id: number): Promise<ProductWithCategory | null> {
    return await this.productRepository.findById(id);
  }

  async createProduct(data: CreateProductData, syncToWooCommerce: boolean = false): Promise<Product> {
    // Verificar si el código ya existe
    const existingProduct = await this.productRepository.findByCode(data.code);
    if (existingProduct) {
      throw new Error('El código del producto ya existe');
    }

    const product = await this.productRepository.create(data);

    if (syncToWooCommerce && this.wooCommerceService.isConfigured()) {
      try {
        const syncResult = await this.syncProductToWooCommerce(product.id);
        if (syncResult.created) {
          const updated = await this.productRepository.findById(product.id);
          if (updated) return updated;
        }
      } catch (error) {
        console.error('[ProductService] Error sincronizando producto a WooCommerce tras crear:', error);
      }
    }

    return product;
  }

  async updateProduct(id: number, data: UpdateProductData, syncToWooCommerce: boolean = false): Promise<Product> {
    // Verificar si el producto existe
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new Error('Producto no encontrado');
    }

    // Si se está cambiando el código, verificar que no exista
    if (data.code && data.code !== existingProduct.code) {
      const codeExists = await this.productRepository.findByCode(data.code);
      if (codeExists) {
        throw new Error('El código del producto ya existe');
      }
    }

    // Merge inteligente de imágenes: combinar existentes con nuevas (evitar duplicados)
    // Si images viene como undefined, mantener las existentes sin cambios
    // Si images viene como null o [], limpiar todas las imágenes
    // Si images viene como array con valores, combinar existentes + nuevas (sin duplicados)
    if (data.images !== undefined) {
      const existingImages = Array.isArray(existingProduct.images) ? existingProduct.images : [];
      
      if (data.images === null || (Array.isArray(data.images) && data.images.length === 0)) {
        // Limpiar todas las imágenes
        data.images = null;
      } else if (Array.isArray(data.images)) {
        // Combinar existentes + nuevas, evitando duplicados
        const newImages = data.images.filter((url: string) => 
          typeof url === 'string' && url.trim().length > 0
        );
        const combinedImages = [...existingImages];
        
        for (const newUrl of newImages) {
          const trimmedUrl = newUrl.trim();
          // Evitar duplicados (comparación case-insensitive)
          if (!combinedImages.some((existing: string) => 
            typeof existing === 'string' && existing.trim().toLowerCase() === trimmedUrl.toLowerCase()
          )) {
            combinedImages.push(trimmedUrl);
          }
        }
        
        data.images = combinedImages.length > 0 ? combinedImages : null;
      }
    }

    const updated = await this.productRepository.update(id, data);

    if (syncToWooCommerce && existingProduct.woocommerce_id && this.wooCommerceService.isConfigured()) {
      try {
        await this.syncProductToWooCommerce(id);
        const reloaded = await this.productRepository.findById(id);
        if (reloaded) return reloaded;
      } catch (error) {
        console.error('[ProductService] Error sincronizando producto a WooCommerce tras actualizar:', error);
      }
    }

    return updated;
  }

  async updateStock(id: number, stock: number, operation: 'set' | 'add' | 'subtract' = 'set'): Promise<Product> {
    if (typeof stock !== 'number' || stock < 0) {
      throw new Error('El stock debe ser un número positivo');
    }

    return await this.productRepository.updateStock(id, stock, operation);
  }

  async getLowStockProducts(): Promise<ProductWithCategory[]> {
    return await this.productRepository.findLowStock();
  }

  async getProductStats() {
    return await this.productRepository.getStats();
  }

  async getProductByCode(code: string): Promise<Product | null> {
    return await this.productRepository.findByCode(code);
  }

  async getWooCommerceJsonByProductId(id: number): Promise<any | null> {
    return await this.productRepository.getWooCommerceJsonById(id);
  }

  /**
   * Sincroniza un producto del ERP a WooCommerce (crear o actualizar).
   * Si el producto tiene woocommerce_id, actualiza en WC; si no, crea en WC y guarda el id en el ERP.
   */
  async syncProductToWooCommerce(productId: number): Promise<{ woocommerce_id: number; created: boolean }> {
    if (!this.wooCommerceService.isConfigured()) {
      throw new Error('WooCommerce no está configurado. Verifica las variables de entorno.');
    }

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const stock = product.stock ?? 0;
    // Si tenemos IDs de medios de WordPress, usarlos (evita duplicados en galería); si no, usar URLs.
    // Filtrar URLs vacías e IDs inválidos para evitar "No URL Provided" de WooCommerce.
    const woocommerceImageIds = (product as any).woocommerce_image_ids as number[] | undefined;
    const validIds = Array.isArray(woocommerceImageIds)
      ? woocommerceImageIds.filter((id: number) => typeof id === 'number' && id > 0)
      : [];
    const validUrls = Array.isArray(product.images)
      ? product.images.filter((url: string) => typeof url === 'string' && url.trim().length > 0)
      : [];
    const imagesPayload =
      validIds.length > 0
        ? validIds.map((id: number) => ({ id }))
        : validUrls.length > 0
          ? validUrls.map((url: string) => ({ src: url }))
          : undefined;

    const p = product as ProductWithCategory;
    // WooCommerce requiere el ID de categoría (no solo el nombre). Las categorías vienen de WC y tienen woocommerce_id.
    // IMPORTANTE: Siempre enviar categories (incluso si es []), para que WooCommerce actualice las categorías inmediatamente.
    // Si enviamos undefined, WooCommerce puede mantener las categorías anteriores y no reflejar el cambio hasta que se limpie el caché.
    const categoriesPayload =
      p.category_woocommerce_id != null && p.category_woocommerce_id > 0
        ? [{ id: p.category_woocommerce_id }]
        : p.category_name
          ? [{ name: p.category_name }]
          : []; // Array vacío para limpiar categorías anteriores si no hay categoría asignada

    const payload = {
      name: product.name,
      sku: product.code,
      regular_price: String(product.price),
      description: product.description || '',
      short_description: product.description ? product.description.substring(0, 160) + (product.description.length > 160 ? '...' : '') : '',
      manage_stock: true,
      stock_quantity: stock,
      stock_status: (stock > 0 ? 'instock' : 'outofstock') as 'instock' | 'outofstock',
      status: (product.is_active ? 'publish' : 'draft') as 'publish' | 'draft',
      images: imagesPayload,
      categories: categoriesPayload,
      meta_data: [
        { key: '_mfcomputers_erp_id', value: String(product.id) },
        { key: '_mfcomputers_erp_code', value: product.code }
      ]
    };

    console.log('[ProductService] Sync a WooCommerce - Payload completo:', JSON.stringify(payload, null, 2));
    console.log('[ProductService] Categorías que se enviarán a WooCommerce:', JSON.stringify(payload.categories, null, 2));

    if (product.woocommerce_id) {
      const updateResult = await this.wooCommerceService.updateProduct(product.woocommerce_id, payload);
      
      // Verificar que las categorías se actualizaron correctamente haciendo un GET del producto
      const updatedProduct = await this.wooCommerceService.getProduct(product.woocommerce_id);
      if (updatedProduct) {
        console.log('[ProductService] ✅ Verificación post-actualización - Categorías en WooCommerce:', JSON.stringify(updatedProduct.categories || [], null, 2));
      }
      
      return { woocommerce_id: product.woocommerce_id, created: false };
    }

    // Si no tiene woocommerce_id, buscar por SKU en WooCommerce (evita error "SKU duplicado")
    const wcProduct = await this.wooCommerceService.findProductBySku(product.code);
    if (wcProduct) {
      await this.productRepository.update(productId, { woocommerce_id: wcProduct.id });
      const updateResult = await this.wooCommerceService.updateProduct(wcProduct.id, payload);
      
      // Verificar que las categorías se actualizaron correctamente
      const updatedProduct = await this.wooCommerceService.getProduct(wcProduct.id);
      if (updatedProduct) {
        console.log('[ProductService] ✅ Verificación post-actualización - Categorías en WooCommerce:', JSON.stringify(updatedProduct.categories || [], null, 2));
      }
      
      return { woocommerce_id: wcProduct.id, created: false };
    }

    const created = await this.wooCommerceService.createProduct(payload);
    
    // Verificar que las categorías se asignaron correctamente
    const createdProduct = await this.wooCommerceService.getProduct(created.id);
    if (createdProduct) {
      console.log('[ProductService] ✅ Verificación post-creación - Categorías en WooCommerce:', JSON.stringify(createdProduct.categories || [], null, 2));
    }
    
    await this.productRepository.update(productId, { woocommerce_id: created.id });
    return { woocommerce_id: created.id, created: true };
  }

  /**
   * Obtiene woocommerce_id para todos los productos del ERP que coincidan por SKU con WooCommerce.
   * Recorre los productos de WooCommerce (paginado) y vincula los del ERP que tengan el mismo código.
   */
  async bulkLinkProductsFromWooCommerce(): Promise<{
    linked: number;
    already_linked: number;
    not_found_in_erp: number;
    total_processed: number;
    errors: string[];
  }> {
    if (!this.wooCommerceService.isConfigured()) {
      throw new Error('WooCommerce no está configurado. Verifica las variables de entorno.');
    }

    let linked = 0;
    let already_linked = 0;
    let not_found_in_erp = 0;
    const errors: string[] = [];
    const perPage = 100;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const wcProducts = await this.wooCommerceService.getAllProductsPaginated(page, perPage);
      if (wcProducts.length === 0) {
        hasMore = false;
        break;
      }

      for (const wcProduct of wcProducts) {
        if (!wcProduct.sku || wcProduct.sku.trim() === '') {
          continue;
        }
        try {
          const erpProduct = await this.productRepository.findByCode(wcProduct.sku);
          if (!erpProduct) {
            not_found_in_erp++;
            continue;
          }
          if (erpProduct.woocommerce_id) {
            already_linked++;
            continue;
          }
          await this.productRepository.update(erpProduct.id, {
            woocommerce_id: wcProduct.id
          });
          linked++;
        } catch (err) {
          errors.push(
            `SKU ${wcProduct.sku}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      if (wcProducts.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return {
      linked,
      already_linked,
      not_found_in_erp,
      total_processed: linked + already_linked + not_found_in_erp,
      errors
    };
  }
}


