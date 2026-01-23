import Database from '../config/database';
import { executeQuery } from '../config/database';
import { 
  Sale, 
  SaleWithDetails, 
  CreateSaleData, 
  UpdateSaleData,
  SaleFilters,
  SaleStats,
  SaleItem
} from '../entities/Sale';

export class SaleRepository {
  private db: typeof Database;

  constructor() {
    this.db = Database;
  }

  // Helper para convertir undefined y strings vacíos a null
  private toNull(value: any): any {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
  }

  // =====================================================
  // GENERACIÓN DE NÚMEROS DE VENTA
  // =====================================================

  /**
   * Genera un número único de venta en formato: SALE-YYYYMM-XXXX
   */
  private async generateSaleNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `SALE-${year}${month}`;

    // Buscar el último número de venta del mes
    const lastSaleResult = await executeQuery(
      `SELECT sale_number FROM sales 
       WHERE sale_number LIKE ? 
       ORDER BY sale_number DESC 
       LIMIT 1`,
      [`${prefix}-%`]
    ) as any[];
    const lastSale = lastSaleResult[0];

    let sequence = 1;
    if (lastSale && lastSale.sale_number) {
      const lastSequence = parseInt(lastSale.sale_number.split('-')[2] || '0', 10);
      sequence = lastSequence + 1;
    }

