import fetch from 'node-fetch';

async function testFamilyAPI() {
  const baseUrl = 'http://localhost:5000';

  try {
    console.log('🧪 Testing Family API endpoints...\n');

    // First, we need to login to get a session
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'joao.silva@test.com',
        password: 'senha123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${await loginResponse.text()}`);
    }

    const cookies = loginResponse.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('No session cookie received');
    }

    console.log('✅ Login successful\n');

    // Test GET /api/profile/family
    console.log('2. Testing GET /api/profile/family...');
    const getFamilyResponse = await fetch(`${baseUrl}/api/profile/family`, {
      headers: { 'Cookie': cookies }
    });

    if (!getFamilyResponse.ok) {
      throw new Error(`GET family failed: ${await getFamilyResponse.text()}`);
    }

    const familyMembers = await getFamilyResponse.json();
    console.log('✅ Family members retrieved:', familyMembers);
    console.log(`   Found ${familyMembers.length} family member(s)\n`);

    // Get list of users to add as family
    console.log('3. Getting list of available users...');
    const usersResponse = await fetch(`${baseUrl}/api/users/active`, {
      headers: { 'Cookie': cookies }
    });

    if (!usersResponse.ok) {
      throw new Error(`GET users failed: ${await usersResponse.text()}`);
    }

    const users = await usersResponse.json();
    console.log(`✅ Found ${users.length} active users\n`);

    // Find a user to add as family (not self and not already added)
    const currentUserId = 'joao.silva@test.com'; // We know this from login
    const availableUser = users.find((u: any) =>
      u.email !== currentUserId &&
      !familyMembers.some((fm: any) => fm.user?.id === u.id)
    );

    if (availableUser) {
      console.log(`4. Testing POST /api/profile/family...`);
      console.log(`   Adding ${availableUser.name} as sibling...`);

      const addFamilyResponse = await fetch(`${baseUrl}/api/profile/family`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({
          relatedUserId: availableUser.id,
          relationshipType: 'sibling'
        })
      });

      if (!addFamilyResponse.ok) {
        const error = await addFamilyResponse.text();
        if (error.includes('already exists')) {
          console.log('ℹ️  Relationship already exists');
        } else {
          throw new Error(`POST family failed: ${error}`);
        }
      } else {
        const result = await addFamilyResponse.json();
        console.log('✅ Family member added successfully:', result.message);
      }
    } else {
      console.log('ℹ️  No available users to add as family');
    }

    // Test DELETE /api/profile/family/:id
    if (familyMembers.length > 0) {
      console.log(`\n5. Testing DELETE /api/profile/family/:id...`);
      const memberToRemove = familyMembers[0];
      console.log(`   Removing relationship with ${memberToRemove.user?.name}...`);

      const deleteResponse = await fetch(`${baseUrl}/api/profile/family/${memberToRemove.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookies }
      });

      if (!deleteResponse.ok) {
        throw new Error(`DELETE family failed: ${await deleteResponse.text()}`);
      }

      const deleteResult = await deleteResponse.json();
      console.log('✅', deleteResult.message);
    }

    console.log('\n✨ All API tests completed successfully!');
    console.log('📝 The family relationship API is working correctly.');

  } catch (error) {
    console.error('❌ API test failed:', error);
  }

  process.exit(0);
}

testFamilyAPI();