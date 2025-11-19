import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedEmployees() {
  try {
    console.log('🧑‍🍳 Seeding employee users...');

    // Create employee users
    const employees = [
      {
        email: 'chef@greenfit.mx',
        name: 'Chef Principal',
        role: 'employee',
        password: 'chef123', // In production, this should be hashed
      },
      {
        email: 'kitchen1@greenfit.mx',
        name: 'Cocinero 1',
        role: 'employee',
        password: 'kitchen123',
      },
      {
        email: 'admin@greenfit.mx',
        name: 'Administrador',
        role: 'admin',
        password: 'admin123',
      }
    ];

    for (const employeeData of employees) {
      const existingUser = await prisma.user.findUnique({
        where: { email: employeeData.email }
      });

      if (!existingUser) {
        const employee = await prisma.user.create({
          data: {
            email: employeeData.email,
            name: employeeData.name,
            role: employeeData.role,
            password: employeeData.password,
            preferences: JSON.stringify({
              dietaryRestrictions: [],
              allergens: [],
              favoriteIngredients: []
            })
          }
        });

        console.log(`✅ Created ${employeeData.role}: ${employee.name} (${employee.email})`);
      } else {
        // Update existing user role if needed
        if (existingUser.role !== employeeData.role) {
          await prisma.user.update({
            where: { email: employeeData.email },
            data: { role: employeeData.role }
          });
          console.log(`🔄 Updated role for: ${employeeData.email} to ${employeeData.role}`);
        } else {
          console.log(`➡️  User already exists: ${employeeData.email}`);
        }
      }
    }

    console.log('✅ Employee seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding employees:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedEmployees()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}