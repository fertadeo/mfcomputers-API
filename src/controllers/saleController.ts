import { Request, Response } from 'express';
import { SaleService } from '../services/SaleService';
import { CreateSaleData, SaleFilters } from '../entities/Sale';
import { ApiResponse } from '../types';

export class SaleController {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  // =====================================================
  // GESTIÓN DE VENTAS
  // =====================================================

  // POST /api/sales - Crear nueva venta
  public async createSale(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateSaleData = req.body;
      const userId = (req as any).user?.id || null;

      // Validaciones básicas
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'La venta debe incluir al menos un item',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!data.payment_method) {
        const response: ApiResponse = {
          success: false,
          message: 'El método de pago es requerido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Validar payment_details si el método es mixto
      if (data.payment_method === 'mixto') {
        if (!data.payment_details) {
          const response: ApiResponse = {
            success: false,
            message: 'Los detalles de pago son requeridos cuando el método es mixto',
            timestamp: new Date().toISOString()
          };
          res.status(400).json(response);
          return;
        }

        const total = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const paymentTotal = (data.payment_details.efectivo || 0) + 
                            (data.payment_details.tarjeta || 0) + 
                            (data.payment_details.transferencia || 0);

        if (Math.abs(paymentTotal - total) > 0.01) {
          const response: ApiResponse = {
            success: false,
            message: `El total de los métodos de pago (${paymentTotal}) no coincide con el total de la venta (${total})`,
            timestamp: new Date().toISOString()
          };
          res.status(400).json(response);
          return;
        }
      }

      const result = await this.saleService.createSale(data, userId);
      
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Create sale controller error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/sales/:id - Obtener venta por ID
  public async getSaleById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID de venta inválido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.saleService.getSaleById(id);
      
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Get sale by ID controller error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/sales - Obtener todas las ventas con filtros
  public async getAllSales(req: Request, res: Response): Promise<void> {
    try {
      const filters: SaleFilters = {
        client_id: req.query.client_id ? parseInt(req.query.client_id as string, 10) : undefined,
        payment_method: req.query.payment_method as 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto' | undefined,
        sync_status: req.query.sync_status as 'pending' | 'synced' | 'error' | undefined,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
      };

      const result = await this.saleService.getAllSales(filters);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Get all sales controller error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/sales/stats - Obtener estadísticas de ventas
  public async getSaleStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.saleService.getSaleStats();
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Get sale stats controller error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // =====================================================
  // SINCRONIZACIÓN CON WOOCOMMERCE
  // =====================================================

  // POST /api/sales/:id/sync - Sincronizar venta a WooCommerce
  public async syncSaleToWooCommerce(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID de venta inválido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.saleService.retrySync(id);
      
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Sync sale to WooCommerce controller error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}
