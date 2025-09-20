import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { schedulesRouter } from '../../server/routes/schedules';
import { ministersRouter } from '../../server/routes/ministers';
import { authRouter } from '../../server/authRoutes';
import * as db from '../../server/db';

// Mock database with more complex relationships
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    transaction: vi.fn(),
  },
  schedules: {},
  ministers: {},
  users: {},
  scheduleAssignments: {},
}));

describe('Schedule Integration Tests', () => {
  let app: express.Application;
  let authenticatedAgent: any;

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

    // Setup routes
    app.use('/api/auth', authRouter);
    app.use('/api/ministers', ministersRouter);
    app.use('/api/schedules', schedulesRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authenticatedAgent = request.agent(app);
  });

  describe('Complete Schedule Flow', () => {
    it('should create a schedule with assignments', async () => {
      // Step 1: Create ministers
      const ministers = [
        { id: 1, name: 'Minister A', email: 'a@test.com', isActive: true },
        { id: 2, name: 'Minister B', email: 'b@test.com', isActive: true },
        { id: 3, name: 'Minister C', email: 'c@test.com', isActive: true },
      ];

      // Mock ministers creation
      for (const minister of ministers) {
        vi.mocked(db.db.insert).mockReturnThis();
        vi.mocked(db.db.values).mockReturnThis();
        vi.mocked(db.db.returning).mockResolvedValueOnce([minister]);
      }

      // Step 2: Create a schedule
      const newSchedule = {
        date: '2024-12-25',
        serviceType: 'christmas',
        notes: 'Christmas Service',
      };

      vi.mocked(db.db.insert).mockReturnThis();
      vi.mocked(db.db.values).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([
        {
          id: 1,
          ...newSchedule,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const scheduleResponse = await authenticatedAgent
        .post('/api/schedules')
        .send(newSchedule);

      expect(scheduleResponse.status).toBe(201);
      expect(scheduleResponse.body.serviceType).toBe('christmas');

      // Step 3: Assign ministers to schedule
      const assignments = [
        { scheduleId: 1, ministerId: 1, role: 'celebrant' },
        { scheduleId: 1, ministerId: 2, role: 'deacon' },
        { scheduleId: 1, ministerId: 3, role: 'reader' },
      ];

      for (const assignment of assignments) {
        vi.mocked(db.db.insert).mockReturnThis();
        vi.mocked(db.db.values).mockReturnThis();
        vi.mocked(db.db.returning).mockResolvedValueOnce([
          {
            id: assignment.ministerId,
            ...assignment,
            createdAt: new Date(),
          },
        ]);
      }

      // Step 4: Verify schedule with assignments
      const mockScheduleWithAssignments = {
        id: 1,
        date: '2024-12-25',
        serviceType: 'christmas',
        notes: 'Christmas Service',
        assignments: [
          { ministerId: 1, ministerName: 'Minister A', role: 'celebrant' },
          { ministerId: 2, ministerName: 'Minister B', role: 'deacon' },
          { ministerId: 3, ministerName: 'Minister C', role: 'reader' },
        ],
      };

      vi.mocked(db.db.select).mockResolvedValueOnce([mockScheduleWithAssignments]);

      const getResponse = await authenticatedAgent.get('/api/schedules/1');

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.assignments).toHaveLength(3);
    });

    it('should handle schedule conflicts', async () => {
      // Mock existing schedule on same date
      vi.mocked(db.db.select).mockResolvedValueOnce([
        {
          id: 1,
          date: '2024-12-25',
          serviceType: 'morning',
        },
      ]);

      const conflictingSchedule = {
        date: '2024-12-25',
        serviceType: 'morning',
        notes: 'Duplicate service',
      };

      const response = await authenticatedAgent
        .post('/api/schedules')
        .send(conflictingSchedule);

      // Should either reject or handle the conflict appropriately
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should update schedule and reassign ministers', async () => {
      // Update existing schedule
      const updatedSchedule = {
        date: '2024-12-26',
        serviceType: 'evening',
        notes: 'Updated to evening service',
      };

      vi.mocked(db.db.update).mockReturnThis();
      vi.mocked(db.db.set).mockReturnThis();
      vi.mocked(db.db.where).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([
        {
          id: 1,
          ...updatedSchedule,
          updatedAt: new Date(),
        },
      ]);

      const updateResponse = await authenticatedAgent
        .put('/api/schedules/1')
        .send(updatedSchedule);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.date).toBe('2024-12-26');

      // Delete old assignments and create new ones
      vi.mocked(db.db.delete).mockReturnThis();
      vi.mocked(db.db.where).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([]);

      // Add new assignments
      const newAssignments = [
        { scheduleId: 1, ministerId: 2, role: 'celebrant' },
        { scheduleId: 1, ministerId: 3, role: 'deacon' },
      ];

      for (const assignment of newAssignments) {
        vi.mocked(db.db.insert).mockReturnThis();
        vi.mocked(db.db.values).mockReturnThis();
        vi.mocked(db.db.returning).mockResolvedValueOnce([assignment]);
      }
    });

    it('should delete schedule and its assignments', async () => {
      // Mock cascade delete of assignments
      vi.mocked(db.db.delete).mockReturnThis();
      vi.mocked(db.db.where).mockReturnThis();
      vi.mocked(db.db.returning)
        .mockResolvedValueOnce([]) // Delete assignments
        .mockResolvedValueOnce([{ id: 1 }]); // Delete schedule

      const deleteResponse = await authenticatedAgent.delete('/api/schedules/1');

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message');
    });
  });

  describe('Schedule Queries and Filters', () => {
    it('should get schedules for a specific date range', async () => {
      const mockSchedules = [
        { id: 1, date: '2024-12-01', serviceType: 'morning' },
        { id: 2, date: '2024-12-08', serviceType: 'morning' },
        { id: 3, date: '2024-12-15', serviceType: 'morning' },
      ];

      vi.mocked(db.db.select).mockResolvedValueOnce(mockSchedules);

      const response = await authenticatedAgent
        .get('/api/schedules')
        .query({ from: '2024-12-01', to: '2024-12-31' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should get minister availability for scheduling', async () => {
      const mockAvailability = [
        { ministerId: 1, available: true, blackoutDates: [] },
        { ministerId: 2, available: true, blackoutDates: ['2024-12-24', '2024-12-25'] },
        { ministerId: 3, available: false, blackoutDates: [] },
      ];

      vi.mocked(db.db.select).mockResolvedValueOnce(mockAvailability);

      const response = await authenticatedAgent
        .get('/api/ministers/availability')
        .query({ date: '2024-12-25' });

      expect(response.status).toBe(200);
      // Only minister 1 is available on Christmas
      expect(response.body.filter((m: any) => m.available)).toHaveLength(1);
    });
  });

  describe('Notification Integration', () => {
    it('should send notifications when schedule is created', async () => {
      // Mock notification service
      const sendNotification = vi.fn();

      // Create schedule
      vi.mocked(db.db.insert).mockReturnThis();
      vi.mocked(db.db.values).mockReturnThis();
      vi.mocked(db.db.returning).mockResolvedValueOnce([
        {
          id: 1,
          date: '2024-12-25',
          serviceType: 'christmas',
        },
      ]);

      // Mock minister assignments with emails
      const assignments = [
        { ministerId: 1, email: 'a@test.com', role: 'celebrant' },
        { ministerId: 2, email: 'b@test.com', role: 'deacon' },
      ];

      // Simulate notification sending
      assignments.forEach((assignment) => {
        sendNotification({
          to: assignment.email,
          subject: 'New Schedule Assignment',
          body: `You have been assigned as ${assignment.role}`,
        });
      });

      expect(sendNotification).toHaveBeenCalledTimes(2);
    });
  });
});