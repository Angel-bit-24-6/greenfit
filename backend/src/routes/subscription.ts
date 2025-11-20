import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authenticateUser } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateUser);

// GET /api/subscription/current - Obtener suscripción actual
router.get('/current', SubscriptionController.getCurrent);

// GET /api/subscription/usage - Obtener uso (kg usados y restantes)
router.get('/usage', SubscriptionController.getUsage);

// POST /api/subscription/change - Cambiar plan
router.post('/change', SubscriptionController.changePlan);

// POST /api/subscription/validate - Validar peso antes de agregar
router.post('/validate', SubscriptionController.validateWeight);

export default router;

