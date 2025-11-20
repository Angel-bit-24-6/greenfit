import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Import routes
// import catalogRoutes from './routes/catalog'; // DESHABILITADO - Reemplazado por products
import cartRoutes from './routes/cart_nutrifresco'; // NUTRIFRESCO version
import authRoutes from './routes/auth';
import orderRoutes from './routes/orders_nutrifresco'; // NUTRIFRESCO version
// import stockRoutes from './routes/stock'; // DESHABILITADO - Ya no necesario
// import stripeRoutes from './routes/stripe'; // DESHABILITADO - NUTRIFRESCO no usa pagos
// import paymentRoutes from './routes/payment'; // DESHABILITADO - NUTRIFRESCO no usa pagos
// import employeeRoutes from './routes/employee'; // DESHABILITADO - NUTRIFRESCO no tiene empleados
import chatRoutes from './routes/chat';
import suggestionRoutes from './routes/suggestions';
// import adminRoutes from './routes/admin'; // DESHABILITADO temporalmente - necesita actualización para Product
// NUTRIFRESCO routes
import subscriptionRoutes from './routes/subscription';
import producerRoutes from './routes/producer';
import productRoutes from './routes/product';

// Import controllers for direct endpoint use
// import { CartController } from './controllers/cartController'; // DESHABILITADO

// Initialize Prisma
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://10.34.222.118:8083',
    'http://192.168.100.12:8082',
    process.env.FRONTEND_URL || 'http://localhost:8081'
  ],
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Special middleware for Stripe webhooks (needs raw body)
// app.use('/api/orders/webhook/stripe', express.raw({ type: 'application/json' })); // DESHABILITADO - NUTRIFRESCO no usa Stripe

// Standard JSON middleware for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
// app.use('/api/catalog', catalogRoutes); // DESHABILITADO - Reemplazado por /api/products
app.use('/api/cart', cartRoutes); // NUTRIFRESCO version
app.use('/api/orders', orderRoutes); // NUTRIFRESCO version
// app.use('/api/stock', stockRoutes); // DESHABILITADO - Ya no necesario (validación en cart)
// app.use('/api/stripe', stripeRoutes); // DESHABILITADO - NUTRIFRESCO no usa pagos
// app.use('/api/payment', paymentRoutes); // DESHABILITADO - NUTRIFRESCO no usa pagos
// app.use('/api/employee', employeeRoutes); // DESHABILITADO - NUTRIFRESCO no tiene empleados
app.use('/api/chat', chatRoutes);
app.use('/api/suggestions', suggestionRoutes);
// app.use('/api/admin', adminRoutes); // DESHABILITADO temporalmente - necesita actualización para Product
// NUTRIFRESCO routes
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/producers', producerRoutes);
app.use('/api/products', productRoutes);

// Validation endpoint (as per design spec)
// app.post('/api/validate', CartController.validateCart); // DESHABILITADO - Usar /api/subscription/validate

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GreenFit API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Received shutdown signal...');
  
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`🔗 API Base URL: ${process.env.API_BASE_URL}/api`);
      console.log(`❤️  Health Check: ${process.env.API_BASE_URL}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();