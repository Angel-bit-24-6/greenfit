import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateUser, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Public routes (no auth required)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', optionalAuth, AuthController.logout);

// Protected routes (auth required)
router.get('/me', authenticateUser, AuthController.getProfile);
router.put('/profile', authenticateUser, AuthController.updateProfile);

// Health check
router.get('/health', (req, res) => {
  res.json({ message: 'Auth routes active and ready' });
});

export default router;