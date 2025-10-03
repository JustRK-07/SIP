const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agent = await prisma.agent.update({
    where: { name: 'Appointment Setter' },
    data: { status: 'ACTIVE' }
  });

  console.log(`✅ Agent "${agent.name}" is now ${agent.status}`);
  console.log(`   ID: ${agent.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
