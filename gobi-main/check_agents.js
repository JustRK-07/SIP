const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      model: true,
      voice: true
    }
  });
  
  console.log(`Total Agents: ${agents.length}\n`);
  agents.forEach(agent => {
    const statusIcon = agent.status === 'ACTIVE' ? '🟢' : '🔴';
    console.log(`${statusIcon} ${agent.name} (${agent.status})`);
    console.log(`   ID: ${agent.id}`);
    console.log(`   Model: ${agent.model}, Voice: ${agent.voice}\n`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
