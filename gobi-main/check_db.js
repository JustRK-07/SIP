const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Database Verification ===\n');
  
  // Check Lead Lists with counts
  const leadLists = await prisma.leadList.findMany({
    include: { _count: { select: { leads: true } } }
  });
  
  console.log('📋 Lead Lists:');
  leadLists.forEach(list => {
    console.log(`   ✓ ${list.name}: ${list._count.leads} leads`);
  });
  
  // Check actual leads
  const leads = await prisma.lead.findMany({
    include: { leadList: { select: { name: true } } }
  });
  
  console.log(`\n👥 Total Leads: ${leads.length}`);
  leads.forEach((lead, i) => {
    console.log(`   ${i+1}. ${lead.name || 'Unknown'} (${lead.phoneNumber}) - List: ${lead.leadList?.name}`);
  });
  
  // Test campaign access to leads
  console.log('\n🔗 Testing Campaign-LeadList Relationship:');
  const sampleList = await prisma.leadList.findFirst({
    where: { name: 'sample test' },
    include: {
      leads: { take: 3 },
      assignedCampaigns: { select: { id: true, name: true } }
    }
  });
  
  if (sampleList) {
    console.log(`   LeadList "${sampleList.name}":`);
    console.log(`     - ${sampleList.leads.length} leads (showing first 3)`);
    sampleList.leads.forEach(lead => {
      console.log(`       * ${lead.name}: ${lead.phoneNumber}`);
    });
    console.log(`     - Assigned to ${sampleList.assignedCampaigns.length} campaign(s)`);
    sampleList.assignedCampaigns.forEach(c => {
      console.log(`       * ${c.name}`);
    });
  }
  
  console.log('\n✅ Database is properly configured and accessible');
}

main().catch(console.error).finally(() => prisma.$disconnect());
