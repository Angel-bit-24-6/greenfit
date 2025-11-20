import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EXPANDED database seed...');

  // Clear existing data
  await prisma.chatLog.deleteMany();
  await prisma.suggestion.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.order.deleteMany();
  await prisma.plateIngredient.deleteMany();
  await prisma.plate.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Hash passwords
  const saltRounds = 10;
  const testPasswordHash = await bcrypt.hash('test123', saltRounds);

  // Create test users
  const testUser = await prisma.user.create({
    data: {
      email: 'test@greenfit.mx',
      name: 'Usuario de Prueba',
      phone: '+52 961 123 4567',
      password: testPasswordHash,
      preferences: JSON.stringify({
        dietaryRestrictions: ['vegan', 'gluten_free'],
        allergens: ['nuts'],
        favoriteIngredients: []
      })
    }
  });

  console.log('👤 Created test user');

  // Create employee users
  const employees = [
    {
      email: 'chef@greenfit.mx',
      name: 'Chef Principal',
      role: 'employee',
      password: 'chef123'
    },
    {
      email: 'kitchen1@greenfit.mx',
      name: 'Cocinero 1',
      role: 'employee',
      password: 'kitchen123'
    },
    {
      email: 'admin@greenfit.mx',
      name: 'Administrador',
      role: 'admin',
      password: 'admin123'
    }
  ];

  for (const employeeData of employees) {
    const hashedPassword = await bcrypt.hash(employeeData.password, saltRounds);
    await prisma.user.create({
      data: {
        email: employeeData.email,
        name: employeeData.name,
        role: employeeData.role,
        password: hashedPassword,
        preferences: JSON.stringify({
          dietaryRestrictions: [],
          allergens: [],
          favoriteIngredients: []
        })
      }
    });
    console.log(`✅ Created ${employeeData.role}: ${employeeData.name} (${employeeData.email})`);
  }

  // Create expanded ingredients (22 total - más que suficiente para probar límite de 6)
  const ingredients = await Promise.all([
    // PROTEÍNAS VEGETALES (6 opciones)
    prisma.ingredient.create({
      data: {
        name: 'Tofu orgánico',
        synonyms: JSON.stringify(['tofu', 'queso de soja', 'bean curd']),
        stock: 50,
        price: 25.50,
        allergens: JSON.stringify(['soy']),
        tags: JSON.stringify(['vegan', 'protein', 'organic']),
        available: true,
        description: 'Tofu orgánico suave, perfecto para platillos salteados',
        nutritionalInfo: JSON.stringify({ calories: 76, protein: 8, carbs: 2, fat: 4, fiber: 1 })
      }
    }),
    
    prisma.ingredient.create({
      data: {
        name: 'Tempeh de soya',
        synonyms: JSON.stringify(['tempeh', 'tempe']),
        stock: 30,
        price: 32.00,
        allergens: JSON.stringify(['soy']),
        tags: JSON.stringify(['vegan', 'protein', 'fermented']),
        available: true,
        description: 'Tempeh fermentado rico en proteínas y probióticos',
        nutritionalInfo: JSON.stringify({ calories: 190, protein: 20, carbs: 9, fat: 11, fiber: 0 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Seitan casero',
        synonyms: JSON.stringify(['seitan', 'gluten', 'carne vegetal']),
        stock: 25,
        price: 28.00,
        allergens: JSON.stringify(['gluten']),
        tags: JSON.stringify(['vegan', 'protein', 'artisanal']),
        available: true,
        description: 'Seitan artesanal alto en proteínas',
        nutritionalInfo: JSON.stringify({ calories: 370, protein: 75, carbs: 14, fat: 2, fiber: 0 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Proteína de chícharo',
        synonyms: JSON.stringify(['pea protein', 'proteína vegetal']),
        stock: 15,
        price: 42.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'protein', 'powder', 'supplement']),
        available: true,
        description: 'Proteína en polvo de chícharo orgánico',
        nutritionalInfo: JSON.stringify({ calories: 400, protein: 80, carbs: 7, fat: 7, fiber: 1 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Garbanzos cocidos',
        synonyms: JSON.stringify(['garbanzos', 'chickpeas']),
        stock: 80,
        price: 14.25,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'protein', 'fiber']),
        available: true,
        description: 'Garbanzos orgánicos precocidos',
        nutritionalInfo: JSON.stringify({ calories: 164, protein: 9, carbs: 27, fat: 3, fiber: 8 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Lentejas rojas',
        synonyms: JSON.stringify(['lentejas', 'lentils']),
        stock: 90,
        price: 16.50,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'protein', 'quick_cook']),
        available: true,
        description: 'Lentejas rojas de cocción rápida',
        nutritionalInfo: JSON.stringify({ calories: 116, protein: 9, carbs: 20, fat: 0, fiber: 8 })
      }
    }),

    // GRANOS Y CEREALES (4 opciones)
    prisma.ingredient.create({
      data: {
        name: 'Quinoa tricolor',
        synonyms: JSON.stringify(['quinoa', 'quinua']),
        stock: 100,
        price: 18.75,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'gluten_free', 'protein', 'superfood']),
        available: true,
        description: 'Mezcla de quinoa blanca, roja y negra',
        nutritionalInfo: JSON.stringify({ calories: 368, protein: 14, carbs: 64, fat: 6, fiber: 7 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Arroz integral',
        synonyms: JSON.stringify(['arroz', 'brown rice']),
        stock: 120,
        price: 12.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'gluten_free', 'whole_grain']),
        available: true,
        description: 'Arroz integral de grano largo',
        nutritionalInfo: JSON.stringify({ calories: 370, protein: 7, carbs: 77, fat: 3, fiber: 4 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Avena en hojuelas',
        synonyms: JSON.stringify(['avena', 'oats']),
        stock: 80,
        price: 14.50,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'fiber', 'breakfast']),
        available: true,
        description: 'Avena orgánica en hojuelas',
        nutritionalInfo: JSON.stringify({ calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Frijoles negros',
        synonyms: JSON.stringify(['frijoles', 'black beans']),
        stock: 65,
        price: 13.75,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'protein', 'fiber', 'mexican']),
        available: true,
        description: 'Frijoles negros cocidos con especias',
        nutritionalInfo: JSON.stringify({ calories: 245, protein: 15, carbs: 45, fat: 1, fiber: 15 })
      }
    }),

    // VEGETALES VERDES (4 opciones)
    prisma.ingredient.create({
      data: {
        name: 'Aguacate Hass',
        synonyms: JSON.stringify(['aguacate', 'avocado']),
        stock: 75,
        price: 22.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'healthy_fats', 'fresh']),
        available: true,
        description: 'Aguacate Hass maduro y cremoso',
        nutritionalInfo: JSON.stringify({ calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Espinacas baby',
        synonyms: JSON.stringify(['espinacas', 'spinach']),
        stock: 60,
        price: 12.50,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'leafy_green', 'iron']),
        available: true,
        description: 'Espinacas tiernas perfectas para ensaladas',
        nutritionalInfo: JSON.stringify({ calories: 23, protein: 3, carbs: 4, fat: 0, fiber: 2 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Kale rizado',
        synonyms: JSON.stringify(['kale', 'col rizada']),
        stock: 45,
        price: 16.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'superfood', 'leafy_green']),
        available: true,
        description: 'Col rizada fresca rica en antioxidantes',
        nutritionalInfo: JSON.stringify({ calories: 35, protein: 3, carbs: 7, fat: 1, fiber: 4 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Brócoli orgánico',
        synonyms: JSON.stringify(['brócoli', 'broccoli']),
        stock: 40,
        price: 15.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'organic', 'cruciferous']),
        available: true,
        description: 'Brócoli orgánico fresco',
        nutritionalInfo: JSON.stringify({ calories: 34, protein: 3, carbs: 7, fat: 0, fiber: 3 })
      }
    }),

    // VEGETALES COLORIDOS (4 opciones)
    prisma.ingredient.create({
      data: {
        name: 'Zanahoria baby',
        synonyms: JSON.stringify(['zanahoria', 'carrot']),
        stock: 70,
        price: 11.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'vitamin_a', 'sweet']),
        available: true,
        description: 'Zanahorias baby dulces y crujientes',
        nutritionalInfo: JSON.stringify({ calories: 41, protein: 1, carbs: 10, fat: 0, fiber: 3 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Pimiento rojo',
        synonyms: JSON.stringify(['pimiento', 'bell pepper']),
        stock: 55,
        price: 19.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'vitamin_c', 'colorful']),
        available: true,
        description: 'Pimientos rojos dulces y crujientes',
        nutritionalInfo: JSON.stringify({ calories: 31, protein: 1, carbs: 7, fat: 0, fiber: 3 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Tomate cherry',
        synonyms: JSON.stringify(['tomate', 'cherry tomato']),
        stock: 85,
        price: 24.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'fresh', 'juicy']),
        available: true,
        description: 'Tomates cherry dulces y jugosos',
        nutritionalInfo: JSON.stringify({ calories: 18, protein: 1, carbs: 4, fat: 0, fiber: 1 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Remolacha asada',
        synonyms: JSON.stringify(['remolacha', 'beetroot']),
        stock: 35,
        price: 17.50,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'sweet', 'antioxidants']),
        available: true,
        description: 'Remolacha orgánica pre-asada',
        nutritionalInfo: JSON.stringify({ calories: 43, protein: 2, carbs: 10, fat: 0, fiber: 2 })
      }
    }),

    // SEMILLAS Y FRUTOS SECOS (2 opciones)
    prisma.ingredient.create({
      data: {
        name: 'Semillas de chía',
        synonyms: JSON.stringify(['chia', 'semillas']),
        stock: 35,
        price: 28.50,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'superfood', 'omega3']),
        available: true,
        description: 'Semillas de chía orgánicas',
        nutritionalInfo: JSON.stringify({ calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Nueces de nogal',
        synonyms: JSON.stringify(['nueces', 'walnuts']),
        stock: 20,
        price: 35.00,
        allergens: JSON.stringify(['nuts']),
        tags: JSON.stringify(['vegan', 'healthy_fats', 'omega3']),
        available: true,
        description: 'Nueces de nogal frescas',
        nutritionalInfo: JSON.stringify({ calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 7 })
      }
    }),

    // CONDIMENTOS (2 opciones)
    prisma.ingredient.create({
      data: {
        name: 'Tahini orgánico',
        synonyms: JSON.stringify(['tahini', 'pasta de sésamo']),
        stock: 25,
        price: 45.00,
        allergens: JSON.stringify(['sesame']),
        tags: JSON.stringify(['vegan', 'organic', 'sauce']),
        available: true,
        description: 'Pasta cremosa de semillas de sésamo',
        nutritionalInfo: JSON.stringify({ calories: 595, protein: 17, carbs: 21, fat: 54, fiber: 5 })
      }
    }),

    prisma.ingredient.create({
      data: {
        name: 'Aceite de oliva extra virgen',
        synonyms: JSON.stringify(['aceite de oliva', 'olive oil']),
        stock: 40,
        price: 32.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'healthy_fats', 'mediterranean']),
        available: true,
        description: 'Aceite de oliva extra virgen',
        nutritionalInfo: JSON.stringify({ calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 })
      }
    }),

    // INGREDIENTES ESPECIALES PARA TESTING
    prisma.ingredient.create({
      data: {
        name: 'Hongos shiitake',
        synonyms: JSON.stringify(['shiitake', 'hongos']),
        stock: 3, // POCO STOCK para testing
        price: 38.00,
        allergens: JSON.stringify([]),
        tags: JSON.stringify(['vegan', 'umami', 'gourmet']),
        available: true,
        description: 'Hongos shiitake frescos (¡pocos disponibles!)',
        nutritionalInfo: JSON.stringify({ calories: 34, protein: 2, carbs: 7, fat: 0, fiber: 3 })
      }
    }),

    // INGREDIENTE AGOTADO para testing
    prisma.ingredient.create({
      data: {
        name: 'Queso vegano de anacardo',
        synonyms: JSON.stringify(['queso vegano', 'cashew cheese']),
        stock: 0, // AGOTADO
        price: 65.00,
        allergens: JSON.stringify(['nuts']),
        tags: JSON.stringify(['vegan', 'cheese_alternative']),
        available: false,
        description: 'Queso artesanal hecho con anacardos (temporalmente agotado)',
        nutritionalInfo: JSON.stringify({ calories: 320, protein: 12, carbs: 8, fat: 28, fiber: 2 })
      }
    })
  ]);

  console.log(`🥬 Created ${ingredients.length} ingredients (22 total - perfecto para probar límite de 6!)`);

  // Create more varied plates
  const plates = await Promise.all([
    prisma.plate.create({
      data: {
        name: 'Bowl Verde Energético',
        description: 'Bowl nutritivo con quinoa, aguacate, espinacas y tahini',
        price: 89.50,
        tags: JSON.stringify(['vegan', 'gluten_free', 'energetic', 'superfood']),
        available: true,
        preparationTime: 15,
        nutritionalInfo: JSON.stringify({ calories: 450, protein: 18, carbs: 45, fat: 24, fiber: 12 }),
        ingredients: {
          create: [
            { ingredientId: ingredients[6].id, quantity: 1, required: true }, // Quinoa
            { ingredientId: ingredients[10].id, quantity: 1, required: true }, // Aguacate
            { ingredientId: ingredients[11].id, quantity: 1, required: true }, // Espinacas
            { ingredientId: ingredients[20].id, quantity: 1, required: false } // Tahini
          ]
        }
      }
    }),

    prisma.plate.create({
      data: {
        name: 'Power Bowl Mediterráneo',
        description: 'Combinación mediterránea con garbanzos, brócoli y aceite de oliva',
        price: 78.00,
        tags: JSON.stringify(['vegan', 'mediterranean', 'protein']),
        available: true,
        preparationTime: 12,
        nutritionalInfo: JSON.stringify({ calories: 380, protein: 16, carbs: 38, fat: 18, fiber: 14 }),
        ingredients: {
          create: [
            { ingredientId: ingredients[4].id, quantity: 1, required: true }, // Garbanzos
            { ingredientId: ingredients[13].id, quantity: 1, required: true }, // Brócoli
            { ingredientId: ingredients[11].id, quantity: 1, required: false }, // Espinacas
            { ingredientId: ingredients[21].id, quantity: 1, required: false } // Aceite oliva
          ]
        }
      }
    }),

    prisma.plate.create({
      data: {
        name: 'Protein Bowl Asian',
        description: 'Bowl asiático con tofu, tempeh y vegetales frescos',
        price: 95.75,
        tags: JSON.stringify(['vegan', 'asian', 'high_protein']),
        available: true,
        preparationTime: 18,
        nutritionalInfo: JSON.stringify({ calories: 420, protein: 28, carbs: 25, fat: 22, fiber: 8 }),
        ingredients: {
          create: [
            { ingredientId: ingredients[0].id, quantity: 1, required: true }, // Tofu
            { ingredientId: ingredients[1].id, quantity: 1, required: true }, // Tempeh
            { ingredientId: ingredients[13].id, quantity: 1, required: false }, // Brócoli
            { ingredientId: ingredients[15].id, quantity: 1, required: false } // Pimiento rojo
          ]
        }
      }
    }),

    prisma.plate.create({
      data: {
        name: 'Bowl Arcoíris Nutritivo',
        description: 'Bowl colorido con variedad de vegetales y quinoa',
        price: 82.25,
        tags: JSON.stringify(['vegan', 'colorful', 'nutritious', 'instagram']),
        available: true,
        preparationTime: 20,
        nutritionalInfo: JSON.stringify({ calories: 365, protein: 12, carbs: 42, fat: 16, fiber: 11 }),
        ingredients: {
          create: [
            { ingredientId: ingredients[6].id, quantity: 1, required: true }, // Quinoa
            { ingredientId: ingredients[14].id, quantity: 1, required: true }, // Zanahoria
            { ingredientId: ingredients[15].id, quantity: 1, required: true }, // Pimiento rojo
            { ingredientId: ingredients[16].id, quantity: 1, required: true }, // Tomate cherry
            { ingredientId: ingredients[18].id, quantity: 1, required: false } // Semillas chía
          ]
        }
      }
    }),

    prisma.plate.create({
      data: {
        name: 'Bowl Gourmet Especial',
        description: 'Bowl premium con hongos shiitake (disponibilidad limitada)',
        price: 125.00,
        tags: JSON.stringify(['vegan', 'gourmet', 'limited', 'premium']),
        available: true, // Disponible pero con ingredientes limitados
        preparationTime: 25,
        nutritionalInfo: JSON.stringify({ calories: 520, protein: 22, carbs: 35, fat: 32, fiber: 10 }),
        ingredients: {
          create: [
            { ingredientId: ingredients[22].id, quantity: 1, required: true }, // Hongos shiitake (stock: 3)
            { ingredientId: ingredients[10].id, quantity: 1, required: true }, // Aguacate
            { ingredientId: ingredients[6].id, quantity: 1, required: false }, // Quinoa
            { ingredientId: ingredients[19].id, quantity: 1, required: false } // Nueces (con alérgeno)
          ]
        }
      }
    }),

    // Platillo no disponible con ingrediente agotado
    prisma.plate.create({
      data: {
        name: 'Bowl Cremoso Premium',
        description: 'Bowl especial con queso vegano (temporalmente no disponible)',
        price: 135.00,
        tags: JSON.stringify(['vegan', 'premium', 'creamy']),
        available: false,
        preparationTime: 30,
        nutritionalInfo: JSON.stringify({ calories: 580, protein: 25, carbs: 40, fat: 38, fiber: 12 }),
        ingredients: {
          create: [
            { ingredientId: ingredients[23].id, quantity: 1, required: true }, // Queso vegano (agotado)
            { ingredientId: ingredients[10].id, quantity: 1, required: true }, // Aguacate
            { ingredientId: ingredients[6].id, quantity: 1, required: false } // Quinoa
          ]
        }
      }
    })
  ]);

  console.log(`🍽️  Created ${plates.length} plates with variety`);

  console.log('✅ EXPANDED database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: 4 (1 customer + 3 employees)`);
  console.log(`- Ingredients: ${ingredients.length} (22 total)`);
  console.log(`- Plates: ${plates.length}`);
  console.log('\n🎯 Perfect for testing:');
  console.log('- ✅ Límite de 6 ingredientes en Custom Builder');
  console.log('- ✅ Ingredientes con poco stock (hongos: 3)');
  console.log('- ✅ Ingrediente agotado (queso vegano)');
  console.log('- ✅ Variedad de categorías y precios');
  console.log('- ✅ Platillos con diferentes disponibilidades');
}

main()
  .catch((e) => {
    console.error('❌ Error during expanded seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });