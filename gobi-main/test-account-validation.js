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

// Test function to make HTTP requests
const makeRequest = (path, token, expectedStatus) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
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
          if (res.statusCode === expectedStatus) {
            console.log(`✅ Test passed - Expected ${expectedStatus}, got ${res.statusCode}`);
            console.log(`   Response: ${response.error ? response.error.message : 'Success'}`);
            resolve({ status: res.statusCode, data: response });
          } else {
            console.log(`❌ Test failed - Expected ${expectedStatus}, got ${res.statusCode}`);
            console.log(`   Response:`, response);
            reject(new Error(`Expected ${expectedStatus} but got ${res.statusCode}`));
          }
        } catch (error) {
          console.log('❌ Test failed - Invalid JSON response');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Test failed - Connection error');
      reject(error);
    });

    req.end();
  });
};

// Create test JWT tokens
const createTestToken = (payload) => {
  return jwt.sign(payload, privateKey, { 
    algorithm: 'RS256',
    expiresIn: '1h'
  });
};

const runAccountValidationTests = async () => {
  console.log('🚀 Starting account validation tests...\n');
  console.log('⚠️  Make sure the server is running with: npm run dev\n');
  
  try {
    // Test 1: Valid account ID
    console.log('🧪 Test 1: Request with correct account ID');
    const validToken = createTestToken({
      sub: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      roles: ['admin'],
      acct: '00000000-0000-0000-0000-000000000000'
    });
    
    await makeRequest('/api/tenants', validToken, 200);
    console.log('');
    
    // Test 2: Invalid account ID
    console.log('🧪 Test 2: Request with incorrect account ID');
    const invalidAccountToken = createTestToken({
      sub: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      roles: ['admin'],
      acct: '11111111-1111-1111-1111-111111111111'
    });
    
    await makeRequest('/api/tenants', invalidAccountToken, 403);
    console.log('');
    
    // Test 3: Missing account ID
    console.log('🧪 Test 3: Request with missing account ID');
    const noAccountToken = createTestToken({
      sub: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      roles: ['admin']
      // No acct field
    });
    
    await makeRequest('/api/tenants', noAccountToken, 403);
    console.log('');
    
    // Test 4: No token
    console.log('🧪 Test 4: Request with no token');
    await makeRequest('/api/tenants', null, 401);
    console.log('');
    
    console.log('🎉 All account validation tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ Requests with correct account ID (00000000-0000-0000-0000-000000000000) are allowed');
    console.log('✅ Requests with incorrect account ID are blocked with 403 Forbidden');
    console.log('✅ Requests with missing account ID are blocked with 403 Forbidden');
    console.log('✅ Requests with no authentication token are blocked with 401 Unauthorized');
    
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
  runAccountValidationTests();
}

module.exports = { runAccountValidationTests, createTestToken, publicKey, privateKey };