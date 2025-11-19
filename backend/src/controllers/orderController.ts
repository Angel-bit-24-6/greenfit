import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import StripeService from '../services/stripeService';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createOrderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(['plate', 'custom']),
    plateId: z.string().min(1).optional(),
    customIngredients: z.array(z.string()).optional(),
    quantity: z.number().int().min(1),
    price: z.number().positive(),
    name: z.string().min(1),
    image: z.string().nullable().optional(),
  })),
  customerEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

const createPaymentIntentSchema = z.object({
  orderId: z.string().min(1),
});

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
  orderId: z.string().min(1),
});

export class OrderController {
  /**
   * Create a new order (without payment)
   */
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      console.log('📥 Creating order with data:', JSON.stringify(req.body, null, 2));
      const validatedData = createOrderSchema.parse(req.body);
      const { userId, items, customerEmail, notes } = validatedData;

      // Calculate total price
      const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Validate minimum order amount ($1.00)
      if (totalPrice < 1.00) {
        res.status(400).json({
          ok: false,
          message: 'Order must be at least $1.00',
        });
        return;
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          ok: false,
          message: 'User not found',
        });
        return;
      }

      // Validate stock for all items
      for (const item of items) {
        if (item.type === 'plate' && item.plateId) {
          const plate = await prisma.plate.findUnique({
            where: { id: item.plateId },
            include: { ingredients: { include: { ingredient: true } } },
          });

          if (!plate || !plate.available) {
            res.status(400).json({
              ok: false,
              message: `Plate "${item.name}" is not available`,
            });
            return;
          }

          // Check ingredients stock
          for (const plateIngredient of plate.ingredients) {
            if (plateIngredient.ingredient.stock < plateIngredient.quantity * item.quantity) {
              res.status(400).json({
                ok: false,
                message: `Insufficient stock for ingredient "${plateIngredient.ingredient.name}" in plate "${plate.name}"`,
              });
              return;
            }
          }
        } else if (item.type === 'custom' && item.customIngredients) {
          // Check custom ingredients stock
          for (const ingredientId of item.customIngredients) {
            const ingredient = await prisma.ingredient.findUnique({
              where: { id: ingredientId },
            });

            if (!ingredient || !ingredient.available || ingredient.stock < item.quantity) {
              res.status(400).json({
                ok: false,
                message: `Insufficient stock for ingredient "${ingredient?.name || 'Unknown'}"`,
              });
              return;
            }
          }
        }
      }

      // Create the order
      const order = await prisma.order.create({
        data: {
          userId,
          items: JSON.stringify(items),
          totalPrice,
          status: 'pending',
          paymentStatus: 'pending',
          notes: notes || null,
        },
      });

      console.log(`✅ Order created successfully: ${order.id} - $${totalPrice}`);

      res.status(201).json({
        ok: true,
        message: 'Order created successfully',
        data: {
          orderId: order.id,
          totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : Number(order.totalPrice),
          status: order.status,
          paymentStatus: order.paymentStatus,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          createdAt: order.createdAt,
        },
      });
    } catch (error) {
      console.error('❌ Create order error:', error);

      if (error instanceof z.ZodError) {
        console.error('❌ Zod validation errors:', JSON.stringify(error.errors, null, 2));
        res.status(400).json({
          ok: false,
          message: 'Invalid request data',
          errors: error.errors,
          receivedData: req.body,
        });
        return;
      }

      res.status(500).json({
        ok: false,
        message: 'Failed to create order',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Create payment intent for an order
   */
  static async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createPaymentIntentSchema.parse(req.body);
      const { orderId } = validatedData;

      // Get order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
      });

      if (!order) {
        res.status(404).json({
          ok: false,
          message: 'Order not found',
        });
        return;
      }

      if (order.paymentStatus === 'completed') {
        res.status(400).json({
          ok: false,
          message: 'Order has already been paid',
        });
        return;
      }

      // Convert total price to cents for Stripe
      const amountInCents = Math.round(Number(order.totalPrice) * 100);

      // Create payment intent
      const paymentIntent = await StripeService.createPaymentIntent({
        amount: amountInCents,
        orderId: order.id,
        customerEmail: order.user.email,
        metadata: {
          userId: order.userId,
          orderTotal: order.totalPrice.toString(),
        },
      });

      // Update order with payment intent ID
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentId: paymentIntent.paymentIntentId,
        },
      });

      console.log(`💳 Payment intent created for order ${orderId}: ${paymentIntent.paymentIntentId}`);

      res.status(200).json({
        ok: true,
        message: 'Payment intent created successfully',
        data: {
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.paymentIntentId,
          publishableKey: StripeService.getPublishableKey(),
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      });
    } catch (error) {
      console.error('❌ Create payment intent error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          message: 'Invalid request data',
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        ok: false,
        message: 'Failed to create payment intent',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Confirm payment and complete order
   */
  static async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = confirmPaymentSchema.parse(req.body);
      const { paymentIntentId, orderId } = validatedData;

      // Get order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        res.status(404).json({
          ok: false,
          message: 'Order not found',
        });
        return;
      }

      // Handle simulated payment intents (test mode)
      let paymentIntent;
      let isSimulatedPayment = paymentIntentId.startsWith('pi_test_');
      
      if (isSimulatedPayment) {
        // For simulated payments, we simulate the successful status
        console.log(`🧪 Detected simulated payment: ${paymentIntentId}`);
        paymentIntent = {
          id: paymentIntentId,
          status: 'succeeded',
          amount: Math.round(Number(order.totalPrice) * 100),
          currency: 'usd'
        };
      } else {
        // Get real payment intent from Stripe
        paymentIntent = await StripeService.getPaymentIntent(paymentIntentId);
      }

      if (paymentIntent.status === 'succeeded') {
        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'completed',
            status: 'confirmed',
            paymentMethod: isSimulatedPayment ? 'stripe_test' : 'stripe',
            paymentId: paymentIntentId,
            updatedAt: new Date(),
          },
        });

        // Reduce stock for ingredients
        await OrderController.updateStock(typeof order.items === 'string' ? JSON.parse(order.items) : order.items);

        console.log(`✅ Payment confirmed for order ${orderId}${isSimulatedPayment ? ' (simulated)' : ''}`);

        res.status(200).json({
          ok: true,
          message: 'Payment confirmed successfully',
          data: {
            orderId: updatedOrder.id,
            status: updatedOrder.status,
            paymentStatus: updatedOrder.paymentStatus,
            totalPrice: typeof updatedOrder.totalPrice === 'number' ? updatedOrder.totalPrice : Number(updatedOrder.totalPrice),
          },
        });
      } else {
        res.status(400).json({
          ok: false,
          message: `Payment not completed. Status: ${paymentIntent.status}`,
        });
      }
    } catch (error) {
      console.error('❌ Confirm payment error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          message: 'Invalid request data',
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        ok: false,
        message: 'Failed to confirm payment',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const { status, limit } = req.query;

      if (!userId) {
        res.status(400).json({
          ok: false,
          message: 'User ID is required',
        });
        return;
      }

      // Build where clause
      const whereClause: any = { userId };
      if (status && typeof status === 'string') {
        whereClause.status = status;
      }

      // Build query options
      const queryOptions: any = {
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      };

      if (limit && typeof limit === 'string') {
        const limitNumber = parseInt(limit, 10);
        if (!isNaN(limitNumber) && limitNumber > 0) {
          queryOptions.take = limitNumber;
        }
      }

      const orders = await prisma.order.findMany(queryOptions);

      // Parse items JSON for each order and convert totalPrice to number
      const ordersWithParsedItems = orders.map(order => ({
        ...order,
        totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : Number(order.totalPrice),
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      }));

      res.status(200).json({
        ok: true,
        message: 'Orders retrieved successfully',
        data: ordersWithParsedItems,
        meta: {
          total: ordersWithParsedItems.length,
          filters: { status, limit }
        }
      });
    } catch (error) {
      console.error('❌ Get user orders error:', error);

      res.status(500).json({
        ok: false,
        message: 'Failed to retrieve orders',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Get specific order
   */
  static async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId;

      if (!orderId) {
        res.status(400).json({
          ok: false,
          message: 'Order ID is required',
        });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      if (!order) {
        res.status(404).json({
          ok: false,
          message: 'Order not found',
        });
        return;
      }

      res.status(200).json({
        ok: true,
        message: 'Order retrieved successfully',
        data: {
          ...order,
          totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : Number(order.totalPrice),
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        },
      });
    } catch (error) {
      console.error('❌ Get order error:', error);

      res.status(500).json({
        ok: false,
        message: 'Failed to retrieve order',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Handle Stripe webhooks
   */
  static async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const body = req.body;

      if (!signature) {
        res.status(400).json({
          ok: false,
          message: 'Missing Stripe signature',
        });
        return;
      }

      await StripeService.handleWebhook(body, signature);

      res.status(200).json({
        ok: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      console.error('❌ Stripe webhook error:', error);

      res.status(400).json({
        ok: false,
        message: 'Webhook processing failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Update ingredient stock after successful payment
   */
  private static async updateStock(items: any[]): Promise<void> {
    for (const item of items) {
      if (item.type === 'plate' && item.plateId) {
        // Get plate ingredients
        const plate = await prisma.plate.findUnique({
          where: { id: item.plateId },
          include: { ingredients: { include: { ingredient: true } } },
        });

        if (plate) {
          for (const plateIngredient of plate.ingredients) {
            const stockReduction = plateIngredient.quantity * item.quantity;
            await prisma.ingredient.update({
              where: { id: plateIngredient.ingredientId },
              data: { stock: { decrement: stockReduction } },
            });
          }
        }
      } else if (item.type === 'custom' && item.customIngredients) {
        // Reduce stock for custom ingredients
        for (const ingredientId of item.customIngredients) {
          await prisma.ingredient.update({
            where: { id: ingredientId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
    }

    console.log('✅ Ingredient stock updated successfully');
  }
}

export default OrderController;