    const saleNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;
    return saleNumber;
  }

  // =====================================================
  // SALES - Operaciones principales
  // =====================================================

  /**
   * Crea una nueva venta
   */
  async createSale(data: CreateSaleData, userId: number | null): Promise<Sale> {
    const connection = await this.db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Generar número de venta
      const saleNumber = await this.generateSaleNumber();

      // Calcular total
      const totalAmount = data.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );

      // Validar payment_details si el método es mixto
      if (data.payment_method === 'mixto' && data.payment_details) {
        const paymentTotal = (data.payment_details.efectivo || 0) + 
                            (data.payment_details.tarjeta || 0) + 
                            (data.payment_details.transferencia || 0);
        if (Math.abs(paymentTotal - totalAmount) > 0.01) {
          throw new Error(`El total de los métodos de pago (${paymentTotal}) no coincide con el total de la venta (${totalAmount})`);
        }
      }

      // Obtener o crear cliente genérico "Consumidor Final" si no se especifica cliente
      let clientId = data.client_id;
      if (!clientId) {
        const [genericClient] = await connection.execute(
          `SELECT id FROM clients WHERE code = 'CONSUMIDOR_FINAL' LIMIT 1`
        ) as any[];
        
        if (!genericClient || genericClient.length === 0) {
          // Crear cliente genérico
          const [newClient] = await connection.execute(
            `INSERT INTO clients (code, client_type, sales_channel, name, country, is_active)
             VALUES ('CONSUMIDOR_FINAL', 'persona', 'local', 'Consumidor Final', 'AR', 1)`
          ) as any[];
          clientId = (newClient as any).insertId;
        } else {
          clientId = genericClient[0].id;
        }
      }

      // Insertar venta
      const [result] = await connection.execute(
        `INSERT INTO sales (
          sale_number, client_id, total_amount, payment_method, 
          payment_details, sale_date, sync_status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, NOW(), 'pending', ?, ?)`,
        [
          saleNumber,
          clientId,
          totalAmount,
          data.payment_method,
          data.payment_details ? JSON.stringify(data.payment_details) : null,
          this.toNull(data.notes),
          userId
        ]
      ) as any[];

      const saleId = (result as any).insertId;

      // Insertar items de la venta
      for (const item of data.items) {
        await this.createSaleItem(connection, saleId, item);
      }

      await connection.commit();

      const sale = await this.getSaleById(saleId);
      if (!sale) {
        throw new Error('Error creando la venta');
      }

      return sale;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Crea un item de venta
   */
  private async createSaleItem(
    connection: any,
    saleId: number,
    item: { product_id: number; quantity: number; unit_price: number }
  ): Promise<void> {
    const totalPrice = item.quantity * item.unit_price;

    await connection.execute(
      `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
       VALUES (?, ?, ?, ?, ?)`,
      [saleId, item.product_id, item.quantity, item.unit_price, totalPrice]
    );

    // Descontar stock del producto
    await connection.execute(
      `UPDATE products 
       SET stock = GREATEST(0, stock - ?) 
       WHERE id = ?`,
      [item.quantity, item.product_id]
    );
  }

  /**
   * Obtiene una venta por ID
   */
  async getSaleById(id: number): Promise<SaleWithDetails | null> {
    const sales = await executeQuery(
      `SELECT 
        s.*,
        c.name as client_name,
        c.code as client_code,
        c.email as client_email,
        u.name as created_by_name
       FROM sales s
       LEFT JOIN clients c ON s.client_id = c.id
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = ?`,
      [id]
    ) as any[];

    if (!sales || sales.length === 0) {
      return null;
    }

    const sale = sales[0];
    
    // Parsear payment_details si es string
    if (sale.payment_details && typeof sale.payment_details === 'string') {
      try {
        sale.payment_details = JSON.parse(sale.payment_details);
      } catch (error) {
        sale.payment_details = null;
      }
    }

    // Obtener items
    sale.items = await this.getSaleItems(id);

    return sale;
  }

  /**
   * Obtiene los items de una venta
   */
  async getSaleItems(saleId: number): Promise<SaleItem[]> {
    const items = await executeQuery(
      `SELECT 
        si.*,
        p.name as product_name,
        p.code as product_code
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?
       ORDER BY si.id`,
      [saleId]
    ) as any[];

    return items || [];
  }

  /**
   * Obtiene todas las ventas con filtros
   */
  async getAllSales(filters: SaleFilters = {}): Promise<{
    sales: SaleWithDetails[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.client_id) {
      whereClause += ' AND s.client_id = ?';
      params.push(filters.client_id);
    }

    if (filters.payment_method) {
      whereClause += ' AND s.payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters.sync_status) {
      whereClause += ' AND s.sync_status = ?';
      params.push(filters.sync_status);
    }

    if (filters.date_from) {
      whereClause += ' AND DATE(s.sale_date) >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      whereClause += ' AND DATE(s.sale_date) <= ?';
      params.push(filters.date_to);
    }

    // Contar total
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM sales s ${whereClause}`,
      params
    ) as any[];
    const total = countResult[0]?.total || 0;

    // Obtener ventas
    const sales = await executeQuery(
      `SELECT 
        s.*,
        c.name as client_name,
        c.code as client_code,
        c.email as client_email,
        u.name as created_by_name
       FROM sales s
       LEFT JOIN clients c ON s.client_id = c.id
       LEFT JOIN users u ON s.created_by = u.id
       ${whereClause}
       ORDER BY s.sale_date DESC, s.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as any[];

    // Parsear payment_details y obtener items para cada venta
    const salesWithDetails: SaleWithDetails[] = [];
    for (const sale of sales || []) {
      if (sale.payment_details && typeof sale.payment_details === 'string') {
        try {
          sale.payment_details = JSON.parse(sale.payment_details);
        } catch (error) {
          sale.payment_details = null;
        }
      }
      sale.items = await this.getSaleItems(sale.id);
      salesWithDetails.push(sale);
    }

    return {
      sales: salesWithDetails,
      total,
      page,
      limit
    };
  }

  /**
   * Actualiza una venta
   */
  async updateSale(id: number, data: UpdateSaleData): Promise<Sale> {
    const connection = await this.db.getConnection();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (data.notes !== undefined) {
        fields.push('notes = ?');
        values.push(this.toNull(data.notes));
      }

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await connection.execute(
        `UPDATE sales SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      const sale = await this.getSaleById(id);
      if (!sale) {
        throw new Error('Venta no encontrada después de actualizar');
      }

      return sale;

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Actualiza el estado de sincronización de una venta
   */
  async updateSyncStatus(
    id: number,
    syncStatus: 'pending' | 'synced' | 'error',
    woocommerceOrderId?: number | null,
    syncError?: string | null
  ): Promise<void> {
    const connection = await this.db.getConnection();
    
    try {
      const fields: string[] = ['sync_status = ?'];
      const values: any[] = [syncStatus];

      if (woocommerceOrderId !== undefined) {
        fields.push('woocommerce_order_id = ?');
        values.push(this.toNull(woocommerceOrderId));
      }

      if (syncError !== undefined) {
        fields.push('sync_error = ?');
        values.push(this.toNull(syncError));
      }

      values.push(id);

      await connection.execute(
        `UPDATE sales SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene estadísticas de ventas
   */
  async getSaleStats(): Promise<SaleStats> {
    const stats = await executeQuery(
      `SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as average_sale_amount,
        COUNT(CASE WHEN DATE(sale_date) = CURDATE() THEN 1 END) as sales_today,
        COUNT(CASE WHEN YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE()) THEN 1 END) as sales_this_month,
        COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_sync,
        COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as sync_errors
       FROM sales`
    ) as any[];

    const paymentMethods = await executeQuery(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
       FROM sales
       GROUP BY payment_method`
    ) as any[];

    const salesByPaymentMethod: any = {
      efectivo: { count: 0, total: 0 },
      tarjeta: { count: 0, total: 0 },
      transferencia: { count: 0, total: 0 },
      mixto: { count: 0, total: 0 }
    };

    (paymentMethods || []).forEach((pm: any) => {
      if (salesByPaymentMethod[pm.payment_method]) {
        salesByPaymentMethod[pm.payment_method] = {
          count: pm.count,
          total: parseFloat(pm.total)
        };
      }
    });

    return {
      total_sales: stats[0]?.total_sales || 0,
      total_amount: parseFloat(stats[0]?.total_amount || 0),
      average_sale_amount: parseFloat(stats[0]?.average_sale_amount || 0),
      sales_by_payment_method: salesByPaymentMethod,
      sales_today: stats[0]?.sales_today || 0,
      sales_this_month: stats[0]?.sales_this_month || 0,
      pending_sync: stats[0]?.pending_sync || 0,
      sync_errors: stats[0]?.sync_errors || 0
    };
  }

  /**
   * Obtiene ventas pendientes de sincronización
   */
  async getPendingSyncSales(): Promise<Sale[]> {
    const sales = await executeQuery(
      `SELECT * FROM sales 
       WHERE sync_status = 'pending' OR sync_status = 'error'
       ORDER BY sale_date ASC
       LIMIT 50`
    ) as any[];

    return (sales || []).map((sale: any) => {
      if (sale.payment_details && typeof sale.payment_details === 'string') {
        try {
          sale.payment_details = JSON.parse(sale.payment_details);
        } catch (error) {
          sale.payment_details = null;
        }
      }
      return sale;
    });
  }
}
