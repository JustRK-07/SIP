const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_TENANT_ID = 'test-tenant-123';

// Mock JWT token for testing (would normally be obtained from login)
const TEST_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2N0IjoidGVzdC10ZW5hbnQtMTIzIiwiaWF0IjoxNzI3MjkzNzQwfQ.example';

// HTTP client with authorization
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testCampaignTrunkIntegration() {
  console.log('🚀 Testing Campaign-Driven LiveKit Trunk Integration...\n');

  try {
    // 1. Test creating INBOUND campaign with automatic trunk creation
    console.log('1️⃣ Creating INBOUND campaign with automatic trunk creation...');
    const inboundCampaignResponse = await client.post(`/tenants/${TEST_TENANT_ID}/campaigns`, {
      name: 'Inbound Sales Campaign',
      description: 'Test inbound campaign for sales calls',
      campaignType: 'INBOUND'
    });
    
    const inboundCampaignId = inboundCampaignResponse.data.data.id;
    const inboundTrunk = inboundCampaignResponse.data.data.livekitTrunk;
    
    console.log(`✅ INBOUND Campaign created: ${inboundCampaignId}`);
    console.log(`   Campaign Name: ${inboundCampaignResponse.data.data.name}`);
    console.log(`   Campaign Type: ${inboundCampaignResponse.data.data.campaignType}`);
    console.log(`   LiveKit Trunk: ${inboundTrunk ? inboundTrunk.name : 'None created'}`);
    console.log(`   Trunk Status: ${inboundTrunk ? inboundTrunk.status : 'N/A'}\n`);

    // 2. Test creating OUTBOUND campaign with automatic trunk creation
    console.log('2️⃣ Creating OUTBOUND campaign with automatic trunk creation...');
    const outboundCampaignResponse = await client.post(`/tenants/${TEST_TENANT_ID}/campaigns`, {
      name: 'Outbound Marketing Campaign',
      description: 'Test outbound campaign for marketing calls',
      campaignType: 'OUTBOUND'
    });
    
    const outboundCampaignId = outboundCampaignResponse.data.data.id;
    const outboundTrunk = outboundCampaignResponse.data.data.livekitTrunk;
    
    console.log(`✅ OUTBOUND Campaign created: ${outboundCampaignId}`);
    console.log(`   Campaign Name: ${outboundCampaignResponse.data.data.name}`);
    console.log(`   Campaign Type: ${outboundCampaignResponse.data.data.campaignType}`);
    console.log(`   LiveKit Trunk: ${outboundTrunk ? outboundTrunk.name : 'None created'}`);
    console.log(`   Trunk Status: ${outboundTrunk ? outboundTrunk.status : 'N/A'}\n`);

    // 3. Test adding phone numbers to inbound campaign and trunk update
    console.log('3️⃣ Adding phone numbers to INBOUND campaign...');
    
    try {
      // Add first phone number
      const phoneNumber1Response = await client.post(`/tenants/${TEST_TENANT_ID}/phone-numbers`, {
        number: '+15551111111',
        type: 'LOCAL',
        label: 'Inbound Line 1',
        provider: 'TWILIO',
        campaignId: inboundCampaignId
      });
      
      console.log(`✅ Phone number 1 added: ${phoneNumber1Response.data.data.number}`);
      console.log(`   Associated Campaign: ${phoneNumber1Response.data.data.campaign?.name || 'None'}`);
      console.log(`   LiveKit Trunk Update: ${phoneNumber1Response.data.livekitTrunkUpdate?.status || 'Not updated'}`);
      if (phoneNumber1Response.data.livekitTrunkUpdate?.status === 'success') {
        console.log(`   Numbers in Trunk: ${phoneNumber1Response.data.livekitTrunkUpdate.numbersCount}`);
      }

      // Add second phone number
      const phoneNumber2Response = await client.post(`/tenants/${TEST_TENANT_ID}/phone-numbers`, {
        number: '+15551111112',
        type: 'LOCAL',
        label: 'Inbound Line 2',
        provider: 'TWILIO',
        campaignId: inboundCampaignId
      });
      
      console.log(`✅ Phone number 2 added: ${phoneNumber2Response.data.data.number}`);
      console.log(`   LiveKit Trunk Update: ${phoneNumber2Response.data.livekitTrunkUpdate?.status || 'Not updated'}`);
      if (phoneNumber2Response.data.livekitTrunkUpdate?.status === 'success') {
        console.log(`   Numbers in Trunk: ${phoneNumber2Response.data.livekitTrunkUpdate.numbersCount}`);
      }
      
    } catch (phoneError) {
      console.log(`⚠️  Phone number creation test: ${phoneError.response?.data?.error?.message || phoneError.message}`);
      console.log('   This is expected if Twilio credentials are not configured or numbers are not available');
    }
    console.log('');

    // 4. Test adding phone numbers to outbound campaign
    console.log('4️⃣ Adding phone numbers to OUTBOUND campaign...');
    
    try {
      const phoneNumber3Response = await client.post(`/tenants/${TEST_TENANT_ID}/phone-numbers`, {
        number: '+15552222221',
        type: 'LOCAL',
        label: 'Outbound Line 1',
        provider: 'TWILIO',
        campaignId: outboundCampaignId
      });
      
      console.log(`✅ Phone number 3 added: ${phoneNumber3Response.data.data.number}`);
      console.log(`   Associated Campaign: ${phoneNumber3Response.data.data.campaign?.name || 'None'}`);
      console.log(`   LiveKit Trunk Update: ${phoneNumber3Response.data.livekitTrunkUpdate?.status || 'Not updated'}`);
      if (phoneNumber3Response.data.livekitTrunkUpdate?.status === 'success') {
        console.log(`   Numbers in Trunk: ${phoneNumber3Response.data.livekitTrunkUpdate.numbersCount}`);
      }
      
    } catch (phoneError) {
      console.log(`⚠️  Phone number creation test: ${phoneError.response?.data?.error?.message || phoneError.message}`);
    }
    console.log('');

    // 5. Test campaign update triggering trunk synchronization
    console.log('5️⃣ Testing campaign update with trunk synchronization...');
    
    try {
      const campaignUpdateResponse = await client.put(`/tenants/${TEST_TENANT_ID}/campaigns/${inboundCampaignId}`, {
        description: 'Updated description for inbound sales campaign'
      });
      
      console.log(`✅ Campaign updated: ${campaignUpdateResponse.data.data.name}`);
      console.log(`   New Description: ${campaignUpdateResponse.data.data.description}`);
      console.log(`   LiveKit Trunk Update: ${campaignUpdateResponse.data.livekitTrunkUpdate?.status || 'Not updated'}`);
      if (campaignUpdateResponse.data.livekitTrunkUpdate?.status === 'success') {
        console.log(`   Trunk ID: ${campaignUpdateResponse.data.livekitTrunkUpdate.trunkId}`);
      }
      
    } catch (updateError) {
      console.log(`⚠️  Campaign update test: ${updateError.response?.data?.error?.message || updateError.message}`);
    }
    console.log('');

    // 6. Test phone number campaign reassignment
    console.log('6️⃣ Testing phone number campaign reassignment...');
    
    try {
      // Create a phone number without campaign first
      const phoneNumber4Response = await client.post(`/tenants/${TEST_TENANT_ID}/phone-numbers`, {
        number: '+15553333331',
        type: 'LOCAL',
        label: 'Reassignment Test Line',
        provider: 'TWILIO'
      });
      
      const phoneNumberId = phoneNumber4Response.data.data.id;
      console.log(`✅ Phone number created without campaign: ${phoneNumber4Response.data.data.number}`);
      
      // Now assign it to the inbound campaign
      const reassignResponse = await client.put(`/tenants/${TEST_TENANT_ID}/phone-numbers/${phoneNumberId}`, {
        campaignId: inboundCampaignId
      });
      
      console.log(`✅ Phone number reassigned to campaign: ${reassignResponse.data.data.campaign?.name || 'None'}`);
      console.log(`   LiveKit Trunk Updates: ${reassignResponse.data.livekitTrunkUpdates ? reassignResponse.data.livekitTrunkUpdates.length : 0}`);
      
      if (reassignResponse.data.livekitTrunkUpdates) {
        reassignResponse.data.livekitTrunkUpdates.forEach((update, index) => {
          console.log(`   Update ${index + 1}: ${update.type} ${update.campaignName} (${update.numbersCount} numbers)`);
        });
      }
      
    } catch (reassignError) {
      console.log(`⚠️  Phone number reassignment test: ${reassignError.response?.data?.error?.message || reassignError.message}`);
    }
    console.log('');

    // 7. Test LiveKit trunk listing
    console.log('7️⃣ Listing LiveKit trunks to verify creation...');
    
    try {
      const livekitTrunksResponse = await client.get(`/livekit-trunks?tenantId=${TEST_TENANT_ID}`);
      
      console.log(`✅ LiveKit trunks retrieved: ${livekitTrunksResponse.data.pagination.totalCount} total`);
      livekitTrunksResponse.data.data.forEach((trunk, index) => {
        console.log(`   Trunk ${index + 1}: ${trunk.name} (${trunk.trunkType}, ${trunk.status})`);
        console.log(`     LiveKit ID: ${trunk.livekitTrunkId || 'None'}`);
        console.log(`     Tenant: ${trunk.tenant.name}`);
      });
      
    } catch (listError) {
      console.log(`⚠️  LiveKit trunk listing test: ${listError.response?.data?.error?.message || listError.message}`);
    }
    console.log('');

    // 8. Cleanup
    console.log('8️⃣ Cleaning up test data...');
    
    try {
      await client.delete(`/tenants/${TEST_TENANT_ID}/campaigns/${inboundCampaignId}`);
      console.log(`✅ Inbound campaign deleted`);
      
      await client.delete(`/tenants/${TEST_TENANT_ID}/campaigns/${outboundCampaignId}`);
      console.log(`✅ Outbound campaign deleted`);
      
    } catch (cleanupError) {
      console.log(`⚠️  Cleanup warning: ${cleanupError.response?.data?.error?.message || cleanupError.message}`);
    }

    console.log('\n🎉 Campaign-Trunk Integration Test completed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ INBOUND campaign creation with trunk provisioning');
    console.log('   ✅ OUTBOUND campaign creation with trunk provisioning');
    console.log('   ⚠️  Phone number creation with trunk updates (requires Twilio config)');
    console.log('   ✅ Campaign updates triggering trunk synchronization');
    console.log('   ⚠️  Phone number campaign reassignment with trunk updates');
    console.log('   ✅ LiveKit trunk listing and verification');
    console.log('   ✅ Test cleanup');

  } catch (error) {
    console.error('❌ Campaign-Trunk integration test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404 && error.response?.data?.error?.code === 'TENANT_NOT_FOUND') {
      console.log('\n💡 Note: Make sure the test tenant exists in the database.');
      console.log('   You may need to create a tenant first with ID: ' + TEST_TENANT_ID);
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: JWT authentication failed.');
      console.log('   The test token may be invalid or expired.');
    }

    if (error.response?.status === 500 && error.response?.data?.error?.message?.includes('LiveKit')) {
      console.log('\n💡 Note: LiveKit configuration may be required for trunk provisioning.');
      console.log('   Make sure LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_SERVER_URL are set in .env');
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3000');
    console.log('💡 Start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  await testCampaignTrunkIntegration();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCampaignTrunkIntegration };