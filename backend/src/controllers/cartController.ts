import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { ApiResponse } from '../types/api';
import { CustomError } from '../middleware/errorHandler';
import { parseJsonArray } from '../utils/jsonHelpers';

// Validation schemas
const addToCartSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  type: z.enum(['plate', 'custom'], { required_error: 'Type must be plate or custom' }),
  plateId: z.string().optional(),
  custom_ingredients: z.array(z.string()).optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(10, 'Maximum quantity is 10')
});

export class CartController {
  /**
   * Add item to cart
   * POST /api/cart/add
   */
  static async addToCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Basic validation
      const { user_id, type, plateId, custom_ingredients, quantity } = req.body;
      
      if (!user_id || !type || !quantity) {
        const response: ApiResponse = {
          ok: false,
          error: 'Missing required fields: user_id, type, quantity'
        };
        res.status(400).json(response);
        return;
      }

      // Create or find cart
      let cart = await prisma.cart.findFirst({
        where: { userId: user_id },
        include: { items: true }
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: {
            userId: user_id,
            totalPrice: 0
          },
          include: { items: true }
        });
      }

      // Calculate item details
      let itemName = 'Unknown item';
      let itemPrice = 0;

      if (type === 'plate' && plateId) {
        const plate = await prisma.plate.findUnique({ where: { id: plateId } });
        if (!plate) {
          res.status(404).json({ ok: false, error: 'Plate not found' });
          return;
        }
        itemName = plate.name;
        itemPrice = Number(plate.price);
      } else if (type === 'custom' && custom_ingredients) {
        itemName = `Custom plate (${custom_ingredients.length} ingredients)`;
        itemPrice = custom_ingredients.length * 15; // Simple pricing
      }

      // Add item to cart
      const cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          type,
          plateId: type === 'plate' ? plateId : null,
          customIngredients: type === 'custom' ? (custom_ingredients || []) : [],
          quantity,
          price: itemPrice,
          name: itemName,
          image: null
        }
      });

      // Update cart total
      const newTotal = Number(cart.totalPrice) + (itemPrice * quantity);
      await prisma.cart.update({
        where: { id: cart.id },
        data: { totalPrice: newTotal }
      });

      const response: ApiResponse = {
        ok: true,
        data: {
          cart: {
            id: cart.id,
            items: [...cart.items, cartItem].map(item => ({
              id: item.id,
              type: item.type,
              name: item.name,
              quantity: item.quantity,
              price: Number(item.price)
            })),
            totalPrice: newTotal,
            totalItems: cart.items.length + 1
          }
        }
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's cart
   * GET /api/cart/:userId
   */
  static async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ ok: false, error: 'User ID is required' });
        return;
      }

      const cart = await prisma.cart.findFirst({
        where: { userId },
        include: { items: true }
      });

      if (!cart) {
        res.json({
          ok: true,
          data: { id: null, items: [], totalPrice: 0, totalItems: 0 }
        });
        return;
      }

      const response: ApiResponse = {
        ok: true,
        data: {
          id: cart.id,
          items: cart.items.map(item => ({
            id: item.id,
            type: item.type,
            plateId: item.plateId,
            customIngredients: parseJsonArray(item.customIngredients || '[]') as string[],
            quantity: item.quantity,
            price: Number(item.price),
            name: item.name
          })),
          totalPrice: typeof cart.totalPrice === 'number' ? cart.totalPrice : Number(cart.totalPrice),
          totalItems: cart.items.reduce((total, item) => total + item.quantity, 0)
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate cart items before checkout
   * POST /api/validate
   */
  static async validateCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        res.status(400).json({ ok: false, error: 'Items array is required' });
        return;
      }

      const validation = {
        valid: true,
        errors: [] as string[],
        warnings: [] as string[],
        unavailableItems: [] as any[]
      };

      // Basic validation - all items are considered valid for now
      const response: ApiResponse = { ok: true, data: validation };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:itemId
   */
  static async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        res.status(400).json({ ok: false, error: 'Item ID is required' });
        return;
      }

      const cartItem = await prisma.cartItem.findUnique({
        where: { id: itemId }
      });

      if (!cartItem) {
        res.status(404).json({ ok: false, error: 'Cart item not found' });
        return;
      }

      await prisma.cartItem.delete({
        where: { id: itemId }
      });

      res.json({ ok: true, data: { message: 'Item removed from cart' } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear entire cart
   * DELETE /api/cart/:userId
   */
  static async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ ok: false, error: 'User ID is required' });
        return;
      }

      await prisma.cart.deleteMany({
        where: { userId }
      });

      res.json({ ok: true, data: { message: 'Cart cleared' } });
    } catch (error) {
      next(error);
    }
  }
}