import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ProductCategory } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductController {
  /**
   * Obtener todos los productos con filtros
   * GET /api/products?category=FRUITS&producerId=xxx&available=true
   */
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { category, producerId, available } = req.query;

      const where: any = {};

      if (category) {
        where.category = category as ProductCategory;
      }

      if (producerId) {
        where.producerId = producerId as string;
      }

      if (available !== undefined) {
        where.available = available === 'true';
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          producer: {
            select: {
              id: true,
              businessName: true,
              location: true,
              verified: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        ok: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener producto por ID
   * GET /api/products/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          producer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      });

      if (!product) {
        return res.status(404).json({
          ok: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        ok: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener productos por productor
   * GET /api/products/by-producer/:producerId
   */
  static async getByProducer(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { producerId } = req.params;

      const products = await prisma.product.findMany({
        where: { producerId },
        include: {
          producer: {
            select: {
              id: true,
              businessName: true,
              location: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        ok: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear nuevo producto
   * POST /api/products
   * Solo productores pueden crear productos
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Verificar que sea productor
      if (userRole !== 'producer' && userRole !== 'admin') {
        return res.status(403).json({
          ok: false,
          message: 'Solo los productores pueden crear productos'
        });
      }

      const {
        producerId,
        name,
        description,
        category,
        weightInKg,
        stock,
        image,
        origin,
        season,
        nutritionalInfo,
        tags
      } = req.body;

      // Validaciones
      if (!name || !category || !weightInKg) {
        return res.status(400).json({
          ok: false,
          message: 'Nombre, categoría y peso son requeridos'
        });
      }

      if (weightInKg <= 0) {
        return res.status(400).json({
          ok: false,
          message: 'El peso debe ser mayor a 0'
        });
      }

      // Verificar que el productor existe y pertenece al usuario (si no es admin)
      let finalProducerId = producerId;
      if (userRole === 'producer') {
        const producer = await prisma.producer.findUnique({
          where: { userId }
        });

        if (!producer) {
          return res.status(404).json({
            ok: false,
            message: 'No se encontró tu perfil de productor'
          });
        }

        finalProducerId = producer.id;
      } else if (!producerId) {
        return res.status(400).json({
          ok: false,
          message: 'producerId es requerido para administradores'
        });
      }

      // Verificar que el productor existe
      const producerExists = await prisma.producer.findUnique({
        where: { id: finalProducerId }
      });

      if (!producerExists) {
        return res.status(404).json({
          ok: false,
          message: 'Productor no encontrado'
        });
      }

      // Crear producto
      const product = await prisma.product.create({
        data: {
          producerId: finalProducerId,
          name,
          description,
          category: category as ProductCategory,
          weightInKg: parseFloat(weightInKg),
          available: true,
          stock: stock ? parseInt(stock) : 0,
          image,
          origin,
          season,
          nutritionalInfo: nutritionalInfo ? JSON.stringify(nutritionalInfo) : undefined,
          tags: tags ? JSON.stringify(tags) : JSON.stringify([])
        },
        include: {
          producer: {
            select: {
              id: true,
              businessName: true,
              location: true
            }
          }
        }
      });

      res.status(201).json({
        ok: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar producto
   * PUT /api/products/:id
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const product = await prisma.product.findUnique({
        where: { id },
        include: { producer: true }
      });

      if (!product) {
        return res.status(404).json({
          ok: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar permisos
      if (userRole !== 'admin' && product.producer.userId !== userId) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para actualizar este producto'
        });
      }

      const {
        name,
        description,
        category,
        weightInKg,
        available,
        stock,
        image,
        origin,
        season,
        nutritionalInfo,
        tags
      } = req.body;

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          name,
          description,
          category: category ? (category as ProductCategory) : undefined,
          weightInKg: weightInKg ? parseFloat(weightInKg) : undefined,
          available,
          stock: stock !== undefined ? parseInt(stock) : undefined,
          image,
          origin,
          season,
          nutritionalInfo: nutritionalInfo ? JSON.stringify(nutritionalInfo) : undefined,
          tags: tags ? JSON.stringify(tags) : undefined
        },
        include: {
          producer: {
            select: {
              id: true,
              businessName: true,
              location: true
            }
          }
        }
      });

      res.json({
        ok: true,
        data: updatedProduct
      });
    } catch (error) {
      next(error);
    }
  }
}

