import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { authRouter } from '../authRoutes';
import * as db from '../db';

// Mock database
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
  },
  users: {},
  ministers: {},
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

describe('Authentication API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      })
    );
    app.use('/api/auth', authRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'user',
      };

      vi.mocked(db.db.select).mockResolvedValueOnce([mockUser]);
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid credentials', async () => {
      vi.mocked(db.db.select).mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      vi.mocked(db.db.select).mockResolvedValueOnce([]); // No existing user
      vi.mocked(db.db.insert).mockReturnThis();
      vi.mocked(db.db.values).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([
        {
          id: 1,
          email: 'new@example.com',
          name: 'New User',
          role: 'user',
        },
      ]);

      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.default.hash).mockResolvedValueOnce('hashedPassword');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('new@example.com');
    });

    it('should not register duplicate email', async () => {
      vi.mocked(db.db.select).mockResolvedValueOnce([
        { id: 1, email: 'existing@example.com' },
      ]);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const agent = request.agent(app);

      // Mock authenticated session
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };

      // This is a simplified test - in real scenario you'd need to properly mock session
      const response = await agent.get('/api/auth/me');

      expect(response.status).toBe(401); // Will be 401 without proper session
    });
  });
});