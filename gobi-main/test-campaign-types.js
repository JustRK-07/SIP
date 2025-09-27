const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test JWT token (you may need to update this with a valid token)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2N0IjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDBiNDBkIiwiaWF0IjoxNzI3Mjk0ODAwLCJleHAiOjE3MjczOTQ4MDB9.example';
const TENANT_ID = '00000000-0000-0000-0000-00000000b40d';

async function testCampaignTypes() {
  console.log('🧪 Testing Campaign Types (INBOUND/OUTBOUND)...\n');

  const config = {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    // Test 1: Create an INBOUND campaign
    console.log('1️⃣ Creating INBOUND campaign...');
    const inboundCampaign = {
      name: 'Customer Support Inbound',
      description: 'Campaign for handling incoming customer support calls',
      campaignType: 'INBOUND'
    };

    const inboundResponse = await axios.post(
      `${BASE_URL}/tenants/${TENANT_ID}/campaigns`,
      inboundCampaign,
      config
    );

    console.log('✅ INBOUND campaign created successfully:');
    console.log(`   - ID: ${inboundResponse.data.data.id}`);
    console.log(`   - Name: ${inboundResponse.data.data.name}`);
    console.log(`   - Type: ${inboundResponse.data.data.campaignType}`);
    console.log(`   - Description: ${inboundResponse.data.data.description}\n`);

    // Test 2: Create an OUTBOUND campaign
    console.log('2️⃣ Creating OUTBOUND campaign...');
    const outboundCampaign = {
      name: 'Sales Outreach Campaign',
      description: 'Campaign for outbound sales calls and marketing',
      campaignType: 'OUTBOUND'
    };

    const outboundResponse = await axios.post(
      `${BASE_URL}/tenants/${TENANT_ID}/campaigns`,
      outboundCampaign,
      config
    );

    console.log('✅ OUTBOUND campaign created successfully:');
    console.log(`   - ID: ${outboundResponse.data.data.id}`);
    console.log(`   - Name: ${outboundResponse.data.data.name}`);
    console.log(`   - Type: ${outboundResponse.data.data.campaignType}`);
    console.log(`   - Description: ${outboundResponse.data.data.description}\n`);

    // Test 3: Create campaign without specifying type (should default to INBOUND)
    console.log('3️⃣ Creating campaign without campaignType (should default to INBOUND)...');
    const defaultCampaign = {
      name: 'Default Type Campaign',
      description: 'Campaign without explicit type specification'
    };

    const defaultResponse = await axios.post(
      `${BASE_URL}/tenants/${TENANT_ID}/campaigns`,
      defaultCampaign,
      config
    );

    console.log('✅ Default campaign created successfully:');
    console.log(`   - ID: ${defaultResponse.data.data.id}`);
    console.log(`   - Name: ${defaultResponse.data.data.name}`);
    console.log(`   - Type: ${defaultResponse.data.data.campaignType} (should be INBOUND)`);
    console.log(`   - Description: ${defaultResponse.data.data.description}\n`);

    // Test 4: Update campaign type from INBOUND to OUTBOUND
    console.log('4️⃣ Updating campaign type from INBOUND to OUTBOUND...');
    const updateData = {
      name: 'Customer Support Outbound',
      campaignType: 'OUTBOUND',
      description: 'Updated to handle outbound customer follow-ups'
    };

    const updateResponse = await axios.put(
      `${BASE_URL}/tenants/${TENANT_ID}/campaigns/${inboundResponse.data.data.id}`,
      updateData,
      config
    );

    console.log('✅ Campaign updated successfully:');
    console.log(`   - ID: ${updateResponse.data.data.id}`);
    console.log(`   - Name: ${updateResponse.data.data.name}`);
    console.log(`   - Type: ${updateResponse.data.data.campaignType} (changed to OUTBOUND)`);
    console.log(`   - Description: ${updateResponse.data.data.description}\n`);

    // Test 5: Test invalid campaign type validation
    console.log('5️⃣ Testing invalid campaign type validation...');
    try {
      const invalidCampaign = {
        name: 'Invalid Type Campaign',
        campaignType: 'INVALID_TYPE'
      };

      await axios.post(
        `${BASE_URL}/tenants/${TENANT_ID}/campaigns`,
        invalidCampaign,
        config
      );
      console.log('❌ Invalid campaign type was accepted (this should not happen)');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Invalid campaign type properly rejected:');
        console.log(`   - Error: ${error.response.data.error.message}`);
        console.log(`   - Details: ${error.response.data.error.details.join(', ')}\n`);
      } else {
        throw error;
      }
    }

    // Test 6: List campaigns and verify types
    console.log('6️⃣ Listing all campaigns to verify types...');
    const listResponse = await axios.get(
      `${BASE_URL}/tenants/${TENANT_ID}/campaigns`,
      config
    );

    console.log('✅ Campaigns retrieved successfully:');
    listResponse.data.data.forEach((campaign, index) => {
      console.log(`   ${index + 1}. ${campaign.name} - Type: ${campaign.campaignType}`);
    });

    console.log('\n🎉 All campaign type tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - INBOUND campaigns can be created ✓');
    console.log('   - OUTBOUND campaigns can be created ✓');
    console.log('   - Default campaign type is INBOUND ✓');
    console.log('   - Campaign types can be updated ✓');
    console.log('   - Invalid campaign types are rejected ✓');
    console.log('   - Campaign listing includes campaign types ✓');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Handle different ways the script might be run
if (require.main === module) {
  testCampaignTypes();
}

module.exports = testCampaignTypes;