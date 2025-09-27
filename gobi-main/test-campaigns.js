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

async function testCampaignImplementation() {
  console.log('🚀 Testing Campaign Implementation...\n');

  try {
    // 1. Test creating a campaign
    console.log('1️⃣ Creating a test campaign...');
    const campaignResponse = await client.post(`/tenants/${TEST_TENANT_ID}/campaigns`, {
      name: 'Marketing Campaign 2024',
      description: 'Test campaign for marketing phone numbers'
    });
    
    const campaignId = campaignResponse.data.data.id;
    console.log(`✅ Campaign created successfully: ${campaignId}`);
    console.log(`   Name: ${campaignResponse.data.data.name}`);
    console.log(`   Description: ${campaignResponse.data.data.description}\n`);

    // 2. Test creating a phone number with campaign association
    console.log('2️⃣ Creating a phone number and associating with campaign...');
    // Note: This would normally purchase a real number, but for testing we'll simulate
    const phoneNumberResponse = await client.post(`/tenants/${TEST_TENANT_ID}/phone-numbers`, {
      number: '+15551234567',
      type: 'LOCAL',
      label: 'Marketing Line 1',
      provider: 'TWILIO',
      campaignId: campaignId
    });
    
    const phoneNumberId = phoneNumberResponse.data.data.id;
    console.log(`✅ Phone number created and associated with campaign:`);
    console.log(`   Number: ${phoneNumberResponse.data.data.number}`);
    console.log(`   Campaign: ${phoneNumberResponse.data.data.campaign?.name || 'None'}\n`);

    // 3. Test getting campaign with phone numbers
    console.log('3️⃣ Retrieving campaign with associated phone numbers...');
    const campaignDetailsResponse = await client.get(`/tenants/${TEST_TENANT_ID}/campaigns/${campaignId}`);
    
    console.log(`✅ Campaign details retrieved:`);
    console.log(`   Campaign: ${campaignDetailsResponse.data.data.name}`);
    console.log(`   Phone Numbers Count: ${campaignDetailsResponse.data.data.phoneNumbers.length}`);
    campaignDetailsResponse.data.data.phoneNumbers.forEach((phone, index) => {
      console.log(`   Phone ${index + 1}: ${phone.number} (${phone.label})`);
    });
    console.log('');

    // 4. Test updating LiveKit trunk with campaign numbers
    console.log('4️⃣ Testing LiveKit trunk update with campaign numbers...');
    try {
      const livekitUpdateResponse = await client.post(
        `/tenants/${TEST_TENANT_ID}/campaigns/${campaignId}/update-livekit-trunk`
      );
      
      console.log(`✅ LiveKit trunk updated successfully:`);
      console.log(`   Campaign: ${livekitUpdateResponse.data.data.campaignName}`);
      console.log(`   LiveKit Trunk: ${livekitUpdateResponse.data.data.livekitTrunkName}`);
      console.log(`   Phone Numbers: ${livekitUpdateResponse.data.data.phoneNumbers.join(', ')}`);
    } catch (livekitError) {
      console.log(`⚠️  LiveKit trunk update test: ${livekitError.response?.data?.error?.message || livekitError.message}`);
      console.log('   This is expected if no LiveKit trunk is provisioned');
    }
    console.log('');

    // 5. Test listing campaigns
    console.log('5️⃣ Testing campaign listing...');
    const campaignsListResponse = await client.get(`/tenants/${TEST_TENANT_ID}/campaigns`);
    
    console.log(`✅ Campaigns listed successfully:`);
    console.log(`   Total Campaigns: ${campaignsListResponse.data.pagination.totalCount}`);
    campaignsListResponse.data.data.forEach((campaign, index) => {
      console.log(`   Campaign ${index + 1}: ${campaign.name} (${campaign._count.phoneNumbers} numbers)`);
    });
    console.log('');

    // 6. Test updating phone number to remove from campaign
    console.log('6️⃣ Testing phone number campaign disassociation...');
    const updatedPhoneResponse = await client.put(`/tenants/${TEST_TENANT_ID}/phone-numbers/${phoneNumberId}`, {
      campaignId: null // Remove from campaign
    });
    
    console.log(`✅ Phone number campaign association updated:`);
    console.log(`   Number: ${updatedPhoneResponse.data.data.number}`);
    console.log(`   Campaign: ${updatedPhoneResponse.data.data.campaign?.name || 'None'}\n`);

    // 7. Cleanup - delete test campaign
    console.log('7️⃣ Cleaning up test campaign...');
    await client.delete(`/tenants/${TEST_TENANT_ID}/campaigns/${campaignId}`);
    console.log(`✅ Test campaign deleted successfully\n`);

    console.log('🎉 All campaign tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Campaign creation');
    console.log('   ✅ Phone number association with campaigns');
    console.log('   ✅ Campaign details retrieval');
    console.log('   ✅ Campaign listing');
    console.log('   ✅ Phone number campaign disassociation');
    console.log('   ✅ Campaign deletion');
    console.log('   ⚠️  LiveKit trunk update (requires active trunk)');

  } catch (error) {
    console.error('❌ Campaign test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404 && error.response?.data?.error?.code === 'TENANT_NOT_FOUND') {
      console.log('\n💡 Note: Make sure the test tenant exists in the database.');
      console.log('   You may need to create a tenant first with ID: ' + TEST_TENANT_ID);
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: JWT authentication failed.');
      console.log('   The test token may be invalid or expired.');
    }

    if (error.response?.status === 500 && error.response?.data?.error?.code === 'TWILIO_CONFIG_ERROR') {
      console.log('\n💡 Note: Twilio configuration is required for phone number operations.');
      console.log('   Make sure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set in .env');
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
  await testCampaignImplementation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCampaignImplementation };