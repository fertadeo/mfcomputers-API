import { Router, Response, NextFunction } from 'express';
import { SaleController } from '../controllers/saleController';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticateApiKey } from '../middleware/auth';
import { optionalAuthenticateJWT, authenticateJWT, authorizeRoles } from '../middleware/jwt';
import { AuthenticatedRequest } from '../middleware/jwt';
import { ApiResponse } from '../types';

/** Roles que pueden ver listado de ventas POS y estadísticas (flexible para producción). */
const SALES_VIEW_ROLES = ['admin', 'gerencia', 'ventas', 'logistica', 'finanzas', 'manager', 'employee', 'viewer'] as const;

const router = Router();
const saleController = new SaleController();

/**
 * Acepta JWT (Bearer) o API Key (x-api-key).
 * El POS desde el frontend usa JWT; integraciones externas pueden usar x-api-key.
 */
const authenticateSales = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  optionalAuthenticateJWT(req, res, () => {
    if (req.user) {
      return next();
    }
    if (req.headers['x-api-key']) {
      return authenticateApiKey(req as any, res, next);
    }
    const response: ApiResponse = {
      success: false,
      message: 'Se requiere autenticación',
      error: 'Envía Authorization: Bearer <token> (JWT) o el header x-api-key',
      timestamp: new Date().toISOString()
    };
    res.status(401).json(response);
  });
};

/**
 * Normaliza el body de crear venta: acepta camelCase del frontend y lo convierte al formato esperado por la API.
 * Así se evitan 400 por diferencias de nombre (productId → product_id, unitPrice → unit_price, etc.).
 */
const normalizeSaleBody = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  if (!req.body || req.method !== 'POST') {
    return next();
  }
  const b = req.body;

  // payment_method (acepta paymentMethod o "Efectivo" → "efectivo")
  const rawPaymentMethod = b.payment_method ?? b.paymentMethod;
  if (rawPaymentMethod !== undefined) {
    req.body.payment_method = String(rawPaymentMethod).toLowerCase();
  }

  // client_id (acepta clientId)
  if (b.clientId !== undefined && b.client_id === undefined) {
    req.body.client_id = b.clientId;
  }

  // payment_details (acepta paymentDetails)
  if (b.paymentDetails !== undefined && b.payment_details === undefined) {
    req.body.payment_details = b.paymentDetails;
  }

  // notes, sync_to_woocommerce, allow_inactive
  if (b.notes !== undefined) req.body.notes = b.notes;
  if (b.syncToWooCommerce !== undefined) req.body.sync_to_woocommerce = b.syncToWooCommerce;
  if (b.allowInactive !== undefined) req.body.allow_inactive = b.allowInactive;

  // items: normalizar cada ítem (productId → product_id, unitPrice → unit_price)
  if (Array.isArray(b.items)) {
    req.body.items = b.items.map((item: any) => {
      const product_id = item.product_id ?? item.productId;
      const quantity = item.quantity;
      const unit_price = item.unit_price ?? item.unitPrice;
      return {
        product_id: typeof product_id === 'string' ? parseInt(product_id, 10) : product_id,
        quantity: typeof quantity === 'string' ? parseInt(quantity, 10) : quantity,
        unit_price: typeof unit_price === 'string' ? parseFloat(unit_price) : Number(unit_price)
      };
    });
  }

  next();
};

// =====================================================
// VALIDACIONES
// =====================================================

// Validación para crear venta
const createSaleValidation = [
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('product_id debe ser un entero positivo'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity debe ser un entero positivo'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('unit_price debe ser un número positivo'),
  body('payment_method').isIn(['efectivo', 'tarjeta', 'transferencia', 'mixto']).withMessage('Método de pago inválido'),
  body('client_id').optional().isInt({ min: 1 }).withMessage('client_id debe ser un entero positivo'),
  body('payment_details').optional().isObject().withMessage('payment_details debe ser un objeto'),
  body('payment_details.efectivo').optional().isFloat({ min: 0 }).withMessage('efectivo debe ser un número positivo'),
  body('payment_details.tarjeta').optional().isFloat({ min: 0 }).withMessage('tarjeta debe ser un número positivo'),
  body('payment_details.transferencia').optional().isFloat({ min: 0 }).withMessage('transferencia debe ser un número positivo'),
  body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notas inválidas'),
  body('sync_to_woocommerce').optional().isBoolean().withMessage('sync_to_woocommerce debe ser booleano'),
  body('allow_inactive').optional().isBoolean().withMessage('allow_inactive debe ser booleano')
];

// Validación para parámetros de ID
const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un entero positivo')
];

// Validación para filtros de ventas
const saleFiltersValidation = [
  query('client_id').optional().isInt({ min: 1 }).withMessage('client_id debe ser un entero positivo'),
  query('payment_method').optional().isIn(['efectivo', 'tarjeta', 'transferencia', 'mixto']).withMessage('Método de pago inválido'),
  query('sync_status').optional().isIn(['pending', 'synced', 'error']).withMessage('Estado de sincronización inválido'),
  query('date_from').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('date_to').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100')
];

// =====================================================
// RUTAS DE VENTAS
// =====================================================

// POST /api/sales - Crear nueva venta (JWT o x-api-key)
router.post('/',
  authenticateSales,
  normalizeSaleBody,
  validate(createSaleValidation),
  saleController.createSale.bind(saleController)
);

// GET /api/sales - Obtener todas las ventas con filtros (requiere JWT + rol permitido para ver tabla en prod)
router.get('/',
  authenticateJWT,
  authorizeRoles(...SALES_VIEW_ROLES),
  validate(saleFiltersValidation),
  saleController.getAllSales.bind(saleController)
);

// GET /api/sales/stats - Obtener estadísticas de ventas
router.get('/stats',
  authenticateJWT,
  authorizeRoles(...SALES_VIEW_ROLES),
  saleController.getSaleStats.bind(saleController)
);

// GET /api/sales/:id - Obtener venta por ID
router.get('/:id',
  authenticateJWT,
  authorizeRoles(...SALES_VIEW_ROLES),
  validate(idParamValidation),
  saleController.getSaleById.bind(saleController)
);

// =====================================================
// RUTAS DE SINCRONIZACIÓN CON WOOCOMMERCE
// =====================================================

// POST /api/sales/:id/sync - Sincronizar venta a WooCommerce (JWT o x-api-key)
router.post('/:id/sync',
  authenticateSales,
  validate(idParamValidation),
  saleController.syncSaleToWooCommerce.bind(saleController)
);

export default router;
