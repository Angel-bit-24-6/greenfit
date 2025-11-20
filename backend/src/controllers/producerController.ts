import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProducerController {
  /**
   * Obtener todos los productores
   * GET /api/producers
   */
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const producers = await prisma.producer.findMany({
        where: { verified: true }, // Solo productores verificados
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          products: {
            where: { available: true },
            select: {
              id: true,
              name: true,
              category: true,
              weightInKg: true,
              image: true
            },
            take: 5 // Solo primeros 5 productos para preview
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        ok: true,
        data: producers
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener productor por ID
   * GET /api/producers/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;

      const producer = await prisma.producer.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          products: {
            where: { available: true },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!producer) {
        return res.status(404).json({
          ok: false,
          message: 'Productor no encontrado'
        });
      }

      res.json({
        ok: true,
        data: producer
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registrar nuevo productor
   * POST /api/producers/register
   * Requiere autenticación
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const { businessName, description, location, contactInfo } = req.body;

      if (!businessName) {
        return res.status(400).json({
          ok: false,
          message: 'El nombre del negocio es requerido'
        });
      }

      // Verificar que el usuario no sea ya productor
      const existingProducer = await prisma.producer.findUnique({
        where: { userId }
      });

      if (existingProducer) {
        return res.status(400).json({
          ok: false,
          message: 'Ya eres un productor registrado'
        });
      }

      // Crear productor
      const producer = await prisma.producer.create({
        data: {
          userId,
          businessName,
          description,
          location,
          contactInfo: contactInfo ? JSON.stringify(contactInfo) : undefined,
          verified: false // Requiere verificación de admin
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Actualizar rol del usuario a 'producer'
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'producer' }
      });

      res.status(201).json({
        ok: true,
        message: 'Productor registrado exitosamente. Pendiente de verificación.',
        data: producer
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar perfil de productor
   * PUT /api/producers/:id
   * Solo el mismo productor o admin puede actualizar
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const { businessName, description, location, contactInfo } = req.body;

      // Verificar permisos
      const producer = await prisma.producer.findUnique({
        where: { id }
      });

      if (!producer) {
        return res.status(404).json({
          ok: false,
          message: 'Productor no encontrado'
        });
      }

      if (producer.userId !== userId && userRole !== 'admin') {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para actualizar este productor'
        });
      }

      // Actualizar
      const updatedProducer = await prisma.producer.update({
        where: { id },
        data: {
          businessName,
          description,
          location,
          contactInfo: contactInfo ? JSON.stringify(contactInfo) : undefined
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json({
        ok: true,
        data: updatedProducer
      });
    } catch (error) {
      next(error);
    }
  }
}

