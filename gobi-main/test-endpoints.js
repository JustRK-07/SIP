const http = require('http');

// Simple test script to verify the application is running
const testHealthEndpoint = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
          console.log('✅ Health endpoint test passed');
          console.log('Response:', response);
          resolve(response);
        } catch (error) {
          console.log('❌ Health endpoint test failed - Invalid JSON response');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Health endpoint test failed - Connection error');
      console.log('Make sure the server is running with: npm run dev');
      reject(error);
    });

    req.end();
  });
};

const testTenantsEndpointWithoutAuth = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/tenants',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
          if (res.statusCode === 401) {
            console.log('✅ Authentication test passed - 401 Unauthorized received as expected');
            console.log('Response:', response);
            resolve(response);
          } else {
            console.log('❌ Authentication test failed - Expected 401 but got', res.statusCode);
            reject(new Error(`Expected 401 but got ${res.statusCode}`));
          }
        } catch (error) {
          console.log('❌ Authentication test failed - Invalid JSON response');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Authentication test failed - Connection error');
      reject(error);
    });

    req.end();
  });
};

const test404Endpoint = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/nonexistent',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
          if (res.statusCode === 404) {
            console.log('✅ 404 handler test passed');
            console.log('Response:', response);
            resolve(response);
          } else {
            console.log('❌ 404 handler test failed - Expected 404 but got', res.statusCode);
            reject(new Error(`Expected 404 but got ${res.statusCode}`));
          }
        } catch (error) {
          console.log('❌ 404 handler test failed - Invalid JSON response');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ 404 handler test failed - Connection error');
      reject(error);
    });

    req.end();
  });
};

const runTests = async () => {
  console.log('🚀 Starting endpoint tests...\n');
  console.log('Make sure to start the server first with: npm run dev\n');
  
  try {
    await testHealthEndpoint();
    console.log('');
    
    await testTenantsEndpointWithoutAuth();
    console.log('');
    
    await test404Endpoint();
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Copy .env to .env and configure your database');
    console.log('2. Run: npm run db:migrate to create the database tables');
    console.log('3. Configure JWT_PUBLIC_KEY with your X.509 certificate or RSA public key in your .env file');
    console.log('4. Test the tenant endpoints with proper JWT tokens');
    
  } catch (error) {
    console.log('❌ Tests failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  runTests();
}

module.exports = { testHealthEndpoint, testTenantsEndpointWithoutAuth, test404Endpoint };