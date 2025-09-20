import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ministersRouter } from '../routes/ministers';
import * as db from '../db';

// Mock database
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    eq: vi.fn(),
  },
  ministers: {},
  users: {},
}));

describe('Ministers API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ministers', ministersRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/ministers', () => {
    it('should return list of ministers', async () => {
      const mockMinisters = [
        {
          id: 1,
          name: 'Minister 1',
          email: 'minister1@example.com',
          phone: '123456789',
          isActive: true,
        },
        {
          id: 2,
          name: 'Minister 2',
          email: 'minister2@example.com',
          phone: '987654321',
          isActive: true,
        },
      ];

      vi.mocked(db.db.select).mockResolvedValueOnce(mockMinisters);

      const response = await request(app).get('/api/ministers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Minister 1');
    });

    it('should handle empty minister list', async () => {
      vi.mocked(db.db.select).mockResolvedValueOnce([]);

      const response = await request(app).get('/api/ministers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/ministers/:id', () => {
    it('should return a specific minister', async () => {
      const mockMinister = {
        id: 1,
        name: 'Minister 1',
        email: 'minister1@example.com',
        phone: '123456789',
        isActive: true,
      };

      vi.mocked(db.db.select).mockResolvedValueOnce([mockMinister]);

      const response = await request(app).get('/api/ministers/1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Minister 1');
    });

    it('should return 404 for non-existent minister', async () => {
      vi.mocked(db.db.select).mockResolvedValueOnce([]);

      const response = await request(app).get('/api/ministers/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/ministers', () => {
    it('should create a new minister', async () => {
      const newMinister = {
        name: 'New Minister',
        email: 'new@example.com',
        phone: '555555555',
      };

      vi.mocked(db.db.insert).mockReturnThis();
      vi.mocked(db.db.values).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([
        {
          id: 3,
          ...newMinister,
          isActive: true,
        },
      ]);

      const response = await request(app)
        .post('/api/ministers')
        .send(newMinister);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Minister');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ministers')
        .send({
          email: 'incomplete@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/ministers/:id', () => {
    it('should update an existing minister', async () => {
      const updatedData = {
        name: 'Updated Minister',
        phone: '111111111',
      };

      vi.mocked(db.db.update).mockReturnThis();
      vi.mocked(db.db.set).mockReturnThis();
      vi.mocked(db.db.where).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([
        {
          id: 1,
          ...updatedData,
          email: 'minister1@example.com',
          isActive: true,
        },
      ]);

      const response = await request(app)
        .put('/api/ministers/1')
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Minister');
    });

    it('should return 404 for non-existent minister update', async () => {
      vi.mocked(db.db.update).mockReturnThis();
      vi.mocked(db.db.set).mockReturnThis();
      vi.mocked(db.db.where).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([]);

      const response = await request(app)
        .put('/api/ministers/999')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/ministers/:id', () => {
    it('should delete a minister', async () => {
      vi.mocked(db.db.delete).mockReturnThis();
      vi.mocked(db.db.where).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([
        {
          id: 1,
          name: 'Deleted Minister',
        },
      ]);

      const response = await request(app).delete('/api/ministers/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent minister delete', async () => {
      vi.mocked(db.db.delete).mockReturnThis();
      vi.mocked(db.db.where).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([]);

      const response = await request(app).delete('/api/ministers/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});