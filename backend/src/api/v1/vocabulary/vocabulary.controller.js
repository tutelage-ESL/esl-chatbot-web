'use strict';

const { Op } = require('sequelize');
const db = require('../../../../models');
const { Vocabulary } = db;
const apiResponse = require('../../../../utils/apiResponse');
const { updateProgressDB } = require('../chat/chat.controller');

// ─── Helper functions ─────────────────────────────────────────────────────────

async function calculateVocabularyStats(userId) {
  try {
    const total = await Vocabulary.count({ where: { userId } });
    const byDifficulty = await Vocabulary.findAll({
      where: { userId },
      attributes: ['difficulty', [db.sequelize.fn('COUNT', '*'), 'count']],
      group: ['difficulty']
    });
    const masteryStats = await Vocabulary.findAll({
      where: { userId },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('masteryLevel')), 'avgMastery'],
        [db.sequelize.fn('COUNT', db.sequelize.literal('CASE WHEN "masteryLevel" >= 80 THEN 1 END')), 'mastered']
      ]
    });
    return {
      total,
      byDifficulty: byDifficulty.reduce((acc, item) => { acc[item.difficulty] = parseInt(item.dataValues.count); return acc; }, {}),
      averageMastery: Math.round(masteryStats[0]?.dataValues.avgMastery || 0),
      masteredWords: parseInt(masteryStats[0]?.dataValues.mastered || 0)
    };
  } catch (error) {
    console.error('Error calculating vocabulary stats:', error);
    return { total: 0, byDifficulty: {}, averageMastery: 0, masteredWords: 0 };
  }
}

async function enhanceVocabularyData(word, definition, example) {
  const categories = {
    academic: ['analyze', 'hypothesis', 'methodology', 'theoretical', 'empirical'],
    business: ['revenue', 'profit', 'strategy', 'marketing', 'investment'],
    daily: ['breakfast', 'shopping', 'weather', 'family', 'friend'],
    technology: ['computer', 'internet', 'software', 'digital', 'online'],
    science: ['experiment', 'research', 'discovery', 'laboratory', 'molecule']
  };
  let category = 'general';
  for (const [cat, words] of Object.entries(categories)) {
    if (words.some(w => word.toLowerCase().includes(w) || w.includes(word.toLowerCase()))) { category = cat; break; }
  }
  let difficulty = 'intermediate';
  if (word.length <= 5) difficulty = 'beginner';
  else if (word.length > 8) difficulty = 'advanced';
  return {
    category, difficulty,
    pronunciation: `/${word.toLowerCase().replace(/([aeiou])/g, '$1ː')}/`,
    example: example || `Example sentence with "${word}".`,
    synonyms: [], antonyms: [],
    partOfSpeech: detectPartOfSpeech(definition)
  };
}

