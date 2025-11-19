import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController';

const router = Router();

// GET /api/catalog - Get complete catalog
router.get('/', CatalogController.getCatalog);

// GET /api/catalog/ingredients - Get ingredients only
router.get('/ingredients', CatalogController.getIngredients);

// GET /api/catalog/plates - Get plates only
router.get('/plates', CatalogController.getPlates);

// GET /api/catalog/ingredients/:id - Get ingredient by ID
router.get('/ingredients/:id', CatalogController.getIngredientById);

// GET /api/catalog/plates/:id - Get plate by ID
router.get('/plates/:id', CatalogController.getPlateById);

// GET /api/catalog/plates/:id/ingredients - Get plate ingredients with details
router.get('/plates/:plateId/ingredients', CatalogController.getPlateIngredients);

export default router;