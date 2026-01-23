import { SaleRepository } from '../repositories/SaleRepository';
import { WooCommerceService } from './WooCommerceService';
import { ProductService } from './ProductService';
import { executeQuery } from '../config/database';
import { 
  Sale, 
  SaleWithDetails, 
  CreateSaleData, 
  UpdateSaleData,
  SaleFilters,
  SaleStats
} from '../entities/Sale';
import { ApiResponse } from '../types';

export class SaleService {
  private saleRepository: SaleRepository;
  private wooCommerceService: WooCommerceService;
  private productService: ProductService;

  constructor() {
    this.saleRepository = new SaleRepository();
    this.wooCommerceService = new WooCommerceService();
    this.productService = new ProductService();
  }

  // =====================================================
  // GESTIÓN DE VENTAS
  // =====================================================

  /**
   * Crea una nueva venta local
   */
  async createSale(data: CreateSaleData, userId: number | null): Promise<ApiResponse> {
    try {
      // Validar stock disponible antes de crear la venta
      await this.validateStockAvailability(data.items);

      // Validar productos
      await this.validateProducts(data.items);

      // Crear venta
      const sale = await this.saleRepository.createSale(data, userId);

      // Registrar ingreso en módulo de caja (payments)
      await this.registerPayment(sale, userId);

      // Sincronizar con WooCommerce si está configurado
      const syncToWooCommerce = data.sync_to_woocommerce !== false; // Por defecto true
      if (syncToWooCommerce && this.wooCommerceService.isConfigured()) {
        try {
          await this.syncSaleToWooCommerce(sale.id);
        } catch (syncError) {
          console.error('[SaleService] Error sincronizando venta a WooCommerce:', syncError);
          // No fallar la creación de la venta si falla la sincronización
          await this.saleRepository.updateSyncStatus(
            sale.id,
            'error',
            null,
            syncError instanceof Error ? syncError.message : 'Error desconocido'
          );
        }
      }

      return {
        success: true,
        message: 'Venta creada exitosamente',
        data: sale,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error creating sale:', error);
      return {
        success: false,
        message: 'Error al crear venta',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtiene una venta por ID
   */
  async getSaleById(id: number): Promise<ApiResponse> {
    try {
      const sale = await this.saleRepository.getSaleById(id);

      if (!sale) {
        return {
          success: false,
          message: 'Venta no encontrada',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        message: 'Venta obtenida exitosamente',
        data: sale,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting sale:', error);
      return {
        success: false,
        message: 'Error al obtener venta',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtiene todas las ventas con filtros
   */
  async getAllSales(filters: SaleFilters = {}): Promise<ApiResponse> {
    try {
      const result = await this.saleRepository.getAllSales(filters);

      return {
        success: true,
        message: 'Ventas obtenidas exitosamente',
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting sales:', error);
      return {
        success: false,
        message: 'Error al obtener ventas',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtiene estadísticas de ventas
   */
  async getSaleStats(): Promise<ApiResponse> {
    try {
      const stats = await this.saleRepository.getSaleStats();

      return {
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting sale stats:', error);
      return {
        success: false,
        message: 'Error al obtener estadísticas',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // SINCRONIZACIÓN CON WOOCOMMERCE
  // =====================================================

  /**
   * Sincroniza una venta a WooCommerce
   * Crea un pedido en WooCommerce y descuenta el stock
   */
  async syncSaleToWooCommerce(saleId: number): Promise<ApiResponse> {
    try {
      if (!this.wooCommerceService.isConfigured()) {
        return {
          success: false,
          message: 'WooCommerce no está configurado',
          timestamp: new Date().toISOString()
        };
      }

      const sale = await this.saleRepository.getSaleById(saleId);
      if (!sale) {
        return {
          success: false,
          message: 'Venta no encontrada',
          timestamp: new Date().toISOString()
        };
      }

      // Si ya está sincronizada, no hacer nada
      if (sale.sync_status === 'synced' && sale.woocommerce_order_id) {
        return {
          success: true,
          message: 'Venta ya está sincronizada con WooCommerce',
          data: { woocommerce_order_id: sale.woocommerce_order_id },
          timestamp: new Date().toISOString()
        };
      }

      // Obtener información del cliente
      const [client] = await executeQuery('SELECT * FROM clients WHERE id = ?', [sale.client_id]);
      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      // Obtener items de la venta
      const items = sale.items || [];
      if (items.length === 0) {
        throw new Error('La venta no tiene items');
      }

      // Preparar line_items para WooCommerce y actualizar stock
      const lineItems = [];
      const stockUpdates: Array<{ productId: number; quantity: number; operation: 'subtract' }> = [];

      for (const item of items) {
        // Obtener información del producto
        const [productData] = await executeQuery(
          'SELECT woocommerce_id, code FROM products WHERE id = ?',
          [item.product_id]
        );

        if (!productData) {
          console.warn(`[SaleService] Producto ${item.product_id} no encontrado, omitiendo`);
          continue;
        }

        let wcProductId: number | null = null;

        // Si tiene woocommerce_id, usarlo directamente
        if (productData.woocommerce_id) {
          wcProductId = productData.woocommerce_id;
        } else if (productData.code) {
          // Si no tiene woocommerce_id, buscar por SKU
          const wcProduct = await this.wooCommerceService.findProductBySku(productData.code);
          if (wcProduct) {
            wcProductId = wcProduct.id;
            // Actualizar el producto en el ERP con el woocommerce_id encontrado
            await executeQuery(
              'UPDATE products SET woocommerce_id = ? WHERE id = ?',
              [wcProductId, item.product_id]
            );
          }
        }

        if (!wcProductId) {
          console.warn(`[SaleService] No se pudo encontrar el producto ${productData.code} en WooCommerce, omitiendo`);
          continue;
        }

        lineItems.push({
          product_id: wcProductId,
          quantity: item.quantity,
          price: item.unit_price
        });

        // Preparar actualización de stock
        stockUpdates.push({
          productId: wcProductId,
          quantity: item.quantity,
          operation: 'subtract'
        });
      }

      if (lineItems.length === 0) {
        throw new Error('No se encontraron productos válidos en WooCommerce para sincronizar');
      }

      // Preparar datos de billing
      const billing = {
        first_name: client.name?.split(' ')[0] || client.name || 'Consumidor',
        last_name: client.name?.split(' ').slice(1).join(' ') || 'Final',
        email: client.email || 'consumidor@final.local',
        phone: client.phone || '',
        address_1: client.address || 'Local',
        address_2: '',
        city: client.city || '',
        state: '',
        postcode: '',
        country: client.country || 'AR',
        company: ''
      };

      // Buscar o crear cliente en WooCommerce
      let wcCustomerId: number | undefined;
      if (client.email) {
        const wcCustomer = await this.wooCommerceService.findCustomerByEmail(client.email);
        if (wcCustomer) {
          wcCustomerId = wcCustomer.id;
        } else {
          // Crear cliente en WooCommerce
          const newWcCustomer = await this.wooCommerceService.createCustomer({
            email: client.email,
            first_name: billing.first_name,
            last_name: billing.last_name,
            phone: billing.phone,
            billing: billing
          });
          wcCustomerId = newWcCustomer.id;
        }
      }

      // Crear pedido en WooCommerce (estado: completed, porque es una venta ya realizada)
      const wcOrder = await this.wooCommerceService.createOrder({
        customer_id: wcCustomerId,
        billing: billing,
        shipping: billing, // Mismo que billing para ventas locales
        line_items: lineItems,
        status: 'completed', // Venta ya realizada
        currency: 'ARS',
        payment_method: sale.payment_method === 'efectivo' ? 'cash' : 
                       sale.payment_method === 'tarjeta' ? 'card' : 'bacs',
        payment_method_title: sale.payment_method === 'efectivo' ? 'Efectivo' :
                             sale.payment_method === 'tarjeta' ? 'Tarjeta' :
                             sale.payment_method === 'transferencia' ? 'Transferencia' : 'Mixto',
        customer_note: `Venta local - ${sale.sale_number}${sale.notes ? ` - ${sale.notes}` : ''}`,
        meta_data: [
          { key: '_erp_sale_id', value: sale.id.toString() },
          { key: '_erp_sale_number', value: sale.sale_number },
          { key: '_local_sale', value: 'true' }
        ]
      });

      // Actualizar stock en WooCommerce (descontar productos vendidos)
      const stockResults = await this.wooCommerceService.updateMultipleProductsStock(stockUpdates);
      
      // Verificar si hubo errores en la actualización de stock
      const stockErrors = stockResults.filter(r => !r.success);
      if (stockErrors.length > 0) {
        console.warn('[SaleService] Algunos productos no pudieron actualizar stock en WooCommerce:', stockErrors);
        // No fallar la sincronización completa, pero registrar el error
      }

      // Actualizar estado de sincronización
      await this.saleRepository.updateSyncStatus(
        sale.id,
        'synced',
        wcOrder.id,
        stockErrors.length > 0 ? `Algunos productos no actualizaron stock: ${stockErrors.map(e => e.error).join(', ')}` : null
      );

      return {
        success: true,
        message: 'Venta sincronizada a WooCommerce exitosamente',
        data: {
          woocommerce_order_id: wcOrder.id,
          woocommerce_order_number: wcOrder.number,
          stock_updates: stockResults
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[SaleService] Error sincronizando venta a WooCommerce:', error);
      
      // Actualizar estado de error
      try {
        await this.saleRepository.updateSyncStatus(
          saleId,
          'error',
          null,
          error instanceof Error ? error.message : 'Error desconocido'
        );
      } catch (updateError) {
        console.error('[SaleService] Error actualizando estado de sincronización:', updateError);
      }

      return {
        success: false,
        message: 'Error al sincronizar venta con WooCommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Reintenta la sincronización de una venta
   */
  async retrySync(saleId: number): Promise<ApiResponse> {
    return await this.syncSaleToWooCommerce(saleId);
  }

  // =====================================================
  // INTEGRACIÓN CON MÓDULO DE CAJA
  // =====================================================

  /**
   * Registra el ingreso de una venta en el módulo de caja (payments)
   */
  private async registerPayment(sale: Sale, userId: number | null): Promise<void> {
    try {
      // Si el método de pago es mixto, crear múltiples registros
      if (sale.payment_method === 'mixto' && sale.payment_details) {
        const details = sale.payment_details;
        
        if (details.efectivo && details.efectivo > 0) {
          await executeQuery(
            `INSERT INTO payments (
              type, method, amount, currency, payment_date, status,
              related_type, related_id, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              'income',
              'efectivo',
              details.efectivo,
              'ARS',
              sale.sale_date,
              'posted',
              'sale',
              sale.id,
              `Venta ${sale.sale_number} - Efectivo`,
              userId
            ]
          );
        }

        if (details.tarjeta && details.tarjeta > 0) {
          await executeQuery(
            `INSERT INTO payments (
              type, method, amount, currency, payment_date, status,
              related_type, related_id, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              'income',
              'tarjeta',
              details.tarjeta,
              'ARS',
              sale.sale_date,
              'posted',
              'sale',
              sale.id,
              `Venta ${sale.sale_number} - Tarjeta`,
              userId
            ]
          );
        }

        if (details.transferencia && details.transferencia > 0) {
          await executeQuery(
            `INSERT INTO payments (
              type, method, amount, currency, payment_date, status,
              related_type, related_id, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              'income',
              'transferencia',
              details.transferencia,
              'ARS',
              sale.sale_date,
              'posted',
              'sale',
              sale.id,
              `Venta ${sale.sale_number} - Transferencia`,
              userId
            ]
          );
        }
      } else {
        // Método de pago único
        await executeQuery(
          `INSERT INTO payments (
            type, method, amount, currency, payment_date, status,
            related_type, related_id, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'income',
            sale.payment_method,
            sale.total_amount,
            'ARS',
            sale.sale_date,
            'posted',
            'sale',
            sale.id,
            `Venta ${sale.sale_number}`,
            userId
          ]
        );
      }
    } catch (error) {
      console.error('[SaleService] Error registrando pago en módulo de caja:', error);
      // No fallar la creación de la venta si falla el registro del pago
    }
  }

  // =====================================================
  // VALIDACIONES
  // =====================================================

  /**
   * Valida que haya stock disponible para los productos
   */
  private async validateStockAvailability(items: Array<{ product_id: number; quantity: number }>): Promise<void> {
    for (const item of items) {
      const product = await this.productService.getProductById(item.product_id);
      if (!product) {
        throw new Error(`Producto con ID ${item.product_id} no encontrado`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para el producto ${product.name} (${product.code}). ` +
          `Stock disponible: ${product.stock}, cantidad solicitada: ${item.quantity}`
        );
      }
    }
  }

  /**
   * Valida que los productos existan y estén activos
   */
  private async validateProducts(items: Array<{ product_id: number }>): Promise<void> {
    for (const item of items) {
      const product = await this.productService.getProductById(item.product_id);
      if (!product) {
        throw new Error(`Producto con ID ${item.product_id} no encontrado`);
      }

      if (!product.is_active) {
        throw new Error(`El producto ${product.name} (${product.code}) está inactivo`);
      }
    }
  }
}
