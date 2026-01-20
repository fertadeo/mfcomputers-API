import { Router } from 'express';
import { WooCommerceController } from '../controllers/wooCommerceController';
import { CategoryController } from '../controllers/categoryController';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticateApiKey, authenticateWebhook } from '../middleware/auth';

const router = Router();
const wooCommerceController = new WooCommerceController();
const categoryController = new CategoryController();

// Validation rules
const updateStockValidation = [
  param('sku').notEmpty().withMessage('SKU es requerido'),
  body('stock_quantity').isNumeric().withMessage('stock_quantity debe ser numérico'),
  body('operation').optional().isIn(['set', 'add', 'subtract']).withMessage('Operación debe ser set, add o subtract')
];

const syncProductsValidation = [
  body('products').isArray().withMessage('Products debe ser un array'),
  body('products.*.sku').notEmpty().withMessage('SKU es requerido para cada producto'),
  body('products.*.stock_quantity').optional({ nullable: true, checkFalsy: true }).isNumeric().withMessage('stock_quantity debe ser numérico para cada producto')
];

const syncCategoriesValidation = [
  body('categories').isArray().withMessage('categories debe ser un array'),
  body('categories.*.id').isInt().withMessage('Cada categoría debe tener un id numérico'),
  body('categories.*.name').notEmpty().withMessage('Cada categoría debe tener un name'),
  body('categories.*.slug').notEmpty().withMessage('Cada categoría debe tener un slug')
];

// Routes
router.get('/products', 
  authenticateApiKey,
  wooCommerceController.getProducts.bind(wooCommerceController)
);
router.post('/products/sync', 
  authenticateApiKey,
  validate(syncProductsValidation),
  wooCommerceController.syncProducts.bind(wooCommerceController)
);
router.put('/products/:sku/stock', 
  authenticateApiKey,
  validate(updateStockValidation),
  wooCommerceController.updateStock.bind(wooCommerceController)
);

// Categories routes
router.post('/categories/sync', 
  authenticateWebhook, // Cambiado a authenticateWebhook para aceptar X-Webhook-Secret desde WordPress
  validate(syncCategoriesValidation),
  categoryController.syncFromWooCommerce.bind(categoryController)
);

export default router;
