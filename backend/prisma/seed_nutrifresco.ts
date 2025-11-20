import { PrismaClient, SubscriptionPlan, ProductCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const saltRounds = 10;

async function main() {
  console.log('🌱 Starting NUTRIFRESCO database seed...');

  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.producer.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.chatLog.deleteMany();
  await prisma.suggestion.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // ============================================================================
  // CREAR USUARIOS
  // ============================================================================

  const hashedPassword = await bcrypt.hash('test123', saltRounds);
  const adminPassword = await bcrypt.hash('admin123', saltRounds);

  // Usuario cliente básico
  const basicUser = await prisma.user.create({
    data: {
      email: 'cliente@nutrifresco.mx',
      name: 'Cliente Básico',
      phone: '+52 961 123 4567',
      password: hashedPassword,
      role: 'customer',
      preferences: JSON.stringify({
        theme: { themeId: 'green', colorMode: 'dark' },
        notifications: { email: true, push: true }
      })
    }
  });

  // Usuario cliente estándar
  const standardUser = await prisma.user.create({
    data: {
      email: 'estandar@nutrifresco.mx',
      name: 'Cliente Estándar',
      phone: '+52 961 234 5678',
      password: hashedPassword,
      role: 'customer',
      preferences: JSON.stringify({
        theme: { themeId: 'green', colorMode: 'dark' },
        notifications: { email: true, push: true }
      })
    }
  });

  // Usuario cliente premium
  const premiumUser = await prisma.user.create({
    data: {
      email: 'premium@nutrifresco.mx',
      name: 'Cliente Premium',
      phone: '+52 961 345 6789',
      password: hashedPassword,
      role: 'customer',
      preferences: JSON.stringify({
        theme: { themeId: 'green', colorMode: 'dark' },
        notifications: { email: true, push: true }
      })
    }
  });

  // Usuario productor
  const producerUser = await prisma.user.create({
    data: {
      email: 'productor@nutrifresco.mx',
      name: 'Juan Productor',
      phone: '+52 961 456 7890',
      password: hashedPassword,
      role: 'producer',
      preferences: JSON.stringify({
        theme: { themeId: 'green', colorMode: 'dark' },
        notifications: { email: true, push: true }
      })
    }
  });

  // Usuario admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nutrifresco.mx',
      name: 'Administrador',
      phone: '+52 961 567 8901',
      password: adminPassword,
      role: 'admin',
      preferences: JSON.stringify({
        theme: { themeId: 'green', colorMode: 'dark' },
        notifications: { email: true, push: true }
      })
    }
  });

  console.log('✅ Created users');

  // ============================================================================
  // CREAR SUSCRIPCIONES
  // ============================================================================

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await prisma.subscription.create({
    data: {
      userId: basicUser.id,
      plan: SubscriptionPlan.BASIC,
      limitInKg: 5.0,
      usedKg: 0,
      renewalDate: nextMonth,
      isActive: true
    }
  });

  await prisma.subscription.create({
    data: {
      userId: standardUser.id,
      plan: SubscriptionPlan.STANDARD,
      limitInKg: 8.0,
      usedKg: 0,
      renewalDate: nextMonth,
      isActive: true
    }
  });

  await prisma.subscription.create({
    data: {
      userId: premiumUser.id,
      plan: SubscriptionPlan.PREMIUM,
      limitInKg: 10.0,
      usedKg: 0,
      renewalDate: nextMonth,
      isActive: true
    }
  });

  console.log('✅ Created subscriptions');

  // ============================================================================
  // CREAR PRODUCTORES
  // ============================================================================

  const producer1 = await prisma.producer.create({
    data: {
      userId: producerUser.id,
      businessName: 'Huertos Orgánicos del Sur',
      description: 'Productos orgánicos frescos de la región',
      location: 'Chiapas, México',
      contactInfo: JSON.stringify({
        phone: '+52 961 456 7890',
        email: 'productor@nutrifresco.mx',
        website: 'https://huertosorganicos.mx'
      }),
      verified: true
    }
  });

  const producer2 = await prisma.producer.create({
    data: {
      userId: adminUser.id, // Admin también puede ser productor
      businessName: 'Café de Altura',
      description: 'Café artesanal de altura',
      location: 'Sierra de Chiapas',
      contactInfo: JSON.stringify({
        phone: '+52 961 567 8901',
        email: 'cafe@nutrifresco.mx'
      }),
      verified: true
    }
  });

  console.log('✅ Created producers');

  // ============================================================================
  // CREAR PRODUCTOS
  // ============================================================================

  // FRUTAS
  await prisma.product.create({
    data: {
      producerId: producer1.id,
      name: 'Tomate Rojo',
      description: 'Tomate rojo fresco de temporada',
      category: ProductCategory.VEGETABLES,
      weightInKg: 1.0,
      available: true,
      stock: 50,
      origin: 'Huerto San Cristóbal',
      season: 'Enero-Diciembre',
      tags: JSON.stringify(['orgánico', 'fresco', 'local']),
      nutritionalInfo: JSON.stringify({
        calories: 18,
        protein: 0.9,
        carbs: 3.9,
        fat: 0.2
      })
    }
  });

  await prisma.product.create({
    data: {
      producerId: producer1.id,
      name: 'Cebolla Blanca',
      description: 'Cebolla blanca fresca',
      category: ProductCategory.VEGETABLES,
      weightInKg: 1.0,
      available: true,
      stock: 40,
      origin: 'Huerto San Cristóbal',
      season: 'Todo el año',
      tags: JSON.stringify(['orgánico', 'fresco'])
    }
  });

  await prisma.product.create({
    data: {
      producerId: producer1.id,
      name: 'Lechuga',
      description: 'Lechuga fresca y crujiente',
      category: ProductCategory.VEGETABLES,
      weightInKg: 0.5,
      available: true,
      stock: 30,
      origin: 'Huerto San Cristóbal',
      season: 'Enero-Diciembre',
      tags: JSON.stringify(['orgánico', 'fresco', 'hoja verde'])
    }
  });

  await prisma.product.create({
    data: {
      producerId: producer1.id,
      name: 'Plátano Dominico',
      description: 'Plátano dominico dulce y fresco',
      category: ProductCategory.FRUITS,
      weightInKg: 1.0,
      available: true,
      stock: 60,
      origin: 'Finca El Paraíso',
      season: 'Todo el año',
      tags: JSON.stringify(['dulce', 'fresco', 'local'])
    }
  });

  // LEGUMINOSAS
  await prisma.product.create({
    data: {
      producerId: producer1.id,
      name: 'Frijol Negro',
      description: 'Frijol negro de la región',
      category: ProductCategory.LEGUMES,
      weightInKg: 0.5,
      available: true,
      stock: 25,
      origin: 'Finca El Paraíso',
      season: 'Enero-Diciembre',
      tags: JSON.stringify(['orgánico', 'proteína vegetal'])
    }
  });

  // HIERBAS
  await prisma.product.create({
    data: {
      producerId: producer1.id,
      name: 'Chipilín',
      description: 'Chipilín fresco, hierba tradicional',
      category: ProductCategory.HERBS,
      weightInKg: 0.25,
      available: true,
      stock: 20,
      origin: 'Huerto San Cristóbal',
      season: 'Mayo-Octubre',
      tags: JSON.stringify(['tradicional', 'fresco', 'hierba'])
    }
  });

  await prisma.product.create({
    data: {
      producerId: producer1.id,
      name: 'Hierbamora',
      description: 'Hierbamora fresca',
      category: ProductCategory.HERBS,
      weightInKg: 0.25,
      available: true,
      stock: 15,
      origin: 'Huerto San Cristóbal',
      season: 'Mayo-Octubre',
      tags: JSON.stringify(['tradicional', 'fresco'])
    }
  });

  // CAFÉ
  await prisma.product.create({
    data: {
      producerId: producer2.id,
      name: 'Café Molido Artesanal',
      description: 'Café molido de altura, tostado artesanalmente',
      category: ProductCategory.COFFEE,
      weightInKg: 0.25,
      available: true,
      stock: 35,
      origin: 'Sierra de Chiapas',
      season: 'Todo el año',
      tags: JSON.stringify(['artesanal', 'altura', 'tostado'])
    }
  });

  // CHOCOLATE
  await prisma.product.create({
    data: {
      producerId: producer2.id,
      name: 'Chocolate Artesanal 70% Cacao',
      description: 'Chocolate artesanal con 70% cacao',
      category: ProductCategory.CHOCOLATE,
      weightInKg: 0.2,
      available: true,
      stock: 20,
      origin: 'Sierra de Chiapas',
      season: 'Todo el año',
      tags: JSON.stringify(['artesanal', 'cacao', 'premium'])
    }
  });

  // PROTEÍNAS (solo para PREMIUM)
  await prisma.product.create({
    data: {
      producerId: producer1.id,
      name: 'Huevos de Campo',
      description: 'Huevos frescos de gallinas de campo',
      category: ProductCategory.PROTEINS,
      weightInKg: 1.0, // Aproximadamente 16-18 huevos
      available: true,
      stock: 30,
      origin: 'Granja El Paraíso',
      season: 'Todo el año',
      tags: JSON.stringify(['campo', 'fresco', 'orgánico'])
    }
  });

  console.log('✅ Created products');

  console.log('🎉 NUTRIFRESCO seed completed successfully!');
  console.log('\n📋 Credenciales de prueba:');
  console.log('   Cliente Básico: cliente@nutrifresco.mx / test123 (5 kg/mes)');
  console.log('   Cliente Estándar: estandar@nutrifresco.mx / test123 (8 kg/mes)');
  console.log('   Cliente Premium: premium@nutrifresco.mx / test123 (10 kg/mes)');
  console.log('   Productor: productor@nutrifresco.mx / test123');
  console.log('   Admin: admin@nutrifresco.mx / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

