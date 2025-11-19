import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { CustomError } from '../middleware/errorHandler';
import { StripeService } from '../services/stripeService';
import { validateCartAvailability } from '../utils/plateAvailability';

export class PaymentController {
  /**
   * Process successful payment and create order
   * POST /api/payment/complete
   */
  static async completePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentIntentId, cartItems, customerEmail, notes } = req.body;

      if (!paymentIntentId || !cartItems) {
        throw new CustomError('Missing required fields: paymentIntentId and cartItems', 400);
      }

      // Get user from JWT middleware
      if (!req.user) {
        throw new CustomError('User authentication required', 401);
      }

      const userId = req.user.id;

      // 1. Verify payment was successful with Stripe
      const paymentIntent = await StripeService.getPaymentIntent(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new CustomError('Payment not completed', 400);
      }

      // 2. Validate stock availability before creating order
      const stockValidation = await validateCartAvailability(cartItems);
      if (!stockValidation.valid) {
        // Payment succeeded but no stock - need to refund
        await StripeService.createRefund(paymentIntentId);
        throw new CustomError(`Stock not available: ${stockValidation.issues.join(', ')}`, 400);
      }

      // 3. User already verified by JWT middleware, use req.user
      const user = req.user;

      // 4. Calculate total price
      const totalPrice = cartItems.reduce(
        (total: number, item: any) => total + (item.price * item.quantity), 
        0
      );

      // 5. Create order after successful payment
      const order = await prisma.order.create({
        data: {
          userId,
          items: JSON.stringify(cartItems),
          totalPrice,
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentMethod: 'stripe',
          paymentId: paymentIntentId,
          notes: notes || null,
        },
      });

      // 6. Update stock for ingredients
      await PaymentController.updateStockAfterPayment(cartItems);

      console.log(`✅ Order created after successful payment: ${order.id}`);

      res.status(200).json({
        ok: true,
        message: 'Payment completed and order created successfully',
        data: {
          orderId: order.id,
          paymentIntentId,
          totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : Number(order.totalPrice),
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      });

    } catch (error) {
      console.error('❌ Complete payment error:', error);
      next(error);
    }
  }

  /**
   * Update stock after successful payment
   */
  private static async updateStockAfterPayment(items: any[]): Promise<void> {
    try {
      for (const item of items) {
        if (item.type === 'plate' && item.plateId) {
          // Get plate ingredients
          const plate = await prisma.plate.findUnique({
            where: { id: item.plateId },
            include: {
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          });

          if (plate) {
            // Update stock for each ingredient in the plate
            for (const plateIngredient of plate.ingredients) {
              const requiredQuantity = plateIngredient.quantity * item.quantity;
              
              await prisma.ingredient.update({
                where: { id: plateIngredient.ingredientId },
                data: {
                  stock: {
                    decrement: requiredQuantity
                  }
                }
              });

              console.log(`📦 Reduced ${plateIngredient.ingredient.name} stock by ${requiredQuantity}`);
            }
          }
        } else if (item.type === 'custom' && item.customIngredients) {
          // Update stock for custom ingredients
          for (const ingredientId of item.customIngredients) {
            await prisma.ingredient.update({
              where: { id: ingredientId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            });
          }
        }
      }

      console.log('✅ Stock updated successfully after payment');
    } catch (error) {
      console.error('❌ Error updating stock:', error);
      throw error;
    }
  }
}
