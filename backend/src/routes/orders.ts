import { Router } from 'express';
import { body } from 'express-validator';
import OrderController from '../controllers/orderController';
import { errorHandler } from '../middleware/errorHandler';

const router = Router();

// Validation middleware
const createOrderValidation = [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.type').isIn(['plate', 'custom']).withMessage('Item type must be plate or custom'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0.01 }).withMessage('Price must be positive'),
  body('items.*.name').isString().notEmpty().withMessage('Item name is required'),
  body('customerEmail').optional().isEmail().withMessage('Valid email is required'),
];

const createPaymentIntentValidation = [
  body('orderId').isString().notEmpty().withMessage('Order ID is required'),
];

const confirmPaymentValidation = [
  body('paymentIntentId').isString().notEmpty().withMessage('Payment Intent ID is required'),
  body('orderId').isString().notEmpty().withMessage('Order ID is required'),
];

// Routes

/**
 * @route   GET /api/orders/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'Orders service is healthy', 
    timestamp: new Date().toISOString(),
    stripe: {
      configured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
  });
});

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Public
 */
router.post('/', createOrderValidation, OrderController.createOrder);

/**
 * @route   POST /api/orders/payment-intent
 * @desc    Create payment intent for order
 * @access  Public
 */
router.post('/payment-intent', createPaymentIntentValidation, OrderController.createPaymentIntent);

/**
 * @route   POST /api/orders/confirm-payment
 * @desc    Confirm payment and complete order
 * @access  Public
 */
router.post('/confirm-payment', confirmPaymentValidation, OrderController.confirmPayment);

/**
 * @route   GET /api/orders/user/:userId
 * @desc    Get user's orders
 * @access  Public
 */
router.get('/user/:userId', OrderController.getUserOrders);

/**
 * @route   GET /api/orders/:orderId
 * @desc    Get specific order details
 * @access  Public
 */
router.get('/:orderId', OrderController.getOrder);

/**
 * @route   POST /api/orders/webhook/stripe
 * @desc    Handle Stripe webhooks
 * @access  Public (but secured by Stripe signature)
 */
router.post('/webhook/stripe', OrderController.handleStripeWebhook);

// Error handling middleware
router.use(errorHandler);

export default router;