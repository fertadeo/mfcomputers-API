import { Router } from 'express';
import { SaleController } from '../controllers/saleController';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticateApiKey } from '../middleware/auth';

const router = Router();
const saleController = new SaleController();

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
  body('sync_to_woocommerce').optional().isBoolean().withMessage('sync_to_woocommerce debe ser booleano')
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

// POST /api/sales - Crear nueva venta
router.post('/',
  authenticateApiKey,
  validate(createSaleValidation),
  saleController.createSale.bind(saleController)
);

// GET /api/sales - Obtener todas las ventas con filtros
router.get('/',
  validate(saleFiltersValidation),
  saleController.getAllSales.bind(saleController)
);

// GET /api/sales/stats - Obtener estadísticas de ventas
router.get('/stats',
  saleController.getSaleStats.bind(saleController)
);

// GET /api/sales/:id - Obtener venta por ID
router.get('/:id',
  validate(idParamValidation),
  saleController.getSaleById.bind(saleController)
);

// =====================================================
// RUTAS DE SINCRONIZACIÓN CON WOOCOMMERCE
// =====================================================

// POST /api/sales/:id/sync - Sincronizar venta a WooCommerce
router.post('/:id/sync',
  authenticateApiKey,
  validate(idParamValidation),
  saleController.syncSaleToWooCommerce.bind(saleController)
);

export default router;
