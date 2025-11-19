import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { CustomError } from './errorHandler';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

/**
 * JWT Authentication middleware
 * Verifies JWT token from Authorization header
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Authentication required. Provide Bearer token in Authorization header.', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      throw new CustomError('Authentication token not provided', 401);
    }

    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_for_dev') as any;

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      next(new CustomError('Invalid authentication token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new CustomError('Authentication token expired', 401));
    } else {
      next(error);
    }
  }
}

/**
 * Middleware to verify admin role
 */
export async function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new CustomError('Authentication required', 401);
    }

    if (req.user.role !== 'admin') {
      throw new CustomError('Admin access required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to verify employee or admin role
 */
export async function requireEmployeeRole(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new CustomError('Authentication required', 401);
    }

    if (!['employee', 'admin'].includes(req.user.role)) {
      throw new CustomError('Employee or admin access required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Adds user to request if provided, but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_for_dev') as any;

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        });

        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue without user
    next();
  }
}

