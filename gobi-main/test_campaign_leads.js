const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Testing Campaign Lead Assignment ===\n');
  
  // Get the lead list
  const leadList = await prisma.leadList.findFirst({
    where: { name: 'sample test' },
    include: { _count: { select: { leads: true } } }
  });
  
  console.log(`Found lead list: "${leadList.name}" with ${leadList._count.leads} leads`);
  
  // Create a test campaign
  const tenant = await prisma.tenant.findFirst();
  
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Test Campaign with Leads',
      description: 'Testing lead list assignment',
      status: 'DRAFT',
      campaignType: 'OUTBOUND',
      tenantId: tenant.id,
      leadLists: {
        connect: { id: leadList.id }
      }
    },
    include: {
      leadLists: {
        include: {
          _count: { select: { leads: true } },
          leads: { take: 5 }
        }
      }
    }
  });
  
  console.log(`\n✅ Created campaign: "${campaign.name}"`);
  console.log(`   Assigned lead lists: ${campaign.leadLists.length}`);
  
  campaign.leadLists.forEach(list => {
    console.log(`\n   📋 ${list.name}: ${list._count.leads} total leads`);
    console.log(`   First 5 leads:`);
    list.leads.forEach((lead, i) => {
      console.log(`     ${i+1}. ${lead.name} (${lead.phoneNumber})`);
    });
  });
  
  console.log('\n✅ Campaign can successfully access all leads through LeadList!');
  
  // Cleanup
  await prisma.campaign.delete({ where: { id: campaign.id } });
  console.log('\n🧹 Test campaign cleaned up');
}

main().catch(console.error).finally(() => prisma.$disconnect());
