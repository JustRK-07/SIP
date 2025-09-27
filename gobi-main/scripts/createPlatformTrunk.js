const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPlatformTrunk() {
  try {
    const trunk = await prisma.platformTrunk.upsert({
      where: { id: 'default-platform-trunk' },
      update: {
        isActive: true,
        status: 'ACTIVE',
        updatedAt: new Date()
      },
      create: {
        id: 'default-platform-trunk',
        name: 'Default Platform Trunk',
        description: 'Default trunk for LiveKit SIP integration',
        status: 'ACTIVE',
        isActive: true,
        tenantId: 'cmg2bhib90000sb0t3h8o87kn'
      }
    });

    console.log('Platform trunk created/updated:', trunk);
  } catch (error) {
    console.error('Error creating platform trunk:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPlatformTrunk();