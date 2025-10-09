import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testAPIs() {
  console.log('🔍 Testing production APIs...\n');

  try {
    // 1. Test health endpoint
    console.log('1. Testing /health endpoint...');
    const healthRes = await fetch(`${API_URL}/health`);
    const healthData = await healthRes.json();
    console.log(`   Status: ${healthRes.status}`);
    console.log(`   Response:`, healthData);

    // 2. Test login
    console.log('\n2. Testing login...');
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
    console.log(`   User:`, loginData.user.name);
    const token = loginData.token;

    // 3. Test /api/users with authentication
    console.log('\n3. Testing /api/users endpoint...');
    const usersRes = await fetch(`${API_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${usersRes.status}`);

    if (usersRes.ok) {
      const usersData = await usersRes.json();
      console.log(`   ✅ Users retrieved: ${usersData.length} users`);
      if (usersData.length > 0) {
        console.log('   Sample users:');
        usersData.slice(0, 3).forEach((user: any) => {
          console.log(`     - ${user.name} (${user.email}) - ${user.role}`);
        });
      }
    } else {
      const error = await usersRes.text();
      console.log(`   ❌ Failed to get users: ${error}`);
    }

    // 4. Test /api/questionnaires
    console.log('\n4. Testing /api/questionnaires endpoint...');
    const questRes = await fetch(`${API_URL}/api/questionnaires`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${questRes.status}`);

    if (questRes.ok) {
      const questData = await questRes.json();
      console.log(`   ✅ Questionnaires retrieved: ${questData.length} questionnaires`);
    } else {
      const error = await questRes.text();
      console.log(`   ❌ Failed to get questionnaires: ${error}`);
    }

    // 5. Test /api/schedules
    console.log('\n5. Testing /api/schedules endpoint...');
    const schedulesRes = await fetch(`${API_URL}/api/schedules`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${schedulesRes.status}`);

    if (schedulesRes.ok) {
      const schedulesData = await schedulesRes.json();
      console.log(`   ✅ Schedules retrieved: ${schedulesData.length} schedules`);
    } else {
      const error = await schedulesRes.text();
      console.log(`   ❌ Failed to get schedules: ${error}`);
    }

    console.log('\n✅ API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPIs();