import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { CustomError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SubscriptionPlan } from '@prisma/client';

// Helper function to safely parse JSON preferences
const parsePreferences = (preferences: any): any => {
  try {
    if (typeof preferences === 'string') {
      return JSON.parse(preferences);
    }
    if (typeof preferences === 'object' && preferences !== null) {
      return preferences;
    }
    return {};
  } catch {
    return {};
  }
};

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, password } = req.body;

      // Validation
      if (!name || !email || !password) {
        throw new CustomError('Name, email and password are required', 400);
      }

      if (password.length < 6) {
        throw new CustomError('Password must be at least 6 characters long', 400);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new CustomError('User with this email already exists', 409);
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Obtener plan de suscripción del body (por defecto BASIC)
      const { subscriptionPlan = 'BASIC' } = req.body;
      const validPlans: SubscriptionPlan[] = [SubscriptionPlan.BASIC, SubscriptionPlan.STANDARD, SubscriptionPlan.PREMIUM];
      const selectedPlan = validPlans.includes(subscriptionPlan as SubscriptionPlan) 
        ? (subscriptionPlan as SubscriptionPlan) 
        : SubscriptionPlan.BASIC;

      // Definir límites por plan
      const planLimits: Record<SubscriptionPlan, number> = {
        [SubscriptionPlan.BASIC]: 5.0,
        [SubscriptionPlan.STANDARD]: 8.0,
        [SubscriptionPlan.PREMIUM]: 10.0
      };

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          password: hashedPassword,
          role: 'customer',
          preferences: JSON.stringify({
            theme: {},
            notifications: {}
          })
        }
      });

      // Crear suscripción para el nuevo usuario
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: selectedPlan,
          limitInKg: planLimits[selectedPlan],
          usedKg: 0,
          renewalDate: nextMonth,
          isActive: true
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback_secret_key_for_dev',
        { expiresIn: '7d' }
      );

      // Remove password from response
      const { password: _, ...userResponse } = user;

      console.log(`✅ New user registered: ${user.name} (${user.email})`);

      res.status(201).json({
        ok: true,
        message: 'User registered successfully',
        data: {
          user: {
            ...userResponse,
            preferences: parsePreferences(userResponse.preferences)
          },
          token
        }
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        throw new CustomError('Email and password are required', 400);
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new CustomError('Invalid credentials', 401);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new CustomError('Invalid credentials', 401);
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback_secret_key_for_dev',
        { expiresIn: '7d' }
      );

      // Remove password from response
      const { password: _, ...userResponse } = user;

      console.log(`✅ User logged in: ${user.name} (${user.email})`);

      res.status(200).json({
        ok: true,
        message: 'Login successful',
        data: {
          user: {
            ...userResponse,
            preferences: parsePreferences(userResponse.preferences)
          },
          token
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new CustomError('User not authenticated', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          preferences: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      res.status(200).json({
        ok: true,
        data: {
          ...user,
          preferences: parsePreferences(user.preferences)
        }
      });

    } catch (error) {
      console.error('❌ Get profile error:', error);
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new CustomError('User not authenticated', 401);
      }

      const { name, phone, preferences } = req.body;
      const updateData: any = {};

      if (name) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (preferences) updateData.preferences = JSON.stringify(preferences);

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          preferences: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log(`✅ User profile updated: ${user.name} (${user.email})`);

      res.status(200).json({
        ok: true,
        message: 'Profile updated successfully',
        data: {
          ...user,
          preferences: parsePreferences(user.preferences)
        }
      });

    } catch (error) {
      console.error('❌ Update profile error:', error);
      next(error);
    }
  }

  /**
   * Logout user (client-side token removal)
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // In a JWT system, logout is typically handled on the client side
      // by removing the token. This endpoint can be used for logging purposes.
      
      if (req.user) {
        console.log(`✅ User logged out: ${req.user.email}`);
      }

      res.status(200).json({
        ok: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      next(error);
    }
  }
}