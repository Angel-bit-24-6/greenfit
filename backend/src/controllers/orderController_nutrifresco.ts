import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const createOrderSchema = z.object({
  deliveryAddress: z.string().min(1, 'Dirección de entrega es requerida'),
  deliveryDate: z.string().optional(), // ISO date string
  notes: z.string().optional()
});

export class OrderController {
  /**
   * Crear pedido desde el carrito
   * POST /api/orders/create
   * Body: { deliveryAddress: string, deliveryDate?: string, notes?: string }
   */
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const validatedData = createOrderSchema.parse(req.body);
      const { deliveryAddress, deliveryDate, notes } = validatedData;

      // Obtener carrito del usuario
      const cart = await prisma.cart.findFirst({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  producer: true
                }
              }
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          ok: false,
          message: 'El carrito está vacío'
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

      // Calcular peso total del pedido
      const totalWeightInKg = cart.items.reduce((sum, item) => sum + item.weightInKg, 0);

      // Validar que no exceda el límite
      const newUsedKg = subscription.usedKg + totalWeightInKg;
      if (newUsedKg > subscription.limitInKg) {
        return res.status(400).json({
          ok: false,
          message: `No puedes crear este pedido. Excederías tu límite de ${subscription.limitInKg} kg. Te quedan ${(subscription.limitInKg - subscription.usedKg).toFixed(2)} kg disponibles.`,
          data: {
            totalWeightInKg,
            currentUsed: subscription.usedKg,
            limit: subscription.limitInKg,
            wouldExceed: true
          }
        });
      }

      // Crear pedido
      const order = await prisma.order.create({
        data: {
          userId,
          totalWeightInKg,
          status: 'pending',
          deliveryAddress,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          notes
        }
      });

      // Crear items del pedido
      const orderItems = await Promise.all(
        cart.items.map(item =>
          prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              weightInKg: item.weightInKg,
              name: item.name,
              image: item.image,
              producerName: item.product.producer.businessName
            }
          })
        )
      );

      // Actualizar suscripción: agregar peso usado
      await prisma.subscription.update({
        where: { userId },
        data: {
          usedKg: newUsedKg
        }
      });

      // Limpiar carrito
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      await prisma.cart.update({
        where: { id: cart.id },
        data: { totalWeightInKg: 0 }
      });

      // Obtener pedido completo
      const completeOrder = await prisma.order.findUnique({
        where: { id: order.id },
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

      res.status(201).json({
        ok: true,
        message: 'Pedido creado exitosamente',
        data: completeOrder
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
   * Obtener historial de pedidos del usuario
   * GET /api/orders
   */
  static async getOrders(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;

      const orders = await prisma.order.findMany({
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
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        ok: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener detalles de un pedido
   * GET /api/orders/:id
   */
  static async getOrderById(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  producer: {
                    select: {
                      id: true,
                      businessName: true,
                      location: true,
                      contactInfo: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!order) {
        return res.status(404).json({
          ok: false,
          message: 'Pedido no encontrado'
        });
      }

      // Verificar que el pedido pertenece al usuario
      if (order.userId !== userId) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para ver este pedido'
        });
      }

      res.json({
        ok: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }
}

