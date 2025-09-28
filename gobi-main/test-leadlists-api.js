const axios = require('axios');

async function testLeadListsAPI() {
  try {
    // First login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'qateam@ytel.com',
      password: 'password123'
    });

    const { accessToken } = loginResponse.data;
    console.log('✓ Login successful, got token');

    // Test lead lists endpoints
    console.log('\n2. Testing GET /api/lead-lists...');
    try {
      const listResponse = await axios.get('http://localhost:3000/api/lead-lists', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('✓ Lead Lists API response:', JSON.stringify(listResponse.data, null, 2));

      // Test creating a new lead list
      console.log('\n3. Testing POST /api/lead-lists...');
      const createResponse = await axios.post('http://localhost:3000/api/lead-lists',
        {
          name: 'Test Lead List',
          description: 'Testing lead list API'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✓ Lead list created:', JSON.stringify(createResponse.data, null, 2));

    } catch (error) {
      console.error('✗ Lead Lists API error:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testLeadListsAPI();