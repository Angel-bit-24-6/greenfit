import { Router } from 'express';
import { ProducerController } from '../controllers/producerController';
import { authenticateUser, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Rutas públicas
router.get('/', ProducerController.getAll); // Listar productores
router.get('/:id', ProducerController.getById); // Ver productor

// Rutas protegidas
router.post('/register', authenticateUser, ProducerController.register); // Registrar como productor
router.put('/:id', authenticateUser, ProducerController.update); // Actualizar perfil de productor

export default router;

