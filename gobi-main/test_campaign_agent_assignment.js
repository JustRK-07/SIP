const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Testing Campaign Agent Assignment ===\n');

  // Get active agent
  const agent = await prisma.agent.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, status: true }
  });

  if (!agent) {
    console.log('❌ No active agents found');
    return;
  }

  console.log(`Found active agent: "${agent.name}" (${agent.id})`);

  // Get tenant
  const tenant = await prisma.tenant.findFirst();
  console.log(`Using tenant: "${tenant.name}" (${tenant.id})\n`);

  // Create campaign with agent assignment
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Test Campaign with Agent',
      description: 'Testing agent assignment',
      status: 'DRAFT',
      campaignType: 'INBOUND',
      tenantId: tenant.id
    }
  });

  console.log(`✅ Created campaign: "${campaign.name}" (${campaign.id})`);

  // Create CampaignAgent record
  const campaignAgent = await prisma.campaignAgent.create({
    data: {
      campaignId: campaign.id,
      agentId: agent.id,
      isActive: true,
      priority: 1
    }
  });

  console.log(`✅ Created CampaignAgent record (${campaignAgent.id})`);

  // Verify the relationship
  const verifiedCampaign = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    include: {
      agents: {
        include: {
          agent: {
            select: { id: true, name: true, status: true }
          }
        }
      }
    }
  });

  console.log(`\n=== Verification ===`);
  console.log(`Campaign: "${verifiedCampaign.name}"`);
  console.log(`Assigned agents: ${verifiedCampaign.agents.length}`);
  verifiedCampaign.agents.forEach((ca, i) => {
    console.log(`  ${i + 1}. ${ca.agent.name} (${ca.agent.status})`);
    console.log(`     Priority: ${ca.priority}, Active: ${ca.isActive}`);
  });

  // Cleanup
  await prisma.campaignAgent.delete({ where: { id: campaignAgent.id } });
  await prisma.campaign.delete({ where: { id: campaign.id } });
  console.log('\n🧹 Test data cleaned up');
}

main().catch(console.error).finally(() => prisma.$disconnect());
