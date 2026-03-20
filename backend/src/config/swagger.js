'use strict';
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ESL Chatbot API v2',
      version: '2.0.0',
      description: 'ESL Chatbot API v2 — lightweight health & status endpoints',
    },
    servers: [{ url: 'http://localhost:3002', description: 'v2 Development server' }],
    components: {
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            version: { type: 'string', example: '2.0.0' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', example: 3600 }
          }
        },
        StatusResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                ai: { type: 'boolean' },
                tts: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Status', description: 'Service status endpoints' }
    ]
  },
  apis: [path.join(__dirname, '../api/v2/**/*.js')]
};
const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
