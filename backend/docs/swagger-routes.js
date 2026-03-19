/**
 * Centralized Swagger route docs.
 * These annotations are picked up by swagger-jsdoc.
 */

// ============================================================================
// JWT AUTH ROUTES
// ============================================================================

/**
 * @swagger
 * /api/auth/jwt/signup:
 *   post:
 *     summary: Create a new account and receive JWT tokens
 *     tags: [JWT Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Account created, tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */

/**
 * @swagger
 * /api/auth/jwt/signin:
 *   post:
 *     summary: Sign in and receive access + refresh tokens
 *     tags: [JWT Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Signed in, tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenResponse'
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /api/auth/jwt/refresh:
 *   post:
 *     summary: Refresh access token using a valid refresh token (rotation)
 *     tags: [JWT Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: New token pair returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       401:
 *         description: Refresh token invalid, expired, or revoked
 */

/**
 * @swagger
 * /api/auth/jwt/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [JWT Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Logged out successfully
 */

/**
 * @swagger
 * /api/auth/jwt/profile:
 *   get:
 *     summary: Get authenticated user profile (protected)
 *     tags: [JWT Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Access token missing or invalid
 */

// ============================================================================
// SESSION AUTH ROUTES (legacy)
// ============================================================================

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user account (session-based, legacy)
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
 *     summary: Login and create session (legacy)
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
 *     summary: Logout current user (session-based, legacy)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Get session status (legacy)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Session status returned
 */

// ============================================================================
// CHAT
// ============================================================================

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send chat message to AI tutor
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
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

// ============================================================================
// PROGRESS
// ============================================================================

/**
 * @swagger
 * /api/progress:
 *   get:
 *     summary: Get current user's progress
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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

// ============================================================================
// SETTINGS
// ============================================================================

/**
 * @swagger
 * /api/settings/{userId}:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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

// ============================================================================
// UPLOADS
// ============================================================================

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
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

// ============================================================================
// VOICE
// ============================================================================

/**
 * @swagger
 * /api/voice-message:
 *   post:
 *     summary: Process a voice message using fallback LLM route
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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

// ============================================================================
// VOCABULARY
// ============================================================================

/**
 * @swagger
 * /api/vocabulary:
 *   get:
 *     summary: Get current user's vocabulary list
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vocabulary list returned
 *   post:
 *     summary: Add vocabulary item
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
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
 *       - bearerAuth: []
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
 *       - bearerAuth: []
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
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Practice words returned
 *   post:
 *     summary: Submit vocabulary practice result
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quiz returned
 */

// ============================================================================
// GOALS
// ============================================================================

/**
 * @swagger
 * /api/goals:
 *   get:
 *     summary: List user goals
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Goals returned
 *   post:
 *     summary: Create a new goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
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
 *       - bearerAuth: []
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
 *       - bearerAuth: []
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
 *       - bearerAuth: []
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
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suggestions returned
 */

// ============================================================================
// PRONUNCIATION
// ============================================================================

/**
 * @swagger
 * /api/pronunciation/analyze:
 *   post:
 *     summary: Analyze pronunciation from uploaded audio
 *     tags: [Pronunciation]
 *     security:
 *       - bearerAuth: []
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

// ============================================================================
// SUBSCRIPTION
// ============================================================================

/**
 * @swagger
 * /api/subscription/status:
 *   get:
 *     summary: Get current user's subscription and usage status
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage reset
 */

// ============================================================================
// DASHBOARD & USAGE (defined in app-api.js)
// ============================================================================

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats returned
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /api/usage:
 *   get:
 *     summary: Get current user's TTS usage and limits
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage info returned
 *       401:
 *         description: Not authenticated
 */

module.exports = {};

// ============================================================================
// LEARNER PROFILE
// ============================================================================

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get the authenticated student's learner profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Learner profile returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LearnerProfile'
 *       401:
 *         description: Not authenticated
 *   put:
 *     summary: Update the authenticated student's learner profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LearnerProfileRequest'
 *     responses:
 *       200:
 *         description: Learner profile updated
 */

// ============================================================================
// TUTOR DASHBOARD
// ============================================================================

/**
 * @swagger
 * /api/tutor/students:
 *   get:
 *     summary: List all students belonging to the authenticated tutor
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student list returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Tutor role required
 *   post:
 *     summary: Create a new student account under the authenticated tutor
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Student account created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Tutor role required
 */

/**
 * @swagger
 * /api/tutor/students/{studentId}/progress:
 *   get:
 *     summary: View a specific student's progress history
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Student progress snapshots returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgressSnapshot'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /api/tutor/students/{studentId}/goals:
 *   post:
 *     summary: Assign a learning goal to a student
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGoalRequest'
 *     responses:
 *       201:
 *         description: Goal assigned to student
 *       403:
 *         description: Tutor role required
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /api/tutor/students/{studentId}/metrics:
 *   get:
 *     summary: View a student's live metrics (streaks, skill scores, etc.)
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student metrics returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserMetrics'
 *       403:
 *         description: Access denied
 */

// ============================================================================
// ADMIN PANEL
// ============================================================================

/**
 * @swagger
 * /api/admin/tutors:
 *   get:
 *     summary: List all tutors in the system
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tutor list returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Admin role required
 *   post:
 *     summary: Register a new tutor account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Tutor account created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin role required
 */

/**
 * @swagger
 * /api/admin/tutors/{tutorId}/students:
 *   get:
 *     summary: View all students belonging to a specific tutor
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student list returned
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Tutor not found
 */

/**
 * @swagger
 * /api/admin/overview:
 *   get:
 *     summary: Get system-wide statistics (total users, active students, tutors, sessions)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System overview returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStudents:
 *                       type: integer
 *                     totalTutors:
 *                       type: integer
 *                     totalAdmins:
 *                       type: integer
 *                     activeSessions:
 *                       type: integer
 *                     totalMessages:
 *                       type: integer
 *       403:
 *         description: Admin role required
 */

