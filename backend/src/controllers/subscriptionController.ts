import { Request, Response, NextFunction } from 'express';
import { PrismaClient, SubscriptionPlan } from '@prisma/client';

const prisma = new PrismaClient();

export class SubscriptionController {
  /**
   * Obtener suscripción actual del usuario
   * GET /api/subscription/current
   */
  static async getCurrent(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { user: { select: { id: true, email: true, name: true } } }
      });

      if (!subscription) {
        return res.status(404).json({
          ok: false,
          message: 'No se encontró suscripción activa'
        });
      }

      // Calcular kg restantes
      const remainingKg = subscription.limitInKg - subscription.usedKg;

      res.json({
        ok: true,
        data: {
          ...subscription,
          remainingKg: Math.max(0, remainingKg)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener uso actual (kg usados y restantes)
   * GET /api/subscription/usage
   */
  static async getUsage(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;

      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (!subscription) {
        return res.status(404).json({
          ok: false,
          message: 'No se encontró suscripción activa'
        });
      }

      const remainingKg = subscription.limitInKg - subscription.usedKg;

      res.json({
        ok: true,
        data: {
          plan: subscription.plan,
          limitInKg: subscription.limitInKg,
          usedKg: subscription.usedKg,
          remainingKg: Math.max(0, remainingKg),
          renewalDate: subscription.renewalDate,
          isActive: subscription.isActive
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cambiar plan de suscripción
   * POST /api/subscription/change
   * Body: { plan: 'BASIC' | 'STANDARD' | 'PREMIUM' }
   */
  static async changePlan(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const { plan } = req.body;

      if (!plan || !['BASIC', 'STANDARD', 'PREMIUM'].includes(plan)) {
        return res.status(400).json({
          ok: false,
          message: 'Plan inválido. Debe ser BASIC, STANDARD o PREMIUM'
        });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (!subscription) {
        return res.status(404).json({
          ok: false,
          message: 'No se encontró suscripción'
        });
      }

      // Definir límites por plan
      const planLimits: Record<SubscriptionPlan, number> = {
        BASIC: 5.0,
        STANDARD: 8.0,
        PREMIUM: 10.0
      };

      const newLimit = planLimits[plan as SubscriptionPlan];

      // Advertencia si ya usó parte del límite
      const hasUsedLimit = subscription.usedKg > 0;
      const warning = hasUsedLimit 
        ? `Ya has usado ${subscription.usedKg} kg de tu plan actual. El nuevo límite será ${newLimit} kg.`
        : null;

      // Actualizar suscripción
      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          plan: plan as SubscriptionPlan,
          limitInKg: newLimit,
          // Si el nuevo límite es menor que lo usado, ajustar usedKg
          usedKg: Math.min(subscription.usedKg, newLimit)
        }
      });

      res.json({
        ok: true,
        data: updatedSubscription,
        warning
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validar si se puede agregar un producto (verificar límite)
   * POST /api/subscription/validate
   * Body: { weightInKg: number }
   */
  static async validateWeight(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const { weightInKg } = req.body;

      if (!weightInKg || typeof weightInKg !== 'number' || weightInKg <= 0) {
        return res.status(400).json({
          ok: false,
          message: 'Peso inválido'
        });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (!subscription || !subscription.isActive) {
        return res.status(404).json({
          ok: false,
          message: 'No se encontró suscripción activa'
        });
      }

      const remainingKg = subscription.limitInKg - subscription.usedKg;
      const canAdd = remainingKg >= weightInKg;

      res.json({
        ok: true,
        data: {
          canAdd,
          weightToAdd: weightInKg,
          currentUsed: subscription.usedKg,
          limit: subscription.limitInKg,
          remaining: Math.max(0, remainingKg),
          wouldExceed: !canAdd,
          excessKg: canAdd ? 0 : weightInKg - remainingKg
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

