import { Router } from 'express';
import { ClientController } from '../controllers/clientController';
import { createClientValidation, updateClientValidation } from '../middleware/clientValidation';
import { authenticateJWT, authorizeRoles } from '../middleware/jwt';

const router = Router();
const clientController = new ClientController();

// Apply JWT authentication to all client routes
router.use(authenticateJWT);

/**
 * @route GET /api/clients
 * @desc Get all clients with pagination and filters
 * @access Public
 * @queryParams page, limit, search, status, city, all
 * @example 
 *   - GET /api/clients (paginado, 10 por página)
 *   - GET /api/clients?all=true (todos los clientes sin paginación)
 *   - GET /api/clients?page=2&limit=20 (página 2, 20 por página)
 *   - GET /api/clients?search=maria (buscar por nombre/código/email)
 *   - GET /api/clients?status=active (solo clientes activos)
 *   - GET /api/clients?city=Buenos Aires (filtrar por ciudad)
 */
router.get('/', authorizeRoles('gerencia', 'ventas', 'finanzas'), clientController.getAllClients.bind(clientController));

/**
 * @route GET /api/clients/stats
 * @desc Get client statistics 
 * @access Public
 */
router.get('/stats', authorizeRoles('gerencia', 'ventas', 'finanzas'), clientController.getClientStats.bind(clientController));

/**
 * @route GET /api/clients/:id
 * @desc Get client by ID
 * @access Public
 */
router.get('/:id', authorizeRoles('gerencia', 'ventas', 'finanzas'), clientController.getClientById.bind(clientController));

/**
 * @route POST /api/clients
 * @desc Create new client with auto-generated code
 * @access Public
 * @body { client_type?, name, email?, phone?, address?, city?, country? }
 * @note Code is automatically generated based on client_type (MAY001, MIN001, PER001, etc.)
 */
router.post('/', authorizeRoles('gerencia', 'ventas'), createClientValidation, clientController.createClient.bind(clientController));

/**
 * @route PUT /api/clients/:id
 * @desc Update client
 * @access Public
 * @body { code?, client_type?, name?, email?, phone?, address?, city?, country?, is_active? }
 */
router.put('/:id', authorizeRoles('gerencia', 'ventas'), updateClientValidation, clientController.updateClient.bind(clientController));

/**
 * @route DELETE /api/clients/:id
 * @desc Delete client (soft delete if has orders, hard delete otherwise)
 * @access Public
 */
router.delete('/:id', authorizeRoles('gerencia', 'ventas'), clientController.deleteClient.bind(clientController));

export default router;