function detectPartOfSpeech(definition) {
  const lowerDef = definition.toLowerCase();
  if (lowerDef.includes('verb') || lowerDef.includes('action')) return 'verb';
  if (lowerDef.includes('adjective') || lowerDef.includes('describes')) return 'adjective';
  if (lowerDef.includes('adverb') || lowerDef.includes('manner')) return 'adverb';
  return 'noun';
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function generateDefinitionOptions(correctDefinition, vocabulary) {
  const options = [correctDefinition];
  options.push(...vocabulary.filter(v => v.definition !== correctDefinition).map(v => v.definition).slice(0, 3));
  while (options.length < 4) options.push(`Alternative definition ${options.length}`);
  return options;
}

async function generateExampleOptions(correctExample, vocabulary) {
  const options = [correctExample];
  options.push(...vocabulary.filter(v => v.example !== correctExample).map(v => v.example).slice(0, 3));
  while (options.length < 4) options.push(`Example sentence ${options.length}`);
  return options;
}

async function generateVocabularyQuiz(vocabulary) {
  const quiz = [];
  for (const word of vocabulary) {
    const questionTypes = ['definition', 'example', 'synonym'];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    let question, correctAnswer, options;
    if (questionType === 'definition') {
      question = `What does "${word.word}" mean?`;
      correctAnswer = word.definition;
      options = await generateDefinitionOptions(word.definition, vocabulary);
    } else if (questionType === 'example') {
      question = `Which sentence correctly uses "${word.word}"?`;
      correctAnswer = word.example;
      options = await generateExampleOptions(word.example, vocabulary);
    } else {
      question = `What does "${word.word}" mean?`;
      correctAnswer = word.definition;
      options = await generateDefinitionOptions(word.definition, vocabulary);
    }
    quiz.push({ id: word.id, word: word.word, question, correctAnswer, options: shuffleArray(options), type: questionType });
  }
  return quiz;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.getVocabulary = async (req, res) => {
  try {
    const userId = req.userId;
    const { difficulty, search, limit = 50 } = req.query;
    let whereClause = { userId };
    if (difficulty && difficulty !== 'all') whereClause.difficulty = difficulty;
    if (search) whereClause.word = { [Op.iLike]: `%${search}%` };
    const vocabulary = await Vocabulary.findAll({ where: whereClause, order: [['createdAt', 'DESC']], limit: parseInt(limit) });
    const stats = await calculateVocabularyStats(userId);
    return apiResponse.success(res, { words: vocabulary, stats });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    return apiResponse.internalError(res, 'Failed to fetch vocabulary');
  }
};

exports.addVocabulary = async (req, res) => {
  try {
    const { word, definition, example, difficulty, category } = req.body;
    const userId = req.userId;
    if (!word || !definition) return apiResponse.validationError(res, 'Word and definition are required');
    const existingWord = await Vocabulary.findOne({ where: { userId, word: word.toLowerCase() } });
    if (existingWord) return apiResponse.conflict(res, 'Word already exists in your vocabulary');
    const enhancedData = await enhanceVocabularyData(word, definition, example);
    const vocabularyItem = await Vocabulary.create({
      userId, word: word.toLowerCase(), definition, example: example || enhancedData.example,
      difficulty: difficulty || enhancedData.difficulty, category: category || enhancedData.category,
      pronunciation: enhancedData.pronunciation, synonyms: enhancedData.synonyms, antonyms: enhancedData.antonyms,
      partOfSpeech: enhancedData.partOfSpeech, masteryLevel: 0, practiceCount: 0, lastPracticed: null
    });
    await updateProgressDB(userId, word, 'vocabulary', `Added new word: ${word}`);
    return apiResponse.created(res, { vocabulary: vocabularyItem }, 'Word added successfully');
  } catch (error) {
    console.error('Error adding vocabulary:', error);
    return apiResponse.internalError(res, 'Failed to add vocabulary');
  }
};

exports.updateVocabulary = async (req, res) => {
  try {
    const { id } = req.params;
    const { definition, example, difficulty, category, masteryLevel } = req.body;
    const userId = req.userId;
    const vocabularyItem = await Vocabulary.findOne({ where: { id, userId } });
    if (!vocabularyItem) return apiResponse.notFound(res, 'Vocabulary item not found');
    await vocabularyItem.update({
      definition: definition || vocabularyItem.definition, example: example || vocabularyItem.example,
      difficulty: difficulty || vocabularyItem.difficulty, category: category || vocabularyItem.category,
      masteryLevel: masteryLevel !== undefined ? masteryLevel : vocabularyItem.masteryLevel
    });
    return apiResponse.success(res, { vocabulary: vocabularyItem });
  } catch (error) {
    console.error('Error updating vocabulary:', error);
    return apiResponse.internalError(res, 'Failed to update vocabulary');
  }
};

exports.deleteVocabulary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const vocabularyItem = await Vocabulary.findOne({ where: { id, userId } });
    if (!vocabularyItem) return apiResponse.notFound(res, 'Vocabulary item not found');
    await vocabularyItem.destroy();
    return apiResponse.success(res, null, 'Vocabulary item deleted');
  } catch (error) {
    console.error('Error deleting vocabulary:', error);
    return apiResponse.internalError(res, 'Failed to delete vocabulary');
  }
};

exports.getPracticeWords = async (req, res) => {
  try {
    const userId = req.userId;
    const { difficulty = 'all', count = 10 } = req.query;
    let whereClause = { userId };
    if (difficulty !== 'all') whereClause.difficulty = difficulty;
    const words = await Vocabulary.findAll({ where: whereClause, order: db.sequelize.literal('RAND()'), limit: parseInt(count) });
    res.json({ words });
  } catch (error) {
    console.error('Error fetching practice words:', error);
    res.status(500).json({ error: 'Failed to fetch practice words' });
  }
};

exports.recordPractice = async (req, res) => {
  try {
    const { wordId, correct, timeSpent } = req.body;
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const vocab = await Vocabulary.findOne({ where: { id: wordId, userId } });
    if (!vocab) return res.status(404).json({ error: 'Vocabulary item not found' });
    const masteryDelta = correct ? 10 : -5;
    const newMastery = Math.max(0, Math.min(100, (vocab.masteryLevel || 0) + masteryDelta));
    await vocab.update({ masteryLevel: newMastery, practiceCount: (vocab.practiceCount || 0) + 1, lastPracticed: new Date() });
    res.json({ success: true, masteryLevel: newMastery });
  } catch (error) {
    console.error('Error recording practice:', error);
    res.status(500).json({ error: 'Failed to record practice' });
  }
};

exports.getQuiz = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const { difficulty = 'all', count = 10 } = req.query;
    let whereClause = { userId };
    if (difficulty !== 'all') whereClause.difficulty = difficulty;
    const vocabulary = await Vocabulary.findAll({ where: whereClause, order: db.sequelize.literal('RAND()'), limit: parseInt(count) });
    if (vocabulary.length === 0) return res.json({ quiz: [], message: 'No vocabulary words found for quiz' });
    const quiz = await generateVocabularyQuiz(vocabulary);
    res.json({ questions: quiz });
  } catch (error) {
    console.error('Error generating vocabulary quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
};
