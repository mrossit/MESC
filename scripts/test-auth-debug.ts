import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:5000';

async function testAuthDebug() {
  console.log('🔍 Testing auth with debug info...\n');

  try {
    // 1. Test login and get token
    console.log('1. Testing login...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rossit@icloud.com',
        password: '123Pegou'
      })
    });

    if (!loginRes.ok) {
      const error = await loginRes.text();
      console.log(`   ❌ Login failed (${loginRes.status}): ${error}`);
      return;
    }

    const loginData = await loginRes.json();
    console.log(`   ✅ Login successful`);
    console.log(`   User from login response:`, {
      id: loginData.user.id,
      name: loginData.user.name,
      email: loginData.user.email,
      role: loginData.user.role,
      status: loginData.user.status
    });

    const token = loginData.token;

    // 2. Decode the JWT token
    console.log('\n2. Decoding JWT token...');
    const decoded = jwt.decode(token) as any;
    console.log('   Token payload:', {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    });

    // 3. Test a protected endpoint with detailed error
    console.log('\n3. Testing /api/users endpoint...');
    const usersRes = await fetch(`${API_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${usersRes.status}`);
    const responseText = await usersRes.text();
    console.log(`   Response: ${responseText}`);

    // 4. Test /api/auth/user endpoint
    console.log('\n4. Testing /api/auth/user endpoint...');
    const meRes = await fetch(`${API_URL}/api/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${meRes.status}`);
    if (meRes.ok) {
      const userData = await meRes.json();
      console.log('   Current user from /api/auth/user:', {
        id: userData.id,
        email: userData.email,
        status: userData.status
      });
    } else {
      console.log(`   Response: ${await meRes.text()}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthDebug();