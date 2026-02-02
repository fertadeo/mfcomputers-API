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
  } = {}) {
    return await this.productRepository.findAll(options);
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
      categories: (product as ProductWithCategory).category_name
        ? [{ name: (product as ProductWithCategory).category_name }]
        : undefined,
      meta_data: [
        { key: '_mfcomputers_erp_id', value: String(product.id) },
        { key: '_mfcomputers_erp_code', value: product.code }
      ]
    };

    if (product.woocommerce_id) {
      await this.wooCommerceService.updateProduct(product.woocommerce_id, payload);
      return { woocommerce_id: product.woocommerce_id, created: false };
    }

    const created = await this.wooCommerceService.createProduct(payload);
    await this.productRepository.update(productId, { woocommerce_id: created.id });
    return { woocommerce_id: created.id, created: true };
  }
}


