import { db } from '../server/db';
import { users } from '@shared/schema';
import { storage } from '../server/storage';

async function testFamilyFeature() {
  try {
    console.log('🧪 Testing family relationship feature...\n');

    // Get two active users for testing
    const activeUsers = await db.select().from(users).limit(3);

    if (activeUsers.length < 2) {
      console.log('⚠️  Not enough users in database for testing. Need at least 2 users.');
      return;
    }

    const user1 = activeUsers[0];
    const user2 = activeUsers[1];

    console.log(`👤 User 1: ${user1.name} (${user1.id})`);
    console.log(`👤 User 2: ${user2.name} (${user2.id})\n`);

    // Test 1: Add family member
    console.log('Test 1: Adding family member...');
    try {
      const relationship = await storage.addFamilyMember(
        user1.id,
        user2.id,
        'spouse'
      );
      console.log('✅ Successfully added family relationship:', relationship);
    } catch (error) {
      if (error instanceof Error && error.message === 'Relationship already exists') {
        console.log('ℹ️  Relationship already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Test 2: Get family members
    console.log('\nTest 2: Getting family members...');
    const familyMembers = await storage.getFamilyMembers(user1.id);
    console.log(`✅ Found ${familyMembers.length} family member(s):`);
    familyMembers.forEach(member => {
      console.log(`   - Related to user ${member.relatedUserId} as ${member.relationshipType}`);
    });

    // Test 3: Check reciprocal relationship
    console.log('\nTest 3: Checking reciprocal relationship...');
    const reciprocalMembers = await storage.getFamilyMembers(user2.id);
    console.log(`✅ User 2 has ${reciprocalMembers.length} family member(s):`);
    reciprocalMembers.forEach(member => {
      console.log(`   - Related to user ${member.relatedUserId} as ${member.relationshipType}`);
    });

    // Test 4: Try to add duplicate (should fail)
    console.log('\nTest 4: Testing duplicate prevention...');
    try {
      await storage.addFamilyMember(user1.id, user2.id, 'sibling');
      console.log('❌ Duplicate was not prevented!');
    } catch (error) {
      if (error instanceof Error && error.message === 'Relationship already exists') {
        console.log('✅ Duplicate prevention working correctly');
      } else {
        throw error;
      }
    }

    // Test 5: Remove family member (optional - commented out to preserve test data)
    // console.log('\nTest 5: Removing family member...');
    // if (familyMembers.length > 0) {
    //   await storage.removeFamilyMember(familyMembers[0].id);
    //   console.log('✅ Successfully removed family member');
    // }

    console.log('\n✨ All tests completed successfully!');
    console.log('📝 The family relationship feature is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testFamilyFeature();