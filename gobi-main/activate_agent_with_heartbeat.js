const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get current agent config
  const currentAgent = await prisma.agent.findFirst({
    where: { name: 'Appointment Setter' }
  });

  let livekitConfig = {};
  if (currentAgent.livekitConfig) {
    if (typeof currentAgent.livekitConfig === 'string') {
      livekitConfig = JSON.parse(currentAgent.livekitConfig);
    } else {
      livekitConfig = currentAgent.livekitConfig;
    }
  }

  // Update with recent heartbeat
  livekitConfig.lastHeartbeat = new Date().toISOString();

  const agent = await prisma.agent.update({
    where: { name: 'Appointment Setter' },
    data: {
      status: 'ACTIVE',
      livekitConfig: livekitConfig
    }
  });

  console.log(`✅ Agent "${agent.name}" is now ${agent.status}`);
  console.log(`   ID: ${agent.id}`);
  console.log(`   Last heartbeat set to: ${livekitConfig.lastHeartbeat}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
