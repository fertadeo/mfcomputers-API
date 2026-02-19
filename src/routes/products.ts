import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticateJWT, authorizeRoles } from '../middleware/jwt';

const router = Router();
const productController = new ProductController();

// Validation rules
const createProductValidation = [
  body('code').notEmpty().withMessage('Código es requerido'),
  body('name').notEmpty().withMessage('Nombre es requerido'),
  body('price').isNumeric().withMessage('Precio debe ser numérico'),
  body('description').optional({ nullable: true }).isString().withMessage('Descripción debe ser texto'),
  body('category_id').optional({ nullable: true }).isInt().withMessage('Categoría debe ser un número entero'),
  body('images').optional({ nullable: true }).isArray().withMessage('Imágenes debe ser un array'),
  body('woocommerce_image_ids').optional({ nullable: true }).isArray().withMessage('woocommerce_image_ids debe ser un array de IDs'),
  body('woocommerce_image_ids.*').optional().isInt().withMessage('Cada ID debe ser un número entero'),
  body('barcode').optional({ nullable: true }).isString().withMessage('Barcode debe ser texto'),
  body('qr_code').optional({ nullable: true }).isString().withMessage('QR debe ser texto'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock debe ser un número entero positivo'),
  body('min_stock').optional().isInt({ min: 0 }).withMessage('Stock mínimo debe ser un número entero positivo'),
  body('max_stock').optional().isInt({ min: 0 }).withMessage('Stock máximo debe ser un número entero positivo'),
  body('sync_to_woocommerce').optional().isBoolean().withMessage('sync_to_woocommerce debe ser booleano')
];

const updateProductValidation = [
  param('id').isInt().withMessage('ID debe ser un número entero'),
  body('code').optional().notEmpty().withMessage('Código no puede estar vacío'),
  body('name').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('price').optional().isNumeric().withMessage('Precio debe ser numérico'),
  body('description').optional({ nullable: true }).isString().withMessage('Descripción debe ser texto'),
  body('category_id').optional({ nullable: true }).isInt().withMessage('Categoría debe ser un número entero'),
  body('images').optional({ nullable: true }).isArray().withMessage('Imágenes debe ser un array'),
  body('woocommerce_image_ids').optional({ nullable: true }).isArray().withMessage('woocommerce_image_ids debe ser un array de IDs'),
  body('woocommerce_image_ids.*').optional().isInt().withMessage('Cada ID debe ser un número entero'),
  body('barcode').optional({ nullable: true }).isString().withMessage('Barcode debe ser texto'),
  body('qr_code').optional({ nullable: true }).isString().withMessage('QR debe ser texto'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock debe ser un número entero positivo'),
  body('min_stock').optional().isInt({ min: 0 }).withMessage('Stock mínimo debe ser un número entero positivo'),
  body('max_stock').optional().isInt({ min: 0 }).withMessage('Stock máximo debe ser un número entero positivo'),
  body('sync_to_woocommerce').optional().isBoolean().withMessage('sync_to_woocommerce debe ser booleano')
];

const updateStockValidation = [
  param('id').isInt().withMessage('ID debe ser un número entero'),
  body('stock').isNumeric().withMessage('Stock debe ser numérico'),
  body('operation').optional().isIn(['set', 'add', 'subtract']).withMessage('Operación debe ser set, add o subtract')
];

// Routes
// Autenticación requerida para todos los endpoints de productos
router.use(authenticateJWT);

// Lecturas: gerencia, ventas, logistica, finanzas
router.get('/', authorizeRoles('gerencia', 'ventas', 'logistica', 'finanzas'), productController.getAllProducts.bind(productController));
router.get('/stats', authorizeRoles('gerencia', 'ventas', 'logistica', 'finanzas'), productController.getProductStats.bind(productController));
router.get('/stock/low', authorizeRoles('gerencia', 'ventas', 'logistica', 'finanzas'), productController.getLowStockProducts.bind(productController));
router.get('/:id/woocommerce-json',
  authorizeRoles('gerencia', 'ventas', 'logistica', 'finanzas'),
  param('id').isInt().withMessage('ID debe ser un número entero'),
  validate([param('id').isInt().withMessage('ID debe ser un número entero')]),
  productController.getWooCommerceJson.bind(productController)
);
router.get('/:id', 
  authorizeRoles('gerencia', 'ventas', 'logistica', 'finanzas'),
  param('id').isInt().withMessage('ID debe ser un número entero'),
  validate([param('id').isInt().withMessage('ID debe ser un número entero')]),
  productController.getProductById.bind(productController)
);

// Crear/Actualizar/Eliminar productos: solo gerencia
router.post('/', 
  authorizeRoles('gerencia'),
  createProductValidation,
  validate(createProductValidation),
  productController.createProduct.bind(productController)
);
router.put('/:id', 
  authorizeRoles('gerencia'),
  updateProductValidation,
  validate(updateProductValidation),
  productController.updateProduct.bind(productController)
);
router.post('/link-woocommerce-ids',
  authorizeRoles('gerencia'),
  productController.bulkLinkProductsFromWooCommerce.bind(productController)
);
router.post('/:id/sync-to-woocommerce',
  authorizeRoles('gerencia'),
  param('id').isInt().withMessage('ID debe ser un número entero'),
  validate([param('id').isInt().withMessage('ID debe ser un número entero')]),
  productController.syncProductToWooCommerce.bind(productController)
);
router.delete('/:id', 
  authorizeRoles('gerencia'),
  param('id').isInt().withMessage('ID debe ser un número entero'),
  validate([param('id').isInt().withMessage('ID debe ser un número entero')]),
  productController.deleteProduct.bind(productController)
);
router.delete('/:id/permanent', 
  authorizeRoles('gerencia'),
  param('id').isInt().withMessage('ID debe ser un número entero'),
  validate([param('id').isInt().withMessage('ID debe ser un número entero')]),
  productController.permanentDeleteProduct.bind(productController)
);

// Actualización de stock: gerencia y logistica
router.put('/:id/stock', 
  authorizeRoles('gerencia', 'logistica'),
  updateStockValidation,
  validate(updateStockValidation),
  productController.updateStock.bind(productController)
);

// Barcode lookup endpoints
const barcodeValidation = [
  param('code').notEmpty().withMessage('Código de barras es requerido')
];

const acceptBarcodeValidation = [
  param('code').notEmpty().withMessage('Código de barras es requerido'),
  body('category_id').optional().isInt().withMessage('category_id debe ser un número entero'),
  body('price').optional().isNumeric().withMessage('price debe ser numérico'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock debe ser un número entero positivo'),
  body('code').optional().isString().withMessage('code debe ser texto')
];

const createFromBarcodeValidation = [
  param('code').notEmpty().withMessage('Código de barras es requerido'),
  body('code').notEmpty().withMessage('Código interno es requerido'),
  body('name').notEmpty().withMessage('Nombre es requerido'),
  body('price').isNumeric().withMessage('Precio debe ser numérico'),
  body('barcode').optional().isString().withMessage('Barcode debe ser texto'),
  body('description').optional({ nullable: true }).isString().withMessage('Descripción debe ser texto'),
  body('category_id').optional({ nullable: true }).isInt().withMessage('Categoría debe ser un número entero'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock debe ser un número entero positivo'),
  body('images').optional({ nullable: true }).isArray().withMessage('Imágenes debe ser un array')
];

// GET /api/products/barcode/:code - Buscar por código de barras
router.get('/barcode/:code',
  authorizeRoles('gerencia', 'ventas', 'logistica', 'finanzas'),
  validate(barcodeValidation),
  productController.getProductByBarcode.bind(productController)
);

// POST /api/products/barcode/:code/accept - Aceptar datos y crear producto
router.post('/barcode/:code/accept',
  authorizeRoles('gerencia'),
  validate(acceptBarcodeValidation),
  productController.acceptBarcodeData.bind(productController)
);

// POST /api/products/barcode/:code/create - Modificar datos y crear producto
router.post('/barcode/:code/create',
  authorizeRoles('gerencia'),
  validate(createFromBarcodeValidation),
  productController.createProductFromBarcode.bind(productController)
);

// POST /api/products/barcode/:code/ignore - Ignorar datos encontrados
router.post('/barcode/:code/ignore',
  authorizeRoles('gerencia', 'ventas', 'logistica', 'finanzas'),
  validate(barcodeValidation),
  productController.ignoreBarcodeData.bind(productController)
);

export default router;