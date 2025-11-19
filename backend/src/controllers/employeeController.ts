import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse } from '../types/api';
import bcrypt from 'bcryptjs';

export class EmployeeController {
  /**
   * Employee authentication
   * POST /api/employee/auth
   */
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new CustomError('Email and password are required', 400);
      }

      // Find employee user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new CustomError('Invalid credentials', 401);
      }

      if (user.role !== 'employee' && user.role !== 'admin') {
        throw new CustomError('Access denied. Employee role required.', 403);
      }

      // Verify password with bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new CustomError('Invalid credentials', 401);
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      const response: ApiResponse = {
        ok: true,
        data: {
          user: userWithoutPassword,
          message: 'Authentication successful'
        }
      };

      console.log(`👨‍🍳 Employee login successful: ${user.name} (${user.email})`);
      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Employee authentication error:', error);
      next(error);
    }
  }

  /**
   * Get active orders for kitchen dashboard
   * GET /api/employee/orders/active
   */
  static async getActiveOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, limit = '20' } = req.query;

      // Build where clause for active orders
      const whereClause: any = {
        paymentStatus: 'completed', // Only show paid orders
        status: {
          in: ['confirmed', 'preparing', 'ready', 'on_hold'] // Include on_hold orders
        }
      };

      // Optional status filter
      if (status && typeof status === 'string') {
        whereClause.status = status;
      }

      const limitNumber = parseInt(limit as string, 10);
      const validLimit = !isNaN(limitNumber) && limitNumber > 0 ? limitNumber : 20;

      // Fetch active orders
      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' }, // High priority first
          { createdAt: 'asc' }   // Oldest first (FIFO)
        ],
        take: validLimit
      });

      // Parse items JSON and calculate preparation stats
      const ordersWithDetails = await Promise.all(
        orders.map(async order => {
          const rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          const now = new Date();
          const orderAge = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)); // minutes

          // Enrich items with names from catalog
          const items = await Promise.all(
            rawItems.map(async (item: any) => {
              let itemName = item.name || 'Unknown Item';
              
              // If it's a plate and has plateId, get the name from plates table
              if (item.type === 'plate' && item.plateId && !item.name) {
                const plate = await prisma.plate.findUnique({
                  where: { id: item.plateId },
                  select: { name: true }
                });
                if (plate) {
                  itemName = plate.name;
                }
              }
              
              return {
                ...item,
                name: itemName,
                price: typeof item.price === 'number' ? item.price : Number(item.price || 0)
              };
            })
          );

          // Estimate preparation time based on items
          const estimatedPrepTime = items.reduce((total: number, item: any) => {
            // Base time per item + complexity factor
            const baseTime = item.quantity * 5; // 5 minutes per quantity
            const complexityFactor = item.type === 'custom' ? 1.5 : 1; // Custom plates take longer
            return total + (baseTime * complexityFactor);
          }, 10); // 10 minute base time

          return {
            ...order,
            totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : Number(order.totalPrice),
            items,
            orderAge,
            estimatedPrepTime: Math.ceil(estimatedPrepTime),
            isUrgent: orderAge > 30, // Mark urgent if older than 30 minutes
            customer: order.user
          };
        })
      );

      const response: ApiResponse = {
        ok: true,
        data: ordersWithDetails,
        meta: {
          total: ordersWithDetails.length,
          filters: { status, limit: validLimit },
          timestamp: new Date().toISOString()
        }
      };

      console.log(`📋 Fetched ${ordersWithDetails.length} active orders for kitchen`);
      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Get active orders error:', error);
      next(error);
    }
  }

  /**
   * Update order status
   * POST /api/employee/orders/:orderId/status
   */
  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const { status, employeeId, notes } = req.body;

      if (!orderId || !status) {
        throw new CustomError('Order ID and status are required', 400);
      }

      // Validate status
      const validStatuses = ['confirmed', 'preparing', 'ready', 'delivered', 'on_hold'];
      if (!validStatuses.includes(status)) {
        throw new CustomError('Invalid status', 400);
      }

      // Find the order
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!existingOrder) {
        throw new CustomError('Order not found', 404);
      }

      if (existingOrder.paymentStatus !== 'completed') {
        throw new CustomError('Cannot update unpaid order status', 400);
      }

      // Calculate preparation time if completing order
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (employeeId) {
        updateData.assignedTo = employeeId;
      }

      // Add completion tracking
      if (status === 'ready' && !existingOrder.actualReady) {
        updateData.actualReady = new Date();
        
        // Calculate actual preparation time
        if (existingOrder.createdAt) {
          const prepTime = Math.floor(
            (updateData.actualReady.getTime() - new Date(existingOrder.createdAt).getTime()) / (1000 * 60)
          );
          updateData.preparationTime = prepTime;
        }
      }

      if (status === 'preparing' && !existingOrder.estimatedReady) {
        // Set estimated ready time (20 minutes from now as default)
        const estimatedReady = new Date();
        estimatedReady.setMinutes(estimatedReady.getMinutes() + 20);
        updateData.estimatedReady = estimatedReady;
      }

      // Update the order
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Enrich items with names before sending response
      const rawItems = typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : updatedOrder.items;
      const enrichedItems = await Promise.all(
        rawItems.map(async (item: any) => {
          let itemName = item.name || 'Unknown Item';
          
          // If it's a plate and has plateId, get the name from plates table
          if (item.type === 'plate' && item.plateId && !item.name) {
            const plate = await prisma.plate.findUnique({
              where: { id: item.plateId },
              select: { name: true }
            });
            if (plate) {
              itemName = plate.name;
            }
          }
          
          return {
            ...item,
            name: itemName,
            price: typeof item.price === 'number' ? item.price : Number(item.price || 0)
          };
        })
      );

      const response: ApiResponse = {
        ok: true,
        data: {
          ...updatedOrder,
          totalPrice: typeof updatedOrder.totalPrice === 'number' ? updatedOrder.totalPrice : Number(updatedOrder.totalPrice),
          items: enrichedItems
        },
        meta: {
          previousStatus: existingOrder.status,
          newStatus: status,
          updatedBy: employeeId || 'unknown',
          timestamp: new Date().toISOString()
        }
      };

      console.log(`🔄 Order ${orderId} status updated: ${existingOrder.status} → ${status}`);
      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Update order status error:', error);
      next(error);
    }
  }

  /**
   * Get order details
   * GET /api/employee/orders/:orderId
   */
  static async getOrderDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new CustomError('Order ID is required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!order) {
        throw new CustomError('Order not found', 404);
      }

      // Parse items and add detailed information
      const rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      const now = new Date();
      const orderAge = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 60));

      // Enrich items with names from catalog
      const items = await Promise.all(
        rawItems.map(async (item: any) => {
          let itemName = item.name || 'Unknown Item';
          
          // If it's a plate and has plateId, get the name from plates table
          if (item.type === 'plate' && item.plateId && !item.name) {
            const plate = await prisma.plate.findUnique({
              where: { id: item.plateId },
              select: { name: true }
            });
            if (plate) {
              itemName = plate.name;
            }
          }
          
          return {
            ...item,
            name: itemName,
            price: typeof item.price === 'number' ? item.price : Number(item.price || 0)
          };
        })
      );

      const orderWithDetails = {
        ...order,
        totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : Number(order.totalPrice),
        items,
        orderAge,
        customer: order.user,
        timeline: {
          ordered: order.createdAt,
          estimated: order.estimatedReady,
          completed: order.actualReady,
          preparationTime: order.preparationTime
        }
      };

      const response: ApiResponse = {
        ok: true,
        data: orderWithDetails
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Get order details error:', error);
      next(error);
    }
  }

  /**
   * Get kitchen dashboard summary
   * GET /api/employee/dashboard/summary
   */
  static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get counts for different order statuses
      const [
        pendingCount,
        preparingCount,
        readyCount,
        completedToday,
        totalToday
      ] = await Promise.all([
        prisma.order.count({
          where: {
            status: 'confirmed',
            paymentStatus: 'completed'
          }
        }),
        prisma.order.count({
          where: {
            status: 'preparing',
            paymentStatus: 'completed'
          }
        }),
        prisma.order.count({
          where: {
            status: 'ready',
            paymentStatus: 'completed'
          }
        }),
        prisma.order.count({
          where: {
            status: 'delivered',
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        prisma.order.count({
          where: {
            paymentStatus: 'completed',
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          }
        })
      ]);

      // Get average preparation time for today
      const avgPrepTime = await prisma.order.aggregate({
        where: {
          preparationTime: { not: null },
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        },
        _avg: {
          preparationTime: true
        }
      });

      const summary = {
        queue: {
          pending: pendingCount,
          preparing: preparingCount,
          ready: readyCount
        },
        today: {
          completed: completedToday,
          total: totalToday,
          avgPrepTime: Math.round(avgPrepTime._avg.preparationTime || 0)
        },
        timestamp: new Date().toISOString()
      };

      const response: ApiResponse = {
        ok: true,
        data: summary
      };

      console.log(`📊 Dashboard summary: ${pendingCount} pending, ${preparingCount} preparing, ${readyCount} ready`);
      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Get dashboard summary error:', error);
      next(error);
    }
  }
}