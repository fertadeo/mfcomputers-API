import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/jwt';
import { ApiKeyService } from '../services/ApiKeyService';
import { ApiResponse } from '../types';

export class ApiKeyController {
  private apiKeyService: ApiKeyService;

  constructor() {
    this.apiKeyService = new ApiKeyService();
  }

  /**
   * GET /api/api-keys - Obtener todas las API Keys
   */
  async getAllApiKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const is_active = req.query.is_active !== undefined 
        ? req.query.is_active === 'true' || req.query.is_active === '1'
        : undefined;
      const search = req.query.search as string | undefined;

      const result = await this.apiKeyService.getAllApiKeys({
        page,
        limit,
        is_active,
        search
      });

      const response: ApiResponse = {
        success: true,
        message: 'API Keys obtenidas exitosamente',
        data: {
          apiKeys: result.apiKeys,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / result.limit)
          }
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        message: 'Error al obtener API Keys',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/api-keys/:id - Obtener una API Key por ID
   */
  async getApiKeyById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const apiKey = await this.apiKeyService.getApiKeyById(id);

      const response: ApiResponse = {
        success: true,
        message: 'API Key obtenida exitosamente',
        data: apiKey,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const statusCode = error.message === 'API Key no encontrada' ? 404 : 500;
      const response: ApiResponse = {
        success: false,
        message: error.message || 'Error al obtener API Key',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * POST /api/api-keys - Crear una nueva API Key
   */
  async createApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { key_name, description, expires_at, rate_limit_per_minute, rate_limit_per_hour, allowed_ips, metadata } = req.body;
      const createdBy = req.user?.id;

      if (!key_name) {
        const response: ApiResponse = {
          success: false,
          message: 'El nombre de la API Key es requerido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.apiKeyService.createApiKey({
        key_name,
        description,
        expires_at,
        rate_limit_per_minute,
        rate_limit_per_hour,
        allowed_ips,
        metadata
      }, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'API Key creada exitosamente',
        data: {
          apiKey: result.apiKey,
          plainKey: result.plainKey, // Solo se muestra una vez al crear
          warning: '⚠️ IMPORTANTE: Guarda esta API Key ahora. No se mostrará nuevamente.'
        },
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        message: 'Error al crear API Key',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  /**
   * PUT /api/api-keys/:id - Actualizar una API Key
   */
  async updateApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const { key_name, description, is_active, expires_at, rate_limit_per_minute, rate_limit_per_hour, allowed_ips, metadata } = req.body;

      const apiKey = await this.apiKeyService.updateApiKey(id, {
        key_name,
        description,
        is_active,
        expires_at,
        rate_limit_per_minute,
        rate_limit_per_hour,
        allowed_ips,
        metadata
      });

      const response: ApiResponse = {
        success: true,
        message: 'API Key actualizada exitosamente',
        data: apiKey,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const statusCode = error.message === 'API Key no encontrada' ? 404 : 400;
      const response: ApiResponse = {
        success: false,
        message: 'Error al actualizar API Key',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * DELETE /api/api-keys/:id - Desactivar una API Key (soft delete)
   */
  async deactivateApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      await this.apiKeyService.deactivateApiKey(id);

      const response: ApiResponse = {
        success: true,
        message: 'API Key desactivada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const statusCode = error.message === 'API Key no encontrada' ? 404 : 500;
      const response: ApiResponse = {
        success: false,
        message: 'Error al desactivar API Key',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * PUT /api/api-keys/:id/activate - Activar una API Key
   */
  async activateApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      await this.apiKeyService.activateApiKey(id);

      const response: ApiResponse = {
        success: true,
        message: 'API Key activada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const statusCode = error.message === 'API Key no encontrada' ? 404 : 500;
      const response: ApiResponse = {
        success: false,
        message: 'Error al activar API Key',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * DELETE /api/api-keys/:id/permanent - Eliminar permanentemente una API Key
   */
  async deleteApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      await this.apiKeyService.deleteApiKey(id);

      const response: ApiResponse = {
        success: true,
        message: 'API Key eliminada permanentemente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const statusCode = error.message === 'API Key no encontrada' ? 404 : 500;
      const response: ApiResponse = {
        success: false,
        message: 'Error al eliminar API Key',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(statusCode).json(response);
    }
  }
}




