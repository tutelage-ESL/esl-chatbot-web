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
      },
    },
  },
  apis: ["./src/modules/**/*.router.ts", "./src/routes/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
