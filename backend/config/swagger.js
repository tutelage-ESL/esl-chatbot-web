/**
 * Swagger/OpenAPI Configuration
 * 
 * Provides interactive API documentation at /api/docs
 */

const swaggerJsdoc = require('swagger-jsdoc');

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
                sessionAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid',
                    description: 'Session-based authentication'
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
                        username: { type: 'string', minLength: 2, maxLength: 50 },
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 6 },
                        subscriptionTier: { type: 'string', enum: ['standard', 'gold', 'diamond'] }
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
                        email: { type: 'string' },
                        subscriptionTier: { type: 'string' }
                    }
                },
                // Chat schemas
                ChatRequest: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        message: { type: 'string', maxLength: 2000 }
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
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                        masteryLevel: { type: 'integer', minimum: 0, maximum: 100 }
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
                        type: { type: 'string' },
                        target: { type: 'integer' },
                        timeframe: { type: 'string', enum: ['week', 'month', 'quarter'] },
                        progress: { type: 'integer' },
                        status: { type: 'string', enum: ['active', 'completed', 'paused'] }
                    }
                },
                CreateGoalRequest: {
                    type: 'object',
                    required: ['type', 'target', 'timeframe'],
                    properties: {
                        type: { type: 'string' },
                        target: { type: 'integer', maximum: 10000 },
                        timeframe: { type: 'string', enum: ['week', 'month', 'quarter'] },
                        description: { type: 'string', maxLength: 1000 },
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
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
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Chat', description: 'AI chat endpoints' },
            { name: 'Vocabulary', description: 'Vocabulary management' },
            { name: 'Goals', description: 'Learning goals' },
            { name: 'Health', description: 'System health checks' }
        ]
    },
    apis: ['./routes/*.js', './controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
