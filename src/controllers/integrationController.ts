import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { OrderService } from '../services/OrderService';
import { ApiResponse, ClientType, SalesChannel } from '../types';
import { executeQuery } from '../config/database';
import { CreateOrderData, CreateOrderItemData } from '../entities/Order';
import bcrypt from 'bcryptjs';

export class IntegrationController {
  private productService: ProductService;
  private orderService: OrderService;

  constructor() {
    this.productService = new ProductService();
    this.orderService = new OrderService();
  }

  // GET /api/integration/hello - Hola mundo endpoint para probar conexión
  public async helloWorld(req: Request, res: Response): Promise<void> {
    try {
      const response: ApiResponse = {
        success: true,
        message: '¡Hola Mundo! Conexión exitosa con MF Computers API',
        data: {
          api_name: 'MF Computers API',
          version: '1.0.0',
          status: 'active',
          timestamp: new Date().toISOString(),
          integration_ready: true,
          available_endpoints: {
            products: '/api/products',
            clients: '/api/clients',
            stock: '/api/products/stock',
            health: '/health'
          }
        },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Hello world error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error en endpoint hello world',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/integration/products/woocommerce - Obtener productos formateados para WooCommerce
  public async getProductsForWooCommerce(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, per_page = 10 } = req.query;
      
      const pageNum = parseInt(String(page), 10) || 1;
      const perPageNum = parseInt(String(per_page), 10) || 10;
      
      const { products, total } = await this.productService.getAllProducts({
        page: pageNum,
        limit: perPageNum,
        active_only: true
      });
      
      // Formatear productos para WooCommerce
      const wooCommerceProducts = products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.name.toLowerCase().replace(/\s+/g, '-'),
        permalink: `https://tu-tienda.com/producto/${product.name.toLowerCase().replace(/\s+/g, '-')}`,
        sku: product.code,
        price: product.price.toString(),
        regular_price: product.price.toString(),
        sale_price: '',
        on_sale: false,
        status: product.is_active ? 'publish' : 'draft',
        purchasable: product.stock > 0,
        stock_quantity: product.stock,
        stock_status: product.stock > 0 ? 'instock' : 'outofstock',
        manage_stock: true,
        backorders: 'no',
        categories: product.category_name ? [{ name: product.category_name }] : [],
        description: product.description || '',
        short_description: product.description ? product.description.substring(0, 160) + '...' : '',
        date_created: product.created_at,
        date_modified: product.updated_at,
        meta_data: [
          {
            key: '_mfcomputers_erp_id',
            value: product.id.toString()
          },
          {
            key: '_mfcomputers_erp_code',
            value: product.code
          }
        ]
      }));
      
