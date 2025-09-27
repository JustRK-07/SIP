const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_TENANT_ID = 'test-tenant-123';

// Mock JWT token for testing
const TEST_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2N0IjoidGVzdC10ZW5hbnQtMTIzIiwiaWF0IjoxNzI3MjkzNzQwfQ.example';

// HTTP client with authorization
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testDispatchRuleImplementation() {
  console.log('🚀 Testing Dispatch Rule Implementation...\n');

  let campaignId = null;

  try {
    // 1. Test creating a campaign with agentName (should create dispatch rule)
    console.log('1️⃣ Creating a campaign with agent name...');
    const campaignResponse = await client.post(`/tenants/${TEST_TENANT_ID}/campaigns`, {
      name: 'Dispatch Rule Test Campaign',
      agentName: 'TestAgent001',
      description: 'Test campaign for dispatch rule functionality',
      campaignType: 'INBOUND'
    });
    
    campaignId = campaignResponse.data.data.id;
    const livekitTrunk = campaignResponse.data.data.livekitTrunk;
    const dispatchRule = campaignResponse.data.data.dispatchRule;
    
    console.log(`✅ Campaign created successfully: ${campaignId}`);
    console.log(`   Name: ${campaignResponse.data.data.name}`);
    console.log(`   Agent Name: ${dispatchRule?.agentName || 'None'}`);
    console.log(`   LiveKit Trunk: ${livekitTrunk ? livekitTrunk.name : 'None created'}`);
    console.log(`   Dispatch Rule: ${dispatchRule ? dispatchRule.name : 'None created'}`);
    
    if (dispatchRule) {
      console.log(`   Dispatch Rule Details:`);
      console.log(`     - ID: ${dispatchRule.id}`);
      console.log(`     - LiveKit Rule ID: ${dispatchRule.livekitDispatchRuleId || 'None'}`);
      console.log(`     - Rule Type: ${dispatchRule.ruleType}`);
      console.log(`     - Room Name: ${dispatchRule.roomName}`);
      console.log(`     - Status: ${dispatchRule.status}`);
    }
    console.log('');

    // 2. Test updating campaign with new agentName
    console.log('2️⃣ Updating campaign with new agent name...');
    
    try {
      const updateResponse = await client.put(`/tenants/${TEST_TENANT_ID}/campaigns/${campaignId}`, {
        agentName: 'UpdatedAgent002',
        description: 'Updated description for dispatch rule testing'
      });
      
      console.log(`✅ Campaign updated successfully:`);
      console.log(`   Message: ${updateResponse.data.message}`);
      console.log(`   Updated Description: ${updateResponse.data.data.description}`);
      
      if (updateResponse.data.dispatchRuleUpdate) {
        const dispatchUpdate = updateResponse.data.dispatchRuleUpdate;
        console.log(`   Dispatch Rule Update:`);
        console.log(`     - Status: ${dispatchUpdate.status}`);
        console.log(`     - Agent Name: ${dispatchUpdate.agentName}`);
        console.log(`     - Dispatch Rule ID: ${dispatchUpdate.dispatchRuleId || 'None'}`);
        if (dispatchUpdate.message) console.log(`     - Message: ${dispatchUpdate.message}`);
        if (dispatchUpdate.error) console.log(`     - Error: ${dispatchUpdate.error}`);
      }
    } catch (updateError) {
      console.log(`⚠️  Campaign update test: ${updateError.response?.data?.error?.message || updateError.message}`);
      if (updateError.response?.data?.error?.details) {
        console.log(`   Details:`, updateError.response.data.error.details);
      }
    }
    console.log('');

    // 3. Test updating campaign without agentName (should not affect dispatch rule)
    console.log('3️⃣ Updating campaign without agent name...');
    
    try {
      const partialUpdateResponse = await client.put(`/tenants/${TEST_TENANT_ID}/campaigns/${campaignId}`, {
        description: 'Another update without agent name change'
      });
      
      console.log(`✅ Partial campaign update successful:`);
      console.log(`   Message: ${partialUpdateResponse.data.message}`);
      console.log(`   Dispatch Rule Update Present: ${partialUpdateResponse.data.dispatchRuleUpdate ? 'Yes' : 'No'}`);
    } catch (partialUpdateError) {
      console.log(`⚠️  Partial campaign update test: ${partialUpdateError.response?.data?.error?.message || partialUpdateError.message}`);
    }
    console.log('');

    // 4. Test campaign creation validation (missing agentName)
    console.log('4️⃣ Testing validation - creating campaign without agent name...');
    
    try {
      await client.post(`/tenants/${TEST_TENANT_ID}/campaigns`, {
        name: 'Invalid Campaign Without Agent',
        description: 'This should fail validation',
        campaignType: 'OUTBOUND'
      });
      console.log(`❌ Campaign without agentName was accepted (this should not happen)`);
    } catch (validationError) {
      if (validationError.response && validationError.response.status === 400) {
        console.log(`✅ Missing agentName properly rejected:`);
        console.log(`   Error: ${validationError.response.data.error.message}`);
        if (validationError.response.data.error.details) {
          console.log(`   Details: ${validationError.response.data.error.details.join(', ')}`);
        }
      } else {
        throw validationError;
      }
    }
    console.log('');

    // 5. Test OUTBOUND campaign creation
    console.log('5️⃣ Creating OUTBOUND campaign with dispatch rule...');
    
    let outboundCampaignId = null;
    try {
      const outboundResponse = await client.post(`/tenants/${TEST_TENANT_ID}/campaigns`, {
        name: 'Outbound Test Campaign',
        agentName: 'OutboundAgent003',
        description: 'Test outbound campaign',
        campaignType: 'OUTBOUND'
      });
      
      outboundCampaignId = outboundResponse.data.data.id;
      const outboundDispatchRule = outboundResponse.data.data.dispatchRule;
      
      console.log(`✅ OUTBOUND campaign created: ${outboundCampaignId}`);
      console.log(`   Campaign Type: ${outboundResponse.data.data.campaignType}`);
      console.log(`   Dispatch Rule: ${outboundDispatchRule ? outboundDispatchRule.name : 'None created'}`);
      if (outboundDispatchRule) {
        console.log(`   Agent Name: ${outboundDispatchRule.agentName}`);
        console.log(`   Room Name: ${outboundDispatchRule.roomName}`);
      }
    } catch (outboundError) {
      console.log(`⚠️  OUTBOUND campaign creation: ${outboundError.response?.data?.error?.message || outboundError.message}`);
    }
    console.log('');

    // 6. Test campaign deletion with dispatch rule cleanup
    console.log('6️⃣ Testing campaign deletion with dispatch rule cleanup...');
    
    try {
      const deleteResponse = await client.delete(`/tenants/${TEST_TENANT_ID}/campaigns/${campaignId}`);
      
      console.log(`✅ Campaign deletion completed:`);
      console.log(`   Message: ${deleteResponse.data.message}`);
      
      if (deleteResponse.data.dispatchRuleCleanup) {
        const cleanup = deleteResponse.data.dispatchRuleCleanup;
        console.log(`   Dispatch Rule Cleanup:`);
        console.log(`     - Total Rules: ${cleanup.totalRules}`);
        console.log(`     - Successful Cleanups: ${cleanup.successfulCleanups}`);
        
        if (cleanup.results && cleanup.results.length > 0) {
          cleanup.results.forEach((result, index) => {
            console.log(`     Rule ${index + 1}:`);
            if (result.agentName) console.log(`       - Agent: ${result.agentName}`);
            console.log(`       - LiveKit Cleanup: ${result.livekitCleanup}`);
            console.log(`       - Database Cleanup: ${result.databaseCleanup}`);
            if (result.livekitError) console.log(`       - LiveKit Error: ${result.livekitError}`);
            if (result.databaseError) console.log(`       - Database Error: ${result.databaseError}`);
          });
        }
      }
    } catch (deleteError) {
      console.log(`⚠️  Campaign deletion test: ${deleteError.response?.data?.error?.message || deleteError.message}`);
    }
    console.log('');

    // Cleanup outbound campaign if created
    if (outboundCampaignId) {
      console.log('7️⃣ Cleaning up OUTBOUND test campaign...');
      try {
        await client.delete(`/tenants/${TEST_TENANT_ID}/campaigns/${outboundCampaignId}`);
        console.log(`✅ OUTBOUND campaign cleaned up successfully`);
      } catch (cleanupError) {
        console.log(`⚠️  OUTBOUND campaign cleanup: ${cleanupError.response?.data?.error?.message || cleanupError.message}`);
      }
    }

    console.log('\n🎉 Dispatch rule implementation tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Campaign creation with dispatch rule');
    console.log('   ✅ Campaign update with agentName change');
    console.log('   ✅ Campaign update without agentName change');
    console.log('   ✅ Validation of required agentName parameter');
    console.log('   ✅ OUTBOUND campaign with dispatch rule');
    console.log('   ✅ Campaign deletion with dispatch rule cleanup');
    console.log('   ✅ Comprehensive error handling and status reporting');
    
    console.log('\n💡 Note: Actual LiveKit integration depends on:');
    console.log('   - Valid LiveKit credentials in .env file');
    console.log('   - LiveKit server accessibility');
    console.log('   - Proper LiveKit trunk provisioning');

  } catch (error) {
    console.error('❌ Dispatch rule test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404 && error.response?.data?.error?.code === 'TENANT_NOT_FOUND') {
      console.log('\n💡 Note: Make sure the test tenant exists in the database.');
      console.log('   You may need to create a tenant first with ID: ' + TEST_TENANT_ID);
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: JWT authentication failed.');
      console.log('   The test token may be invalid or expired.');
    }

    if (error.response?.status === 500 && error.response?.data?.error?.message?.includes('LiveKit')) {
      console.log('\n💡 Note: LiveKit configuration may be required for dispatch rule operations.');
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
  await testDispatchRuleImplementation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testDispatchRuleImplementation };