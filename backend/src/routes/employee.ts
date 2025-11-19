import { Router } from 'express';
import { EmployeeController } from '../controllers/employeeController';

const router = Router();

// Authentication
router.post('/auth', EmployeeController.authenticate);

// Orders management
router.get('/orders/active', EmployeeController.getActiveOrders);
router.get('/orders/:orderId', EmployeeController.getOrderDetails);
router.post('/orders/:orderId/status', EmployeeController.updateOrderStatus);

// Dashboard
router.get('/dashboard/summary', EmployeeController.getDashboardSummary);

export default router;