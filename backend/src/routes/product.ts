import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticateUser, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Rutas públicas
router.get('/', ProductController.getAll); // Listar productos con filtros
router.get('/:id', ProductController.getById); // Ver producto
router.get('/by-producer/:producerId', ProductController.getByProducer); // Productos por productor

// Rutas protegidas (solo productores y admin)
router.post('/', authenticateUser, ProductController.create); // Crear producto
router.put('/:id', authenticateUser, ProductController.update); // Actualizar producto

export default router;

