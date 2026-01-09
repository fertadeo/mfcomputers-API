import { Request, Response } from 'express';
import { executeQuery } from '../config/database';
import { DashboardStats, ApiResponse } from '../types';

export class DashboardController {
  // Get dashboard statistics
  public async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      // Get daily sales
      const dailySalesQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as daily_sales 
        FROM orders 
        WHERE DATE(order_date) = CURDATE() AND status != 'cancelled'
      `;
      
      // Get active orders
      const activeOrdersQuery = `
        SELECT COUNT(*) as active_orders 
        FROM orders 
        WHERE status IN ('pending', 'in_process')
      `;
      
      // Get active clients
      const activeClientsQuery = `
        SELECT COUNT(*) as active_clients 
        FROM clients 
        WHERE is_active = 1
      `;
      
      // Get critical products (low stock)
      const criticalProductsQuery = `
        SELECT COUNT(*) as critical_products 
        FROM products 
        WHERE stock <= min_stock AND is_active = 1
      `;
      
      // Get stock minority (products with low stock)
      const stockMinorityQuery = `
        SELECT COUNT(*) as stock_minority 
        FROM products 
        WHERE stock < (max_stock * 0.3) AND is_active = 1
      `;
      
      // Get stock majority (products with high stock)
      const stockMajorityQuery = `
        SELECT COUNT(*) as stock_majority 
        FROM products 
        WHERE stock > (max_stock * 0.7) AND is_active = 1
      `;
      
      // Get custom orders (pending personalized orders)
      const customOrdersQuery = `
        SELECT COUNT(*) as custom_orders 
        FROM orders 
        WHERE status = 'pending' AND notes LIKE '%personalizado%'
      `;

      // Execute all queries
      const [dailySales] = await executeQuery(dailySalesQuery);
      const [activeOrders] = await executeQuery(activeOrdersQuery);
      const [activeClients] = await executeQuery(activeClientsQuery);
      const [criticalProducts] = await executeQuery(criticalProductsQuery);
      const [stockMinority] = await executeQuery(stockMinorityQuery);
      const [stockMajority] = await executeQuery(stockMajorityQuery);
      const [customOrders] = await executeQuery(customOrdersQuery);

      const stats: DashboardStats = {
        dailySales: dailySales?.daily_sales || 0,
        activeOrders: activeOrders?.active_orders || 0,
        activeClients: activeClients?.active_clients || 0,
        criticalProducts: criticalProducts?.critical_products || 0,
        stockMinority: stockMinority?.stock_minority || 0,
        stockMajority: stockMajority?.stock_majority || 0,
        customOrders: customOrders?.custom_orders || 0
      };

      const response: ApiResponse<DashboardStats> = {
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: stats,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error retrieving dashboard statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // Get recent activities
  public async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT 
          'order' as type,
          id,
          order_number as reference,
          total_amount as amount,
          status,
          created_at
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        UNION ALL
        
        SELECT 
          'production' as type,
          id,
          order_number as reference,
          0 as amount,
          status,
          created_at
        FROM production_orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const activities = await executeQuery(query);

      const response: ApiResponse = {
        success: true,
        message: 'Recent activities retrieved successfully',
        data: activities,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Recent activities error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error retrieving recent activities',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}
