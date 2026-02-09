import { Router } from 'express';
import dashboardRoutes from './dashboard';
import clientRoutes from './clients';
import productRoutes from './products';
import integrationRoutes from './integration';
import wooCommerceRoutes from './woocommerce';
import authRoutes from './auth';
import logisticsRoutes from './logistics';
import orderRoutes from './orders';
import cashRoutes from './cash';
import paymentsRoutes from './payments';
import purchaseRoutes from './purchases';
import rolesRoutes from './roles';
import usersRoutes from './users';
import supplierInvoiceRoutes from './supplierInvoices';
import supplierDeliveryNoteRoutes from './supplierDeliveryNotes';
import supplierAccountRoutes from './supplierAccounts';
import accruedExpenseRoutes from './accruedExpenses';
import accruedLiabilityRoutes from './accruedLiabilities';
import apiKeyRoutes from './apiKeys';
import categoryRoutes from './categories';
import saleRoutes from './sales';

const router = Router();

// Mount all route modules
router.use('/dashboard', dashboardRoutes);
router.use('/clients', clientRoutes);
router.use('/products', productRoutes);
router.use('/integration', integrationRoutes);
router.use('/woocommerce', wooCommerceRoutes);
router.use('/auth', authRoutes);
router.use('/logistics', logisticsRoutes);
router.use('/orders', orderRoutes);
router.use('/cash', cashRoutes);
router.use('/payments', paymentsRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/roles', rolesRoutes);
router.use('/users', usersRoutes);
router.use('/supplier-invoices', supplierInvoiceRoutes);
router.use('/supplier-delivery-notes', supplierDeliveryNoteRoutes);
router.use('/supplier-accounts', supplierAccountRoutes);
router.use('/accrued-expenses', accruedExpenseRoutes);
router.use('/accrued-liabilities', accruedLiabilityRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/categories', categoryRoutes);
router.use('/sales', saleRoutes);

// Health check for API routes
router.get('/', (req, res) => {
  res.json({
    message: 'MF Computers API Routes',
    version: '1.0.0',
      availableRoutes: {
      dashboard: '/api/dashboard',
      clients: '/api/clients',
      products: '/api/products',
      integration: '/api/integration',
      woocommerce: '/api/woocommerce',
      auth: '/api/auth',
      logistics: '/api/logistics',
      orders: '/api/orders',
      cash: '/api/cash',
      payments: '/api/payments',
      purchases: '/api/purchases',
      roles: '/api/roles',
      users: '/api/users',
      supplierInvoices: '/api/supplier-invoices',
      supplierDeliveryNotes: '/api/supplier-delivery-notes',
      supplierAccounts: '/api/supplier-accounts',
      accruedExpenses: '/api/accrued-expenses',
      accruedLiabilities: '/api/accrued-liabilities',
      apiKeys: '/api/api-keys',
      categories: '/api/categories',
      // Future routes will be added here
      stock: '/api/products/stock (available)',
      production: '/api/production (coming soon)',
      personnel: '/api/personnel (coming soon)',
      budgets: '/api/budgets (coming soon)',
      store: '/api/store (coming soon)',
      billing: '/api/billing (coming soon)'
    },
    products: {
      list: 'GET /api/products',
      get_by_id: 'GET /api/products/:id',
      create: 'POST /api/products',
      update: 'PUT /api/products/:id',
      delete: 'DELETE /api/products/:id (soft delete; envía a papelera en WooCommerce si está vinculado)',
      permanent_delete: 'DELETE /api/products/:id/permanent',
      update_stock: 'PUT /api/products/:id/stock',
      sync_to_woocommerce: 'POST /api/products/:id/sync-to-woocommerce',
      link_woocommerce_ids: 'POST /api/products/link-woocommerce-ids',
      low_stock: 'GET /api/products/stock/low',
      stats: 'GET /api/products/stats'
    },
    integration: {
      hello_world: '/api/integration/hello',
      woo_commerce_products: '/api/integration/products/woocommerce',
      stock_sync: '/api/integration/products/sync',
      stock_summary: '/api/integration/stock/summary',
      webhook: '/api/integration/webhook/woocommerce',
      webhook_order: 'POST /api/integration/webhook/woocommerce/order',
      wholesale_order: 'POST /api/integration/orders/woocommerce-mayorista'
    },
    woocommerce: {
      products: '/api/woocommerce/products',
      sync_products: '/api/woocommerce/products/sync',
      upload_media: 'POST /api/woocommerce/media',
      update_stock: '/api/woocommerce/products/:sku/stock'
    },
    logistics: {
      remitos: {
        list: 'GET /api/logistics/remitos',
        get_by_id: 'GET /api/logistics/remitos/:id',
        get_by_number: 'GET /api/logistics/remitos/number/:number',
        create: 'POST /api/logistics/remitos',
        update: 'PUT /api/logistics/remitos/:id',
        delete: 'DELETE /api/logistics/remitos/:id',
        prepare: 'PUT /api/logistics/remitos/:id/prepare',
        dispatch: 'PUT /api/logistics/remitos/:id/dispatch',
        deliver: 'PUT /api/logistics/remitos/:id/deliver',
        tracking: 'GET /api/logistics/remitos/:id/tracking'
      },
      trazabilidad: {
        create: 'POST /api/logistics/trazabilidad',
        get_by_remito: 'GET /api/logistics/remitos/:id/trazabilidad'
      },
      stats: 'GET /api/logistics/stats',
      zones: 'GET /api/logistics/zones',
      transport_companies: 'GET /api/logistics/transport-companies',
      config: 'GET /api/logistics/config',
      n8n_integration: {
        generate_from_order: 'POST /api/logistics/n8n/generate-from-order',
        update_status: 'PUT /api/logistics/n8n/update-status',
        sync_data: 'GET /api/logistics/n8n/sync-data'
      },
      public_tracking: {
        by_number: 'GET /api/logistics/public/tracking/:remitoNumber',
        by_id: 'GET /api/logistics/public/remitos/:id/tracking'
      }
    },
    orders: {
      list: 'GET /api/orders',
      get_by_id: 'GET /api/orders/:id',
      get_by_number: 'GET /api/orders/number/:number',
      create: 'POST /api/orders',
      update: 'PUT /api/orders/:id',
      delete: 'DELETE /api/orders/:id',
      stats: 'GET /api/orders/stats',
      config: 'GET /api/orders/config',
      ready_for_remito: 'GET /api/orders/ready-for-remito',
      reserve_stock: 'POST /api/orders/:id/reserve-stock',
      update_remito_status: 'PUT /api/orders/:id/remito-status',
      sync_to_woocommerce: 'POST /api/orders/:id/sync-to-woocommerce'
    },
    sales: {
      list: 'GET /api/sales',
      get_by_id: 'GET /api/sales/:id',
      create: 'POST /api/sales',
      stats: 'GET /api/sales/stats',
      sync_to_woocommerce: 'POST /api/sales/:id/sync'
    },
    purchases: {
      list: 'GET /api/purchases',
      get_by_id: 'GET /api/purchases/:id',
      create: 'POST /api/purchases',
      update: 'PUT /api/purchases/:id',
      delete: 'DELETE /api/purchases/:id',
      stats: 'GET /api/purchases/stats',
      items: {
        list: 'GET /api/purchases/:id/items',
        create: 'POST /api/purchases/:id/items',
        update: 'PUT /api/purchases/:id/items/:itemId',
        delete: 'DELETE /api/purchases/:id/items/:itemId'
      },
      suppliers: {
        list: 'GET /api/purchases/suppliers',
        get_by_id: 'GET /api/purchases/suppliers/:id',
        create: 'POST /api/purchases/suppliers',
        update: 'PUT /api/purchases/suppliers/:id',
        delete: 'DELETE /api/purchases/suppliers/:id',
        stats: 'GET /api/purchases/suppliers/stats'
      }
    }
  });
});

export default router;