      const response: ApiResponse = {
        success: true,
        message: 'Productos formateados para WooCommerce obtenidos exitosamente',
        data: {
          products: wooCommerceProducts,
          pagination: {
            page: pageNum,
            per_page: perPageNum,
            total,
            total_pages: Math.ceil(total / perPageNum)
          }
        },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Get products for WooCommerce error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error obteniendo productos para WooCommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // POST /api/integration/products/sync - Sincronizar stock desde WooCommerce
  public async syncStockFromWooCommerce(req: Request, res: Response): Promise<void> {
    try {
      const { products } = req.body; // Array de productos con { sku, stock_quantity }
      
      if (!Array.isArray(products)) {
        const response: ApiResponse = {
          success: false,
          message: 'Formato inválido. Se espera un array de productos.',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }
      
      const results = [];
      
      for (const product of products) {
        const { sku, stock_quantity } = product;
        
        if (!sku || typeof stock_quantity !== 'number') {
          results.push({
            sku,
            success: false,
            error: 'SKU o stock_quantity inválido'
          });
          continue;
        }
        
         try {
           // Buscar producto por código (SKU)
           const existingProduct = await this.productService.getProductByCode(sku);
          
          if (!existingProduct) {
            results.push({
              sku,
              success: false,
              error: 'Producto no encontrado'
            });
            continue;
          }
          
          // Actualizar stock
          await this.productService.updateStock(existingProduct.id, stock_quantity, 'set');
          
          results.push({
            sku,
            success: true,
            old_stock: existingProduct.stock,
            new_stock: stock_quantity
          });
          
        } catch (error) {
          results.push({
            sku,
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
      
      const successCount = results.filter((r: any) => r.success).length;
      const errorCount = results.filter((r: any) => !r.success).length;
      
      const response: ApiResponse = {
        success: true,
        message: `Sincronización completada. ${successCount} exitosos, ${errorCount} errores.`,
        data: {
          results,
          summary: {
            total: products.length,
            successful: successCount,
            errors: errorCount
          }
        },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Sync stock from WooCommerce error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error sincronizando stock desde WooCommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/integration/stock/summary - Resumen de stock para sincronización
  public async getStockSummary(req: Request, res: Response): Promise<void> {
    try {
      const { products } = await this.productService.getAllProducts({ active_only: true });
      
      const summary = {
        total_products: products.length,
        instock: products.filter(p => p.stock > p.min_stock).length,
        lowstock: products.filter(p => p.stock <= p.min_stock && p.stock > 0).length,
        outofstock: products.filter(p => p.stock === 0).length,
        total_stock_value: products.reduce((sum, p) => sum + (p.stock * p.price), 0)
      };
      
      const response: ApiResponse = {
        success: true,
        message: 'Resumen de stock obtenido exitosamente',
        data: {
          summary,
          products: products.map(p => ({
            sku: p.code,
            name: p.name,
            stock: p.stock,
            min_stock: p.min_stock,
            max_stock: p.max_stock,
            is_active: p.is_active,
            stock_status: p.stock === 0 ? 'outofstock' : p.stock <= p.min_stock ? 'lowstock' : 'instock'
          }))
        },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Get stock summary error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error obteniendo resumen de stock',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // POST /api/integration/webhook/woocommerce - Webhook para recibir actualizaciones de WooCommerce
  public async wooCommerceWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = `WC-PROD-WEBHOOK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      const { action, product } = req.body;
      
      console.log(`[${requestId}] ========== WEBHOOK PRODUCTO RECIBIDO DE WOOCOMMERCE ==========`);
      console.log(`[${requestId}] IP: ${req.ip || req.socket.remoteAddress || 'unknown'}`);
      console.log(`[${requestId}] User-Agent: ${req.get('user-agent') || 'unknown'}`);
      console.log(`[${requestId}] Content-Type: ${req.get('content-type') || 'not set'}`);
      console.log(`[${requestId}] Headers:`, {
        'x-webhook-secret': req.headers['x-webhook-secret'] ? '***presente***' : 'no presente',
        'x-api-key': req.headers['x-api-key'] ? '***presente***' : 'no presente'
      });
      console.log(`[${requestId}] Acción: ${action || 'no action'}`);
      if (product && typeof product === 'object') {
        console.log(`[${requestId}] Producto (preview):`, {
          id: (product as any).id,
          sku: (product as any).sku,
          name: (product as any).name,
          status: (product as any).status,
          stock_quantity: (product as any).stock_quantity,
          price: (product as any).price
        });
      }
      
      // Productos: guardar JSON completo + actualizar campos básicos (stock/precio/estado)
      if (action && typeof action === 'string' && action.startsWith('product.') && product) {
        const sku = product.sku;
        if (sku) {
          const woocommerceIdRaw = product.id;
          const woocommerce_id =
            typeof woocommerceIdRaw === 'number'
              ? woocommerceIdRaw
              : (woocommerceIdRaw ? parseInt(String(woocommerceIdRaw), 10) : null);

          const normalizedPrice =
            product.price !== undefined && product.price !== null && String(product.price).trim() !== ''
              ? Number(product.price)
              : (product.regular_price ? Number(product.regular_price) : undefined);

          const normalizedStock =
            product.stock_quantity !== null && product.stock_quantity !== undefined && String(product.stock_quantity).trim() !== ''
              ? Number(product.stock_quantity)
              : undefined;

          // Extraer URLs de imágenes si vienen en formato WC
          let imageUrls: string[] | undefined;
          if (product.images) {
            if (Array.isArray(product.images)) {
              const urls = product.images
                .map((img: any) =>
                  typeof img === 'string'
                    ? img
                    : (img && typeof img === 'object' && img.src ? img.src : null)
                )
                .filter((url: any): url is string => typeof url === 'string' && url.length > 0);

              imageUrls = urls.length > 0 ? urls : undefined;
            } else if (typeof product.images === 'string') {
              imageUrls = [product.images];
            }
          }

          const existingProduct = await this.productService.getProductByCode(sku);
          console.log(`[${requestId}] Producto en ERP:`, existingProduct ? { id: existingProduct.id, code: existingProduct.code } : 'NO EXISTE');

          if (existingProduct) {
            await this.productService.updateProduct(existingProduct.id, {
              name: product.name !== undefined ? product.name : undefined,
              description: product.description !== undefined ? product.description : undefined,
              price: normalizedPrice !== undefined && !Number.isNaN(normalizedPrice) ? normalizedPrice : undefined,
              stock: normalizedStock !== undefined && !Number.isNaN(normalizedStock) ? normalizedStock : undefined,
              is_active: product.status ? product.status === 'publish' : undefined,
              images: imageUrls !== undefined ? imageUrls : undefined,
              woocommerce_id: woocommerce_id,
              woocommerce_json: product
            });
            console.log(`[${requestId}] ✅ Producto actualizado`, { sku, erp_id: existingProduct.id });
          } else {
            // Si no existe, crear (evita perder el cambio y guarda JSON completo)
            await this.productService.createProduct({
              code: sku,
              name: product.name || `Producto ${sku}`,
              description: product.description || undefined,
              price: normalizedPrice !== undefined && !Number.isNaN(normalizedPrice) ? normalizedPrice : 0,
              stock: normalizedStock !== undefined && !Number.isNaN(normalizedStock) ? normalizedStock : 0,
              images: imageUrls,
              woocommerce_id: woocommerce_id,
              woocommerce_json: product
            });
            console.log(`[${requestId}] ✅ Producto creado`, { sku, woocommerce_id });
          }
        }
      }

      console.log(`[${requestId}] ========== WEBHOOK PROCESADO EN ${Date.now() - startTime}ms ==========`);      
      
      const response: ApiResponse = {
        success: true,
        message: 'Webhook procesado exitosamente',
        data: { action, processed: true },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error(`[${requestId}] ❌ Error webhook producto después de ${Date.now() - startTime}ms:`, error);
      const response: ApiResponse = {
        success: false,
        message: 'Error procesando webhook de WooCommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // POST /api/integration/orders/woocommerce-mayorista - Recibir pedido mayorista desde WooCommerce/N8N
  public async receiveWholesaleOrder(req: Request, res: Response): Promise<void> {
    try {
      // Log completo del body recibido para debugging
      console.log('=== RECIBIENDO PEDIDO MAYORISTA ===');
      console.log('Body completo:', JSON.stringify(req.body, null, 2));
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Body keys:', Object.keys(req.body || {}));

      // N8N a veces envía los datos en un objeto 'data' o directamente en el body
      // Intentar extraer los datos del body directamente o de req.body.data
      let bodyData = req.body;
      
      // Si los datos vienen dentro de un objeto 'data' (común en N8N)
      if (req.body && req.body.data && typeof req.body.data === 'object') {
        console.log('Datos encontrados en req.body.data');
        bodyData = req.body.data;
      }
      // Si los datos vienen dentro de un objeto 'json' (también común en N8N)
      else if (req.body && req.body.json && typeof req.body.json === 'object') {
        console.log('Datos encontrados en req.body.json');
        bodyData = req.body.json;
      }
      // Si los datos vienen dentro de un objeto 'body' (algunos casos de N8N)
      else if (req.body && req.body.body && typeof req.body.body === 'object') {
        console.log('Datos encontrados en req.body.body');
        bodyData = req.body.body;
      }

      const {
        order_date,           // Fecha y hora del pedido
        order_number,         // Número de pedido de WooCommerce (opcional)
        woocommerce_order_id, // ID del pedido en WooCommerce (para evitar duplicados)
        customer,             // Datos del cliente
        line_items,           // Productos del pedido
        shipping,             // Datos de envío
        total,                // Total del pedido (opcional, se calcula)
        billing,              // Datos de facturación
        meta_data             // Metadatos adicionales
      } = bodyData;

      console.log('Datos extraídos:', {
        order_date,
        order_number,
        customer: customer ? (typeof customer === 'object' ? JSON.stringify(customer) : customer) : 'undefined',
        customer_email: customer?.email,
        customer_type: typeof customer,
        line_items: line_items ? (Array.isArray(line_items) ? `Array[${line_items.length}]` : line_items) : 'undefined',
        line_items_count: line_items?.length,
        shipping: shipping ? (typeof shipping === 'object' ? 'object' : shipping) : 'undefined',
        billing: billing ? (typeof billing === 'object' ? 'object' : billing) : 'undefined'
      });

      // Validar datos requeridos con mensajes más detallados
      if (!bodyData) {
        const response: ApiResponse = {
          success: false,
          message: 'Body de la petición está vacío',
          error: 'No se recibieron datos en el body de la petición',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!customer) {
        const response: ApiResponse = {
          success: false,
          message: 'Datos del cliente requeridos',
          error: `Campo 'customer' no encontrado. Campos recibidos en body: ${Object.keys(req.body || {}).join(', ')}. Campos en bodyData: ${Object.keys(bodyData || {}).join(', ')}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Validar que customer es un objeto
      if (typeof customer !== 'object') {
        const response: ApiResponse = {
          success: false,
          message: 'Datos del cliente inválidos',
          error: `Campo 'customer' debe ser un objeto, pero se recibió: ${typeof customer}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!customer.email) {
        const response: ApiResponse = {
          success: false,
          message: 'Email del cliente requerido',
          error: `Campo 'customer.email' no encontrado. Campos en customer: ${Object.keys(customer).join(', ')}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'El pedido debe incluir al menos un producto',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // 0. Verificar si el pedido ya existe (evitar duplicados)
      // Si viene woocommerce_order_id, buscar por ese campo
      // Si no, buscar por order_number
      if (woocommerce_order_id) {
        const existingOrder = await this.orderService.getOrderByWooCommerceId(woocommerce_order_id);
        if (existingOrder && existingOrder.success && existingOrder.data) {
          const response: ApiResponse = {
            success: true,
            message: 'Pedido ya existe en el sistema',
            data: {
              order: existingOrder.data,
              already_exists: true
            },
            timestamp: new Date().toISOString()
          };
          res.status(200).json(response);
          return;
        }
      } else if (order_number) {
        const existingOrder = await this.orderService.getOrderByNumber(order_number);
        if (existingOrder && existingOrder.success && existingOrder.data) {
          const response: ApiResponse = {
            success: true,
            message: 'Pedido ya existe en el sistema',
            data: {
              order: existingOrder.data,
              already_exists: true
            },
            timestamp: new Date().toISOString()
          };
          res.status(200).json(response);
          return;
        }
      }

      // 1. Buscar o crear cliente
      const client = await this.findOrCreateClient({
        email: customer.email,
        name: customer.first_name && customer.last_name 
          ? `${customer.first_name} ${customer.last_name}` 
          : customer.display_name || customer.email,
        phone: customer.phone || billing?.phone,
        address: shipping?.address_1 || billing?.address_1,
        city: shipping?.city || billing?.city,
        country: shipping?.country || billing?.country || 'Argentina'
      });

      // 2. Mapear productos y validar existencia
      const orderItems: CreateOrderItemData[] = [];
      const missingProducts: string[] = [];

      for (const item of line_items) {
        const sku = item.sku;
        if (!sku) {
          console.warn('Item sin SKU:', item);
          continue;
        }

        // Buscar producto por SKU
        const product = await this.productService.getProductByCode(sku);
        if (!product) {
          missingProducts.push(sku);
          console.warn(`Producto no encontrado: ${sku}`);
          continue;
        }

        orderItems.push({
          product_id: product.id,
          quantity: item.quantity || 1,
          unit_price: parseFloat(String(item.price || item.unit_price || product.price))
        });
      }

      // Validar que se encontraron productos
      if (orderItems.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'No se encontraron productos válidos para el pedido',
          error: missingProducts.length > 0 
            ? `Productos no encontrados: ${missingProducts.join(', ')}`
            : 'Todos los productos tienen SKU inválido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // 3. Preparar datos del pedido
      // Helper para convertir undefined y strings vacíos a null
      const toNull = (value: any): any => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'string' && value.trim() === '') return null;
        return value;
      };
      
      const orderData: CreateOrderData = {
        client_id: client.id,
        order_number: order_number ? `WC-${order_number}` : undefined, // Prefijo WC- para identificar pedidos de WooCommerce
        woocommerce_order_id: woocommerce_order_id ? parseInt(String(woocommerce_order_id), 10) : undefined,
        status: 'pendiente_preparacion',
        delivery_date: shipping?.delivery_date || order_date || undefined,
        delivery_address: toNull(shipping?.address_1 || billing?.address_1),
        delivery_city: toNull(shipping?.city || billing?.city),
        delivery_contact: toNull(
          shipping?.first_name && shipping?.last_name
            ? `${shipping.first_name} ${shipping.last_name}`
            : customer.display_name || customer.email
        ),
        delivery_phone: toNull(shipping?.phone || customer.phone || billing?.phone),
        transport_company: toNull(shipping?.method), // Convierte string vacío "" a null
        transport_cost: shipping?.total && shipping.total !== '' && shipping.total !== '0.00' 
          ? parseFloat(String(shipping.total)) 
          : 0,
        notes: `Pedido desde WooCommerce Mayorista${order_number ? ` - Order #${order_number}` : ''}${woocommerce_order_id ? ` (WC ID: ${woocommerce_order_id})` : ''}${meta_data ? `\n${JSON.stringify(meta_data)}` : ''}`,
        items: orderItems
      };

      // 4. Obtener o crear usuario del sistema para pedidos automáticos
      const userId = await this.getOrCreateSystemUser();

      // 5. Crear pedido
      const result = await this.orderService.createOrder(orderData, userId);

      if (!result.success) {
        const response: ApiResponse = {
          success: false,
          message: 'Error al crear pedido',
          error: result.error || 'Error desconocido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // 5. Retornar pedido creado
      const response: ApiResponse = {
        success: true,
        message: 'Pedido mayorista recibido y creado exitosamente',
        data: {
          order: result.data,
          warnings: missingProducts.length > 0 
            ? [`Productos no encontrados: ${missingProducts.join(', ')}`]
            : []
        },
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Error recibiendo pedido mayorista:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error procesando pedido mayorista desde WooCommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // Método auxiliar para buscar o crear cliente
  private async findOrCreateClient(clientData: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  }): Promise<any> {
    try {
      // Buscar cliente por email
      const query = 'SELECT * FROM clients WHERE email = ? AND is_active = 1 LIMIT 1';
      const [existingClient] = await executeQuery(query, [clientData.email]);

      if (existingClient) {
        console.log('Cliente existente encontrado:', existingClient.email);
        return existingClient;
      }

      // Crear nuevo cliente (tipo mayorista, canal woocommerce_mayorista)
      console.log('Creando nuevo cliente:', clientData.email);
      
      // Generar código de cliente
      const code = await this.generateClientCode(ClientType.MAYORISTA);

      const insertQuery = `
        INSERT INTO clients (
          code, client_type, sales_channel, name, email, phone, address, city, country, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `;

      const result = await executeQuery(insertQuery, [
        code,
        ClientType.MAYORISTA,
        SalesChannel.WOOCOMMERCE_MAYORISTA,
        clientData.name,
        clientData.email,
        clientData.phone || null,
        clientData.address || null,
        clientData.city || null,
        clientData.country || 'Argentina'
      ]);

      // Obtener cliente creado
      const [newClient] = await executeQuery(
        'SELECT * FROM clients WHERE id = ?',
        [result.insertId]
      );

      console.log('Cliente creado exitosamente:', newClient.email);
      return newClient;

    } catch (error) {
      console.error('Error buscando/creando cliente:', error);
      throw error;
    }
  }

  // Método auxiliar para generar código de cliente
  private async generateClientCode(clientType: ClientType): Promise<string> {
    try {
      const prefix = clientType.toUpperCase().substring(0, 3); // MAY, MIN, PER
      
      const query = `
        SELECT code 
        FROM clients 
        WHERE client_type = ? AND code LIKE ?
        ORDER BY code DESC 
        LIMIT 1
      `;
      
      const [result] = await executeQuery(query, [clientType, `${prefix}%`]);
      
      let nextNumber = 1;
      if (result && result.code) {
        const match = result.code.match(new RegExp(`${prefix}(\\d+)`));
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generando código de cliente:', error);
      throw new Error('Failed to generate client code');
    }
  }

  // Método auxiliar para obtener o crear usuario del sistema para pedidos automáticos
  private async getOrCreateSystemUser(): Promise<number | null> {
    try {
      // Buscar un usuario existente (preferir admin o el primer usuario activo)
      const query = `
        SELECT id FROM users 
        WHERE is_active = 1 
        ORDER BY 
          CASE role 
            WHEN 'admin' THEN 1 
            WHEN 'manager' THEN 2 
            ELSE 3 
          END
        LIMIT 1
      `;
      
      const [user] = await executeQuery(query);
      
      if (user && user.id) {
        console.log('Usuario del sistema encontrado:', user.id);
        return user.id;
      }

      // Si no existe ningún usuario, intentar crear uno del sistema
      console.warn('No se encontró ningún usuario activo. Intentando crear usuario del sistema...');
      
      try {
        // Generar hash de contraseña válido con bcrypt
        // Usar una contraseña aleatoria segura que nunca se usará
        const randomPassword = `system_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        
        const insertQuery = `
          INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `;
        
        const result = await executeQuery(insertQuery, [
          'sistema_woocommerce',
          'sistema@mfcomputers.com.ar',
          passwordHash,
          'Sistema',
          'WooCommerce',
          'employee'
        ]);
        
        console.log('Usuario del sistema creado exitosamente:', result.insertId);
        return result.insertId;
      } catch (createError: any) {
        console.error('Error creando usuario del sistema:', createError);
        
        // Si el error es por restricción única (usuario ya existe), intentar buscarlo de nuevo
        if (createError.code === 'ER_DUP_ENTRY') {
          console.log('Usuario ya existe, buscando nuevamente...');
          const [existingUser] = await executeQuery(
            'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
            ['sistema_woocommerce', 'sistema@mfcomputers.com']
          );
          if (existingUser && existingUser.id) {
            return existingUser.id;
          }
        }
        
        // Si no se puede crear, intentar usar NULL (requiere migración SQL)
        console.warn('No se pudo crear usuario. Se usará NULL para created_by.');
        console.warn('NOTA: Necesitas ejecutar la migración SQL para permitir NULL en created_by.');
        console.warn('Archivo: src/database/migration_orders_allow_null_created_by.sql');
        return null;
      }
    } catch (error) {
      console.error('Error obteniendo usuario del sistema:', error);
      // En caso de error, retornar null y ver si la base de datos lo acepta
      return null;
    }
  }

  // POST /api/integration/webhook/woocommerce/order - Recibir pedido directamente desde WooCommerce webhook
  public async receiveWooCommerceOrder(req: Request, res: Response): Promise<void> {
    const requestId = `WC-ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`[${requestId}] ========== RECIBIENDO PEDIDO DESDE WOOCOMMERCE WEBHOOK ==========`);
      console.log(`[${requestId}] IP: ${req.ip || req.socket.remoteAddress || 'unknown'}`);
      console.log(`[${requestId}] Content-Type: ${req.headers['content-type']}`);
      console.log(`[${requestId}] Body type: ${typeof req.body}`);
      console.log(`[${requestId}] Body keys: ${req.body ? Object.keys(req.body).join(', ') : 'body is null/undefined'}`);
      console.log(`[${requestId}] Body completo:`, JSON.stringify(req.body, null, 2));
      
      // WooCommerce envía el pedido directamente en el body
      const wooCommerceOrder = req.body;

      // Validar que el body exista y tenga contenido
      if (!req.body || Object.keys(req.body).length === 0) {
        console.error(`[${requestId}] ❌ ERROR: Body vacío o no parseado`);
        const response: ApiResponse = {
          success: false,
          message: 'Body vacío',
          error: 'No se recibió ningún dato en el body de la petición. Verifica que Express esté configurado para parsear JSON.',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Manejar webhooks de prueba de WooCommerce (solo contienen webhook_id)
      if (wooCommerceOrder.webhook_id && !wooCommerceOrder.id) {
        console.log(`[${requestId}] ℹ️ Webhook de prueba recibido (webhook_id: ${wooCommerceOrder.webhook_id})`);
        const response: ApiResponse = {
          success: true,
          message: 'Webhook de prueba recibido correctamente',
          data: {
            webhook_id: wooCommerceOrder.webhook_id,
            is_test: true
          },
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
        return;
      }

      // Validar que sea un pedido válido de WooCommerce
      if (!wooCommerceOrder.id) {
        console.error(`[${requestId}] ❌ ERROR: Pedido sin ID`);
        console.error(`[${requestId}] Body recibido:`, JSON.stringify(req.body, null, 2));
        const response: ApiResponse = {
          success: false,
          message: 'Formato de pedido inválido',
          error: `El body debe contener un pedido válido de WooCommerce con campo "id". Campos recibidos: ${Object.keys(wooCommerceOrder).join(', ')}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      console.log(`[${requestId}] Pedido ID: ${wooCommerceOrder.id}, Número: ${wooCommerceOrder.number || 'N/A'}`);

      // ⭐ NUEVO: Detectar el tipo de acción (create, update, delete)
      // Puede venir en el header o en el body
      const action = (req.headers['x-order-action'] as string) || wooCommerceOrder.action || 'create';
      console.log(`[${requestId}] Acción detectada: ${action}`);

      // Transformar el formato de WooCommerce al formato interno del sistema
      const transformedOrder = {
        order_date: wooCommerceOrder.date_created || wooCommerceOrder.date_created_gmt || new Date().toISOString(),
        order_number: wooCommerceOrder.number || wooCommerceOrder.id.toString(),
        woocommerce_order_id: wooCommerceOrder.id,
        customer: {
          email: wooCommerceOrder.billing?.email || wooCommerceOrder.customer_id?.toString(),
          first_name: wooCommerceOrder.billing?.first_name || '',
          last_name: wooCommerceOrder.billing?.last_name || '',
          phone: wooCommerceOrder.billing?.phone || '',
          display_name: `${wooCommerceOrder.billing?.first_name || ''} ${wooCommerceOrder.billing?.last_name || ''}`.trim() || wooCommerceOrder.billing?.email || ''
        },
        line_items: (wooCommerceOrder.line_items || []).map((item: any) => ({
          sku: item.sku || null,
          quantity: item.quantity || 1,
          price: parseFloat(item.price || item.total || 0) / (item.quantity || 1), // Precio unitario
          product_name: item.name || ''
        })),
        shipping: {
          address_1: wooCommerceOrder.shipping?.address_1 || wooCommerceOrder.billing?.address_1 || '',
          city: wooCommerceOrder.shipping?.city || wooCommerceOrder.billing?.city || '',
          country: wooCommerceOrder.shipping?.country || wooCommerceOrder.billing?.country || 'AR',
          phone: wooCommerceOrder.shipping?.phone || wooCommerceOrder.billing?.phone || '',
          method: wooCommerceOrder.shipping_lines?.[0]?.method_title || '',
          total: wooCommerceOrder.shipping_total || '0'
        },
        billing: {
          address_1: wooCommerceOrder.billing?.address_1 || '',
          city: wooCommerceOrder.billing?.city || '',
          country: wooCommerceOrder.billing?.country || 'AR',
          phone: wooCommerceOrder.billing?.phone || ''
        },
        total: wooCommerceOrder.total || '0',
        meta_data: wooCommerceOrder.meta_data || []
      };

      console.log(`[${requestId}] Pedido transformado:`, {
        order_number: transformedOrder.order_number,
        woocommerce_order_id: transformedOrder.woocommerce_order_id,
        customer_email: transformedOrder.customer.email,
        line_items_count: transformedOrder.line_items?.length || 0
      });

      // Validar datos requeridos
      if (!transformedOrder.customer.email) {
        console.error(`[${requestId}] ❌ ERROR: Falta email del cliente`);
        console.error(`[${requestId}] Billing recibido:`, JSON.stringify(wooCommerceOrder.billing, null, 2));
        const response: ApiResponse = {
          success: false,
          message: 'Email del cliente requerido',
          error: `El pedido de WooCommerce debe incluir un email en billing.email. Billing recibido: ${JSON.stringify(wooCommerceOrder.billing)}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!transformedOrder.line_items || transformedOrder.line_items.length === 0) {
        console.error(`[${requestId}] ❌ ERROR: Pedido sin productos`);
        console.error(`[${requestId}] Line items recibidos:`, JSON.stringify(wooCommerceOrder.line_items, null, 2));
        const response: ApiResponse = {
          success: false,
          message: 'El pedido debe incluir al menos un producto',
          error: `El pedido de WooCommerce debe incluir line_items con al menos un producto. Line items recibidos: ${wooCommerceOrder.line_items ? wooCommerceOrder.line_items.length : 0}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // ⭐ NUEVO: Manejar diferentes acciones (create, update, delete)
      if (transformedOrder.woocommerce_order_id) {
        const existingOrder = await this.orderService.getOrderByWooCommerceId(transformedOrder.woocommerce_order_id);
        
        if (existingOrder && existingOrder.success && existingOrder.data) {
          const existingOrderData = existingOrder.data as any;
          
          // Si es una eliminación
          if (action === 'delete') {
            console.log(`[${requestId}] 🗑️ Procesando eliminación de pedido ID: ${existingOrderData.id}`);
            const deleteResult = await this.orderService.deleteOrder(existingOrderData.id);
            
            if (deleteResult.success) {
              const response: ApiResponse = {
                success: true,
                message: 'Pedido eliminado exitosamente',
                data: {
                  order_id: existingOrderData.id,
                  woocommerce_order_id: transformedOrder.woocommerce_order_id,
                  action: 'delete'
                },
                timestamp: new Date().toISOString()
              };
              res.status(200).json(response);
              return;
            } else {
              const response: ApiResponse = {
                success: false,
                message: 'Error al eliminar pedido',
                error: deleteResult.error || 'Error desconocido',
                timestamp: new Date().toISOString()
              };
              res.status(500).json(response);
              return;
            }
          }
          
          // Si es una actualización
          if (action === 'update') {
            console.log(`[${requestId}] 🔄 Procesando actualización de pedido ID: ${existingOrderData.id}`);
            // Continuar con el flujo de actualización más abajo
            // No retornar aquí, dejar que continúe para actualizar el pedido
          }
          
          // Si es creación y ya existe, evitar duplicados
          if (action === 'create') {
            console.log(`[${requestId}] ⚠️ Pedido ya existe, omitiendo creación duplicada`);
            const response: ApiResponse = {
              success: true,
              message: 'Pedido ya existe en el sistema',
              data: {
                order: existingOrderData,
                already_exists: true
              },
              timestamp: new Date().toISOString()
            };
            res.status(200).json(response);
            return;
          }
        } else {
          // Si no existe pero es update o delete, no podemos procesarlo
          if (action === 'update' || action === 'delete') {
            console.error(`[${requestId}] ❌ ERROR: No se puede ${action} un pedido que no existe`);
            const response: ApiResponse = {
              success: false,
              message: `No se puede ${action === 'update' ? 'actualizar' : 'eliminar'} un pedido que no existe`,
              error: `Pedido con woocommerce_order_id ${transformedOrder.woocommerce_order_id} no encontrado en el sistema`,
              timestamp: new Date().toISOString()
            };
            res.status(404).json(response);
            return;
          }
        }
      }

      // 1. Buscar o crear cliente
      const client = await this.findOrCreateClient({
        email: transformedOrder.customer.email,
        name: transformedOrder.customer.display_name || transformedOrder.customer.email,
        phone: transformedOrder.customer.phone || transformedOrder.billing.phone,
        address: transformedOrder.shipping.address_1 || transformedOrder.billing.address_1,
        city: transformedOrder.shipping.city || transformedOrder.billing.city,
        country: transformedOrder.shipping.country || transformedOrder.billing.country || 'Argentina'
      });

      // 2. Mapear productos y validar existencia
      const orderItems: CreateOrderItemData[] = [];
      const missingProducts: string[] = [];

      for (const wcItem of wooCommerceOrder.line_items || []) {
        const sku = wcItem.sku;
        if (!sku) {
          console.warn('Item sin SKU:', wcItem);
          continue;
        }

        // Buscar producto por SKU
        const product = await this.productService.getProductByCode(sku);
        if (!product) {
          missingProducts.push(sku);
          console.warn(`Producto no encontrado: ${sku}`);
          continue;
        }

        // Calcular precios
        const quantity = wcItem.quantity || 1;
        const total = parseFloat(String(wcItem.total || 0));
        const unitPrice = quantity > 0 ? total / quantity : 0;
        const subtotal = parseFloat(String(wcItem.subtotal || total));
        const subtotalTax = parseFloat(String(wcItem.subtotal_tax || 0));
        const totalTax = parseFloat(String(wcItem.total_tax || 0));

        orderItems.push({
          product_id: product.id,
          quantity: quantity,
          unit_price: unitPrice,
          // Campos adicionales de WooCommerce
          woocommerce_item_id: wcItem.id,
          woocommerce_product_id: wcItem.product_id,
          woocommerce_variation_id: wcItem.variation_id || null,
          product_name_wc: wcItem.name,
          tax_class: wcItem.tax_class || null,
          subtotal: subtotal,
          subtotal_tax: subtotalTax,
          total_tax: totalTax
        });
      }

      // Validar que se encontraron productos
      if (orderItems.length === 0) {
        console.error(`[${requestId}] ❌ ERROR: No se encontraron productos válidos`);
        console.error(`[${requestId}] Productos faltantes: ${missingProducts.join(', ')}`);
        const response: ApiResponse = {
          success: false,
          message: 'No se encontraron productos válidos para el pedido',
          error: missingProducts.length > 0 
            ? `Productos no encontrados en el ERP: ${missingProducts.join(', ')}`
            : 'Todos los productos tienen SKU inválido o vacío',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // 3. Preparar datos del pedido
      const toNull = (value: any): any => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'string' && value.trim() === '') return null;
        return value;
      };

      // ⭐ NUEVO: Mapear estado de WooCommerce al estado del ERP
      const mapWooCommerceStatus = (wcStatus: string): string => {
        const statusMap: Record<string, string> = {
          'pending': 'pendiente_preparacion',
          'processing': 'en_proceso',
          'on-hold': 'pendiente_preparacion',
          'completed': 'completado',
          'cancelled': 'cancelado',
          'refunded': 'cancelado',
          'failed': 'cancelado'
        };
        return statusMap[wcStatus] || 'pendiente_preparacion';
      };

      const orderStatus = wooCommerceOrder.status 
        ? mapWooCommerceStatus(wooCommerceOrder.status)
        : 'pendiente_preparacion';

      const orderData: CreateOrderData = {
        client_id: client.id,
        order_number: transformedOrder.order_number ? `WC-${transformedOrder.order_number}` : undefined,
        woocommerce_order_id: transformedOrder.woocommerce_order_id ? parseInt(String(transformedOrder.woocommerce_order_id), 10) : undefined,
        // Marcar como pedido de WooCommerce y guardar JSON completo recibido del webhook
        canal_venta: 'woocommerce',
        json: wooCommerceOrder, // JSON completo recibido del webhook de WooCommerce (incluye todos los datos: line_items, billing, shipping, meta_data, etc.)
        status: orderStatus as 'pendiente_preparacion' | 'listo_despacho' | 'pagado' | 'aprobado' | undefined, // ⭐ NUEVO: Usar estado mapeado de WooCommerce
        delivery_date: transformedOrder.order_date || undefined,
        delivery_address: toNull(transformedOrder.shipping.address_1 || transformedOrder.billing.address_1),
        delivery_city: toNull(transformedOrder.shipping.city || transformedOrder.billing.city),
        delivery_contact: toNull(transformedOrder.customer.display_name || transformedOrder.customer.email),
        delivery_phone: toNull(transformedOrder.shipping.phone || transformedOrder.customer.phone || transformedOrder.billing.phone),
        transport_company: toNull(transformedOrder.shipping.method),
        transport_cost: transformedOrder.shipping.total && transformedOrder.shipping.total !== '' && transformedOrder.shipping.total !== '0.00' 
          ? parseFloat(String(transformedOrder.shipping.total)) 
          : 0,
        notes: `Pedido desde WooCommerce${transformedOrder.order_number ? ` - Order #${transformedOrder.order_number}` : ''}${transformedOrder.woocommerce_order_id ? ` (WC ID: ${transformedOrder.woocommerce_order_id})` : ''}${wooCommerceOrder.status ? ` - Estado WC: ${wooCommerceOrder.status}` : ''}`,
        items: orderItems,
        // Campos adicionales de WooCommerce
        payment_method: toNull(wooCommerceOrder.payment_method),
        payment_method_title: toNull(wooCommerceOrder.payment_method_title),
        transaction_id: toNull(wooCommerceOrder.transaction_id),
        customer_ip_address: toNull(wooCommerceOrder.customer_ip_address),
        currency: toNull(wooCommerceOrder.currency || 'ARS'),
        discount_total: wooCommerceOrder.discount_total ? parseFloat(String(wooCommerceOrder.discount_total)) : 0,
        tax_total: wooCommerceOrder.total_tax ? parseFloat(String(wooCommerceOrder.total_tax)) : 0,
        date_paid: wooCommerceOrder.date_paid || wooCommerceOrder.date_paid_gmt || undefined,
        date_completed: wooCommerceOrder.date_completed || wooCommerceOrder.date_completed_gmt || undefined,
        billing_address_2: toNull(wooCommerceOrder.billing?.address_2),
        billing_state: toNull(wooCommerceOrder.billing?.state),
        billing_postcode: toNull(wooCommerceOrder.billing?.postcode),
        billing_company: toNull(wooCommerceOrder.billing?.company),
        shipping_address_2: toNull(wooCommerceOrder.shipping?.address_2),
        shipping_state: toNull(wooCommerceOrder.shipping?.state),
        shipping_postcode: toNull(wooCommerceOrder.shipping?.postcode),
        shipping_company: toNull(wooCommerceOrder.shipping?.company),
        total_amount: wooCommerceOrder.total ? parseFloat(String(wooCommerceOrder.total)) : undefined,
        // Guardar TODOS los datos completos de WooCommerce en formato JSON
        woocommerce_raw_data: wooCommerceOrder,
        // ⭐ IMPORTANTE: Agregar flag para evitar sincronización de vuelta a WooCommerce (viene de WooCommerce)
        sync_to_woocommerce: false
      } as any;

      // 4. Obtener o crear usuario del sistema para pedidos automáticos
      const userId = await this.getOrCreateSystemUser();

      // 5. Crear o actualizar pedido según la acción
      let result;
      let actionMessage = '';
      
      if (action === 'update') {
        // Buscar el pedido existente para actualizarlo
        const existingOrder = await this.orderService.getOrderByWooCommerceId(transformedOrder.woocommerce_order_id!);
        if (existingOrder && existingOrder.success && existingOrder.data) {
          const existingOrderData = existingOrder.data as any;
          console.log(`[${requestId}] 🔄 Actualizando pedido existente ID: ${existingOrderData.id}`);
          
          // Preparar datos de actualización
          const updateData: any = {
            status: orderStatus,
            json: wooCommerceOrder,
            delivery_address: toNull(transformedOrder.shipping.address_1 || transformedOrder.billing.address_1),
            delivery_city: toNull(transformedOrder.shipping.city || transformedOrder.billing.city),
            delivery_contact: toNull(transformedOrder.customer.display_name || transformedOrder.customer.email),
            delivery_phone: toNull(transformedOrder.shipping.phone || transformedOrder.customer.phone || transformedOrder.billing.phone),
            transport_company: toNull(transformedOrder.shipping.method),
            transport_cost: transformedOrder.shipping.total && transformedOrder.shipping.total !== '' && transformedOrder.shipping.total !== '0.00' 
              ? parseFloat(String(transformedOrder.shipping.total)) 
              : 0,
            notes: `Pedido desde WooCommerce${transformedOrder.order_number ? ` - Order #${transformedOrder.order_number}` : ''}${transformedOrder.woocommerce_order_id ? ` (WC ID: ${transformedOrder.woocommerce_order_id})` : ''}${wooCommerceOrder.status ? ` - Estado WC: ${wooCommerceOrder.status}` : ''} - Actualizado: ${new Date().toISOString()}`,
            total_amount: wooCommerceOrder.total ? parseFloat(String(wooCommerceOrder.total)) : undefined,
            // ⭐ IMPORTANTE: Desactivar sincronización de vuelta a WooCommerce (viene de WooCommerce)
            sync_to_woocommerce: false
          };
          
          result = await this.orderService.updateOrder(existingOrderData.id, updateData, userId);
          actionMessage = 'Pedido actualizado exitosamente';
        } else {
          // Si no existe, crear uno nuevo
          console.log(`[${requestId}] ⚠️ Pedido no encontrado para actualizar, creando nuevo`);
          // Ya tiene sync_to_woocommerce: false en orderData
          result = await this.orderService.createOrder(orderData, userId);
          actionMessage = 'Pedido creado exitosamente (no existía para actualizar)';
        }
      } else {
        // Crear nuevo pedido
        // Ya tiene sync_to_woocommerce: false en orderData
        result = await this.orderService.createOrder(orderData, userId);
        actionMessage = 'Pedido recibido desde WooCommerce y creado exitosamente';
      }

      if (!result.success) {
        const response: ApiResponse = {
          success: false,
          message: action === 'update' ? 'Error al actualizar pedido' : 'Error al crear pedido',
          error: result.error || 'Error desconocido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // 6. Retornar pedido creado/actualizado
      const response: ApiResponse = {
        success: true,
        message: actionMessage,
        data: {
          order: result.data,
          action: action,
          warnings: missingProducts.length > 0 
            ? [`Productos no encontrados: ${missingProducts.join(', ')}`]
            : []
        },
        timestamp: new Date().toISOString()
      };

      const actionLabel = action === 'update' ? 'actualizado' : 'creado';
      console.log(`[${requestId}] ✅ Pedido ${actionLabel} exitosamente con ID: ${result.data?.id}`);
      res.status(action === 'update' ? 200 : 201).json(response);

    } catch (error: any) {
      console.error(`[${requestId}] ❌ ERROR GENERAL:`, error);
      console.error(`[${requestId}] Stack trace:`, error instanceof Error ? error.stack : 'N/A');
      const response: ApiResponse = {
        success: false,
        message: 'Error procesando pedido desde WooCommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}

