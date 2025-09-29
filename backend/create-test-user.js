const { User } = require('./models');
const bcrypt = require('bcryptjs'); // Using bcryptjs instead of bcrypt

async function createTestUser() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Create user with standard tier (20 minutes = 1200 seconds)
    // Set usage to 1140 seconds (19 minutes) so they have 60 seconds (1 minute) left
    const user = await User.create({
      username: 'testuser_1min',
      email: 'testuser1min@example.com',
      password: hashedPassword,
      subscriptionTier: 'standard',
      monthlyTtsUsage: 1140, // 19 minutes used, 1 minute remaining
      lastUsageReset: new Date()
    });
    
    console.log('✅ Test user created successfully:');
    console.log('📧 Email: testuser1min@example.com');
    console.log('🔒 Password: test123');
    console.log('💳 Subscription: Standard (20 minutes total)');
    console.log('⏱️  Usage: 19 minutes used, 1 minute remaining');
    console.log('🕐 Remaining seconds:', user.getRemainingUsage());
    
    // Verify the user was created correctly
    const tierLimits = user.getTierLimits();
    const remainingUsage = user.getRemainingUsage();
    
    console.log('\n📊 Verification:');
    console.log(`Total limit: ${tierLimits} seconds (${Math.floor(tierLimits / 60)} minutes)`);
    console.log(`Current usage: ${user.monthlyTtsUsage} seconds (${Math.floor(user.monthlyTtsUsage / 60)} minutes)`);
    console.log(`Remaining: ${remainingUsage} seconds (${Math.floor(remainingUsage / 60)} minutes ${remainingUsage % 60} seconds)`);
    
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('⚠️  User already exists. Updating existing user...');
      
      try {
        const existingUser = await User.findOne({ where: { email: 'testuser1min@example.com' } });
        if (existingUser) {
          existingUser.monthlyTtsUsage = 1140; // Set to 19 minutes used
          existingUser.lastUsageReset = new Date();
          await existingUser.save();
          
          console.log('✅ Existing user updated successfully:');
          console.log('📧 Email: testuser1min@example.com');
          console.log('🔒 Password: test123');
          console.log('⏱️  Usage reset to: 19 minutes used, 1 minute remaining');
          console.log('🕐 Remaining seconds:', existingUser.getRemainingUsage());
        }
      } catch (updateError) {
        console.error('❌ Error updating existing user:', updateError.message);
      }
    } else {
      console.error('❌ Error creating test user:', error.message);
    }
  }
  
  process.exit(0);
}

createTestUser();