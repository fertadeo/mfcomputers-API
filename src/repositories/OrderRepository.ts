import Database from '../config/database';
import { 
  Order, 
  OrderWithDetails, 
  CreateOrderData, 
  UpdateOrderData,
  OrderFilters,
  OrderStats,
  OrderItem,
  CreateOrderItemData,
  UpdateOrderItemData
} from '../entities/Order';

export class OrderRepository {
  private db: typeof Database;

  constructor() {
    this.db = Database;
  }

  // Función auxiliar para convertir fecha ISO a formato MySQL
  private convertToMySQLDate(dateString: string | undefined | null): string | null {
    if (!dateString) {
      return null;
    }

    try {
      // Convertir fecha ISO a Date object (maneja automáticamente UTC y zonas horarias)
      const date = new Date(dateString);
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.warn(`Fecha inválida: ${dateString}`);
        return null;
      }

      // Usar métodos UTC para obtener la fecha en formato consistente
      // MySQL almacena fechas en formato local, así que convertimos a UTC primero
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');

      // Formato MySQL: YYYY-MM-DD HH:MM:SS
      const mysqlDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      console.log(`Fecha convertida: ${dateString} -> ${mysqlDate}`);
      
      return mysqlDate;
    } catch (error) {
      console.error(`Error convirtiendo fecha: ${dateString}`, error);
      return null;
    }
  }

  // =====================================================
  // ORDERS - Operaciones principales
  // =====================================================

  // Helper para convertir undefined y strings vacíos a null (MySQL no acepta undefined)
  private toNull(value: any): any {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
  }

  async createOrder(data: CreateOrderData, userId: number | null): Promise<Order> {
    const connection = await this.db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Usar order_number personalizado si se proporciona, o generar uno automático
      const orderNumber = data.order_number || await this.generateOrderNumber();
      
      // Convertir fecha de entrega a formato MySQL (ya retorna null si no hay fecha)
      const deliveryDate = this.convertToMySQLDate(data.delivery_date);

      // Crear pedido (created_by puede ser NULL si no hay usuario)
      // Convertir todos los undefined a null explícitamente
      // Preparar todos los valores asegurando que no haya undefined
      const insertValues = [
        orderNumber,
        this.toNull(data.woocommerce_order_id),
        Number(data.client_id), // Asegurar que sea número
        data.status || 'pendiente_preparacion',
        this.toNull(deliveryDate), // Asegurar que no sea undefined
        this.toNull(data.delivery_address),
        this.toNull(data.delivery_city),
        this.toNull(data.delivery_contact),
        this.toNull(data.delivery_phone),
        this.toNull(data.transport_company),
        data.transport_cost !== undefined && data.transport_cost !== null ? Number(data.transport_cost) : 0,
        this.toNull(data.notes),
        userId === undefined || userId === null ? null : Number(userId)
      ];

      // Validar que no haya undefined en los valores
      const hasUndefined = insertValues.some(val => val === undefined);
      if (hasUndefined) {
        console.error('Valores a insertar:', insertValues);
        throw new Error('Algunos valores son undefined. Revisar logs.');
      }

      const [result] = await connection.execute(
        `INSERT INTO orders (
          order_number, woocommerce_order_id, client_id, status, delivery_date,
          delivery_address, delivery_city, delivery_contact, delivery_phone,
          transport_company, transport_cost, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        insertValues
      );

      const orderId = (result as any).insertId;

      if (!orderId) {
        throw new Error('No se pudo obtener el ID del pedido creado');
      }

      // Calcular total_amount del pedido
      let totalAmount = 0;

      // Crear items del pedido
      for (const item of data.items) {
        // Validar que product_id existe
        if (!item.product_id || isNaN(Number(item.product_id))) {
          throw new Error(`Product ID inválido en item: ${JSON.stringify(item)}`);
        }

        // Asegurar que quantity y unit_price no sean undefined o NaN
        const quantity = item.quantity && !isNaN(Number(item.quantity)) ? Number(item.quantity) : 1;
        const unitPrice = item.unit_price && !isNaN(Number(item.unit_price)) ? Number(item.unit_price) : 0;
        const totalPrice = quantity * unitPrice;
        totalAmount += totalPrice;

        await connection.execute(
          `INSERT INTO order_items (
            order_id, product_id, quantity, unit_price, total_price, batch_number, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            Number(orderId), // Asegurar que sea número
            Number(item.product_id), // Asegurar que sea número
            Number(quantity), // Asegurar que sea número
            Number(unitPrice), // Asegurar que sea número
            Number(totalPrice), // Asegurar que sea número
            this.toNull(item.batch_number),
            this.toNull(item.notes)
          ]
        );
      }

      // Agregar costo de transporte al total
      totalAmount += (data.transport_cost || 0);

      // Actualizar total_amount del pedido
      await connection.execute(
        `UPDATE orders SET total_amount = ? WHERE id = ?`,
        [totalAmount, orderId]
      );

      await connection.commit();

      // Retornar pedido creado
      const order = await this.getOrderById(orderId);
      return order!;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getOrderById(id: number): Promise<OrderWithDetails | null> {
    const connection = await this.db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT 
          o.*,
          c.name as client_name,
          c.code as client_code,
          c.email as client_email,
          c.phone as client_phone,
          r.id as remito_id,
          r.remito_number
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN remitos r ON o.id = r.order_id AND r.is_active = TRUE
        WHERE o.id = ? AND o.is_active = TRUE`,
        [id]
      );

      const orders = rows as OrderWithDetails[];
      if (orders.length === 0) return null;

      const order = orders[0];
      
      // Obtener items del pedido
      order.items = await this.getOrderItems(order.id);

      return order;

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderWithDetails | null> {
    const connection = await this.db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT 
          o.*,
          c.name as client_name,
          c.code as client_code,
          c.email as client_email,
          c.phone as client_phone,
          r.id as remito_id,
          r.remito_number
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN remitos r ON o.id = r.order_id AND r.is_active = TRUE
        WHERE o.order_number = ? AND o.is_active = TRUE`,
        [orderNumber]
      );

      const orders = rows as OrderWithDetails[];
      if (orders.length === 0) return null;

      const order = orders[0];
      
      // Obtener items del pedido
      order.items = await this.getOrderItems(order.id);

      return order;

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async getOrderByWooCommerceId(woocommerceOrderId: number): Promise<OrderWithDetails | null> {
    const connection = await this.db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT 
          o.*,
          c.name as client_name,
          c.code as client_code,
          c.email as client_email,
          c.phone as client_phone,
          r.id as remito_id,
          r.remito_number
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN remitos r ON o.id = r.order_id AND r.is_active = TRUE
        WHERE o.woocommerce_order_id = ? AND o.is_active = TRUE`,
        [woocommerceOrderId]
      );

      const orders = rows as OrderWithDetails[];
      if (orders.length === 0) return null;

      const order = orders[0];
      
      // Obtener items del pedido
      order.items = await this.getOrderItems(order.id);

      return order;

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async getAllOrders(filters: OrderFilters = {}): Promise<{ orders: OrderWithDetails[], total: number }> {
    const connection = await this.db.getConnection();
    
    try {
      let whereClause = 'WHERE o.is_active = TRUE';
      const params: any[] = [];

      // Aplicar filtros
      if (filters.status) {
        whereClause += ' AND o.status = ?';
        params.push(filters.status);
      }

      if (filters.client_id) {
        whereClause += ' AND o.client_id = ?';
        params.push(filters.client_id);
      }

      if (filters.remito_status) {
        whereClause += ' AND o.remito_status = ?';
        params.push(filters.remito_status);
      }

      if (filters.date_from) {
        whereClause += ' AND o.order_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND o.order_date <= ?';
        params.push(filters.date_to);
      }

      if (filters.stock_reserved !== undefined) {
        whereClause += ' AND o.stock_reserved = ?';
        params.push(filters.stock_reserved);
      }

      if (filters.has_remito !== undefined) {
        if (filters.has_remito) {
          whereClause += ' AND o.remito_status != ?';
          params.push('sin_remito');
        } else {
          whereClause += ' AND o.remito_status = ?';
          params.push('sin_remito');
        }
      }

      // Obtener total para paginación
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
        params
      );
      const total = (countRows as any)[0].total;

      // Paginación
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      // Obtener pedidos
      const [rows] = await connection.execute(
        `SELECT 
          o.*,
          c.name as client_name,
          c.code as client_code,
          c.email as client_email,
          c.phone as client_phone,
          r.id as remito_id,
          r.remito_number
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN remitos r ON o.id = r.order_id AND r.is_active = TRUE
        ${whereClause}
        ORDER BY o.order_date DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const orders = rows as OrderWithDetails[];

      // Obtener items para cada pedido
      for (const order of orders) {
        order.items = await this.getOrderItems(order.id);
      }

      return { orders, total };

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateOrder(id: number, data: UpdateOrderData, userId: number | null): Promise<Order> {
    const connection = await this.db.getConnection();
    
    try {
      const fields = [];
      const values = [];

      Object.keys(data).forEach(key => {
        const value = data[key as keyof UpdateOrderData];
        if (value !== undefined) {
          // Convertir fecha de entrega a formato MySQL si existe
          if (key === 'delivery_date' && typeof value === 'string') {
            const mysqlDate = this.convertToMySQLDate(value);
            fields.push(`${key} = ?`);
            values.push(mysqlDate);
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await connection.execute(
        `UPDATE orders SET ${fields.join(', ')} WHERE id = ? AND is_active = TRUE`,
        values
      );

      const updatedOrder = await this.getOrderById(id);
      return updatedOrder!;

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteOrder(id: number): Promise<void> {
    const connection = await this.db.getConnection();
    
    try {
      await connection.execute(
        'UPDATE orders SET is_active = FALSE WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // =====================================================
  // ORDER ITEMS - Gestión de productos en pedidos
  // =====================================================

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const connection = await this.db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT 
          oi.*,
          p.name as product_name,
          p.code as product_code
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY oi.id`,
        [orderId]
      );

      return rows as OrderItem[];

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateOrderItem(id: number, data: UpdateOrderItemData): Promise<OrderItem> {
    const connection = await this.db.getConnection();
    
    try {
      const fields: string[] = [];
      const values = [];

      Object.keys(data).forEach(key => {
        if (data[key as keyof UpdateOrderItemData] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(data[key as keyof UpdateOrderItemData]);
        }
      });

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      values.push(id);

      await connection.execute(
        `UPDATE order_items SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      // Obtener item actualizado
      const [rows] = await connection.execute(
        `SELECT 
          oi.*,
          p.name as product_name,
          p.code as product_code
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.id = ?`,
        [id]
      );

      const items = rows as OrderItem[];
      return items[0];

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // =====================================================
  // ESTADÍSTICAS Y REPORTES
  // =====================================================

  async getOrderStats(): Promise<OrderStats> {
    const connection = await this.db.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'pendiente_preparacion' THEN 1 ELSE 0 END) as pending_preparation,
          SUM(CASE WHEN status = 'listo_despacho' THEN 1 ELSE 0 END) as ready_for_dispatch,
          SUM(CASE WHEN status = 'en_proceso' THEN 1 ELSE 0 END) as in_process,
          SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) as cancelled,
          SUM(total_amount) as total_value,
          AVG(total_amount) as average_order_value,
          SUM(CASE WHEN remito_status = 'sin_remito' AND status IN ('listo_despacho', 'pagado', 'aprobado') THEN 1 ELSE 0 END) as orders_without_remito,
          SUM(CASE WHEN stock_reserved = TRUE THEN 1 ELSE 0 END) as orders_with_stock_reserved
        FROM orders 
        WHERE is_active = TRUE
      `);

      const stats = (rows as any)[0];
      
      return {
        total_orders: stats.total_orders || 0,
        pending_preparation: stats.pending_preparation || 0,
        ready_for_dispatch: stats.ready_for_dispatch || 0,
        in_process: stats.in_process || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0,
        total_value: stats.total_value || 0,
        average_order_value: stats.average_order_value || 0,
        orders_without_remito: stats.orders_without_remito || 0,
        orders_with_stock_reserved: stats.orders_with_stock_reserved || 0
      };

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // =====================================================
  // MÉTODOS ESPECÍFICOS PARA INTEGRACIÓN CON REMITOS
  // =====================================================

  async getOrdersReadyForRemito(): Promise<OrderWithDetails[]> {
    const connection = await this.db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT 
          o.*,
          c.name as client_name,
          c.code as client_code,
          c.email as client_email,
          c.phone as client_phone
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.is_active = TRUE
          AND o.status IN ('listo_despacho', 'pagado', 'aprobado')
          AND o.remito_status = 'sin_remito'
          AND o.stock_reserved = TRUE
        ORDER BY o.order_date ASC`
      );

      const orders = rows as OrderWithDetails[];

      // Obtener items para cada pedido
      for (const order of orders) {
        order.items = await this.getOrderItems(order.id);
      }

      return orders;

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateOrderRemitoStatus(orderId: number, remitoStatus: string): Promise<void> {
    const connection = await this.db.getConnection();
    
    try {
      await connection.execute(
        'UPDATE orders SET remito_status = ? WHERE id = ?',
        [remitoStatus, orderId]
      );
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async reserveOrderStock(orderId: number): Promise<void> {
    const connection = await this.db.getConnection();
    
    try {
      await connection.execute(
        'UPDATE orders SET stock_reserved = TRUE WHERE id = ?',
        [orderId]
      );

      await connection.execute(
        'UPDATE order_items SET stock_reserved = TRUE WHERE order_id = ?',
        [orderId]
      );
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  private async generateOrderNumber(): Promise<string> {
    const connection = await this.db.getConnection();
    
    try {
      const prefix = 'ORD';
      const year = new Date().getFullYear().toString().slice(-2);
      
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count FROM orders 
         WHERE order_number LIKE ? AND YEAR(order_date) = YEAR(NOW())`,
        [`${prefix}${year}%`]
      );

      const count = (rows as any)[0].count;
      const nextNumber = String(count + 1).padStart(5, '0');
      
      return `${prefix}${year}${nextNumber}`;

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async getOrdersConfig(): Promise<Record<string, any>> {
    const connection = await this.db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT config_key, config_value, config_type FROM orders_config WHERE is_active = TRUE'
      );

      const configs = rows as any[];
      const config: Record<string, any> = {};
      
      configs.forEach(cfg => {
        let value: any = cfg.config_value;
        
        switch (cfg.config_type) {
          case 'number':
            value = parseFloat(cfg.config_value);
            break;
          case 'boolean':
            value = cfg.config_value === 'true';
            break;
          case 'json':
            try {
              value = JSON.parse(cfg.config_value);
            } catch (error) {
              value = cfg.config_value;
            }
            break;
        }
        
        config[cfg.config_key] = value;
      });

      return config;

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }
}

