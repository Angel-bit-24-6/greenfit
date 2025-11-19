import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateUser } from '../middleware/authMiddleware';

const router = Router();

// POST /api/payment/complete - Complete payment and create order (auth required)
router.post('/complete', authenticateUser, PaymentController.completePayment);

export default router;