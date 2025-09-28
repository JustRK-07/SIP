const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding campaign data...');

  // Get the Ytel Inc tenant (the one our user belongs to)
  const tenant = await prisma.tenant.findFirst({
    where: { domain: 'ytel.com' }
  });

  if (!tenant) {
    console.error('Test tenant not found. Please run seed.js first.');
    return;
  }

  console.log('Using tenant:', tenant.name);

  // Create test campaigns
  const campaigns = [
    {
      name: 'Q1 Sales Outreach',
      description: 'Cold calling campaign for Q1 2025',
      status: 'ACTIVE',
      campaignType: 'OUTBOUND',
      script: 'Hello, this is {agent_name} from Test Organization. I\'m calling to discuss our new product offerings...',
      totalLeads: 500,
      callsMade: 125,
      callsAnswered: 89,
      conversionRate: 12.5,
      averageDuration: 180,
      totalCost: 250.00,
      tenantId: tenant.id
    },
    {
      name: 'Customer Support Line',
      description: 'Inbound support for existing customers',
      status: 'ACTIVE',
      campaignType: 'INBOUND',
      script: 'Thank you for calling Test Organization support. How may I assist you today?',
      totalLeads: 0,
      callsMade: 0,
      callsAnswered: 245,
      conversionRate: 0,
      averageDuration: 420,
      totalCost: 125.50,
      tenantId: tenant.id
    },
    {
      name: 'Product Launch Campaign',
      description: 'Outbound calls for new product launch',
      status: 'PAUSED',
      campaignType: 'OUTBOUND',
      script: 'Hi! I\'m calling to share exciting news about our latest product launch...',
      totalLeads: 1000,
      callsMade: 450,
      callsAnswered: 320,
      conversionRate: 18.5,
      averageDuration: 240,
      totalCost: 890.00,
      tenantId: tenant.id
    },
    {
      name: 'Customer Feedback Survey',
      description: 'Gathering customer satisfaction data',
      status: 'COMPLETED',
      campaignType: 'OUTBOUND',
      script: 'Good day! We\'re conducting a brief customer satisfaction survey...',
      totalLeads: 200,
      callsMade: 198,
      callsAnswered: 156,
      conversionRate: 78.0,
      averageDuration: 90,
      totalCost: 98.00,
      tenantId: tenant.id
    },
    {
      name: 'Holiday Promotion',
      description: 'Special holiday offers campaign',
      status: 'DRAFT',
      campaignType: 'OUTBOUND',
      script: 'Happy holidays from Test Organization! We have special offers just for you...',
      totalLeads: 750,
      callsMade: 0,
      callsAnswered: 0,
      conversionRate: 0,
      averageDuration: 0,
      totalCost: 0,
      tenantId: tenant.id
    }
  ];

  for (const campaignData of campaigns) {
    const campaign = await prisma.campaign.upsert({
      where: {
        id: campaignData.name.toLowerCase().replace(/\s+/g, '-') + '-' + tenant.id
      },
      update: campaignData,
      create: {
        ...campaignData,
        id: campaignData.name.toLowerCase().replace(/\s+/g, '-') + '-' + tenant.id
      }
    });
    console.log('Created/updated campaign:', campaign.name);
  }

  // Create some phone numbers for the tenant
  const phoneNumbers = [
    {
      number: '+14155551234',
      friendlyName: 'Main Sales Line',
      status: 'ACTIVE',
      capabilities: 'voice,sms',
      twilioSid: 'PN' + Math.random().toString(36).substring(2, 15),
      twilioAccount: process.env.TWILIO_ACCOUNT_SID || 'AC' + Math.random().toString(36).substring(2, 34),
      country: 'US',
      region: 'CA',
      monthlyCost: 1.00,
      callDirection: 'BOTH',
      tenantId: tenant.id
    },
    {
      number: '+14155551235',
      friendlyName: 'Support Hotline',
      status: 'ACTIVE',
      capabilities: 'voice',
      twilioSid: 'PN' + Math.random().toString(36).substring(2, 15),
      twilioAccount: process.env.TWILIO_ACCOUNT_SID || 'AC' + Math.random().toString(36).substring(2, 34),
      country: 'US',
      region: 'CA',
      monthlyCost: 1.00,
      callDirection: 'INBOUND',
      tenantId: tenant.id
    },
    {
      number: '+14155551236',
      friendlyName: 'Outbound Campaign Line',
      status: 'ACTIVE',
      capabilities: 'voice',
      twilioSid: 'PN' + Math.random().toString(36).substring(2, 15),
      twilioAccount: process.env.TWILIO_ACCOUNT_SID || 'AC' + Math.random().toString(36).substring(2, 34),
      country: 'US',
      region: 'CA',
      monthlyCost: 1.00,
      callDirection: 'OUTBOUND',
      tenantId: tenant.id
    }
  ];

  for (const phoneData of phoneNumbers) {
    const phone = await prisma.phoneNumber.upsert({
      where: { number: phoneData.number },
      update: phoneData,
      create: phoneData
    });
    console.log('Created/updated phone number:', phone.friendlyName);
  }

  // Assign phone numbers to campaigns
  const salesCampaign = await prisma.campaign.findFirst({
    where: { name: 'Q1 Sales Outreach' }
  });

  const supportCampaign = await prisma.campaign.findFirst({
    where: { name: 'Customer Support Line' }
  });

  if (salesCampaign) {
    await prisma.phoneNumber.updateMany({
      where: { number: '+14155551236' },
      data: { campaignId: salesCampaign.id }
    });
    console.log('Assigned phone number to sales campaign');
  }

  if (supportCampaign) {
    await prisma.phoneNumber.updateMany({
      where: { number: '+14155551235' },
      data: { campaignId: supportCampaign.id }
    });
    console.log('Assigned phone number to support campaign');
  }

  console.log('Campaign seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });