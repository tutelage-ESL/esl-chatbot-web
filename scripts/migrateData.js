const fs = require('fs');
const path = require('path');
const { User, Vocabulary, Goal, Interaction, UserMetrics } = require('../models');

async function migrateData() {
  try {
    console.log('Starting data migration from JSON files to database...');
    
    // Migrate vocabulary data
    await migrateVocabulary();
    
    // Migrate goals data
    await migrateGoals();
    
    // Migrate progress/interactions data
    await migrateProgress();
    
    console.log('Data migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

async function migrateVocabulary() {
  const vocabularyPath = path.join(__dirname, '..', 'data', 'vocabulary.json');
  
  if (!fs.existsSync(vocabularyPath)) {
    console.log('No vocabulary.json file found, skipping vocabulary migration.');
    return;
  }
  
  const vocabularyData = JSON.parse(fs.readFileSync(vocabularyPath, 'utf8'));
  
  for (const [userId, userData] of Object.entries(vocabularyData)) {
    if (userData.words && Array.isArray(userData.words)) {
      for (const word of userData.words) {
        try {
          await Vocabulary.findOrCreate({
            where: {
              userId: parseInt(userId),
              word: word.word
            },
            defaults: {
              userId: parseInt(userId),
              word: word.word,
              definition: word.definition || '',
              example: word.example || '',
              difficulty: word.difficulty || 'medium',
              reviewCount: word.reviewCount || 0,
              mastered: word.mastered || false,
              dateAdded: word.dateAdded ? new Date(word.dateAdded) : new Date()
            }
          });
        } catch (error) {
          console.error(`Error migrating vocabulary word "${word.word}" for user ${userId}:`, error.message);
        }
      }
    }
  }
  
  console.log('Vocabulary migration completed.');
}

async function migrateGoals() {
  const goalsPath = path.join(__dirname, '..', 'data', 'goals.json');
  
  if (!fs.existsSync(goalsPath)) {
    console.log('No goals.json file found, skipping goals migration.');
    return;
  }
  
  const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf8'));
  
  for (const [userId, userData] of Object.entries(goalsData)) {
    // Migrate active goals
    if (userData.activeGoals && Array.isArray(userData.activeGoals)) {
      for (const goal of userData.activeGoals) {
        try {
          await Goal.findOrCreate({
            where: {
              userId: parseInt(userId),
              description: goal.description,
              dateCreated: goal.dateCreated ? new Date(goal.dateCreated) : new Date()
            },
            defaults: {
              userId: parseInt(userId),
              type: goal.type || 'custom',
              description: goal.description || '',
              target: goal.target || 1,
              current: goal.current || 0,
              deadline: goal.deadline ? new Date(goal.deadline) : null,
              completed: goal.completed || false,
              dateCreated: goal.dateCreated ? new Date(goal.dateCreated) : new Date()
            }
          });
        } catch (error) {
          console.error(`Error migrating active goal for user ${userId}:`, error.message);
        }
      }
    }
    
    // Migrate completed goals
    if (userData.completedGoals && Array.isArray(userData.completedGoals)) {
      for (const goal of userData.completedGoals) {
        try {
          await Goal.findOrCreate({
            where: {
              userId: parseInt(userId),
              description: goal.description,
              dateCreated: goal.dateCreated ? new Date(goal.dateCreated) : new Date()
            },
            defaults: {
              userId: parseInt(userId),
              type: goal.type || 'custom',
              description: goal.description || '',
              target: goal.target || 1,
              current: goal.target || 1,
              deadline: goal.deadline ? new Date(goal.deadline) : null,
              completed: true,
              dateCreated: goal.dateCreated ? new Date(goal.dateCreated) : new Date(),
              dateCompleted: goal.dateCompleted ? new Date(goal.dateCompleted) : new Date()
            }
          });
        } catch (error) {
          console.error(`Error migrating completed goal for user ${userId}:`, error.message);
        }
      }
    }
  }
  
  console.log('Goals migration completed.');
}

async function migrateProgress() {
  const progressPath = path.join(__dirname, '..', 'data', 'progress.json');
  
  if (!fs.existsSync(progressPath)) {
    console.log('No progress.json file found, skipping progress migration.');
    return;
  }
  
  const progressData = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  
  for (const [userId, userData] of Object.entries(progressData)) {
    try {
      // Migrate interactions
      if (userData.interactions && Array.isArray(userData.interactions)) {
        for (const interaction of userData.interactions) {
          await Interaction.findOrCreate({
            where: {
              userId: parseInt(userId),
              timestamp: new Date(interaction.timestamp),
              type: interaction.type || 'text'
            },
            defaults: {
              userId: parseInt(userId),
              type: interaction.type || 'text',
              message: interaction.message || null,
              responsePreview: interaction.responsePreview || null,
              timestamp: new Date(interaction.timestamp),
              metadata: interaction.metadata || null,
              score: interaction.score || null
            }
          });
        }
      }
      
      // Migrate user metrics
      if (userData.metrics) {
        const metrics = userData.metrics;
        const skillMetrics = metrics.skillMetrics || {};
        
        await UserMetrics.findOrCreate({
          where: { userId: parseInt(userId) },
          defaults: {
            userId: parseInt(userId),
            totalInteractions: metrics.totalInteractions || 0,
            textInteractions: metrics.textInteractions || 0,
            voiceInteractions: metrics.voiceInteractions || 0,
            pronunciationInteractions: 0,
            vocabularyInteractions: 0,
            commandsUsed: metrics.commandsUsed || 0,
            lessonsCompleted: metrics.lessonsCompleted || 0,
            practiceSessionsCompleted: metrics.practiceSessionsCompleted || 0,
            totalWordsTyped: metrics.totalWordsTyped || 0,
            chatMessageCount: metrics.chatMessageCount || 0,
            estimatedLevel: metrics.estimatedLevel || null,
            grammarSkill: skillMetrics.grammar || 0,
            vocabularySkill: skillMetrics.vocabulary || 0,
            readingSkill: skillMetrics.reading || 0,
            writingSkill: skillMetrics.writing || 0,
            speakingSkill: skillMetrics.speaking || 0,
            listeningSkill: skillMetrics.listening || 0,
            totalStudyTimeMinutes: 0,
            currentStreak: 0,
            longestStreak: 0,
            overallProgress: 0,
            lastUpdated: metrics.lastUpdated ? new Date(metrics.lastUpdated) : new Date()
          }
        });
      }
    } catch (error) {
      console.error(`Error migrating progress data for user ${userId}:`, error.message);
    }
  }
  
  console.log('Progress migration completed.');
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('Migration script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateData };