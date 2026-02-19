import { ProductRepository } from '../repositories/ProductRepository';
import { BarcodeLookupCacheRepository } from '../repositories/BarcodeLookupCacheRepository';
import { ProductService } from './ProductService';
import { ProductWithCategory } from '../entities/Product';
import { resolveProduct, validateBarcode } from './product-resolver';
import { BarcodeLookupResponse } from './product-resolver/types';
import { logger } from '../utils/logger';

export class BarcodeLookupService {
  private productRepository: ProductRepository;
  private cacheRepository: BarcodeLookupCacheRepository;
  private productService: ProductService;

  constructor() {
    this.productRepository = new ProductRepository();
    this.cacheRepository = new BarcodeLookupCacheRepository();
    this.productService = new ProductService();
  }

  /**
   * Busca un producto por código de barras
   * Prioriza: products existentes → cache → providers externos
   */
  async lookupBarcode(barcode: string): Promise<BarcodeLookupResponse | null> {
    // Validar formato
    if (!validateBarcode(barcode)) {
      throw new Error('Formato de código de barras inválido');
    }

    const cleanedBarcode = barcode.replace(/[\s-]/g, '');

    // Paso 1: Buscar en productos existentes
    const existingProduct = await this.productRepository.findByBarcode(cleanedBarcode);
    if (existingProduct) {
      return {
        title: existingProduct.name,
        description: existingProduct.description || undefined,
        brand: undefined, // No tenemos brand en products aún
        images: existingProduct.images || undefined,
        source: 'products',
        exists_as_product: true,
        product_id: existingProduct.id,
        preview_message: `Producto ya existe: ${existingProduct.name}`,
        available_actions: {
          accept: false, // Ya existe, no se puede aceptar
          modify: false, // Ya existe, usar endpoint de actualización normal
          ignore: false
        }
      };
    }

    // Paso 2: Buscar en cache
    const cachedResult = await this.cacheRepository.findByBarcode(cleanedBarcode);
    if (cachedResult && !cachedResult.ignored) {
      // Actualizar uso
      await this.cacheRepository.updateUsage(cleanedBarcode);

      return {
        title: cachedResult.title,
        description: cachedResult.description || undefined,
        brand: cachedResult.brand || undefined,
        images: cachedResult.images || undefined,
        source: cachedResult.source,
        suggested_price: cachedResult.suggested_price || undefined,
        category_suggestion: cachedResult.category_suggestion || undefined,
        exists_as_product: false,
        cached_at: cachedResult.last_used_at || cachedResult.created_at,
        preview_message: `Hemos encontrado: ${cachedResult.title}`,
        available_actions: {
          accept: true,
          modify: true,
          ignore: true
        }
      };
    }

    // Paso 3: Consultar providers externos
    const providerResult = await resolveProduct(cleanedBarcode);
    if (providerResult) {
      // Extraer solo los datos originales del provider (sin provider_response_time)
      const { provider_response_time, ...providerData } = providerResult;
      
      // Guardar en cache (sin raw_json por ahora para evitar problemas de paquete)
      await this.cacheRepository.upsert({
        barcode: cleanedBarcode,
        title: providerResult.title,
        description: providerResult.description || null,
        brand: providerResult.brand || null,
        images: providerResult.images || null,
        source: providerResult.source,
        suggested_price: providerResult.suggested_price || null,
        category_suggestion: providerResult.category_suggestion || null,
        raw_json: null // Deshabilitado temporalmente para evitar errores de paquete
      });

      // Actualizar uso
      await this.cacheRepository.updateUsage(cleanedBarcode);

      return {
        ...providerResult,
        exists_as_product: false,
        preview_message: `Hemos encontrado: ${providerResult.title}`,
        available_actions: {
          accept: true,
          modify: true,
          ignore: true
        }
      };
    }

    // No se encontró en ningún lugar
    return null;
  }

  /**
   * Acepta los datos encontrados y crea el producto
   */
  async acceptBarcodeData(
    barcode: string,
    additionalData?: {
      category_id?: number;
      price?: number;
      stock?: number;
      code?: string;
    }
  ): Promise<ProductWithCategory> {
    // Buscar datos en cache primero
    const lookupResult = await this.lookupBarcode(barcode);
    if (!lookupResult || lookupResult.exists_as_product) {
      throw new Error('No se encontraron datos para este código de barras o el producto ya existe');
    }

    // Generar código interno si no se proporciona
    const productCode = additionalData?.code || this.generateCodeFromBarcode(barcode);

    // Verificar que el código no exista
    const existingByCode = await this.productRepository.findByCode(productCode);
    if (existingByCode) {
      throw new Error('El código interno del producto ya existe');
    }

    // Crear producto usando ProductService
      const productData = {
      code: productCode,
      name: lookupResult.title,
      description: lookupResult.description || null,
      category_id: additionalData?.category_id || null,
      price: additionalData?.price || lookupResult.suggested_price || 0,
      stock: additionalData?.stock || 0,
      min_stock: 0,
      max_stock: 1000,
      barcode: barcode.replace(/[\s-]/g, ''),
      images: lookupResult.images || null
    };

    return await this.productService.createProduct(productData, false);
  }

  /**
   * Ignora los datos encontrados
   */
  async ignoreBarcodeData(barcode: string, userId?: number): Promise<void> {
    const cleanedBarcode = barcode.replace(/[\s-]/g, '');
    await this.cacheRepository.markAsIgnored(cleanedBarcode, userId);
  }

  /**
   * Genera un código interno desde el código de barras
   */
  private generateCodeFromBarcode(barcode: string): string {
    const cleaned = barcode.replace(/[\s-]/g, '');
    // Usar últimos 8 dígitos + prefijo
    return `BC-${cleaned.slice(-8)}`;
  }
}
