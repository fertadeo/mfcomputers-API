import { OrderRepository } from '../repositories/OrderRepository';
import { 
  Order, 
  OrderWithDetails, 
  CreateOrderData, 
  UpdateOrderData,
  OrderFilters,
  OrderStats,
  OrderItem,
  UpdateOrderItemData
} from '../entities/Order';
import { ApiResponse } from '../types';

export class OrderService {
  private orderRepository: OrderRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
  }

  // =====================================================
  // GESTIÓN DE PEDIDOS
  // =====================================================

  async createOrder(data: CreateOrderData, userId: number | null): Promise<ApiResponse> {
    try {
      // Validar que el cliente existe
      await this.validateClient(data.client_id);

      // Validar productos y stock
      await this.validateProductsAvailability(data.items);

      // Crear pedido
      const order = await this.orderRepository.createOrder(data, userId);

      // Si el pedido está en estado aprobado y tiene la configuración activa, reservar stock
      const config = await this.orderRepository.getOrdersConfig();
      if (config.auto_reserve_stock_on_approval && 
          (data.status === 'aprobado' || data.status === 'listo_despacho')) {
        await this.orderRepository.reserveOrderStock(order.id);
      }

      // Enviar notificaciones
      await this.sendOrderNotifications(order, 'created');

      return {
        success: true,
        message: 'Pedido creado exitosamente',
        data: order,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error creating order:', error);
      return {
        success: false,
        message: 'Error al crear pedido',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getOrderById(id: number): Promise<ApiResponse> {
    try {
      const order = await this.orderRepository.getOrderById(id);

      if (!order) {
        return {
          success: false,
          message: 'Pedido no encontrado',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        message: 'Pedido obtenido exitosamente',
        data: order,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting order:', error);
      return {
        success: false,
        message: 'Error al obtener pedido',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getOrderByNumber(orderNumber: string): Promise<ApiResponse> {
    try {
      const order = await this.orderRepository.getOrderByNumber(orderNumber);

      if (!order) {
        return {
          success: false,
          message: 'Pedido no encontrado',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        message: 'Pedido obtenido exitosamente',
        data: order,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting order by number:', error);
      return {
        success: false,
        message: 'Error al obtener pedido',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getOrderByWooCommerceId(woocommerceOrderId: number): Promise<ApiResponse> {
    try {
      const order = await this.orderRepository.getOrderByWooCommerceId(woocommerceOrderId);

      if (!order) {
        return {
          success: false,
          message: 'Pedido no encontrado',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        message: 'Pedido obtenido exitosamente',
        data: order,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting order by WooCommerce ID:', error);
      return {
        success: false,
        message: 'Error al obtener pedido',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getAllOrders(filters: OrderFilters = {}): Promise<ApiResponse> {
    try {
      const result = await this.orderRepository.getAllOrders(filters);

      return {
        success: true,
        message: 'Pedidos obtenidos exitosamente',
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting orders:', error);
      return {
        success: false,
        message: 'Error al obtener pedidos',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async updateOrder(id: number, data: UpdateOrderData, userId: number | null): Promise<ApiResponse> {
    try {
      // Validar que el pedido existe
      const existingOrder = await this.orderRepository.getOrderById(id);
      if (!existingOrder) {
        return {
          success: false,
          message: 'Pedido no encontrado',
          timestamp: new Date().toISOString()
        };
      }

      // Validar transiciones de estado
      if (data.status) {
        await this.validateStatusTransition(existingOrder.status, data.status);
      }

      // Si cambia a estado "listo_despacho" o "aprobado", reservar stock automáticamente
      const config = await this.orderRepository.getOrdersConfig();
      if (config.auto_reserve_stock_on_approval && 
          data.status && 
          ['aprobado', 'listo_despacho'].includes(data.status) &&
          !existingOrder.stock_reserved) {
        await this.orderRepository.reserveOrderStock(id);
      }

      // Actualizar pedido
      const updatedOrder = await this.orderRepository.updateOrder(id, data, userId);

      // Enviar notificaciones si cambió el estado
      if (data.status && data.status !== existingOrder.status) {
        await this.sendOrderNotifications(updatedOrder, 'status_changed');
      }

      return {
        success: true,
        message: 'Pedido actualizado exitosamente',
        data: updatedOrder,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error updating order:', error);
      return {
        success: false,
        message: 'Error al actualizar pedido',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async deleteOrder(id: number): Promise<ApiResponse> {
    try {
      const order = await this.orderRepository.getOrderById(id);
      
      if (!order) {
        return {
          success: false,
          message: 'Pedido no encontrado',
          timestamp: new Date().toISOString()
        };
      }

      // Validar que se puede eliminar (solo si está en estado 'pendiente_preparacion')
      if (order.status !== 'pendiente_preparacion') {
        return {
          success: false,
          message: 'Solo se pueden eliminar pedidos en estado "pendiente_preparacion"',
          timestamp: new Date().toISOString()
        };
      }

      await this.orderRepository.deleteOrder(id);

      return {
        success: true,
        message: 'Pedido eliminado exitosamente',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error deleting order:', error);
      return {
        success: false,
        message: 'Error al eliminar pedido',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // ESTADÍSTICAS Y REPORTES
  // =====================================================

  async getOrderStats(): Promise<ApiResponse> {
    try {
      const stats = await this.orderRepository.getOrderStats();

      return {
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting order stats:', error);
      return {
        success: false,
        message: 'Error al obtener estadísticas',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // MÉTODOS ESPECÍFICOS PARA INTEGRACIÓN CON REMITOS
  // =====================================================

  async getOrdersReadyForRemito(): Promise<ApiResponse> {
    try {
      const orders = await this.orderRepository.getOrdersReadyForRemito();

      return {
        success: true,
        message: 'Pedidos listos para remito obtenidos exitosamente',
        data: orders,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting orders ready for remito:', error);
      return {
        success: false,
        message: 'Error al obtener pedidos listos para remito',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async reserveStock(orderId: number): Promise<ApiResponse> {
    try {
      const order = await this.orderRepository.getOrderById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Pedido no encontrado',
          timestamp: new Date().toISOString()
        };
      }

      if (order.stock_reserved) {
        return {
          success: false,
          message: 'El stock ya está reservado para este pedido',
          timestamp: new Date().toISOString()
        };
      }

      // Validar disponibilidad de stock
      await this.validateProductsAvailability(order.items || []);

      // Reservar stock
      await this.orderRepository.reserveOrderStock(orderId);

      return {
        success: true,
        message: 'Stock reservado exitosamente',
        data: { orderId },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error reserving stock:', error);
      return {
        success: false,
        message: 'Error al reservar stock',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async updateRemitoStatus(orderId: number, remitoStatus: string): Promise<ApiResponse> {
    try {
      await this.orderRepository.updateOrderRemitoStatus(orderId, remitoStatus);

      return {
        success: true,
        message: 'Estado de remito actualizado exitosamente',
        data: { orderId, remitoStatus },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error updating remito status:', error);
      return {
        success: false,
        message: 'Error al actualizar estado de remito',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // CONFIGURACIÓN
  // =====================================================

  async getOrdersConfig(): Promise<ApiResponse> {
    try {
      const config = await this.orderRepository.getOrdersConfig();

      return {
        success: true,
        message: 'Configuración obtenida exitosamente',
        data: config,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting orders config:', error);
      return {
        success: false,
        message: 'Error al obtener configuración',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // MÉTODOS DE VALIDACIÓN PRIVADOS
  // =====================================================

  private async validateClient(clientId: number): Promise<void> {
    // TODO: Implementar validación del cliente
    // Verificar que existe y está activo
  }

  private async validateProductsAvailability(items: any[]): Promise<void> {
    // TODO: Implementar validación de disponibilidad de productos
    // Verificar que existen y hay stock suficiente
  }

  private async validateStatusTransition(currentStatus: string, newStatus: string): Promise<void> {
    const validTransitions: Record<string, string[]> = {
      'pendiente_preparacion': ['listo_despacho', 'aprobado', 'en_proceso', 'cancelado'],
      'aprobado': ['listo_despacho', 'en_proceso', 'cancelado'],
      'en_proceso': ['listo_despacho', 'completado', 'cancelado'],
      'listo_despacho': ['completado', 'cancelado'],
      'completado': [],
      'cancelado': []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Transición de estado inválida: ${currentStatus} → ${newStatus}`);
    }
  }

  // =====================================================
  // MÉTODOS DE NOTIFICACIÓN PRIVADOS
  // =====================================================

  private async sendOrderNotifications(order: Order, event: string): Promise<void> {
    // TODO: Implementar notificaciones
    // Slack, Email, WhatsApp según configuración
    console.log(`Sending order notification: ${event} for order ${order.order_number}`);
  }
}

