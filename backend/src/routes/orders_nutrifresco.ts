import { Router } from 'express';
import { OrderController } from '../controllers/orderController_nutrifresco';
import { authenticateUser } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateUser);

// POST /api/orders/create - Crear pedido desde el carrito
router.post('/create', OrderController.createOrder);

// GET /api/orders/producer/my-orders - Obtener pedidos del productor (debe ir antes de /:id)
router.get('/producer/my-orders', OrderController.getProducerOrders);

// PUT /api/orders/producer/:id/status - Actualizar estado de pedido (productor)
router.put('/producer/:id/status', OrderController.updateOrderStatus);

// GET /api/orders - Obtener historial de pedidos
router.get('/', OrderController.getOrders);

// GET /api/orders/:id - Obtener detalles de un pedido
router.get('/:id', OrderController.getOrderById);

export default router;

