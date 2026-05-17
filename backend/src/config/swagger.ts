import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.ts";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ESL Chatbot API",
      version: "1.0.0",
      description: "AI-powered English learning platform API",
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            data: { nullable: true, example: null },
            errors: {
              type: "object",
              nullable: true,
              description: "Field-level validation errors (only present on 422 responses)",
              additionalProperties: { type: "string" },
              example: { email: "Invalid email address", password: "Password must be at least 8 characters" },
            },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 42 },
            totalPages: { type: "integer", example: 3 },
          },
        },
        LearnerProfile: {
          type: "object",
          nullable: true,
          properties: {
            id: { type: "string", format: "uuid" },
            currentLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"], nullable: true },
            targetLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"], nullable: true },
            learningPurpose: { type: "string", nullable: true },
            topicsOfInterest: { type: "array", items: { type: "string" }, nullable: true },
            aiPersonality: {
              type: "string",
              enum: ["FRIENDLY", "FORMAL", "CASUAL", "ENCOURAGING", "STRICT", "PATIENT"],
              nullable: true,
            },
            voiceSpeed: { type: "number", minimum: 0.5, maximum: 2.0, example: 1.0 },
            autoSpeak: { type: "boolean", example: false },
            uiLanguage: { type: "string", example: "en" },
            theme: { type: "string", enum: ["light", "dark"], example: "light" },
            weeklyGoalMinutes: { type: "integer", minimum: 5, maximum: 840, example: 60 },
            timezone: { type: "string", example: "Asia/Baghdad" },
          },
        },
        MyProfile: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string" },
            email: { type: "string", format: "email" },
            displayName: { type: "string" },
            avatarUrl: { type: "string", format: "uri", nullable: true },
            phoneNumber: { type: "string", nullable: true },
            role: { type: "string", enum: ["STUDENT", "TUTOR", "ADMIN"] },
            isActive: { type: "boolean" },
            authProvider: { type: "string", enum: ["LOCAL", "GOOGLE"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            subscription: {
              type: "object",
              nullable: true,
              properties: {
                plan: { type: "string", enum: ["FREE", "GOLD", "PREMIUM"] },
                status: { type: "string", enum: ["ACTIVE", "INACTIVE", "CANCELLED", "PAST_DUE"] },
                currentPeriodEnd: { type: "string", format: "date-time", nullable: true },
              },
            },
            learnerProfile: { $ref: "#/components/schemas/LearnerProfile" },
          },
        },
        Goal: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            assignedByTutorId: { type: "string", format: "uuid", nullable: true },
            type: {
              type: "string",
              enum: ["VOCABULARY", "SPEAKING", "GRAMMAR", "CONVERSATION", "STUDY_TIME"],
            },
            description: { type: "string" },
            target: { type: "integer", minimum: 1 },
            difficulty: { type: "string", enum: ["easy", "medium", "hard"], nullable: true },
            status: { type: "string", enum: ["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"] },
            progress: { type: "number", minimum: 0, maximum: 100 },
            actionPlan: { type: "string", nullable: true },
            startDate: { type: "string", format: "date-time" },
            targetDate: { type: "string", format: "date-time", nullable: true },
            completedDate: { type: "string", format: "date-time", nullable: true },
            lastProgressUpdate: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            assignedByTutor: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                displayName: { type: "string" },
                avatarUrl: { type: "string", format: "uri", nullable: true },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing or invalid access token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Forbidden: {
          description: "Authenticated but insufficient permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ValidationError: {
          description: "Zod validation failure — malformed or missing fields",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  apis: ["./src/modules/**/*.router.ts", "./src/routes/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
