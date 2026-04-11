import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.ts";

const projectRoot = process.cwd().replace(/\\/g, "/");

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
          },
        },
      },
    },
  },
  apis: [
    `${projectRoot}/src/modules/**/*.router.ts`,
    `${projectRoot}/src/routes/**/*.ts`,
  ],
};

export const swaggerSpec = (() => {
  try {
    return swaggerJsdoc(options);
  } catch (error) {
    console.warn("Swagger spec generation failed; continuing without API docs.", error);
    return {
      openapi: "3.0.0",
      info: {
        title: "ESL Chatbot API",
        version: "1.0.0",
        description: "Swagger unavailable at startup",
      },
      paths: {},
    };
  }
})();
