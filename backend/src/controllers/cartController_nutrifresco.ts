import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1')
});

export class CartController {
  /**
   * Obtener carrito del usuario
   * GET /api/cart
   */
  static async getCart(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;

      // Obtener o crear carrito
      let cart = await prisma.cart.findFirst({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  producer: {
                    select: {
                      id: true,
                      businessName: true,
                      location: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId, totalWeightInKg: 0 },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    producer: {
                      select: {
                        id: true,
                        businessName: true,
                        location: true
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }

      // Obtener suscripción para calcular límite
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      const limitInKg = subscription?.limitInKg || 0;
      const usedKg = subscription?.usedKg || 0;
      const remainingKg = Math.max(0, limitInKg - usedKg);

      res.json({
        ok: true,
        data: {
          ...cart,
          limitInKg,
          usedKg,
          remainingKg
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Agregar producto al carrito
   * POST /api/cart/add
   * Body: { productId: string, quantity: number }
   */
  static async addItem(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const validatedData = addToCartSchema.parse(req.body);
      const { productId, quantity } = validatedData;

      // Verificar que el producto existe
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { producer: true }
      });

      if (!product) {
        return res.status(404).json({
          ok: false,
          message: 'Producto no encontrado'
        });
      }

      if (!product.available) {
        return res.status(400).json({
          ok: false,
          message: 'El producto no está disponible'
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          ok: false,
          message: `Solo hay ${product.stock} unidades disponibles`
        });
      }

      // Obtener suscripción y validar límite
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (!subscription || !subscription.isActive) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes una suscripción activa'
        });
      }

      // Calcular peso del item a agregar
      const itemWeight = product.weightInKg * quantity;
      const currentUsedKg = subscription.usedKg;
      const remainingKg = subscription.limitInKg - currentUsedKg;

      // Validar que no exceda el límite
      if (itemWeight > remainingKg) {
        return res.status(400).json({
          ok: false,
          message: `No puedes agregar este producto. Excederías tu límite de ${subscription.limitInKg} kg. Te quedan ${remainingKg.toFixed(2)} kg disponibles.`,
          data: {
            weightToAdd: itemWeight,
            remainingKg,
            limitInKg: subscription.limitInKg,
            wouldExceed: true
          }
        });
      }

      // Validar categoría según plan
      const categoryAllowed = validateCategoryForPlan(product.category, subscription.plan);
      if (!categoryAllowed) {
        return res.status(403).json({
          ok: false,
          message: `Tu plan ${subscription.plan} no permite productos de la categoría ${product.category}.`,
          data: {
            category: product.category,
            plan: subscription.plan
          }
        });
      }

      // Obtener o crear carrito
      let cart = await prisma.cart.findFirst({
        where: { userId }
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId, totalWeightInKg: 0 }
        });
      }

      // Verificar si el producto ya está en el carrito
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id
        }
      });

      let cartItem;
      let newTotalWeight = cart.totalWeightInKg;

      if (existingItem) {
        // Actualizar cantidad
        const newQuantity = existingItem.quantity + quantity;
        const newItemWeight = product.weightInKg * newQuantity;

        // Validar nuevo peso total
        const newTotalUsed = currentUsedKg - (existingItem.weightInKg) + newItemWeight;
        if (newTotalUsed > subscription.limitInKg) {
          return res.status(400).json({
            ok: false,
            message: `No puedes agregar más cantidad. Excederías tu límite.`,
            data: {
              currentQuantity: existingItem.quantity,
              requestedQuantity: newQuantity,
              wouldExceed: true
            }
          });
        }

        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            weightInKg: newItemWeight
          },
          include: {
            product: {
              include: {
                producer: {
                  select: {
                    id: true,
                    businessName: true,
                    location: true
                  }
                }
              }
            }
          }
        });

        newTotalWeight = cart.totalWeightInKg - existingItem.weightInKg + newItemWeight;
      } else {
        // Crear nuevo item
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            quantity,
            weightInKg: itemWeight,
            name: product.name,
            image: product.image || null
          },
          include: {
            product: {
              include: {
                producer: {
                  select: {
                    id: true,
                    businessName: true,
                    location: true
                  }
                }
              }
            }
          }
        });

        newTotalWeight = cart.totalWeightInKg + itemWeight;
      }

      // Actualizar peso total del carrito
      await prisma.cart.update({
        where: { id: cart.id },
        data: { totalWeightInKg: newTotalWeight }
      });

      // Obtener carrito actualizado
      const updatedCart = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  producer: {
                    select: {
                      id: true,
                      businessName: true,
                      location: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      res.json({
        ok: true,
        message: 'Producto agregado al carrito',
        data: {
          item: cartItem,
          cart: updatedCart,
          remainingKg: Math.max(0, remainingKg - itemWeight)
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          message: 'Datos inválidos',
          errors: error.errors
        });
      }
      next(error);
    }
  }

  /**
   * Actualizar cantidad de un item
   * PUT /api/cart/update
   * Body: { itemId: string, quantity: number }
   */
  static async updateQuantity(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const { itemId, quantity } = req.body;

      if (!itemId || !quantity || quantity < 0) {
        return res.status(400).json({
          ok: false,
          message: 'itemId y quantity son requeridos'
        });
      }

      // Obtener item del carrito
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: {
          cart: true,
          product: true
        }
      });

      if (!cartItem) {
        return res.status(404).json({
          ok: false,
          message: 'Item no encontrado en el carrito'
        });
      }

      // Verificar que el carrito pertenece al usuario
      if (cartItem.cart.userId !== userId) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para modificar este carrito'
        });
      }

      // Si quantity es 0, eliminar el item
      if (quantity === 0) {
        await prisma.cartItem.delete({
          where: { id: itemId }
        });

        const newTotalWeight = cartItem.cart.totalWeightInKg - cartItem.weightInKg;
        await prisma.cart.update({
          where: { id: cartItem.cartId },
          data: { totalWeightInKg: Math.max(0, newTotalWeight) }
        });

        return res.json({
          ok: true,
          message: 'Item eliminado del carrito'
        });
      }

      // Validar límite de suscripción
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (!subscription || !subscription.isActive) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes una suscripción activa'
        });
      }

      // Calcular nuevo peso
      const newItemWeight = cartItem.product.weightInKg * quantity;
      const weightDifference = newItemWeight - cartItem.weightInKg;
      const currentUsedKg = subscription.usedKg;
      const newTotalUsed = currentUsedKg + weightDifference;

      if (newTotalUsed > subscription.limitInKg) {
        return res.status(400).json({
          ok: false,
          message: `No puedes aumentar la cantidad. Excederías tu límite de ${subscription.limitInKg} kg.`,
          data: {
            wouldExceed: true,
            newTotalUsed,
            limitInKg: subscription.limitInKg
          }
        });
      }

      // Actualizar item
      const updatedItem = await prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          weightInKg: newItemWeight
        },
        include: {
          product: {
            include: {
              producer: {
                select: {
                  id: true,
                  businessName: true,
                  location: true
                }
              }
            }
          }
        }
      });

      // Actualizar peso total del carrito
      const newTotalWeight = cartItem.cart.totalWeightInKg + weightDifference;
      await prisma.cart.update({
        where: { id: cartItem.cartId },
        data: { totalWeightInKg: Math.max(0, newTotalWeight) }
      });

      res.json({
        ok: true,
        data: updatedItem
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar item del carrito
   * DELETE /api/cart/remove/:itemId
   */
  static async removeItem(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const { itemId } = req.params;

      const cartItem = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true }
      });

      if (!cartItem) {
        return res.status(404).json({
          ok: false,
          message: 'Item no encontrado'
        });
      }

      if (cartItem.cart.userId !== userId) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para eliminar este item'
        });
      }

      // Eliminar item
      await prisma.cartItem.delete({
        where: { id: itemId }
      });

      // Actualizar peso total del carrito
      const newTotalWeight = cartItem.cart.totalWeightInKg - cartItem.weightInKg;
      await prisma.cart.update({
        where: { id: cartItem.cartId },
        data: { totalWeightInKg: Math.max(0, newTotalWeight) }
      });

      res.json({
        ok: true,
        message: 'Item eliminado del carrito'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Vaciar carrito
   * DELETE /api/cart/clear
   */
  static async clearCart(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;

      const cart = await prisma.cart.findFirst({
        where: { userId }
      });

      if (!cart) {
        return res.json({
          ok: true,
          message: 'El carrito ya está vacío'
        });
      }

      // Eliminar todos los items
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      // Resetear peso total
      await prisma.cart.update({
        where: { id: cart.id },
        data: { totalWeightInKg: 0 }
      });

      res.json({
        ok: true,
        message: 'Carrito vaciado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Validar si una categoría está permitida para un plan
 */
function validateCategoryForPlan(category: string, plan: string): boolean {
  const basicCategories = ['FRUITS', 'VEGETABLES'];
  const standardCategories = [...basicCategories, 'LEGUMES', 'HERBS', 'SNACKS', 'COFFEE', 'CHOCOLATE'];
  const premiumCategories = [...standardCategories, 'PROTEINS'];

  switch (plan) {
    case 'BASIC':
      return basicCategories.includes(category);
    case 'STANDARD':
      return standardCategories.includes(category);
    case 'PREMIUM':
      return premiumCategories.includes(category);
    default:
      return false;
  }
}

