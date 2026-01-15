/**
 * Integration Tests for Authentication
 * 
 * Tests signup, login, logout, and auth status endpoints
 */

const request = require('supertest');

// We need to get the app without starting the server
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');

// Create a test app
const createTestApp = () => {
    const app = express();

    app.use(bodyParser.json());
    app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false
    }));

    // Load routes
    const authRoutes = require('../routes/authRoutes-api');
    app.use('/api/auth', authRoutes);

    return app;
};

describe('Authentication API', () => {
    let app;

    beforeAll(() => {
        app = createTestApp();
    });

    describe('POST /api/auth/signup', () => {
        it('should reject signup with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@test.com' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject signup with invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    username: 'testuser',
                    email: 'invalid-email',
                    password: 'password123'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should reject signup with short password', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    username: 'testuser',
                    email: 'test@test.com',
                    password: '123'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should reject login with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject login with wrong credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'wrongpassword'
                });

            // Should return 401 (user not found) or 400 (validation)
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/auth/status', () => {
        it('should return unauthenticated for no session', async () => {
            const res = await request(app)
                .get('/api/auth/status');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.authenticated).toBe(false);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should successfully logout', async () => {
            const res = await request(app)
                .post('/api/auth/logout');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
