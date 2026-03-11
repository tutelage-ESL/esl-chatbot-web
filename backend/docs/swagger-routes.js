/**
 * Centralized Swagger route docs.
 * These annotations are picked up by swagger-jsdoc.
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and create session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Logged in
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Get authentication/session status
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Session status returned
 */

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send chat message to AI tutor
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: Chat response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChatResponse'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /api/progress:
 *   get:
 *     summary: Get current user's progress
 *     tags: [Progress]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Progress fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProgressResponse'
 */

/**
 * @swagger
 * /api/progress/{userId}:
 *   get:
 *     summary: Get progress by user id
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User progress fetched
 */

/**
 * @swagger
 * /api/settings/{userId}:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Settings fetched
 *       404:
 *         description: Settings not found
 */

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Create or update user settings
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SettingsRequest'
 *     responses:
 *       200:
 *         description: Settings updated
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded
 */

/**
 * @swagger
 * /api/voice-message:
 *   post:
 *     summary: Process a voice message using fallback LLM route
 *     tags: [Voice]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Voice message processed
 */

/**
 * @swagger
 * /api/voices:
 *   get:
 *     summary: List available voices from ElevenLabs
 *     tags: [Voice]
 *     responses:
 *       200:
 *         description: Voice list returned
 *       503:
 *         description: Voice service unavailable
 */

/**
 * @swagger
 * /api/text-to-speech:
 *   post:
 *     summary: Convert text to speech audio buffer
 *     tags: [Voice]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TextToSpeechRequest'
 *     responses:
 *       200:
 *         description: Audio returned
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /api/text-to-speech-stream:
 *   post:
 *     summary: Stream text-to-speech audio
 *     tags: [Voice]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TextToSpeechRequest'
 *     responses:
 *       200:
 *         description: Streaming audio response
 */

/**
 * @swagger
 * /api/voice-status:
 *   get:
 *     summary: Get status of voice providers
 *     tags: [Voice]
 *     responses:
 *       200:
 *         description: Voice provider status
 */

/**
 * @swagger
 * /api/free-tts:
 *   post:
 *     summary: Free TTS proxy endpoint
 *     tags: [Voice]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Audio returned
 */

/**
 * @swagger
 * /api/vocabulary:
 *   get:
 *     summary: Get current user's vocabulary list
 *     tags: [Vocabulary]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Vocabulary list returned
 *   post:
 *     summary: Add vocabulary item
 *     tags: [Vocabulary]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVocabularyRequest'
 *     responses:
 *       201:
 *         description: Vocabulary item created
 */

/**
 * @swagger
 * /api/vocabulary/{id}:
 *   put:
 *     summary: Update a vocabulary item
 *     tags: [Vocabulary]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vocabulary item updated
 *   delete:
 *     summary: Delete a vocabulary item
 *     tags: [Vocabulary]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vocabulary item deleted
 */

/**
 * @swagger
 * /api/vocabulary/practice:
 *   get:
 *     summary: Get random practice words
 *     tags: [Vocabulary]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Practice words returned
 *   post:
 *     summary: Submit vocabulary practice result
 *     tags: [Vocabulary]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [wordId, correct]
 *             properties:
 *               wordId:
 *                 type: integer
 *               correct:
 *                 type: boolean
 *               timeSpent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Practice result recorded
 */

/**
 * @swagger
 * /api/vocabulary/quiz:
 *   get:
 *     summary: Generate a vocabulary quiz
 *     tags: [Vocabulary]
 *     responses:
 *       200:
 *         description: Quiz returned
 */

/**
 * @swagger
 * /api/goals:
 *   get:
 *     summary: List user goals
 *     tags: [Goals]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Goals returned
 *   post:
 *     summary: Create a new goal
 *     tags: [Goals]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGoalRequest'
 *     responses:
 *       201:
 *         description: Goal created
 */

/**
 * @swagger
 * /api/goals/{id}:
 *   put:
 *     summary: Update a goal
 *     tags: [Goals]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Goal updated
 *   delete:
 *     summary: Delete a goal
 *     tags: [Goals]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Goal deleted
 */

/**
 * @swagger
 * /api/goals/{id}/progress:
 *   post:
 *     summary: Record goal progress event
 *     tags: [Goals]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activity:
 *                 type: string
 *               value:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Goal progress recorded
 */

/**
 * @swagger
 * /api/goals/suggestions:
 *   get:
 *     summary: Get personalized goal suggestions
 *     tags: [Goals]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Suggestions returned
 */

/**
 * @swagger
 * /api/pronunciation/analyze:
 *   post:
 *     summary: Analyze pronunciation from uploaded audio
 *     tags: [Pronunciation]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [word, audio]
 *             properties:
 *               word:
 *                 type: string
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Pronunciation analysis returned
 */

/**
 * @swagger
 * /api/subscription/status:
 *   get:
 *     summary: Get current user's subscription and usage status
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: Subscription status returned
 */

/**
 * @swagger
 * /api/subscription/tier:
 *   post:
 *     summary: Update user's subscription tier
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tier]
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [standard, gold, diamond]
 *     responses:
 *       200:
 *         description: Tier updated
 */

/**
 * @swagger
 * /api/subscription/usage-history:
 *   get:
 *     summary: Get subscription usage history
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: Usage history returned
 */

/**
 * @swagger
 * /api/subscription/reset-usage:
 *   post:
 *     summary: Reset monthly usage counters (admin/testing)
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: Usage reset
 */

module.exports = {};
