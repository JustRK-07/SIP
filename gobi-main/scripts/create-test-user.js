const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Create or find test tenant
    let tenant = await prisma.tenant.findFirst({
      where: { domain: 'ytel.com' }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Ytel Inc',
          domain: 'ytel.com',
          description: 'Test organization',
          contactEmail: 'admin@ytel.com',
          isActive: true
        }
      });
      console.log('Created test tenant:', tenant.name);
    } else {
      console.log('Using existing tenant:', tenant.name);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'qateam@ytel.com' }
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'qateam@ytel.com',
        username: 'qateam@ytel.com',
        passwordHash,
        firstName: 'QA',
        lastName: 'Team',
        isActive: true,
        permissions: [8686796633n, 536814048n, 2097215n], // Default permissions from your example (BigInt)
        tenantId: tenant.id
      }
    });

    console.log('Created test user successfully:');
    console.log('Email:', user.email);
    console.log('Password: password123');
    console.log('Tenant:', tenant.name);

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();