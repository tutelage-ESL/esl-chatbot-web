import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("\n┌─────────────────────────────────────────┐");
  console.log("│           DATABASE SEEDING               │");
  console.log("└─────────────────────────────────────────┘\n");

  // Clear existing data (in reverse dependency order)
  console.log("🗑️  Clearing existing data...");
  await prisma.progress.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.vocabulary.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.enrollmentRequest.deleteMany();
  await prisma.userMetrics.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.learnerProfile.deleteMany();
  await prisma.classStudent.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Existing data cleared\n");

  // Hash password
  const hashedPassword = await bcryptjs.hash("password123", 12);
  console.log("🔐 Password hashed (test password: password123)\n");

  // ─── Create Admin ────────────────────────────────────
  console.log("👤 Creating Admin user...");
  const admin = await prisma.user.create({
    data: {
      username: "admin_main",
      displayName: "Platform Admin",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`   ✅ Admin created: ${admin.username} (id: ${admin.id})`);

  // ─── Create Tutor ────────────────────────────────────
  console.log("👤 Creating Tutor user...");
  const tutor = await prisma.user.create({
    data: {
      username: "tutor_sarah",
      displayName: "Sarah Johnson",
      password: hashedPassword,
      role: "TUTOR",
      isActive: true,
    },
  });
  console.log(`   ✅ Tutor created: ${tutor.username}`);

  // ─── Create Students ─────────────────────────────────
  console.log("👤 Creating Student users...");
  const student1 = await prisma.user.create({
    data: {
      username: "student_ali",
      displayName: "Ali Hassan",
      password: hashedPassword,
      role: "STUDENT",
      isActive: true,
    },
  });
  console.log(`   ✅ Student 1 created: ${student1.username}`);

  const student2 = await prisma.user.create({
    data: {
      username: "student_yuki",
      displayName: "Yuki Tanaka",
      password: hashedPassword,
      role: "STUDENT",
      isActive: true,
    },
  });
  console.log(`   ✅ Student 2 created: ${student2.username}\n`);

  // ─── Create Classes ─────────────────────────────────
  console.log("🏫 Creating Classes...");
  const sarahClass = await prisma.class.create({
    data: {
      className: "Sarah's ESL Class",
      classCode: "SARAH-2024",
      classCategory: "General English",
      classStatus: "ACTIVE",
    },
  });
  console.log(`   ✅ Class created: ${sarahClass.className} (code: ${sarahClass.classCode})\n`);

  // ─── Enroll Students in Class ───────────────────────
  console.log("📝 Enrolling students in class...");
  await prisma.classStudent.create({
    data: {
      classId: sarahClass.id,
      studentId: student1.id,
    },
  });
  await prisma.classStudent.create({
    data: {
      classId: sarahClass.id,
      studentId: student2.id,
    },
  });
  console.log("   ✅ 2 students enrolled in Sarah's class\n");

  // ─── Learner Profiles ─────────────────────────────────
  console.log("📋 Creating Learner Profiles...");
  await prisma.learnerProfile.create({
    data: {
      userId: student1.id,
      currentLevel: "B1",
      targetLevel: "B2",
      learningPurpose: "Career advancement in tech industry",
      topicsOfInterest: ["technology", "business", "travel"],
      aiPersonality: "friendly",
      voiceSpeed: 0.9,
      weeklyGoalMinutes: 120,
      timezone: "Asia/Baghdad",
    },
  });
  await prisma.learnerProfile.create({
    data: {
      userId: student2.id,
      currentLevel: "A2",
      targetLevel: "B1",
      learningPurpose: "Study abroad preparation",
      topicsOfInterest: ["culture", "food", "daily life"],
      aiPersonality: "patient",
      voiceSpeed: 0.8,
      weeklyGoalMinutes: 90,
      timezone: "Asia/Tokyo",
    },
  });
  console.log("   ✅ 2 learner profiles created\n");

  // ─── Subscriptions ────────────────────────────────────
  console.log("💳 Creating Subscriptions...");
  await prisma.subscription.create({
    data: {
      userId: student1.id,
      plan: "PREMIUM",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.subscription.create({
    data: {
      userId: student2.id,
      plan: "FREE",
      status: "ACTIVE",
    },
  });
  console.log("   ✅ 2 subscriptions created (1 PREMIUM, 1 FREE)\n");

  // ─── User Metrics ─────────────────────────────────────
  console.log("📊 Creating User Metrics...");
  await prisma.userMetrics.create({
    data: {
      userId: student1.id,
      totalStudyTimeMinutes: 480,
      totalWordsTyped: 3200,
      lessonsCompleted: 12,
      currentStreak: 5,
      longestStreak: 8,
      lastStudyDate: new Date(),
      estimatedLevel: "B1",
      grammarSkill: 65,
      vocabularySkill: 70,
      readingSkill: 72,
      writingSkill: 60,
      speakingSkill: 55,
      listeningSkill: 68,
    },
  });
  await prisma.userMetrics.create({
    data: {
      userId: student2.id,
      totalStudyTimeMinutes: 180,
      totalWordsTyped: 1100,
      lessonsCompleted: 5,
      currentStreak: 2,
      longestStreak: 4,
      lastStudyDate: new Date(),
      estimatedLevel: "A2",
      grammarSkill: 40,
      vocabularySkill: 45,
      readingSkill: 50,
      writingSkill: 35,
      speakingSkill: 30,
      listeningSkill: 42,
    },
  });
  console.log("   ✅ 2 user metrics records created\n");

  // ─── Enrollment Request ───────────────────────────────
  console.log("📨 Creating Enrollment Request...");
  await prisma.enrollmentRequest.create({
    data: {
      studentId: student1.id,
      tutorId: tutor.id,
      classCode: "SARAH-2024",
      status: "ACCEPTED",
      note: "I want to improve my English for work",
      resolvedAt: new Date(),
    },
  });
  await prisma.enrollmentRequest.create({
    data: {
      studentId: student2.id,
      tutorId: tutor.id,
      classCode: "SARAH-2024",
      status: "ACCEPTED",
      note: "Preparing for university entrance",
      resolvedAt: new Date(),
    },
  });
  console.log("   ✅ 2 enrollment requests created (both ACCEPTED)\n");

  // ─── Conversation Sessions & Messages ─────────────────
  console.log("💬 Creating Conversation Sessions & Messages...");
  const session1 = await prisma.conversationSession.create({
    data: {
      userId: student1.id,
      mode: "TEXT",
      topic: "Ordering food at a restaurant",
      summary: "Practiced restaurant vocabulary and polite ordering phrases",
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      durationSeconds: 1800,
      messageCount: 6,
      averageScore: 78.5,
    },
  });

  const session1Messages = [
    { role: "USER" as const, content: "Hi! I want to practice ordering food at a restaurant.", wordCount: 11 },
    { role: "ASSISTANT" as const, content: "Great choice! Let's roleplay. I'll be the waiter. Welcome to The Green Garden! Here's your menu. What would you like to start with?", wordCount: 24 },
    { role: "USER" as const, content: "I would like to have the chicken soup for starter please.", wordCount: 11 },
    { role: "ASSISTANT" as const, content: "Excellent choice! And for your main course? We have a special today — grilled salmon with vegetables.", wordCount: 17 },
    { role: "USER" as const, content: "That sounds good. I will take the salmon. Can I also get a glass of water?", wordCount: 16 },
    { role: "ASSISTANT" as const, content: "Of course! So that's one chicken soup, the grilled salmon special, and a glass of water. Great ordering! Your grammar was very natural.", wordCount: 23 },
  ];

  for (const msg of session1Messages) {
    await prisma.message.create({
      data: {
        userId: student1.id,
        sessionId: session1.id,
        role: msg.role,
        content: msg.content,
        wordCount: msg.wordCount,
        inputMode: "text",
        aiEvaluation: msg.role === "USER" ? { grammar: 85, fluency: 80, vocabulary: 75 } : undefined,
      },
    });
  }
  console.log(`   ✅ Session 1: "${session1.topic}" (${session1Messages.length} messages)`);

  const session2 = await prisma.conversationSession.create({
    data: {
      userId: student2.id,
      mode: "TEXT",
      topic: "Introducing yourself",
      summary: "Practiced self-introduction and basic personal information sharing",
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      durationSeconds: 1200,
      messageCount: 4,
      averageScore: 65.0,
    },
  });

  const session2Messages = [
    { role: "USER" as const, content: "Hello, I want practice introduce myself.", wordCount: 7 },
    { role: "ASSISTANT" as const, content: "Hello Yuki! Let's practice. Try saying: 'I would like to practice introducing myself.' Now, go ahead — tell me about yourself!", wordCount: 21 },
    { role: "USER" as const, content: "My name is Yuki. I am from Japan. I am 22 years old. I like cooking and reading books.", wordCount: 18 },
    { role: "ASSISTANT" as const, content: "That was great, Yuki! Very clear and well-structured. To make it even more natural, you could say: 'I'm Yuki from Japan. I'm 22 and I enjoy cooking and reading.'", wordCount: 30 },
  ];

  for (const msg of session2Messages) {
    await prisma.message.create({
      data: {
        userId: student2.id,
        sessionId: session2.id,
        role: msg.role,
        content: msg.content,
        wordCount: msg.wordCount,
        inputMode: "text",
        aiEvaluation: msg.role === "USER" ? { grammar: 60, fluency: 65, vocabulary: 55 } : undefined,
      },
    });
  }
  console.log(`   ✅ Session 2: "${session2.topic}" (${session2Messages.length} messages)\n`);

  // ─── Vocabulary ───────────────────────────────────────
  console.log("📖 Creating Vocabulary items...");
  const vocabItems = [
    { userId: student1.id, word: "accomplish", definition: "To succeed in doing something", pronunciation: "/əˈkɑːmplɪʃ/", example: "She accomplished all her goals this year.", partOfSpeech: "verb", difficulty: 3, category: "academic", masteryLevel: 3, reviewCount: 5, correctCount: 4, incorrectCount: 1 },
    { userId: student1.id, word: "reluctant", definition: "Unwilling and hesitant", pronunciation: "/rɪˈlʌktənt/", example: "He was reluctant to share his opinion.", partOfSpeech: "adjective", difficulty: 3, category: "academic", masteryLevel: 2, reviewCount: 3, correctCount: 2, incorrectCount: 1 },
    { userId: student1.id, word: "appetizer", definition: "A small dish served before the main course", pronunciation: "/ˈæpɪtaɪzər/", example: "We ordered soup as an appetizer.", partOfSpeech: "noun", difficulty: 2, category: "food", masteryLevel: 4, reviewCount: 6, correctCount: 6, incorrectCount: 0 },
    { userId: student2.id, word: "introduce", definition: "To present someone or yourself to others", pronunciation: "/ˌɪntrəˈdjuːs/", example: "Let me introduce myself.", partOfSpeech: "verb", difficulty: 1, category: "social", masteryLevel: 3, reviewCount: 4, correctCount: 3, incorrectCount: 1 },
    { userId: student2.id, word: "hobby", definition: "An activity done for enjoyment in spare time", pronunciation: "/ˈhɑːbi/", example: "My hobby is reading books.", partOfSpeech: "noun", difficulty: 1, category: "daily life", masteryLevel: 4, reviewCount: 5, correctCount: 5, incorrectCount: 0 },
    { userId: student2.id, word: "delicious", definition: "Highly pleasant to taste", pronunciation: "/dɪˈlɪʃəs/", example: "The sushi was delicious.", partOfSpeech: "adjective", difficulty: 1, category: "food", masteryLevel: 2, reviewCount: 3, correctCount: 2, incorrectCount: 1 },
  ];

  for (const item of vocabItems) {
    await prisma.vocabulary.create({ data: item });
  }
  console.log(`   ✅ ${vocabItems.length} vocabulary items created\n`);

  // ─── Goals ────────────────────────────────────────────
  console.log("🎯 Creating Goals...");
  await prisma.goal.create({
    data: {
      userId: student1.id,
      assignedByTutorId: tutor.id,
      type: "vocabulary",
      description: "Learn 50 new business English words",
      target: 50,
      timeframe: "monthly",
      difficulty: "medium",
      status: "ACTIVE",
      progress: 30,
      milestones: [
        { at: 10, label: "Getting started" },
        { at: 25, label: "Quarter way" },
        { at: 50, label: "Goal reached!" },
      ],
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.goal.create({
    data: {
      userId: student1.id,
      type: "study_time",
      description: "Study English for 30 minutes every day",
      target: 30,
      timeframe: "daily",
      difficulty: "easy",
      status: "ACTIVE",
      progress: 60,
    },
  });
  await prisma.goal.create({
    data: {
      userId: student2.id,
      assignedByTutorId: tutor.id,
      type: "conversation",
      description: "Complete 10 conversation sessions",
      target: 10,
      timeframe: "monthly",
      difficulty: "medium",
      status: "ACTIVE",
      progress: 10,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("   ✅ 3 goals created (2 for Ali, 1 for Yuki)\n");

  // ─── Progress Snapshots ───────────────────────────────
  console.log("📈 Creating Progress snapshots...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const progressEntries = [
    { userId: student1.id, date: twoDaysAgo, studyMinutes: 45, messagesCount: 12, wordsTyped: 320, vocabularyPracticed: 8, goalsAdvanced: 1, pronunciationScore: 72.0, skillSnapshot: { grammar: 62, vocabulary: 67, reading: 70, writing: 58, speaking: 52, listening: 65 } },
    { userId: student1.id, date: yesterday, studyMinutes: 60, messagesCount: 18, wordsTyped: 480, vocabularyPracticed: 10, goalsAdvanced: 2, pronunciationScore: 75.0, skillSnapshot: { grammar: 64, vocabulary: 69, reading: 71, writing: 59, speaking: 54, listening: 67 } },
    { userId: student1.id, date: today, studyMinutes: 30, messagesCount: 6, wordsTyped: 180, vocabularyPracticed: 5, goalsAdvanced: 1, pronunciationScore: 78.0, skillSnapshot: { grammar: 65, vocabulary: 70, reading: 72, writing: 60, speaking: 55, listening: 68 } },
    { userId: student2.id, date: yesterday, studyMinutes: 25, messagesCount: 8, wordsTyped: 150, vocabularyPracticed: 4, goalsAdvanced: 1, pronunciationScore: 60.0, skillSnapshot: { grammar: 38, vocabulary: 43, reading: 48, writing: 33, speaking: 28, listening: 40 } },
    { userId: student2.id, date: today, studyMinutes: 20, messagesCount: 4, wordsTyped: 110, vocabularyPracticed: 3, goalsAdvanced: 0, pronunciationScore: 62.0, skillSnapshot: { grammar: 40, vocabulary: 45, reading: 50, writing: 35, speaking: 30, listening: 42 } },
  ];

  for (const entry of progressEntries) {
    await prisma.progress.create({ data: entry });
  }
  console.log(`   ✅ ${progressEntries.length} progress snapshots created\n`);

  // ─── Summary ──────────────────────────────────────────
  const counts = {
    users: await prisma.user.count(),
    classes: await prisma.class.count(),
    classStudents: await prisma.classStudent.count(),
    learnerProfiles: await prisma.learnerProfile.count(),
    subscriptions: await prisma.subscription.count(),
    userMetrics: await prisma.userMetrics.count(),
    enrollmentRequests: await prisma.enrollmentRequest.count(),
    sessions: await prisma.conversationSession.count(),
    messages: await prisma.message.count(),
    vocabularies: await prisma.vocabulary.count(),
    goals: await prisma.goal.count(),
    progress: await prisma.progress.count(),
  };

  console.log("┌─────────────────────────────────────────┐");
  console.log("│         SEEDING COMPLETE                 │");
  console.log("└─────────────────────────────────────────┘");
  console.log("");
  console.log("📊 Final record counts:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`   • ${table}: ${count}`);
  }
  console.log("");
  console.log("🔑 Test accounts (all use password: password123):");
  console.log("   • Admin:   admin_main");
  console.log("   • Tutor:   tutor_sarah (class code: SARAH-2024)");
  console.log("   • Student: student_ali (PREMIUM, level B1)");
  console.log("   • Student: student_yuki (FREE, level A2)");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
