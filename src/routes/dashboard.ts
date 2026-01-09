import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateJWT, authorizeRoles } from '../middleware/jwt';

const router = Router();
const dashboardController = new DashboardController();

// All dashboard routes require JWT auth
router.use(authenticateJWT);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', authorizeRoles('gerencia', 'finanzas'), dashboardController.getDashboardStats.bind(dashboardController));

// GET /api/dashboard/activities - Get recent activities
router.get('/activities', authorizeRoles('gerencia', 'finanzas'), dashboardController.getRecentActivities.bind(dashboardController));

export default router;
