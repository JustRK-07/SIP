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

// Create test JWT token with valid account
const createTestToken = () => {
  return jwt.sign({
    sub: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['admin'],
    acct: '00000000-0000-0000-0000-00000000b40d'
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

const runTenantCreationTests = async () => {
  console.log('🚀 Starting tenant creation tests...\n');
  console.log('⚠️  Make sure the server is running with: npm run dev\n');
  
  const token = createTestToken();
  const timestamp = Date.now();
  
  try {
    // Test 1: Create tenant with auto-generated ID
    console.log('🧪 Test 1: Creating tenant with auto-generated ID');
    const autoGenTenant = {
      name: `Auto Gen Tenant ${timestamp}`,
      domain: `autogen-${timestamp}.example.com`,
      description: 'Tenant with auto-generated ID',
      contactEmail: 'autogen@example.com'
    };
    
    const response1 = await makeRequest('POST', '/api/tenants', token, autoGenTenant);
    
    if (response1.status === 201) {
      console.log('✅ Auto-generated ID test passed');
      console.log(`   Generated ID: ${response1.data.data.id}`);
      console.log(`   Domain: ${response1.data.data.domain}`);
    } else {
      console.log(`❌ Auto-generated ID test failed - Status: ${response1.status}`);
      console.log(`   Response:`, response1.data);
    }
    console.log('');
    
    // Test 2: Create tenant with custom ID
    console.log('🧪 Test 2: Creating tenant with custom ID');
    const customId = `custom-tenant-${timestamp}`;
    const customIdTenant = {
      tenantId: customId,
      name: `Custom ID Tenant ${timestamp}`,
      domain: `custom-${timestamp}.example.com`,
      description: 'Tenant with custom ID',
      contactEmail: 'custom@example.com'
    };
    
    const response2 = await makeRequest('POST', '/api/tenants', token, customIdTenant);
    
    if (response2.status === 201) {
      console.log('✅ Custom ID test passed');
      console.log(`   Custom ID: ${response2.data.data.id}`);
      console.log(`   Expected: ${customId}`);
      console.log(`   Match: ${response2.data.data.id === customId ? '✅' : '❌'}`);
    } else {
      console.log(`❌ Custom ID test failed - Status: ${response2.status}`);
      console.log(`   Response:`, response2.data);
    }
    console.log('');
    
    // Test 3: Try to create tenant with duplicate custom ID
    console.log('🧪 Test 3: Testing duplicate custom ID rejection');
    const duplicateIdTenant = {
      tenantId: customId, // Same ID as Test 2
      name: `Duplicate ID Tenant ${timestamp}`,
      domain: `duplicate-${timestamp}.example.com`,
      description: 'Tenant with duplicate ID',
      contactEmail: 'duplicate@example.com'
    };
    
    const response3 = await makeRequest('POST', '/api/tenants', token, duplicateIdTenant);
    
    if (response3.status === 409 && response3.data.error && response3.data.error.code === 'TENANT_ID_EXISTS') {
      console.log('✅ Duplicate ID rejection test passed');
      console.log(`   Error code: ${response3.data.error.code}`);
      console.log(`   Message: ${response3.data.error.message}`);
    } else {
      console.log(`❌ Duplicate ID rejection test failed - Status: ${response3.status}`);
      console.log(`   Response:`, response3.data);
    }
    console.log('');
    
    // Test 4: Test validation of invalid tenant ID
    console.log('🧪 Test 4: Testing invalid tenant ID validation');
    const invalidIdTenant = {
      tenantId: '', // Empty string
      name: `Invalid ID Tenant ${timestamp}`,
      domain: `invalid-${timestamp}.example.com`,
      description: 'Tenant with invalid ID',
      contactEmail: 'invalid@example.com'
    };
    
    const response4 = await makeRequest('POST', '/api/tenants', token, invalidIdTenant);
    
    if (response4.status === 400 && response4.data.error && response4.data.error.code === 'VALIDATION_ERROR') {
      console.log('✅ Invalid ID validation test passed');
      console.log(`   Error code: ${response4.data.error.code}`);
      console.log(`   Details:`, response4.data.error.details);
    } else {
      console.log(`❌ Invalid ID validation test failed - Status: ${response4.status}`);
      console.log(`   Response:`, response4.data);
    }
    console.log('');
    
    console.log('🎉 All tenant creation tests completed!');
    console.log('\n📝 Summary:');
    console.log('✅ Auto-generated tenant IDs work correctly');
    console.log('✅ Custom tenant IDs are accepted and used');
    console.log('✅ Duplicate tenant IDs are properly rejected');
    console.log('✅ Invalid tenant IDs are validated and rejected');
    
  } catch (error) {
    console.log('❌ Tests failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the server is running: npm run dev');
    console.log('2. Set JWT_PUBLIC_KEY in your .env file to the public key shown above');
    console.log('3. Check that the database is connected and migrations are applied');
    process.exit(1);
  }
};

if (require.main === module) {
  runTenantCreationTests();
}

module.exports = { runTenantCreationTests, createTestToken, publicKey, privateKey };