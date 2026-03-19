/**
 * Swagger/OpenAPI Configuration
 * 
 * Provides interactive API documentation at /api/docs
 */

const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ESL Chatbot API',
            version: '1.0.0',
            description: 'AI-powered English as a Second Language learning platform API',
            contact: {
                name: 'API Support'
            }
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT access token. Obtain from POST /api/auth/jwt/signin'
                }
            },
            schemas: {
                // Standard response format
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' },
                        message: { type: 'string' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', example: 'VALIDATION_ERROR' },
                                message: { type: 'string' },
                                details: { type: 'array', items: { type: 'object' } }
                            }
                        }
                    }
                },
                // Auth schemas
                SignupRequest: {
                    type: 'object',
                    required: ['username', 'email', 'password'],
                    properties: {
                        username: { type: 'string', minLength: 2, maxLength: 60 },
                        displayName: { type: 'string', maxLength: 100 },
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 6 },
                        role: { type: 'string', enum: ['student', 'tutor', 'admin'], default: 'student' },
                        phone: { type: 'string', description: 'Required for tutor/admin accounts' }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        username: { type: 'string' },
                        displayName: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string', enum: ['student', 'tutor', 'admin'] },
                        tutorId: { type: 'integer', nullable: true, description: 'FK to tutor (student rows only)' },
                        adminId: { type: 'integer', nullable: true, description: 'FK to admin (tutor rows only)' },
                        phone: { type: 'string', nullable: true },
                        nativeLanguage: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                // Learner profile schema (student-only)
                LearnerProfile: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        currentLevel: { type: 'string', enum: ['beginner','elementary','intermediate','upper-intermediate','advanced','proficient'] },
                        targetLevel: { type: 'string', enum: ['beginner','elementary','intermediate','upper-intermediate','advanced','proficient'] },
                        learningPurpose: { type: 'string', example: 'work' },
                        topicsOfInterest: { type: 'array', items: { type: 'string' } },
                        aiPersonality: { type: 'string', enum: ['friendly', 'strict', 'formal'] },
                        voiceSpeed: { type: 'number', minimum: 0.5, maximum: 2.0 },
                        autoSpeak: { type: 'boolean' },
                        uiLanguage: { type: 'string', example: 'en' },
                        theme: { type: 'string', enum: ['light', 'dark', 'system'] },
                        weeklyGoalMinutes: { type: 'integer' },
                        timezone: { type: 'string', example: 'UTC' }
                    }
                },
                // Subscription schema (student-only)
                Subscription: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        plan: { type: 'string', enum: ['free', 'basic', 'pro'] },
                        status: { type: 'string', enum: ['active', 'trialing', 'cancelled', 'expired'] },
                        monthlyTtsUsage: { type: 'integer', description: 'TTS seconds used this month' },
                        currentPeriodStart: { type: 'string', format: 'date-time', nullable: true },
                        currentPeriodEnd: { type: 'string', format: 'date-time', nullable: true }
                    }
                },
                // Conversation session schema
                ConversationSession: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        mode: { type: 'string', enum: ['text', 'voice', 'lesson', 'pronunciation'] },
                        topic: { type: 'string', nullable: true },
                        summary: { type: 'string', nullable: true, description: 'AI-generated summary written at session close' },
                        startedAt: { type: 'string', format: 'date-time' },
                        endedAt: { type: 'string', format: 'date-time', nullable: true },
                        durationSeconds: { type: 'integer', nullable: true },
                        messageCount: { type: 'integer' },
                        averageScore: { type: 'number', nullable: true }
                    }
                },
                // JWT Auth schemas
                AuthTokenResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Sign in successful' },
                        data: {
                            type: 'object',
                            properties: {
                                user: { $ref: '#/components/schemas/User' },
                                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                                refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }
                            }
                        }
                    }
                },
                RefreshTokenRequest: {
                    type: 'object',
                    required: ['refreshToken'],
                    properties: {
                        refreshToken: { type: 'string' }
                    }
                },
                RefreshTokenResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Tokens refreshed successfully' },
                        data: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' }
                            }
                        }
                    }
                },
                // Chat schemas
                ChatRequest: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        message: { type: 'string', maxLength: 2000 },
                        sessionId: { type: 'integer', description: 'Existing session ID to continue; omit to start a new session' }
                    }
                },
                ChatResponse: {
                    type: 'object',
                    properties: {
                        response: { type: 'string' },
                        sessionId: { type: 'integer' },
                        aiEvaluation: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                grammarScore: { type: 'number' },
                                pronunciationScore: { type: 'number' },
                                corrections: { type: 'array', items: { type: 'object' } },
                                suggestions: { type: 'array', items: { type: 'string' } }
                            }
                        }
                    }
                },
                // Vocabulary schemas
                VocabularyItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        word: { type: 'string' },
                        definition: { type: 'string' },
                        example: { type: 'string' },
                        pronunciation: { type: 'string' },
                        partOfSpeech: { type: 'string' },
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                        category: { type: 'string' },
                        masteryLevel: { type: 'integer', minimum: 0, maximum: 5 },
                        srsInterval: { type: 'integer', description: 'Days until next SRS review' },
                        srsDue: { type: 'string', format: 'date', nullable: true },
                        reviewCount: { type: 'integer' },
                        correctCount: { type: 'integer' },
                        incorrectCount: { type: 'integer' }
                    }
                },
                CreateVocabularyRequest: {
                    type: 'object',
                    required: ['word', 'definition'],
                    properties: {
                        word: { type: 'string', maxLength: 100 },
                        definition: { type: 'string', maxLength: 1000 },
                        example: { type: 'string', maxLength: 500 },
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                        category: { type: 'string' }
                    }
                },
                // Goal schemas
                Goal: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        type: { type: 'string', example: 'vocabulary' },
                        description: { type: 'string' },
                        target: { type: 'integer' },
                        timeframe: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'custom'] },
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                        progress: { type: 'integer', minimum: 0, maximum: 100 },
                        status: { type: 'string', enum: ['active', 'completed', 'paused', 'cancelled'] },
                        assignedByTutorId: { type: 'integer', nullable: true },
                        startDate: { type: 'string', format: 'date' },
                        targetDate: { type: 'string', format: 'date', nullable: true },
                        completedDate: { type: 'string', format: 'date', nullable: true },
                        milestones: { type: 'array', items: { type: 'object' } },
                        actionPlan: { type: 'array', items: { type: 'string' } }
                    }
                },
                CreateGoalRequest: {
                    type: 'object',
                    required: ['type', 'target', 'timeframe'],
                    properties: {
                        type: { type: 'string' },
                        target: { type: 'integer', maximum: 10000 },
                        timeframe: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'custom'] },
                        description: { type: 'string', maxLength: 1000 },
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
                    }
                },
                // Progress schema (daily snapshot)
                ProgressSnapshot: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        date: { type: 'string', format: 'date' },
                        studyMinutes: { type: 'integer' },
                        messagesCount: { type: 'integer' },
                        wordsTyped: { type: 'integer' },
                        vocabularyPracticed: { type: 'integer' },
                        goalsAdvanced: { type: 'integer' },
                        pronunciationScore: { type: 'number', nullable: true },
                        skillSnapshot: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                grammar: { type: 'number' },
                                vocabulary: { type: 'number' },
                                reading: { type: 'number' },
                                writing: { type: 'number' },
                                speaking: { type: 'number' },
                                listening: { type: 'number' }
                            }
                        }
                    }
                },
                // User metrics (live dashboard totals)
                UserMetrics: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        totalStudyTimeMinutes: { type: 'integer' },
                        totalWordsTyped: { type: 'integer' },
                        lessonsCompleted: { type: 'integer' },
                        currentStreak: { type: 'integer' },
                        longestStreak: { type: 'integer' },
                        lastStudyDate: { type: 'string', format: 'date', nullable: true },
                        estimatedLevel: { type: 'string', enum: ['beginner','elementary','intermediate','upper-intermediate','advanced','proficient'], nullable: true },
                        grammarSkill: { type: 'number' },
                        vocabularySkill: { type: 'number' },
                        readingSkill: { type: 'number' },
                        writingSkill: { type: 'number' },
                        speakingSkill: { type: 'number' },
                        listeningSkill: { type: 'number' }
                    }
                },
                // Learner profile request
                LearnerProfileRequest: {
                    type: 'object',
                    properties: {
                        currentLevel: { type: 'string', enum: ['beginner','elementary','intermediate','upper-intermediate','advanced','proficient'] },
                        targetLevel: { type: 'string', enum: ['beginner','elementary','intermediate','upper-intermediate','advanced','proficient'] },
                        learningPurpose: { type: 'string' },
                        topicsOfInterest: { type: 'array', items: { type: 'string' } },
                        aiPersonality: { type: 'string', enum: ['friendly', 'strict', 'formal'] },
                        voiceSpeed: { type: 'number', minimum: 0.5, maximum: 2.0 },
                        autoSpeak: { type: 'boolean' },
                        uiLanguage: { type: 'string' },
                        theme: { type: 'string', enum: ['light', 'dark', 'system'] },
                        weeklyGoalMinutes: { type: 'integer' },
                        timezone: { type: 'string' }
                    }
                },
                TextToSpeechRequest: {
                    type: 'object',
                    required: ['text'],
                    properties: {
                        text: { type: 'string', example: 'Hello, welcome to your ESL lesson.' },
                        voiceId: { type: 'string' },
                        options: { type: 'object' }
                    }
                },
                // Health check
                HealthCheck: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'OK' },
                        timestamp: { type: 'string', format: 'date-time' },
                        services: {
                            type: 'object',
                            properties: {
                                database: { type: 'boolean' },
                                gemini: { type: 'boolean' },
                                elevenlabs: { type: 'boolean' }
                            }
                        },
                        memory: {
                            type: 'object',
                            properties: {
                                heapUsed: { type: 'string' },
                                heapTotal: { type: 'string' }
                            }
                        }
                    }
                }
            }
        },
        tags: [
            { name: 'Auth',         description: 'Session-based authentication (legacy)' },
            { name: 'JWT Auth',     description: 'JWT token-based authentication' },
            { name: 'Chat',         description: 'AI conversational tutor endpoints' },
            { name: 'Progress',     description: 'Student progress and analytics endpoints' },
            { name: 'Profile',      description: 'Learner profile and user settings' },
            { name: 'Voice',        description: 'Voice synthesis and voice-message endpoints' },
            { name: 'Pronunciation',description: 'Pronunciation analysis and feedback' },
            { name: 'Subscription', description: 'Student subscription and TTS usage (student-only)' },
            { name: 'Vocabulary',   description: 'Vocabulary builder and SRS flashcard system' },
            { name: 'Goals',        description: 'Learning goal setting and tracking' },
            { name: 'Tutor',        description: 'Tutor dashboard: manage and view student accounts' },
            { name: 'Admin',        description: 'Admin panel: manage tutors and full system view' },
            { name: 'Health',       description: 'System health checks' }
        ]
    },
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../controllers/*.js'),
        path.join(__dirname, '../docs/*.js')
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
