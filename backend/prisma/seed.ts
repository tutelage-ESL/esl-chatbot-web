import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { CURRENT_AGREEMENT } from "../src/modules/auth/agreement.content.ts";

const prisma = new PrismaClient();

// Helper: date N days ago at a given hour
function daysAgo(n: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Helper: date at start of day N days ago (for progress snapshots)
function dayStart(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("\n┌─────────────────────────────────────────┐");
  console.log("│           DATABASE SEEDING               │");
  console.log("└─────────────────────────────────────────┘\n");

  // Clear existing data (in reverse dependency order)
  console.log("🗑️  Clearing existing data...");
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.vocabulary.deleteMany();
  await prisma.sessionEvaluation.deleteMany();
  await prisma.messageEvaluation.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.userMetrics.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.learnerProfile.deleteMany();
  await prisma.classUser.deleteMany();
  await prisma.taskSubmission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Existing data cleared\n");

  const hashedPassword = await bcryptjs.hash("password123", 12);
  console.log("🔐 Password hashed (test password: password123)\n");

  // ─── Users ──────────────────────────────────────────────────────────────────
  console.log("👤 Creating users...");
  const admin = await prisma.user.create({
    data: {
      username: "admin_main",
      email: "admin@tutelage.com",
      displayName: "Platform Admin",
      password: hashedPassword,
      authProvider: "LOCAL",
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const tutor = await prisma.user.create({
    data: {
      username: "tutor_sarah",
      email: "sarah@tutelage.com",
      displayName: "Sarah Johnson",
      password: hashedPassword,
      authProvider: "LOCAL",
      role: "TUTOR",
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const student1 = await prisma.user.create({
    data: {
      username: "student_ali",
      email: "ali@tutelage.com",
      displayName: "Ali Hassan",
      password: hashedPassword,
      authProvider: "LOCAL",
      role: "STUDENT",
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const student2 = await prisma.user.create({
    data: {
      username: "student_yuki",
      email: "yuki@tutelage.com",
      displayName: "Yuki Tanaka",
      password: hashedPassword,
      authProvider: "LOCAL",
      role: "STUDENT",
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  // Stealth internal account: full ADMIN access but hidden from listings,
  // dashboards, class member lists, and notification fan-outs.
  const internalAdmin = await prisma.user.create({
    data: {
      username: "sys_monitor",
      email: "monitor@tutelage.com",
      displayName: "System Monitor",
      password: hashedPassword,
      authProvider: "LOCAL",
      role: "ADMIN",
      isActive: true,
      isInternal: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`   ✅ 5 users created (admin, tutor, ali, yuki, sys_monitor [internal])\n`);

  // ─── Class ──────────────────────────────────────────────────────────────────
  console.log("🏫 Creating class...");
  const WEEK_SECONDS = 7 * 24 * 60 * 60;
  const seededRefreshedAt = new Date();
  const seededExpiresAt = new Date(seededRefreshedAt.getTime() + WEEK_SECONDS * 1000);
  const sarahClass = await prisma.class.create({
    data: {
      className: "Sarah's ESL Class",
      classCode: "SARAH123",
      classCategory: "General English",
      classStatus: "ACTIVE",
      classCodeRefreshIntervalSeconds: WEEK_SECONDS,
      classCodeExpiresAt: seededExpiresAt,
      classCodeRefreshedAt: seededRefreshedAt,
      classCodeBlocked: false,
      createdById: tutor.id,
    },
  });

  await prisma.classUser.createMany({
    data: [
      { classId: sarahClass.id, userId: tutor.id, role: "TUTOR" },
      { classId: sarahClass.id, userId: student1.id, role: "STUDENT" },
      { classId: sarahClass.id, userId: student2.id, role: "STUDENT" },
    ],
  });
  console.log(`   ✅ Class "${sarahClass.className}" (code: SARAH123) with 3 members\n`);

  // ─── Learner Profiles ───────────────────────────────────────────────────────
  console.log("📋 Creating learner profiles...");
  await prisma.learnerProfile.create({
    data: {
      userId: student1.id,
      currentLevel: "B1",
      targetLevel: "B2",
      learningPurpose: "Career advancement in tech industry",
      topicsOfInterest: ["technology", "business", "travel"],
      aiPersonality: "FRIENDLY",
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
      aiPersonality: "PATIENT",
      voiceSpeed: 0.8,
      weeklyGoalMinutes: 90,
      timezone: "Asia/Tokyo",
      emailDigestEnabled: false,
    },
  });
  console.log("   ✅ 2 learner profiles created\n");

  // ─── Subscriptions ──────────────────────────────────────────────────────────
  console.log("💳 Creating subscriptions...");
  await prisma.subscription.create({
    data: {
      userId: student1.id,
      plan: "PREMIUM",
      status: "ACTIVE",
      paymentProvider: "CASH",
      currentPeriodStart: daysAgo(14),
      currentPeriodEnd: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.subscription.create({ data: { userId: student2.id, plan: "FREE", status: "ACTIVE" } });
  await prisma.subscription.create({ data: { userId: tutor.id, plan: "FREE", status: "ACTIVE" } });
  await prisma.subscription.create({ data: { userId: admin.id, plan: "FREE", status: "ACTIVE" } });
  await prisma.subscription.create({ data: { userId: internalAdmin.id, plan: "FREE", status: "ACTIVE" } });
  console.log("   ✅ 5 subscriptions (1 PREMIUM/CASH for Ali, 4 FREE ACTIVE)\n");

  // ─── User Metrics ───────────────────────────────────────────────────────────
  console.log("📊 Creating user metrics...");
  await prisma.userMetrics.create({ data: { userId: admin.id } });
  await prisma.userMetrics.create({ data: { userId: internalAdmin.id } });
  await prisma.userMetrics.create({ data: { userId: tutor.id } });
  await prisma.userMetrics.create({
    data: {
      userId: student1.id,
      totalStudyTimeMinutes: 780,
      totalWordsTyped: 5100,
      currentStreak: 10,
      longestStreak: 12,
      lastStudyDate: new Date(),
      estimatedLevel: "B1",
      grammarSkill: 71,
      vocabularySkill: 74,
      fluencySkill: 70,
      speakingSkill: 63,
    },
  });
  await prisma.userMetrics.create({
    data: {
      userId: student2.id,
      totalStudyTimeMinutes: 310,
      totalWordsTyped: 2100,
      currentStreak: 4,
      longestStreak: 6,
      lastStudyDate: new Date(),
      estimatedLevel: "A2",
      grammarSkill: 48,
      vocabularySkill: 52,
      fluencySkill: 47,
      speakingSkill: 38,
    },
  });
  console.log("   ✅ 5 user metrics rows\n");

  // ─── Terms of Service acceptance ────────────────────────────────────────────
  // Every seed user has accepted the current agreement version so they can log in
  // (login is blocked with needsAgreement until the current version is accepted).
  console.log("📜 Recording terms-of-service acceptance...");
  await prisma.userAgreement.createMany({
    data: [admin.id, internalAdmin.id, tutor.id, student1.id, student2.id].map((userId) => ({
      userId,
      version: CURRENT_AGREEMENT.version,
      ipAddress: "127.0.0.1",
    })),
  });
  console.log("   ✅ 5 agreement acceptances\n");

  // ─── Sessions + Messages + Evaluations ─────────────────────────────────────
  console.log("💬 Creating sessions, messages & evaluations...");

  // ── Ali sessions (7 total, TEXT + VOICE mix, spread over 14 days) ──────────

  // Session A1 — day 13 ago (oldest, TEXT)
  const sA1 = await prisma.conversationSession.create({
    data: {
      userId: student1.id, mode: "TEXT",
      topic: "Daily routines",
      summary: "Practiced present simple for habits and daily schedule",
      startedAt: daysAgo(13, 9), endedAt: daysAgo(13, 9, 30),
      durationSeconds: 1800, messageCount: 6,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA1.id, role: "USER", type: "TEXT", content: "I wake up every day at 7 in the morning and drink coffee.", wordCount: 13 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 88, grammarErrors: [], vocabularyScore: 68, vocabularyLevel: "B1", fluencyScore: 82, overallScore: 80, detectedCefrLevel: "B1", corrections: [], feedback: "Good use of frequency adverb. Natural sentence." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA1.id, role: "ASSISTANT", type: "TEXT", content: "Good! You can also say 'every morning' instead of 'every day at 7 in the morning'. What do you usually do after coffee?", wordCount: 22 } });
    const m3 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA1.id, role: "USER", type: "TEXT", content: "After coffee I usually check my phone and then I go to gym.", wordCount: 13 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 78, grammarErrors: [{ error: "Missing article before 'gym'", correction: "go to the gym", rule: "article", severity: "minor" }], vocabularyScore: 62, vocabularyLevel: "B1", fluencyScore: 75, overallScore: 72, detectedCefrLevel: "B1", corrections: [{ original: "go to gym", corrected: "go to the gym", explanation: "Use 'the gym' — a specific place." }], feedback: "Good structure. Remember the article 'the' before specific places." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA1.id, role: "ASSISTANT", type: "TEXT", content: "Almost perfect — 'go to the gym' needs 'the'. Great daily routine! What time do you usually get to work or university?", wordCount: 21 } });
    const m5 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA1.id, role: "USER", type: "TEXT", content: "I start work at nine. My commute takes about twenty minutes by bus.", wordCount: 13 } });
    await prisma.messageEvaluation.create({ data: { messageId: m5.id, grammarScore: 92, grammarErrors: [], vocabularyScore: 73, vocabularyLevel: "B1", fluencyScore: 87, overallScore: 84, detectedCefrLevel: "B1", corrections: [], feedback: "Excellent! 'commute' is a great B2 word." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA1.id, role: "ASSISTANT", type: "TEXT", content: "Perfect sentence! 'Commute' is excellent vocabulary. Your daily routine description is very clear and natural.", wordCount: 17 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sA1.id, topicsCovered: ["daily routines", "present simple", "frequency adverbs"], avgGrammarScore: 86.0, avgVocabularyScore: 67.7, avgFluencyScore: 81.3, avgOverallScore: 78.7, detectedCefrLevel: "B1", strengths: ["Good sentence structure", "Natural frequency adverb use"], weaknesses: ["Article usage with specific nouns"], recommendations: ["Practice articles with place nouns", "Expand daily routine vocabulary"], newVocabulary: ["commute", "routine", "habit"], totalUserMessages: 3, totalUserWords: 39 } });
  }

  // Session A2 — day 11 ago (TEXT)
  const sA2 = await prisma.conversationSession.create({
    data: {
      userId: student1.id, mode: "TEXT",
      topic: "Talking about past experiences",
      summary: "Practiced past simple and present perfect tenses",
      startedAt: daysAgo(11, 19), endedAt: daysAgo(11, 19, 40),
      durationSeconds: 2400, messageCount: 6,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA2.id, role: "USER", type: "TEXT", content: "Last summer I have visited London for the first time.", wordCount: 10 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 60, grammarErrors: [{ error: "'have visited' should be 'visited' with 'Last summer' (past simple, not present perfect)", correction: "I visited London", rule: "tense", severity: "major" }], vocabularyScore: 70, vocabularyLevel: "B1", fluencyScore: 65, overallScore: 65, detectedCefrLevel: "B1", corrections: [{ original: "Last summer I have visited", corrected: "Last summer I visited", explanation: "Use past simple with specific past time expressions like 'last summer'." }], feedback: "Good content, but 'last summer' requires past simple, not present perfect." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA2.id, role: "ASSISTANT", type: "TEXT", content: "Good topic! Note: with 'last summer' we use past simple: 'I visited London'. Present perfect = no specific time. How long did you stay?", wordCount: 25 } });
    const m3 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA2.id, role: "USER", type: "TEXT", content: "I stayed for five days. I visited the British Museum and I ate fish and chips.", wordCount: 16 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 94, grammarErrors: [], vocabularyScore: 75, vocabularyLevel: "B1", fluencyScore: 88, overallScore: 86, detectedCefrLevel: "B1", corrections: [], feedback: "Perfect tense use! Great details about your trip." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA2.id, role: "ASSISTANT", type: "TEXT", content: "Excellent past simple usage! The British Museum is fascinating. Have you ever visited another country? (Try using present perfect this time!)", wordCount: 24 } });
    const m5 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA2.id, role: "USER", type: "TEXT", content: "Yes, I have been to Turkey and Germany. I have never been to Asia.", wordCount: 14 } });
    await prisma.messageEvaluation.create({ data: { messageId: m5.id, grammarScore: 96, grammarErrors: [], vocabularyScore: 72, vocabularyLevel: "B1", fluencyScore: 90, overallScore: 86, detectedCefrLevel: "B1", corrections: [], feedback: "Excellent! Perfect use of present perfect for life experiences." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA2.id, role: "ASSISTANT", type: "TEXT", content: "Brilliant! 'I have been to' — textbook present perfect. You've mastered the distinction. Great session!", wordCount: 15 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sA2.id, topicsCovered: ["past simple", "present perfect", "travel"], avgGrammarScore: 83.3, avgVocabularyScore: 72.3, avgFluencyScore: 81.0, avgOverallScore: 79.0, detectedCefrLevel: "B1", strengths: ["Accurate present perfect usage", "Good sentence length"], weaknesses: ["Tense confusion with time expressions"], recommendations: ["Practice past simple vs present perfect triggers"], newVocabulary: ["experience", "fascinate", "distinct"], totalUserMessages: 3, totalUserWords: 40 } });
  }

  // Session A3 — day 9 ago (VOICE, Ali)
  const sA3 = await prisma.conversationSession.create({
    data: {
      userId: student1.id, mode: "VOICE",
      topic: "Describing a picture",
      summary: "Practiced describing scenes using present continuous and prepositions",
      startedAt: daysAgo(9, 18), endedAt: daysAgo(9, 18, 25),
      durationSeconds: 1500, messageCount: 4,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA3.id, role: "USER", type: "VOICE", content: "I can see a man who is standing near the window and looking outside.", wordCount: 13, audioDurationSec: 6 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 90, grammarErrors: [], vocabularyScore: 74, vocabularyLevel: "B1", fluencyScore: 84, overallScore: 83, detectedCefrLevel: "B1", corrections: [], feedback: "Natural description. Good relative clause use.", pronunciationScore: 76, pronunciationIssues: [{ word: "standing", issue: "Low accuracy: 52%", suggestion: "standing" }] } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA3.id, role: "ASSISTANT", type: "VOICE", content: "Great description! 'Who is standing' is a perfect relative clause. What else do you see in the picture? Describe the background.", wordCount: 22 } });
    const m3 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA3.id, role: "USER", type: "VOICE", content: "Behind him there is a bookshelf with many books. The room looks very cozy and warm.", wordCount: 16, audioDurationSec: 7 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 93, grammarErrors: [], vocabularyScore: 78, vocabularyLevel: "B1", fluencyScore: 87, overallScore: 86, detectedCefrLevel: "B1", corrections: [], feedback: "Excellent vocabulary! 'Cozy' is a great descriptive word.", pronunciationScore: 81, pronunciationIssues: [] } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA3.id, role: "ASSISTANT", type: "VOICE", content: "Excellent! 'Cozy and warm' is perfect descriptive vocabulary. Your pronunciation of 'bookshelf' was very clear.", wordCount: 17 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sA3.id, topicsCovered: ["picture description", "present continuous", "prepositions of place"], avgGrammarScore: 91.5, avgVocabularyScore: 76.0, avgFluencyScore: 85.5, avgOverallScore: 84.5, avgPronunciationScore: 78.5, detectedCefrLevel: "B1", strengths: ["Strong relative clause use", "Good descriptive vocabulary"], weaknesses: ["Some pronunciation accuracy on voiced consonants"], recommendations: ["Practice -ing word endings pronunciation", "Expand scene description vocabulary"], newVocabulary: ["cozy", "bookshelf", "background"], totalUserMessages: 2, totalUserWords: 29 } });
  }

  // Session A4 — day 7 ago (TEXT)
  const sA4 = await prisma.conversationSession.create({
    data: {
      userId: student1.id, mode: "TEXT",
      topic: "Giving opinions and agreeing/disagreeing",
      summary: "Practiced opinion phrases and counter-argument structures",
      startedAt: daysAgo(7, 20), endedAt: daysAgo(7, 20, 35),
      durationSeconds: 2100, messageCount: 6,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA4.id, role: "USER", type: "TEXT", content: "In my opinion, social media is very beneficial for learning new languages.", wordCount: 13 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 92, grammarErrors: [], vocabularyScore: 80, vocabularyLevel: "B2", fluencyScore: 88, overallScore: 87, detectedCefrLevel: "B2", corrections: [], feedback: "Great opinion phrase. 'Beneficial' is excellent B2 vocabulary." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA4.id, role: "ASSISTANT", type: "TEXT", content: "Interesting point! I partly agree, but there are also distractions. Can you give an example of how social media helps language learning?", wordCount: 24 } });
    const m3 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA4.id, role: "USER", type: "TEXT", content: "For example, I follow English accounts on Instagram and I watch short videos about grammar. Also I chat with native speakers.", wordCount: 21 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 88, grammarErrors: [], vocabularyScore: 76, vocabularyLevel: "B1", fluencyScore: 85, overallScore: 83, detectedCefrLevel: "B1", corrections: [], feedback: "Good examples with linking word 'for example'. Natural and clear." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA4.id, role: "ASSISTANT", type: "TEXT", content: "Those are great examples! However, do you think there are any disadvantages to using social media for language learning?", wordCount: 20 } });
    const m5 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA4.id, role: "USER", type: "TEXT", content: "You have a point. Sometimes the content is too informal and you might learn slang instead of proper English.", wordCount: 19 } });
    await prisma.messageEvaluation.create({ data: { messageId: m5.id, grammarScore: 91, grammarErrors: [], vocabularyScore: 82, vocabularyLevel: "B2", fluencyScore: 89, overallScore: 87, detectedCefrLevel: "B2", corrections: [], feedback: "Excellent concession phrase 'You have a point'. 'Informal' and 'proper' show B2 vocabulary." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA4.id, role: "ASSISTANT", type: "TEXT", content: "Brilliant! 'You have a point' is a native-level phrase. You're reaching B2 level in this discussion. Excellent session!", wordCount: 18 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sA4.id, topicsCovered: ["opinions", "agreeing/disagreeing", "social media", "B2 vocabulary"], avgGrammarScore: 90.3, avgVocabularyScore: 79.3, avgFluencyScore: 87.3, avgOverallScore: 85.7, detectedCefrLevel: "B1", strengths: ["Strong opinion structures", "Good B2 vocabulary range"], weaknesses: [], recommendations: ["Expand formal discussion vocabulary to consolidate B2"], newVocabulary: ["beneficial", "informal", "concession"], totalUserMessages: 3, totalUserWords: 53 } });
  }

  // Session A5 — day 5 ago (VOICE)
  const sA5 = await prisma.conversationSession.create({
    data: {
      userId: student1.id, mode: "VOICE",
      topic: "Job interview practice",
      summary: "Practiced answering common job interview questions confidently",
      startedAt: daysAgo(5, 18), endedAt: daysAgo(5, 18, 30),
      durationSeconds: 1800, messageCount: 6,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA5.id, role: "USER", type: "VOICE", content: "My name is Ali and I have three years of experience in software development.", wordCount: 14, audioDurationSec: 6 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 95, grammarErrors: [], vocabularyScore: 80, vocabularyLevel: "B2", fluencyScore: 88, overallScore: 88, detectedCefrLevel: "B2", corrections: [], feedback: "Confident and professional opener.", pronunciationScore: 82, pronunciationIssues: [] } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA5.id, role: "ASSISTANT", type: "VOICE", content: "Excellent introduction! Very professional. Now, tell me: what are your greatest strengths?", wordCount: 14 } });
    const m3 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA5.id, role: "USER", type: "VOICE", content: "I am a quick learner and I work very good under pressure. I also have strong communication skills.", wordCount: 17, audioDurationSec: 7 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 75, grammarErrors: [{ error: "'work very good' should be 'work very well'", correction: "work very well", rule: "adverb vs adjective", severity: "major" }], vocabularyScore: 75, vocabularyLevel: "B1", fluencyScore: 80, overallScore: 76, detectedCefrLevel: "B1", corrections: [{ original: "work very good", corrected: "work very well", explanation: "Use adverb 'well' to modify verbs, not adjective 'good'." }], feedback: "Good content! Remember: 'work well' (adverb), not 'work good' (adjective).", pronunciationScore: 79, pronunciationIssues: [{ word: "communication", issue: "Low accuracy: 55%", suggestion: "communication" }] } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA5.id, role: "ASSISTANT", type: "VOICE", content: "Good strengths to mention! One correction: 'work very well' — 'well' is the adverb form. Now: why do you want this job?", wordCount: 22 } });
    const m5 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA5.id, role: "USER", type: "VOICE", content: "I am very passionate about technology and I believe this role would allow me to grow professionally.", wordCount: 17, audioDurationSec: 8 } });
    await prisma.messageEvaluation.create({ data: { messageId: m5.id, grammarScore: 94, grammarErrors: [], vocabularyScore: 85, vocabularyLevel: "B2", fluencyScore: 89, overallScore: 89, detectedCefrLevel: "B2", corrections: [], feedback: "Impressive! 'Passionate' and 'professionally' are excellent B2+ words.", pronunciationScore: 85, pronunciationIssues: [] } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA5.id, role: "ASSISTANT", type: "VOICE", content: "Outstanding answer! 'Passionate' and 'grow professionally' are exactly the kind of language interviewers want to hear.", wordCount: 18 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sA5.id, topicsCovered: ["job interviews", "professional English", "strengths/weaknesses"], avgGrammarScore: 88.0, avgVocabularyScore: 80.0, avgFluencyScore: 85.7, avgOverallScore: 84.3, avgPronunciationScore: 82.0, detectedCefrLevel: "B1", strengths: ["Professional vocabulary", "Confident delivery"], weaknesses: ["Adverb/adjective confusion"], recommendations: ["Practice adverb usage", "Prepare more interview answer templates"], newVocabulary: ["passionate", "professionally", "strength"], totalUserMessages: 3, totalUserWords: 48 } });
  }

  // Session A6 — day 3 ago (TEXT)
  const sA6 = await prisma.conversationSession.create({
    data: {
      userId: student1.id, mode: "TEXT",
      topic: "Discussing news and current events",
      summary: "Practiced complex sentences and discourse markers for news discussion",
      startedAt: daysAgo(3, 21), endedAt: daysAgo(3, 21, 45),
      durationSeconds: 2700, messageCount: 6,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA6.id, role: "USER", type: "TEXT", content: "I read an article about how artificial intelligence is transforming the job market.", wordCount: 15 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 95, grammarErrors: [], vocabularyScore: 87, vocabularyLevel: "B2", fluencyScore: 90, overallScore: 91, detectedCefrLevel: "B2", corrections: [], feedback: "Excellent! Complex noun phrase with relative clause. B2-level sophistication." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA6.id, role: "ASSISTANT", type: "TEXT", content: "That's a fascinating topic! What is the article's main argument? Do you agree with it?", wordCount: 16 } });
    const m3 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA6.id, role: "USER", type: "TEXT", content: "The article argued that although AI will eliminate some jobs, it will simultaneously create new ones that require more creativity.", wordCount: 21 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 97, grammarErrors: [], vocabularyScore: 91, vocabularyLevel: "B2", fluencyScore: 92, overallScore: 93, detectedCefrLevel: "B2", corrections: [], feedback: "Outstanding! 'Simultaneously' and 'eliminate' are C1 vocabulary. Concession clause perfectly formed." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA6.id, role: "ASSISTANT", type: "TEXT", content: "Excellent analysis! 'Simultaneously' is near C1 level. Do you think governments should regulate AI development?", wordCount: 16 } });
    const m5 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA6.id, role: "USER", type: "TEXT", content: "That is a complex question. On one hand, regulation could slow innovation. On the other hand, it protects workers from exploitation.", wordCount: 22 } });
    await prisma.messageEvaluation.create({ data: { messageId: m5.id, grammarScore: 96, grammarErrors: [], vocabularyScore: 89, vocabularyLevel: "B2", fluencyScore: 92, overallScore: 92, detectedCefrLevel: "B2", corrections: [], feedback: "Brilliant use of 'on one hand / on the other hand'. Near C1 discourse management." } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA6.id, role: "ASSISTANT", type: "TEXT", content: "Superb! 'On one hand / on the other hand' is perfect balanced argument structure. You are clearly operating at upper B2 level. Excellent session!", wordCount: 23 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sA6.id, topicsCovered: ["current events", "AI and work", "discourse markers", "B2/C1 vocabulary"], avgGrammarScore: 96.0, avgVocabularyScore: 89.0, avgFluencyScore: 91.3, avgOverallScore: 92.0, detectedCefrLevel: "B2", strengths: ["Sophisticated discourse markers", "Near C1 vocabulary", "Complex sentence structures"], weaknesses: [], recommendations: ["Start C1 vocabulary expansion", "Practice academic reading for richer input"], newVocabulary: ["simultaneously", "eliminate", "exploitation", "regulation"], totalUserMessages: 3, totalUserWords: 58 } });
  }

  // Session A7 — today (VOICE, recent)
  const sA7 = await prisma.conversationSession.create({
    data: {
      userId: student1.id, mode: "VOICE",
      topic: "Travel planning conversation",
      summary: "Practiced making plans and travel-related vocabulary",
      startedAt: daysAgo(0, 9), endedAt: daysAgo(0, 9, 20),
      durationSeconds: 1200, messageCount: 4,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA7.id, role: "USER", type: "VOICE", content: "I am planning to visit Japan next spring. I want to see Mount Fuji and try authentic ramen.", wordCount: 17, audioDurationSec: 8 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 93, grammarErrors: [], vocabularyScore: 82, vocabularyLevel: "B2", fluencyScore: 88, overallScore: 88, detectedCefrLevel: "B2", corrections: [], feedback: "Natural and enthusiastic. 'Authentic' is great vocabulary.", pronunciationScore: 84, pronunciationIssues: [] } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA7.id, role: "ASSISTANT", type: "VOICE", content: "How exciting! Japan is beautiful in spring. Have you booked your flights yet? What season do you prefer for traveling?", wordCount: 20 } });
    const m3 = await prisma.message.create({ data: { userId: student1.id, sessionId: sA7.id, role: "USER", type: "VOICE", content: "Not yet, but I am comparing flight prices. I prefer spring because the cherry blossoms are spectacular.", wordCount: 16, audioDurationSec: 7 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 94, grammarErrors: [], vocabularyScore: 86, vocabularyLevel: "B2", fluencyScore: 90, overallScore: 90, detectedCefrLevel: "B2", corrections: [], feedback: "Excellent! 'Spectacular' and 'cherry blossoms' show rich descriptive vocabulary.", pronunciationScore: 87, pronunciationIssues: [] } });
    await prisma.message.create({ data: { userId: student1.id, sessionId: sA7.id, role: "ASSISTANT", type: "VOICE", content: "'Spectacular' — brilliant word choice! Cherry blossom season is indeed magical. Your English continues to improve wonderfully.", wordCount: 18 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sA7.id, topicsCovered: ["travel planning", "seasons", "descriptive vocabulary"], avgGrammarScore: 93.5, avgVocabularyScore: 84.0, avgFluencyScore: 89.0, avgOverallScore: 89.0, avgPronunciationScore: 85.5, detectedCefrLevel: "B2", strengths: ["Rich descriptive vocabulary", "Confident spoken delivery"], weaknesses: [], recommendations: ["Practice spontaneous topic discussions to consolidate B2"], newVocabulary: ["spectacular", "authentic", "cherry blossoms"], totalUserMessages: 2, totalUserWords: 33 } });
  }

  console.log(`   ✅ Ali: 7 sessions (5 TEXT, 2 VOICE) with full evaluations`);

  // ── Yuki sessions (3 total, TEXT, spread over 14 days) ──────────────────────

  // Session Y1 — day 12 ago
  const sY1 = await prisma.conversationSession.create({
    data: {
      userId: student2.id, mode: "TEXT",
      topic: "Introducing yourself",
      summary: "Practiced self-introduction and basic personal information sharing",
      startedAt: daysAgo(12, 10), endedAt: daysAgo(12, 10, 20),
      durationSeconds: 1200, messageCount: 4,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student2.id, sessionId: sY1.id, role: "USER", type: "TEXT", content: "Hello, I want practice introduce myself.", wordCount: 7 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 55, grammarErrors: [{ error: "Missing 'to' before 'practice'", correction: "I want to practice", rule: "infinitive", severity: "major" }, { error: "'introduce' should be 'introducing'", correction: "practice introducing", rule: "gerund", severity: "major" }], vocabularyScore: 50, vocabularyLevel: "A2", fluencyScore: 58, overallScore: 54, detectedCefrLevel: "A2", corrections: [{ original: "I want practice introduce myself", corrected: "I want to practice introducing myself", explanation: "Use 'want to + verb' and 'practice + verb-ing'." }], feedback: "Good attempt! 'Want TO practice INTRODUCING' — two grammar points to remember." } });
    await prisma.message.create({ data: { userId: student2.id, sessionId: sY1.id, role: "ASSISTANT", type: "TEXT", content: "Hello Yuki! No worries. Try: 'I want to practice introducing myself.' Now go ahead — tell me about yourself!", wordCount: 19 } });
    const m3 = await prisma.message.create({ data: { userId: student2.id, sessionId: sY1.id, role: "USER", type: "TEXT", content: "My name is Yuki. I am from Japan. I am 22 years old. I like cooking and reading books.", wordCount: 18 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 85, grammarErrors: [], vocabularyScore: 55, vocabularyLevel: "A2", fluencyScore: 68, overallScore: 71, detectedCefrLevel: "A2", corrections: [], feedback: "Very clear! To sound more natural: 'I'm Yuki from Japan. I'm 22 and enjoy cooking and reading.'" } });
    await prisma.message.create({ data: { userId: student2.id, sessionId: sY1.id, role: "ASSISTANT", type: "TEXT", content: "That was great, Yuki! Very clear and well-structured. To sound more natural you could say: 'I'm Yuki from Japan. I'm 22 and I enjoy cooking and reading.'", wordCount: 30 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sY1.id, topicsCovered: ["self-introduction", "personal information", "hobbies"], avgGrammarScore: 70.0, avgVocabularyScore: 52.5, avgFluencyScore: 63.0, avgOverallScore: 62.5, detectedCefrLevel: "A2", strengths: ["Clear simple sentences"], weaknesses: ["Infinitive/gerund after 'want' and 'practice'"], recommendations: ["Practice 'want to + verb' pattern", "Connect sentences with 'and'"], newVocabulary: ["introduce", "hobby", "enjoy"], totalUserMessages: 2, totalUserWords: 25 } });
  }

  // Session Y2 — day 6 ago
  const sY2 = await prisma.conversationSession.create({
    data: {
      userId: student2.id, mode: "TEXT",
      topic: "Ordering food at a café",
      summary: "Practiced making requests and using polite forms in a café setting",
      startedAt: daysAgo(6, 11), endedAt: daysAgo(6, 11, 25),
      durationSeconds: 1500, messageCount: 6,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student2.id, sessionId: sY2.id, role: "USER", type: "TEXT", content: "I want coffee please.", wordCount: 4 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 70, grammarErrors: [], vocabularyScore: 48, vocabularyLevel: "A1", fluencyScore: 60, overallScore: 60, detectedCefrLevel: "A2", corrections: [], feedback: "Good start! To be more polite: 'Could I have a coffee, please?'" } });
    await prisma.message.create({ data: { userId: student2.id, sessionId: sY2.id, role: "ASSISTANT", type: "TEXT", content: "Good! To be more polite, say: 'Could I have a coffee, please?' or 'I'd like a coffee, please.' Now try again!", wordCount: 22 } });
    const m3 = await prisma.message.create({ data: { userId: student2.id, sessionId: sY2.id, role: "USER", type: "TEXT", content: "Could I have a coffee and a piece of cake, please?", wordCount: 11 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 92, grammarErrors: [], vocabularyScore: 62, vocabularyLevel: "A2", fluencyScore: 80, overallScore: 80, detectedCefrLevel: "A2", corrections: [], feedback: "Perfect! 'Could I have' is exactly right. Very polite!" } });
    await prisma.message.create({ data: { userId: student2.id, sessionId: sY2.id, role: "ASSISTANT", type: "TEXT", content: "Perfect! That's exactly how a native speaker would order. Now what if you want to ask the price? How would you ask?", wordCount: 22 } });
    const m5 = await prisma.message.create({ data: { userId: student2.id, sessionId: sY2.id, role: "USER", type: "TEXT", content: "Excuse me, how much is the cake?", wordCount: 7 } });
    await prisma.messageEvaluation.create({ data: { messageId: m5.id, grammarScore: 95, grammarErrors: [], vocabularyScore: 65, vocabularyLevel: "A2", fluencyScore: 82, overallScore: 82, detectedCefrLevel: "A2", corrections: [], feedback: "Excellent! Natural and polite. You're improving fast!" } });
    await prisma.message.create({ data: { userId: student2.id, sessionId: sY2.id, role: "ASSISTANT", type: "TEXT", content: "Excellent! That's perfect natural English. You've improved so much — great polite request forms this session!", wordCount: 17 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sY2.id, topicsCovered: ["café vocabulary", "polite requests", "question forms"], avgGrammarScore: 85.7, avgVocabularyScore: 58.3, avgFluencyScore: 74.0, avgOverallScore: 74.0, detectedCefrLevel: "A2", strengths: ["Good improvement in polite forms", "Clear question structure"], weaknesses: ["Limited vocabulary range"], recommendations: ["Expand food/café vocabulary", "Practice 'Could I / I'd like' patterns"], newVocabulary: ["polite", "request", "excuse me"], totalUserMessages: 3, totalUserWords: 22 } });
  }

  // Session Y3 — day 2 ago
  const sY3 = await prisma.conversationSession.create({
    data: {
      userId: student2.id, mode: "TEXT",
      topic: "Describing your hometown",
      summary: "Practiced describing places using there is/are and adjectives",
      startedAt: daysAgo(2, 14), endedAt: daysAgo(2, 14, 30),
      durationSeconds: 1800, messageCount: 6,
    },
  });
  {
    const m1 = await prisma.message.create({ data: { userId: student2.id, sessionId: sY3.id, role: "USER", type: "TEXT", content: "My hometown is Osaka. It is very big city in Japan. There are many delicious food there.", wordCount: 16 } });
    await prisma.messageEvaluation.create({ data: { messageId: m1.id, grammarScore: 65, grammarErrors: [{ error: "Missing article: 'a very big city'", correction: "It is a very big city", rule: "article", severity: "minor" }, { error: "'many delicious food' — food is uncountable, use 'much' or 'a lot of'", correction: "a lot of delicious food", rule: "countable/uncountable", severity: "major" }], vocabularyScore: 60, vocabularyLevel: "A2", fluencyScore: 65, overallScore: 64, detectedCefrLevel: "A2", corrections: [{ original: "very big city", corrected: "a very big city", explanation: "Use article 'a' with singular countable nouns." }, { original: "many delicious food", corrected: "a lot of delicious food", explanation: "Food is uncountable — use 'a lot of' or 'much'." }], feedback: "Good topic! Two grammar points: 'a big city' (article) and 'a lot of food' (uncountable)." } });
    await prisma.message.create({ data: { userId: student2.id, sessionId: sY3.id, role: "ASSISTANT", type: "TEXT", content: "Osaka sounds amazing! Two corrections: 'It is A very big city' and 'there is A LOT OF delicious food'. Try again!", wordCount: 22 } });
    const m3 = await prisma.message.create({ data: { userId: student2.id, sessionId: sY3.id, role: "USER", type: "TEXT", content: "It is a very big city and there is a lot of delicious food. There are also beautiful temples.", wordCount: 17 } });
    await prisma.messageEvaluation.create({ data: { messageId: m3.id, grammarScore: 90, grammarErrors: [], vocabularyScore: 65, vocabularyLevel: "A2", fluencyScore: 78, overallScore: 79, detectedCefrLevel: "A2", corrections: [], feedback: "Perfect corrections! You learned quickly. 'Beautiful temples' is great vocabulary." } });
    await prisma.message.create({ data: { userId: student2.id, sessionId: sY3.id, role: "ASSISTANT", type: "TEXT", content: "Excellent! Perfect grammar this time. Osaka has amazing temples and food. What's your favourite thing about your city?", wordCount: 19 } });
    const m5 = await prisma.message.create({ data: { userId: student2.id, sessionId: sY3.id, role: "USER", type: "TEXT", content: "I love the food culture. You can find cheap and tasty food everywhere in Osaka.", wordCount: 15 } });
    await prisma.messageEvaluation.create({ data: { messageId: m5.id, grammarScore: 88, grammarErrors: [], vocabularyScore: 68, vocabularyLevel: "A2", fluencyScore: 80, overallScore: 80, detectedCefrLevel: "A2", corrections: [], feedback: "Natural and clear! 'Food culture' is great vocabulary for A2+" } });
    await prisma.message.create({ data: { userId: student2.id, sessionId: sY3.id, role: "ASSISTANT", type: "TEXT", content: "You're describing it beautifully! 'Food culture' shows you're expanding your vocabulary. Keep up the great work, Yuki!", wordCount: 18 } });
    await prisma.sessionEvaluation.create({ data: { sessionId: sY3.id, topicsCovered: ["describing places", "there is/are", "articles", "uncountable nouns"], avgGrammarScore: 81.0, avgVocabularyScore: 64.3, avgFluencyScore: 74.3, avgOverallScore: 74.3, detectedCefrLevel: "A2", strengths: ["Good self-correction", "Natural place descriptions"], weaknesses: ["Article use with singular nouns", "Countable/uncountable distinction"], recommendations: ["Practice articles with nouns", "Learn 10 common uncountable nouns"], newVocabulary: ["temple", "culture", "uncountable"], totalUserMessages: 3, totalUserWords: 48 } });
  }

  console.log(`   ✅ Yuki: 3 sessions (all TEXT) with full evaluations\n`);

  // ─── Vocabulary (18 words) ──────────────────────────────────────────────────
  console.log("📖 Creating vocabulary...");
  const now = new Date();
  const vocabItems = [
    // Ali — mastered words (high SRS interval)
    { userId: student1.id, word: "accomplish", definition: "To succeed in doing something", pronunciation: "/əˈkɑːmplɪʃ/", example: "She accomplished all her goals this year.", partOfSpeech: "verb", difficulty: 3, category: "academic", source: "MANUAL" as const, masteryLevel: 5, reviewCount: 8, correctCount: 7, incorrectCount: 1, srsInterval: 30, srsEase: 2.5, srsDue: new Date(now.getTime() + 30 * 86400000) },
    { userId: student1.id, word: "beneficial", definition: "Resulting in good; favorable or advantageous", pronunciation: "/ˌbenɪˈfɪʃəl/", example: "Exercise is beneficial to your health.", partOfSpeech: "adjective", difficulty: 3, category: "academic", source: "SESSION" as const, masteryLevel: 4, reviewCount: 6, correctCount: 6, incorrectCount: 0, srsInterval: 21, srsEase: 2.6, srsDue: new Date(now.getTime() + 15 * 86400000) },
    { userId: student1.id, word: "simultaneously", definition: "At the same time", pronunciation: "/ˌsɪməlˈteɪniəsli/", example: "He was simultaneously studying and working.", partOfSpeech: "adverb", difficulty: 4, category: "academic", source: "SESSION" as const, masteryLevel: 3, reviewCount: 4, correctCount: 3, incorrectCount: 1, srsInterval: 7, srsEase: 2.3, srsDue: new Date(now.getTime() + 3 * 86400000) },
    { userId: student1.id, word: "eliminate", definition: "To completely remove or get rid of something", pronunciation: "/ɪˈlɪmɪneɪt/", example: "We need to eliminate waste.", partOfSpeech: "verb", difficulty: 3, category: "academic", source: "SESSION" as const, masteryLevel: 2, reviewCount: 3, correctCount: 2, incorrectCount: 1, srsInterval: 3, srsEase: 2.2, srsDue: new Date(now.getTime() + 1 * 86400000) },
    { userId: student1.id, word: "reluctant", definition: "Unwilling and hesitant", pronunciation: "/rɪˈlʌktənt/", example: "He was reluctant to share his opinion.", partOfSpeech: "adjective", difficulty: 3, category: "academic", source: "MANUAL" as const, masteryLevel: 2, reviewCount: 3, correctCount: 2, incorrectCount: 1, srsInterval: 2, srsEase: 2.1, srsDue: new Date(now.getTime() - 1 * 86400000) },  // overdue
    { userId: student1.id, word: "appetizer", definition: "A small dish served before the main course", pronunciation: "/ˈæpɪtaɪzər/", example: "We ordered soup as an appetizer.", partOfSpeech: "noun", difficulty: 2, category: "food", source: "MANUAL" as const, masteryLevel: 5, reviewCount: 7, correctCount: 7, incorrectCount: 0, srsInterval: 21, srsEase: 2.7, srsDue: new Date(now.getTime() + 14 * 86400000) },
    { userId: student1.id, word: "commute", definition: "Travel regularly between home and work or study", pronunciation: "/kəˈmjuːt/", example: "My commute takes 20 minutes.", partOfSpeech: "noun/verb", difficulty: 2, category: "daily life", source: "SESSION" as const, masteryLevel: 3, reviewCount: 4, correctCount: 3, incorrectCount: 1, srsInterval: 7, srsEase: 2.4, srsDue: new Date(now.getTime() + 4 * 86400000) },
    { userId: student1.id, word: "spectacular", definition: "Beautiful in a dramatic and eye-catching way", pronunciation: "/spekˈtækjʊlər/", example: "The view was spectacular.", partOfSpeech: "adjective", difficulty: 3, category: "descriptive", source: "SESSION" as const, masteryLevel: 1, reviewCount: 1, correctCount: 1, incorrectCount: 0, srsInterval: 1, srsEase: 2.5, srsDue: new Date(now.getTime() + 1 * 86400000) },
    { userId: student1.id, word: "passionate", definition: "Having, showing, or caused by strong feelings or beliefs", pronunciation: "/ˈpæʃənɪt/", example: "She is passionate about teaching.", partOfSpeech: "adjective", difficulty: 2, category: "personality", source: "SESSION" as const, masteryLevel: 2, reviewCount: 2, correctCount: 2, incorrectCount: 0, srsInterval: 3, srsEase: 2.5, srsDue: new Date(now.getTime() + 2 * 86400000) },
    // Ali — new/overdue words
    { userId: student1.id, word: "exploitation", definition: "The action of treating someone unfairly to benefit from their work", pronunciation: "/ˌeksplɔɪˈteɪʃən/", example: "Workers protested against exploitation.", partOfSpeech: "noun", difficulty: 4, category: "social", source: "SESSION" as const, masteryLevel: 0, reviewCount: 0, correctCount: 0, incorrectCount: 0, srsInterval: 0, srsEase: 2.5, srsDue: now },
    // Yuki — vocab words
    { userId: student2.id, word: "introduce", definition: "To present someone or yourself to others", pronunciation: "/ˌɪntrəˈdjuːs/", example: "Let me introduce myself.", partOfSpeech: "verb", difficulty: 1, category: "social", source: "SESSION" as const, masteryLevel: 4, reviewCount: 5, correctCount: 5, incorrectCount: 0, srsInterval: 14, srsEase: 2.6, srsDue: new Date(now.getTime() + 10 * 86400000) },
    { userId: student2.id, word: "hobby", definition: "An activity done for enjoyment in spare time", pronunciation: "/ˈhɑːbi/", example: "My hobby is reading books.", partOfSpeech: "noun", difficulty: 1, category: "daily life", source: "SESSION" as const, masteryLevel: 3, reviewCount: 4, correctCount: 4, incorrectCount: 0, srsInterval: 7, srsEase: 2.5, srsDue: new Date(now.getTime() + 5 * 86400000) },
    { userId: student2.id, word: "delicious", definition: "Highly pleasant to taste", pronunciation: "/dɪˈlɪʃəs/", example: "The sushi was delicious.", partOfSpeech: "adjective", difficulty: 1, category: "food", source: "MANUAL" as const, masteryLevel: 3, reviewCount: 4, correctCount: 3, incorrectCount: 1, srsInterval: 7, srsEase: 2.3, srsDue: new Date(now.getTime() + 3 * 86400000) },
    { userId: student2.id, word: "polite", definition: "Having or showing good manners and respect", pronunciation: "/pəˈlaɪt/", example: "Could I have a coffee, please? — That's very polite!", partOfSpeech: "adjective", difficulty: 1, category: "social", source: "SESSION" as const, masteryLevel: 2, reviewCount: 3, correctCount: 2, incorrectCount: 1, srsInterval: 3, srsEase: 2.2, srsDue: new Date(now.getTime() - 1 * 86400000) },  // overdue
    { userId: student2.id, word: "temple", definition: "A building used for religious worship", pronunciation: "/ˈtempəl/", example: "There are beautiful temples in Osaka.", partOfSpeech: "noun", difficulty: 1, category: "culture", source: "SESSION" as const, masteryLevel: 1, reviewCount: 1, correctCount: 1, incorrectCount: 0, srsInterval: 1, srsEase: 2.5, srsDue: now },
    { userId: student2.id, word: "culture", definition: "The ideas, customs, and social behaviour of a particular group", pronunciation: "/ˈkʌltʃər/", example: "Japan has a rich food culture.", partOfSpeech: "noun", difficulty: 2, category: "society", source: "SESSION" as const, masteryLevel: 1, reviewCount: 1, correctCount: 1, incorrectCount: 0, srsInterval: 1, srsEase: 2.5, srsDue: new Date(now.getTime() + 1 * 86400000) },
    { userId: student2.id, word: "request", definition: "An act of asking politely or formally for something", pronunciation: "/rɪˈkwest/", example: "She made a polite request.", partOfSpeech: "noun", difficulty: 2, category: "communication", source: "SESSION" as const, masteryLevel: 0, reviewCount: 0, correctCount: 0, incorrectCount: 0, srsInterval: 0, srsEase: 2.5, srsDue: now },
    { userId: student2.id, word: "uncountable", definition: "A noun that has no plural and cannot be counted directly", pronunciation: "/ʌnˈkaʊntəbəl/", example: "Food and water are uncountable nouns.", partOfSpeech: "adjective", difficulty: 2, category: "grammar", source: "SESSION" as const, masteryLevel: 0, reviewCount: 0, correctCount: 0, incorrectCount: 0, srsInterval: 0, srsEase: 2.5, srsDue: now },
  ];

  // Spread createdAt across the past ~11 months so the vocabulary-growth chart
  // shows a realistic curve for all ranges (7d / 30d / all). Words are assigned
  // progressively older dates per user, with the most recent few landing inside
  // the last 7 and 30 days.
  const byUser = new Map<string, typeof vocabItems>();
  for (const item of vocabItems) {
    const list = byUser.get(item.userId) ?? [];
    list.push(item);
    byUser.set(item.userId, list);
  }

  for (const [, items] of byUser) {
    const n = items.length;
    // Oldest word ~330 days ago, newest ~2 days ago, evenly spaced
    const oldestDaysAgo = 330;
    const newestDaysAgo = 2;
    for (let i = 0; i < n; i++) {
      const frac = n === 1 ? 0 : i / (n - 1);
      const daysAgo = Math.round(oldestDaysAgo - frac * (oldestDaysAgo - newestDaysAgo));
      const createdAt = new Date(now.getTime() - daysAgo * 86400000);
      await prisma.vocabulary.create({ data: { ...items[i]!, createdAt } });
    }
  }
  // Assigned word — tutor pushes to Ali; captured so VOCABULARY_ASSIGNED notification can reference it
  const assignedVocab = await prisma.vocabulary.create({
    data: {
      userId: student1.id,
      word: "perseverance",
      definition: "Continued effort and determination despite difficulty or failure",
      pronunciation: "/ˌpɜːrsɪˈvɪərəns/",
      example: "Learning English requires perseverance, but the results are worth it.",
      partOfSpeech: "noun",
      difficulty: 4,
      category: "academic",
      source: "ASSIGNED",
      assignedByTutorId: tutor.id,
      masteryLevel: 0,
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      srsInterval: 0,
      srsEase: 2.5,
      srsDue: new Date(),
    },
  });
  console.log(`   ✅ ${vocabItems.length + 1} vocabulary items (10 Ali + 1 assigned, 8 Yuki) with varied SRS states + spread createdAt\n`);

  // ─── Goals ──────────────────────────────────────────────────────────────────
  console.log("🎯 Creating goals...");

  // Ali — 1 completed + 3 active
  const aliGoalCompleted = await prisma.goal.create({
    data: {
      userId: student1.id,
      type: "CONVERSATION",
      description: "Complete 5 conversation sessions to build speaking confidence",
      target: 5,
      difficulty: "EASY",
      status: "COMPLETED",
      progress: 100,
      completedDate: daysAgo(4),
      lastProgressUpdate: daysAgo(4),
      targetDate: daysAgo(3),
      actionPlan: "Have one session every 2-3 days. Focus on fluency over accuracy.",
    },
  });
  await prisma.goal.create({
    data: {
      userId: student1.id,
      assignedByTutorId: tutor.id,
      type: "VOCABULARY",
      description: "Learn 50 new business English words",
      target: 50,
      difficulty: "MEDIUM",
      status: "ACTIVE",
      progress: 40,
      lastProgressUpdate: daysAgo(1),
      targetDate: new Date(Date.now() + 20 * 86400000),
      actionPlan: "Review 5 new words daily using flashcards. Focus on tech and business vocabulary.",
    },
  });
  await prisma.goal.create({
    data: {
      userId: student1.id,
      type: "STUDY_TIME",
      description: "Study English for 30 minutes every day this month",
      target: 30,
      difficulty: "EASY",
      status: "ACTIVE",
      progress: 70,
      lastProgressUpdate: new Date(),
    },
  });
  const aliGoalSpeaking = await prisma.goal.create({
    data: {
      userId: student1.id,
      assignedByTutorId: tutor.id,
      type: "SPEAKING",
      description: "Achieve average pronunciation score of 85+ in voice sessions",
      target: 85,
      difficulty: "HARD",
      status: "ACTIVE",
      progress: 82,
      lastProgressUpdate: daysAgo(0, 9, 20),
      targetDate: new Date(Date.now() + 30 * 86400000),
      actionPlan: "Record voice messages daily. Focus on -ing endings and multi-syllable words.",
    },
  });

  // Yuki — 1 active
  const yukiGoalConversation = await prisma.goal.create({
    data: {
      userId: student2.id,
      assignedByTutorId: tutor.id,
      type: "CONVERSATION",
      description: "Complete 10 conversation sessions to build confidence",
      target: 10,
      difficulty: "MEDIUM",
      status: "ACTIVE",
      progress: 30,
      lastProgressUpdate: daysAgo(2),
      targetDate: new Date(Date.now() + 30 * 86400000),
    },
  });
  console.log("   ✅ 5 goals (Ali: 1 completed + 3 active; Yuki: 1 active)\n");

  // ─── Progress Snapshots (14 days) ──────────────────────────────────────────
  console.log("📈 Creating 14 days of progress snapshots...");

  // Ali — daily for last 10 days (missed 4 days ago, showing streak break)
  const aliProgress = [
    { date: dayStart(13), sessionsCount: 1, studyMinutes: 30, messagesCount: 6,  wordsTyped: 280, vocabularyPracticed: 5,  goalsAdvanced: 1, pronunciationScore: null,  skillSnapshot: { grammar: 60, vocabulary: 63, fluency: 60 } },
    { date: dayStart(12), sessionsCount: 0, studyMinutes: 0,  messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 3,  goalsAdvanced: 0, pronunciationScore: null,  skillSnapshot: { grammar: 60, vocabulary: 63, fluency: 60 } },
    { date: dayStart(11), sessionsCount: 1, studyMinutes: 40, messagesCount: 6,  wordsTyped: 350, vocabularyPracticed: 6,  goalsAdvanced: 1, pronunciationScore: null,  skillSnapshot: { grammar: 62, vocabulary: 65, fluency: 62 } },
    { date: dayStart(10), sessionsCount: 0, studyMinutes: 0,  messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 4,  goalsAdvanced: 0, pronunciationScore: null,  skillSnapshot: { grammar: 62, vocabulary: 65, fluency: 62 } },
    { date: dayStart(9),  sessionsCount: 1, studyMinutes: 25, messagesCount: 4,  wordsTyped: 180, vocabularyPracticed: 4,  goalsAdvanced: 1, pronunciationScore: 78.5,  skillSnapshot: { grammar: 65, vocabulary: 66, fluency: 64 } },
    { date: dayStart(8),  sessionsCount: 0, studyMinutes: 15, messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 5,  goalsAdvanced: 0, pronunciationScore: null,  skillSnapshot: { grammar: 65, vocabulary: 66, fluency: 64 } },
    { date: dayStart(7),  sessionsCount: 1, studyMinutes: 35, messagesCount: 6,  wordsTyped: 400, vocabularyPracticed: 6,  goalsAdvanced: 2, pronunciationScore: null,  skillSnapshot: { grammar: 67, vocabulary: 68, fluency: 66 } },
    { date: dayStart(6),  sessionsCount: 0, studyMinutes: 0,  messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 3,  goalsAdvanced: 0, pronunciationScore: null,  skillSnapshot: { grammar: 67, vocabulary: 68, fluency: 66 } },
    { date: dayStart(5),  sessionsCount: 1, studyMinutes: 30, messagesCount: 6,  wordsTyped: 360, vocabularyPracticed: 7,  goalsAdvanced: 2, pronunciationScore: 82.0,  skillSnapshot: { grammar: 68, vocabulary: 70, fluency: 68 } },
    { date: dayStart(4),  sessionsCount: 0, studyMinutes: 0,  messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 0,  goalsAdvanced: 0, pronunciationScore: null,  skillSnapshot: { grammar: 68, vocabulary: 70, fluency: 68 } },
    { date: dayStart(3),  sessionsCount: 1, studyMinutes: 45, messagesCount: 6,  wordsTyped: 480, vocabularyPracticed: 8,  goalsAdvanced: 1, pronunciationScore: null,  skillSnapshot: { grammar: 70, vocabulary: 72, fluency: 69 } },
    { date: dayStart(2),  sessionsCount: 0, studyMinutes: 10, messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 4,  goalsAdvanced: 0, pronunciationScore: null,  skillSnapshot: { grammar: 70, vocabulary: 72, fluency: 69 } },
    { date: dayStart(1),  sessionsCount: 0, studyMinutes: 20, messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 5,  goalsAdvanced: 0, pronunciationScore: null,  skillSnapshot: { grammar: 70, vocabulary: 73, fluency: 70 } },
    { date: dayStart(0),  sessionsCount: 1, studyMinutes: 20, messagesCount: 4,  wordsTyped: 200, vocabularyPracticed: 3,  goalsAdvanced: 1, pronunciationScore: 85.5,  skillSnapshot: { grammar: 71, vocabulary: 74, fluency: 70 } },
  ];

  for (const entry of aliProgress) {
    await prisma.progress.create({ data: { userId: student1.id, ...entry } });
  }

  // Yuki — sparser (fewer study days)
  const yukiProgress = [
    { date: dayStart(12), sessionsCount: 1, studyMinutes: 20, messagesCount: 4,  wordsTyped: 120, vocabularyPracticed: 3,  goalsAdvanced: 1, pronunciationScore: null, skillSnapshot: { grammar: 42, vocabulary: 44, fluency: 40 } },
    { date: dayStart(11), sessionsCount: 0, studyMinutes: 0,  messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 2,  goalsAdvanced: 0, pronunciationScore: null, skillSnapshot: { grammar: 42, vocabulary: 44, fluency: 40 } },
    { date: dayStart(9),  sessionsCount: 0, studyMinutes: 10, messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 3,  goalsAdvanced: 0, pronunciationScore: null, skillSnapshot: { grammar: 43, vocabulary: 45, fluency: 41 } },
    { date: dayStart(6),  sessionsCount: 1, studyMinutes: 25, messagesCount: 6,  wordsTyped: 180, vocabularyPracticed: 4,  goalsAdvanced: 1, pronunciationScore: null, skillSnapshot: { grammar: 45, vocabulary: 48, fluency: 43 } },
    { date: dayStart(4),  sessionsCount: 0, studyMinutes: 5,  messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 2,  goalsAdvanced: 0, pronunciationScore: null, skillSnapshot: { grammar: 45, vocabulary: 48, fluency: 43 } },
    { date: dayStart(2),  sessionsCount: 1, studyMinutes: 30, messagesCount: 6,  wordsTyped: 220, vocabularyPracticed: 5,  goalsAdvanced: 1, pronunciationScore: null, skillSnapshot: { grammar: 48, vocabulary: 52, fluency: 47 } },
    { date: dayStart(0),  sessionsCount: 0, studyMinutes: 0,  messagesCount: 0,  wordsTyped: 0,   vocabularyPracticed: 2,  goalsAdvanced: 0, pronunciationScore: null, skillSnapshot: { grammar: 48, vocabulary: 52, fluency: 47 } },
  ];

  for (const entry of yukiProgress) {
    await prisma.progress.create({ data: { userId: student2.id, ...entry } });
  }

  console.log(`   ✅ 14 Ali + 7 Yuki = 21 progress entries over 14-day window\n`);

  // ─── Class Announcements ────────────────────────────────────────────────────
  console.log("📢 Creating class announcements...");
  await prisma.announcement.create({
    data: {
      classId: sarahClass.id,
      authorId: tutor.id,
      content: "Welcome to Week 3! This week we're focusing on past tenses. Please complete at least 2 conversation sessions before our next meeting. Good luck! 🎯",
    },
  });
  await prisma.announcement.create({
    data: {
      classId: sarahClass.id,
      authorId: tutor.id,
      content: "Homework reminder: Practice ordering at a restaurant or café using 'Could I have...' and 'I'd like...'. Try a real roleplay with the AI tutor!",
    },
  });
  await prisma.announcement.create({
    data: {
      classId: sarahClass.id,
      authorId: tutor.id,
      content: "Great progress this week everyone! Ali is showing excellent B2-level vocabulary. Yuki has improved her polite request forms significantly. Keep it up! 💪",
    },
  });
  console.log("   ✅ 3 class announcements\n");

  // ─── Tasks ──────────────────────────────────────────────────────────────────
  console.log("📝 Creating tasks...");
  const task1 = await prisma.task.create({
    data: {
      classId: sarahClass.id,
      createdById: tutor.id,
      title: "Write a diary entry",
      description: "Write a 100-word diary entry about your day using past simple tense. Focus on accurate article usage and time expressions. Submit as text.",
      deadline: new Date(Date.now() + 7 * 86400000),
      status: "OPEN",
    },
  });
  const task2 = await prisma.task.create({
    data: {
      classId: sarahClass.id,
      createdById: tutor.id,
      title: "Café roleplay recording",
      description: "Record yourself ordering food and asking about prices at a café. Use 'Could I have...' and 'How much is...' polite forms. Upload as audio file.",
      deadline: new Date(Date.now() + 14 * 86400000),
      status: "OPEN",
    },
  });
  // Yuki has already submitted task2 — mirrors the real TASK_SUBMITTED notification flow
  await prisma.taskSubmission.create({
    data: {
      taskId: task2.id,
      studentId: student2.id,
      content: "Here is my café roleplay! I practiced ordering a coffee and a piece of cake and asking the price. It felt very natural!",
    },
  });
  console.log("   ✅ 2 tasks (both OPEN) + 1 submission (Yuki → task2)\n");

  // ─── Notifications ──────────────────────────────────────────────────────────
  console.log("🔔 Creating notifications...");
  // STREAK_MILESTONE — no routing target entity, data intentionally omitted
  await prisma.notification.create({
    data: {
      userId: student1.id,
      type: "STREAK_MILESTONE",
      message: "🔥 You've reached a 10-day study streak! Keep it up, Ali — consistency is the key to fluency.",
      read: false,
    },
  });
  await prisma.notification.create({
    data: {
      userId: student1.id,
      type: "GOAL_COMPLETED",
      message: "🎉 You completed your goal: 'Complete 5 conversation sessions'. Your consistency paid off!",
      read: true,
      data: { goalId: aliGoalCompleted.id },
    },
  });
  await prisma.notification.create({
    data: {
      userId: student1.id,
      type: "GOAL_ASSIGNED",
      message: "📋 Sarah Johnson assigned you a new goal: 'Achieve average pronunciation score of 85+'. Check your goals page.",
      read: false,
      data: { goalId: aliGoalSpeaking.id },
    },
  });
  await prisma.notification.create({
    data: {
      userId: student1.id,
      type: "TASK_ASSIGNED",
      message: `📝 Sarah Johnson assigned you a new task in Sarah's ESL Class: "Write a diary entry". Deadline in 7 days.`,
      read: false,
      data: { classId: sarahClass.id, taskId: task1.id },
    },
  });
  await prisma.notification.create({
    data: {
      userId: student1.id,
      type: "VOCABULARY_ASSIGNED",
      message: `📖 Your tutor assigned you a new word: "perseverance". Head to your vocabulary page to start learning it.`,
      read: false,
      data: { vocabularyId: assignedVocab.id },
    },
  });
  // Goes to the tutor — student submitted their task
  await prisma.notification.create({
    data: {
      userId: tutor.id,
      type: "TASK_SUBMITTED",
      message: `✅ Yuki Tanaka submitted "Café roleplay recording". Review their work in Sarah's ESL Class.`,
      read: false,
      data: { classId: sarahClass.id, taskId: task2.id },
    },
  });
  await prisma.notification.create({
    data: {
      userId: student2.id,
      type: "CLASS_ANNOUNCEMENT",
      message: "📢 New announcement from Sarah Johnson in Sarah's ESL Class: 'Great progress this week everyone! ...'",
      read: false,
      data: { classId: sarahClass.id },
    },
  });
  console.log("   ✅ 7 notifications — one per NotificationType, all with data field where applicable\n");

  // ─── Summary ────────────────────────────────────────────────────────────────
  const counts = {
    users: await prisma.user.count(),
    classes: await prisma.class.count(),
    classUsers: await prisma.classUser.count(),
    learnerProfiles: await prisma.learnerProfile.count(),
    subscriptions: await prisma.subscription.count(),
    userMetrics: await prisma.userMetrics.count(),
    sessions: await prisma.conversationSession.count(),
    messages: await prisma.message.count(),
    messageEvaluations: await prisma.messageEvaluation.count(),
    sessionEvaluations: await prisma.sessionEvaluation.count(),
    vocabularies: await prisma.vocabulary.count(),
    goals: await prisma.goal.count(),
    progress: await prisma.progress.count(),
    announcements: await prisma.announcement.count(),
    tasks: await prisma.task.count(),
    taskSubmissions: await prisma.taskSubmission.count(),
    notifications: await prisma.notification.count(),
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
  console.log("   • Admin:     admin_main");
  console.log("   • Tutor:     tutor_sarah (class code: SARAH123, expires in 7 days)");
  console.log("   • Student 1: student_ali  (PREMIUM, level B1 → trending B2, 10-day streak)");
  console.log("   • Student 2: student_yuki (FREE, level A2 → trending B1, 4-day streak)");
  console.log("   • Internal:  sys_monitor  (stealth ADMIN — hidden from listings/dashboards)");
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
