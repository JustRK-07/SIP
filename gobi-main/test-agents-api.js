const axios = require('axios');

async function testAgentsAPI() {
  try {
    // First login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'qateam@ytel.com',
      password: 'password123'
    });

    const { accessToken } = loginResponse.data;
    console.log('✓ Login successful, got token');

    // Test agents endpoint
    console.log('\n2. Testing /api/agents endpoint...');
    try {
      const agentsResponse = await axios.get('http://localhost:3000/api/agents', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('✓ Agents API response:', JSON.stringify(agentsResponse.data, null, 2));
    } catch (error) {
      console.error('✗ Agents API error:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAgentsAPI();