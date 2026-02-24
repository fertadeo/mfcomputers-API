import { Router } from 'express';
import { IntegrationController } from '../controllers/integrationController';
import { CategoryController } from '../controllers/categoryController';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticateApiKey, authenticateWebhook, optionalAuth } from '../middleware/auth';

const router = Router();
const integrationController = new IntegrationController();
const categoryController = new CategoryController();

// Validation rules
const syncStockValidation = [
  body('products').isArray().withMessage('Products debe ser un array'),
  body('products.*.sku').notEmpty().withMessage('SKU es requerido para cada producto'),
  body('products.*.stock_quantity').isNumeric().withMessage('stock_quantity debe ser numérico para cada producto')
];

// Routes
router.get('/hello', 
  optionalAuth,
  integrationController.helloWorld.bind(integrationController)
);
router.get('/products/woocommerce', 
  authenticateApiKey,
  integrationController.getProductsForWooCommerce.bind(integrationController)
);
router.get('/stock/summary', 
  authenticateApiKey,
  integrationController.getStockSummary.bind(integrationController)
);
router.post('/products/sync', 
  authenticateApiKey,
  validate(syncStockValidation),
  integrationController.syncStockFromWooCommerce.bind(integrationController)
);
router.post('/webhook/woocommerce', 
  authenticateWebhook,
  integrationController.wooCommerceWebhook.bind(integrationController)
);

// POST /api/integration/webhook/woocommerce/category - Webhook directo de WooCommerce para categorías
router.post('/webhook/woocommerce/category',
  authenticateWebhook,
  categoryController.wooCommerceCategoryWebhook.bind(categoryController)
);

// POST /api/integration/webhook/woocommerce/order - Recibir pedido directamente desde WooCommerce webhook
router.post('/webhook/woocommerce/order',
  authenticateWebhook,
  integrationController.receiveWooCommerceOrder.bind(integrationController)
);

// POST /api/integration/orders/woocommerce-mayorista - Recibir pedido mayorista desde WooCommerce/N8N
router.post('/orders/woocommerce-mayorista',
  authenticateWebhook,
  integrationController.receiveWholesaleOrder.bind(integrationController)
);

// POST /api/integration/clients/register - Registrar cliente nuevo desde el frontend (tienda). Idempotente por email.
router.post('/clients/register',
  authenticateWebhook,
  integrationController.registerClientFromFrontend.bind(integrationController)
);

export default router;
