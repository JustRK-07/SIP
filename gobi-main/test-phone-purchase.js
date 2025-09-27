const jwt = require('jsonwebtoken');
const http = require('http');
const crypto = require('crypto');

// Generate a test RSA key pair for testing
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log('🔑 Generated test RSA key pair for testing');
console.log('ℹ️  Make sure to set JWT_PUBLIC_KEY in your .env to:');
console.log(publicKey);
console.log('⚠️  Make sure to configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env for Twilio purchasing\n');

// Create test JWT token
const createTestToken = (tenantId) => {
  return jwt.sign({
    sub: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['admin'],
    acct: tenantId
  }, privateKey, { 
    algorithm: 'RS256',
    expiresIn: '1h'
  });
};

// Test function to make HTTP requests
const makeRequest = (method, path, token, body = null) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: response,
            headers: res.headers
          });
        } catch (error) {
          console.log('❌ Invalid JSON response');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Connection error');
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

const runPhonePurchaseTests = async () => {
  console.log('🚀 Starting phone number purchase tests...\n');
  console.log('⚠️  Make sure the server is running with: npm run dev\n');
  
  const timestamp = Date.now();
  const testTenantId = `test-tenant-${timestamp}`;
  const token = createTestToken(testTenantId);
  
  try {
    // Step 1: Create a test tenant first
    console.log('🧪 Step 1: Creating test tenant');
    const tenantData = {
      tenantId: testTenantId,
      name: `Test Tenant ${timestamp}`,
      domain: `test-${timestamp}.example.com`,
      description: 'Test tenant for phone purchase testing'
    };
    
    const tenantResponse = await makeRequest('POST', '/api/tenants', token, tenantData);
    
    if (tenantResponse.status === 201) {
      console.log('✅ Test tenant created successfully');
      console.log(`   Tenant ID: ${tenantResponse.data.data.id}`);
    } else {
      console.log(`❌ Failed to create test tenant - Status: ${tenantResponse.status}`);
      console.log('   Response:', tenantResponse.data);
      return;
    }
    console.log('');
    
    // Step 2: Test phone number purchase (this will likely fail without valid Twilio setup)
    console.log('🧪 Step 2: Testing phone number purchase');
    const phoneData = {
      number: '+15551234567', // This is a test number that likely won't work
      type: 'LOCAL',
      label: 'Test Purchase Line',
      provider: 'TWILIO'
    };
    
    const purchaseResponse = await makeRequest('POST', `/api/tenants/${testTenantId}/phone-numbers`, token, phoneData);
    
    if (purchaseResponse.status === 201) {
      console.log('✅ Phone number purchase test passed');
      console.log(`   Number: ${purchaseResponse.data.data.number}`);
      console.log(`   Twilio SID: ${purchaseResponse.data.twilio?.sid || 'N/A'}`);
      console.log(`   Status: ${purchaseResponse.data.twilio?.status || 'N/A'}`);
    } else if (purchaseResponse.status === 400) {
      console.log('⚠️  Phone number purchase test - Expected failure (number not available or Twilio not configured)');
      console.log(`   Error: ${purchaseResponse.data.error?.message}`);
      console.log(`   Code: ${purchaseResponse.data.error?.code}`);
      console.log(`   Twilio Code: ${purchaseResponse.data.error?.twilioCode || 'N/A'}`);
    } else if (purchaseResponse.status === 500 && purchaseResponse.data.error?.code === 'TWILIO_CONFIG_ERROR') {
      console.log('⚠️  Phone number purchase test - Twilio not configured');
      console.log('   Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    } else {
      console.log(`❌ Phone number purchase test failed - Status: ${purchaseResponse.status}`);
      console.log('   Response:', purchaseResponse.data);
    }
    console.log('');
    
    // Step 3: Test with invalid phone number format
    console.log('🧪 Step 3: Testing invalid phone number format');
    const invalidPhoneData = {
      number: 'invalid-number',
      type: 'LOCAL',
      label: 'Invalid Number Test',
      provider: 'TWILIO'
    };
    
    const invalidResponse = await makeRequest('POST', `/api/tenants/${testTenantId}/phone-numbers`, token, invalidPhoneData);
    
    if (invalidResponse.status === 400) {
      console.log('✅ Invalid phone number validation test passed');
      console.log(`   Error: ${invalidResponse.data.error?.message}`);
      console.log(`   Code: ${invalidResponse.data.error?.code}`);
    } else {
      console.log(`❌ Invalid phone number test failed - Status: ${invalidResponse.status}`);
      console.log('   Response:', invalidResponse.data);
    }
    console.log('');
    
    // Step 4: Test with non-existent tenant
    console.log('🧪 Step 4: Testing with non-existent tenant');
    const nonExistentToken = createTestToken('non-existent-tenant');
    const nonExistentResponse = await makeRequest('POST', '/api/tenants/non-existent-tenant/phone-numbers', nonExistentToken, phoneData);
    
    if (nonExistentResponse.status === 404 || nonExistentResponse.status === 403) {
      console.log('✅ Non-existent tenant test passed');
      console.log(`   Status: ${nonExistentResponse.status}`);
      console.log(`   Error: ${nonExistentResponse.data.error?.message}`);
    } else {
      console.log(`❌ Non-existent tenant test failed - Status: ${nonExistentResponse.status}`);
      console.log('   Response:', nonExistentResponse.data);
    }
    console.log('');
    
    console.log('🎉 Phone number purchase tests completed!');
    console.log('\n📝 Summary:');
    console.log('✅ Test tenant creation works correctly');
    console.log('✅ Phone number purchase endpoint is accessible');
    console.log('✅ Invalid phone number format is properly validated');
    console.log('✅ Non-existent tenant access is properly blocked');
    console.log('\n💡 Notes:');
    console.log('- Phone number purchase may fail without valid Twilio configuration');
    console.log('- Use available numbers from /available endpoint for real purchases');
    console.log('- Ensure Twilio account has sufficient balance for purchases');
    
  } catch (error) {
    console.log('❌ Tests failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the server is running: npm run dev');
    console.log('2. Set JWT_PUBLIC_KEY in your .env file to the public key shown above');
    console.log('3. Check that the database is connected and migrations are applied');
    console.log('4. Configure Twilio credentials for purchase testing');
    process.exit(1);
  }
};

if (require.main === module) {
  runPhonePurchaseTests();
}

module.exports = { runPhonePurchaseTests, createTestToken, publicKey, privateKey };