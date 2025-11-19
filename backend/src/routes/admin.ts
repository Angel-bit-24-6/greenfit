import express from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateUser, requireAdminRole } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateUser);
router.use(requireAdminRole);

// ===== INVENTORY MANAGEMENT =====
router.get('/ingredients', AdminController.getIngredients);
router.get('/ingredients/deleted', AdminController.getDeletedIngredients);
router.post('/ingredients', AdminController.createIngredient);
router.put('/ingredients/:id', AdminController.updateIngredient);
router.delete('/ingredients/:id', AdminController.deleteIngredient);
router.post('/ingredients/:id/restore', AdminController.restoreIngredient);
router.post('/ingredients/bulk-stock', AdminController.bulkUpdateStock);

// ===== MENU MANAGEMENT =====
router.get('/plates', AdminController.getPlates);
router.post('/plates', AdminController.createPlate);
router.put('/plates/:id', AdminController.updatePlate);
router.delete('/plates/:id', AdminController.deletePlate);

// ===== ANALYTICS & REPORTING =====
router.get('/analytics/sales', AdminController.getSalesAnalytics);
router.get('/analytics/inventory', AdminController.getInventoryAnalytics);

// ===== USER MANAGEMENT =====
router.get('/users', AdminController.getUsers);
router.put('/users/:id/role', AdminController.updateUserRole);

// ===== SYSTEM OVERVIEW =====
router.get('/overview', AdminController.getSystemOverview);

// ===== SUGGESTIONS MANAGEMENT =====
router.get('/suggestions', AdminController.getSuggestions);
router.put('/suggestions/:id', AdminController.updateSuggestion);

export default router;