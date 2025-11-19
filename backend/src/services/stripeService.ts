import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
});

export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  orderId: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export class StripeService {
  /**
   * Creates a payment intent for processing payment
   */
  static async createPaymentIntent({
    amount,
    currency = process.env.STRIPE_CURRENCY || 'usd',
    orderId,
    customerEmail,
    metadata = {}
  }: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      // Validate amount (minimum $0.50 for Stripe)
      if (amount < 50) {
        throw new Error('Amount must be at least $0.50');
      }

      const createParams: any = {
        amount: Math.round(amount), // Ensure integer cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId,
          ...metadata,
        },
      };

      if (customerEmail) {
        createParams.receipt_email = customerEmail;
      }

      const paymentIntent = await stripe.paymentIntents.create(createParams);

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      console.error('❌ Stripe Payment Intent creation failed:', error);
      throw new Error(`Payment initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirms a payment intent
   */
  static async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Stripe Payment Intent confirmation failed:', error);
      throw new Error(`Payment confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a payment intent
   */
  static async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Stripe Payment Intent retrieval failed:', error);
      throw new Error(`Payment retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancels a payment intent
   */
  static async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Stripe Payment Intent cancellation failed:', error);
      throw new Error(`Payment cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Processes Stripe webhooks
   */
  static async handleWebhook(body: string, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.canceled':
          await this.handlePaymentCancellation(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          console.log(`🔔 Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      throw new Error(`Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handles successful payment
   */
  private static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata.orderId;
    
    if (!orderId) {
      console.error('❌ No orderId found in payment intent metadata');
      return;
    }

    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'completed',
          status: 'confirmed',
          paymentId: paymentIntent.id,
          paymentMethod: 'stripe',
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Payment successful for order ${orderId}`);
    } catch (error) {
      console.error(`❌ Failed to update order ${orderId} after successful payment:`, error);
    }
  }

  /**
   * Handles failed payment
   */
  private static async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata.orderId;
    
    if (!orderId) {
      console.error('❌ No orderId found in payment intent metadata');
      return;
    }

    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'failed',
          status: 'cancelled',
          paymentId: paymentIntent.id,
          updatedAt: new Date(),
        },
      });

      console.log(`❌ Payment failed for order ${orderId}`);
    } catch (error) {
      console.error(`❌ Failed to update order ${orderId} after payment failure:`, error);
    }
  }

  /**
   * Handles payment cancellation
   */
  private static async handlePaymentCancellation(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata.orderId;
    
    if (!orderId) {
      console.error('❌ No orderId found in payment intent metadata');
      return;
    }

    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'failed',
          status: 'cancelled',
          paymentId: paymentIntent.id,
          updatedAt: new Date(),
        },
      });

      console.log(`🚫 Payment cancelled for order ${orderId}`);
    } catch (error) {
      console.error(`❌ Failed to update order ${orderId} after payment cancellation:`, error);
    }
  }

  /**
   * Creates a refund for a payment
   */
  static async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<Stripe.Refund> {
    try {
      const refundParams: any = {
        payment_intent: paymentIntentId,
        reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
      };

      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await stripe.refunds.create(refundParams);

      return refund;
    } catch (error) {
      console.error('❌ Stripe refund creation failed:', error);
      throw new Error(`Refund creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets publishable key for frontend
   */
  static getPublishableKey(): string {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      throw new Error('STRIPE_PUBLISHABLE_KEY is not configured');
    }

    return publishableKey;
  }
}

export default StripeService;