import { Router } from 'express';
import { StripeService } from '../services/stripeService';
import { Request, Response } from 'express';

const router = Router();

/**
 * Create Payment Intent without order (for new checkout flow)
 * POST /api/stripe/create-payment-intent
 */
router.post('/create-payment-intent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency = 'usd', metadata, cartItems } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({
        ok: false,
        message: 'Valid amount is required',
      });
      return;
    }

    // Create a temporary orderId for metadata (since we don't have an order yet)
    const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare safe metadata - avoid exceeding Stripe's 500 char limit per value
    const safeMetadata: Record<string, string> = {};
    
    // Add basic info
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length <= 500) {
          safeMetadata[key] = value;
        }
      });
    }

    // Add cart summary safely (instead of full cart data)
    if (cartItems && Array.isArray(cartItems)) {
      safeMetadata.itemCount = cartItems.length.toString();
      safeMetadata.totalAmount = amount.toString();
      
      // Add first few item names (truncated to fit)
      const itemNames = cartItems.slice(0, 3).map((item: any) => item.name || 'Item').join(', ');
      const truncatedNames = itemNames.length > 400 ? itemNames.substring(0, 397) + '...' : itemNames;
      safeMetadata.items = truncatedNames;
      
      if (cartItems.length > 3) {
        safeMetadata.moreItems = `+${cartItems.length - 3} more`;
      }
    }

    const paymentIntent = await StripeService.createPaymentIntent({
      amount,
      currency,
      orderId: tempOrderId,
      metadata: safeMetadata
    });

    console.log('💳 Payment intent created successfully:');
    console.log('   - Payment Intent ID:', paymentIntent.paymentIntentId);
    console.log('   - Amount:', paymentIntent.amount);
    console.log('   - Items in cart:', cartItems ? cartItems.length : 0);
    console.log('   - Metadata size:', JSON.stringify(safeMetadata).length, 'characters');

    res.status(200).json({
      ok: true,
      message: 'Payment intent created successfully',
      data: {
        paymentIntentId: paymentIntent.paymentIntentId,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });

  } catch (error) {
    console.error('❌ Payment intent creation error:', error);

    res.status(500).json({
      ok: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

export default router;