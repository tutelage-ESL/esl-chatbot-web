const { User, Vocabulary } = require('../models');
const bcrypt = require('bcryptjs');

async function createTestData() {
  try {
    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await User.findOrCreate({
      where: { email: 'test@example.com' },
      defaults: {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword
      }
    });

    const userId = testUser[0].id;
    console.log('Test user created/found with ID:', userId);

    // Create some test vocabulary words
    const testWords = [
      {
        word: 'hello',
        definition: 'A greeting used when meeting someone',
        example: 'Hello, how are you today?',
        difficulty: 'beginner',
        userId: userId
      },
      {
        word: 'beautiful',
        definition: 'Pleasing to the senses or mind aesthetically',
        example: 'The sunset was beautiful tonight.',
        difficulty: 'intermediate',
        userId: userId
      },
      {
        word: 'magnificent',
        definition: 'Extremely beautiful, elaborate, or impressive',
        example: 'The cathedral was a magnificent sight.',
        difficulty: 'advanced',
        userId: userId
      },
      {
        word: 'serendipity',
        definition: 'The occurrence of events by chance in a happy way',
        example: 'Meeting my best friend was pure serendipity.',
        difficulty: 'advanced',
        userId: userId
      }
    ];

    for (const wordData of testWords) {
      await Vocabulary.findOrCreate({
        where: { word: wordData.word, userId: userId },
        defaults: wordData
      });
    }

    console.log('Test vocabulary words created successfully!');
    console.log('You can now login with:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

if (require.main === module) {
  createTestData().then(() => {
    process.exit(0);
  });
}

module.exports = createTestData;