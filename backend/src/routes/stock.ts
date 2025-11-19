import { Router } from 'express';
import { StockController } from '../controllers/stockController';

const router = Router();

// POST /api/stock/validate - Validate stock for cart items
router.post('/validate', StockController.validateStock);

// GET /api/stock/ingredients - Get stock levels for specific ingredients
router.get('/ingredients', StockController.getIngredientStock);

export default router;