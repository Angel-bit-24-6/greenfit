import { Router } from 'express';
import { CartController } from '../controllers/cartController_nutrifresco';
import { authenticateUser } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateUser);

// GET /api/cart - Obtener carrito del usuario
router.get('/', CartController.getCart);

// POST /api/cart/add - Agregar producto al carrito
router.post('/add', CartController.addItem);

// PUT /api/cart/update - Actualizar cantidad de un item
router.put('/update', CartController.updateQuantity);

// DELETE /api/cart/remove/:itemId - Eliminar item del carrito
router.delete('/remove/:itemId', CartController.removeItem);

// DELETE /api/cart/clear - Vaciar carrito
router.delete('/clear', CartController.clearCart);

export default router;

