import { Router } from 'express';
import { CartController } from '../controllers/cartController';

const router = Router();

// POST /api/cart/add - Add item to cart
router.post('/add', CartController.addToCart);

// GET /api/cart/:userId - Get user's cart
router.get('/:userId', CartController.getCart);

// DELETE /api/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', CartController.removeItem);

// DELETE /api/cart/:userId - Clear entire cart
router.delete('/:userId', CartController.clearCart);

export default router;