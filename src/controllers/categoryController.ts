import { Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService';
import { ApiResponse } from '../types';
import { validationResult } from 'express-validator';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  // GET /api/categories
  public async getAllCategories(req: Request, res: Response): Promise<void> {
    try {
      const { categories } = await this.categoryService.getAllCategories();
      
      const response: ApiResponse = {
        success: true,
        message: 'Categorías obtenidas exitosamente',
        data: { categories },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Error obteniendo categorías',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/categories/:id
  public async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const category = await this.categoryService.getCategoryById(id);
      
      if (!category) {
        const response: ApiResponse = {
          success: false,
          message: 'Categoría no encontrada',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Categoría obtenida exitosamente',
        data: { category },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Error obteniendo categoría',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // POST /api/categories
  public async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          error: errors.array().map(err => err.msg).join(', '),
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const { name, description, woocommerce_id, woocommerce_slug, parent_id } = req.body;
      const category = await this.categoryService.createCategory({
        name,
        description,
        woocommerce_id,
        woocommerce_slug,
        parent_id
      });
      
      const response: ApiResponse = {
        success: true,
        message: 'Categoría creada exitosamente',
        data: { category },
        timestamp: new Date().toISOString()
      };
      
      res.status(201).json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('Ya existe') ? 409 : 500;
      const response: ApiResponse = {
        success: false,
        message: 'Error creando categoría',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(statusCode).json(response);
    }
  }

  // PUT /api/categories/:id
  public async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          error: errors.array().map(err => err.msg).join(', '),
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const id = parseInt(req.params.id, 10);
      const { name, description, woocommerce_id, woocommerce_slug, parent_id, is_active } = req.body;
      
      const category = await this.categoryService.updateCategory(id, {
        name,
        description,
        woocommerce_id,
        woocommerce_slug,
        parent_id,
        is_active
      });
      
      const response: ApiResponse = {
        success: true,
        message: 'Categoría actualizada exitosamente',
        data: { category },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('no encontrada') ? 404 : 500;
      const response: ApiResponse = {
        success: false,
        message: 'Error actualizando categoría',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(statusCode).json(response);
    }
  }

  // POST /api/woocommerce/categories/sync - Sincronizar desde WooCommerce
  public async syncFromWooCommerce(req: Request, res: Response): Promise<void> {
    try {
      const { categories } = req.body;
      
      if (!Array.isArray(categories)) {
        const response: ApiResponse = {
          success: false,
          message: 'Formato inválido. Se espera un array de categorías.',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.categoryService.syncFromWooCommerce(categories);
      
      const response: ApiResponse = {
        success: true,
        message: `Sincronización completada. ${result.created} creadas, ${result.updated} actualizadas.`,
        data: result,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Error sincronizando categorías',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // POST /api/categories/webhook - Webhook para cuando se crea/actualiza en ERP
  public async webhookCategoryChange(req: Request, res: Response): Promise<void> {
    try {
      const { action, category } = req.body;
      
      if (!action || !category) {
        const response: ApiResponse = {
          success: false,
          message: 'Formato inválido. Se esperan action y category.',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Esta ruta está pensada para que n8n llame cuando detecta cambios en WooCommerce
      // o para notificar cambios desde el ERP a otros sistemas
      const response: ApiResponse = {
        success: true,
        message: 'Webhook recibido correctamente',
        data: { action, category },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Error procesando webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // POST /api/integration/webhook/woocommerce/category - Webhook directo de WooCommerce
  public async wooCommerceCategoryWebhook(req: Request, res: Response): Promise<void> {
    try {
      // WooCommerce envía el payload directamente con la categoría completa
      const wcCategory = req.body;
      
      console.log('Webhook de categoría recibido de WooCommerce:', {
        id: wcCategory.id,
        name: wcCategory.name,
        slug: wcCategory.slug,
        parent: wcCategory.parent
      });

      // Validar que tenga los campos mínimos necesarios
      if (!wcCategory.id || !wcCategory.name) {
        const response: ApiResponse = {
          success: false,
          message: 'Formato inválido. La categoría debe tener id y name.',
          error: 'Campos requeridos: id, name',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Formatear para la función de sincronización
      // WooCommerce envía parent como número (0 si no tiene padre)
      const categories = [{
        id: wcCategory.id,
        name: wcCategory.name,
        slug: wcCategory.slug || wcCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        parent: wcCategory.parent || 0
      }];
      
      // Sincronizar categoría (crear o actualizar)
      const result = await this.categoryService.syncFromWooCommerce(categories);
      
      const response: ApiResponse = {
        success: true,
        message: 'Categoría sincronizada exitosamente desde WooCommerce',
        data: {
          woocommerce_id: wcCategory.id,
          category_name: wcCategory.name,
          sync_result: result
        },
        timestamp: new Date().toISOString()
      };
      
      // Responder rápido a WooCommerce (importante para webhooks)
      res.status(200).json(response);
    } catch (error) {
      console.error('WooCommerce category webhook error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error procesando webhook de categoría de WooCommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}