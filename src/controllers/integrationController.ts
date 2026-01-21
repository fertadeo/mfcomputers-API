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
    try {
      const { action, product } = req.body;
      
      console.log('Webhook recibido de WooCommerce:', { action, product });
      
      if (action === 'product.updated' && product) {
        const { sku, stock_quantity } = product;
        
         if (sku && typeof stock_quantity === 'number') {
           // Buscar producto por código
           const existingProduct = await this.productService.getProductByCode(sku);
           console.log('Producto encontrado:', existingProduct);
          if (existingProduct) {
            // Actualizar stock en ERP
            await this.productService.updateStock(existingProduct.id, stock_quantity, 'set');
            console.log(`Stock actualizado para SKU ${sku}: ${stock_quantity}`);
          }
        }
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Webhook procesado exitosamente',
        data: { action, processed: true },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('WooCommerce webhook error:', error);
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
    try {
      console.log('=== RECIBIENDO PEDIDO DESDE WOOCOMMERCE WEBHOOK ===');
      console.log('Body completo:', JSON.stringify(req.body, null, 2));
      console.log('Content-Type:', req.headers['content-type']);

      // WooCommerce envía el pedido directamente en el body
      const wooCommerceOrder = req.body;

      // Validar que sea un pedido válido de WooCommerce
      if (!wooCommerceOrder || !wooCommerceOrder.id) {
        const response: ApiResponse = {
          success: false,
          message: 'Formato de pedido inválido',
          error: 'El body debe contener un pedido válido de WooCommerce con campo "id"',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

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

      console.log('Pedido transformado:', JSON.stringify(transformedOrder, null, 2));

      // Validar datos requeridos
      if (!transformedOrder.customer.email) {
        const response: ApiResponse = {
          success: false,
          message: 'Email del cliente requerido',
          error: 'El pedido de WooCommerce debe incluir un email en billing.email',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!transformedOrder.line_items || transformedOrder.line_items.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'El pedido debe incluir al menos un producto',
          error: 'El pedido de WooCommerce debe incluir line_items con al menos un producto',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verificar si el pedido ya existe (evitar duplicados)
      if (transformedOrder.woocommerce_order_id) {
        const existingOrder = await this.orderService.getOrderByWooCommerceId(transformedOrder.woocommerce_order_id);
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

      for (const item of transformedOrder.line_items) {
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
          unit_price: parseFloat(String(item.price || product.price))
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
      const toNull = (value: any): any => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'string' && value.trim() === '') return null;
        return value;
      };

      const orderData: CreateOrderData = {
        client_id: client.id,
        order_number: transformedOrder.order_number ? `WC-${transformedOrder.order_number}` : undefined,
        woocommerce_order_id: transformedOrder.woocommerce_order_id ? parseInt(String(transformedOrder.woocommerce_order_id), 10) : undefined,
        status: 'pendiente_preparacion',
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

      // 6. Retornar pedido creado
      const response: ApiResponse = {
        success: true,
        message: 'Pedido recibido desde WooCommerce y creado exitosamente',
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
      console.error('Error recibiendo pedido desde WooCommerce webhook:', error);
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

