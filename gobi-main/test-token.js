const axios = require('axios');

async function testAuth() {
  try {
    // 1. Login
    console.log('1. Testing Login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'qateam@ytel.com',
      password: 'password123'
    });

    const { accessToken } = loginResponse.data;
    console.log('✓ Login successful');
    console.log('Token length:', accessToken.length);

    // 2. Test profile with token
    console.log('\n2. Testing Profile with token...');
    try {
      const profileResponse = await axios.get('http://localhost:3000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('✓ Profile retrieved:', profileResponse.data);
    } catch (error) {
      console.log('✗ Profile error:', error.response?.data || error.message);
    }

    // 3. Test validation endpoint
    console.log('\n3. Testing Token Validation...');
    try {
      const validateResponse = await axios.get('http://localhost:3000/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('✓ Token validated:', validateResponse.data);
    } catch (error) {
      console.log('✗ Validation error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Wait for server to be ready
setTimeout(testAuth, 1000);