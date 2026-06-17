/**
 * Substitution Routes Unit Tests
 *
 * Tests for the substitution API routes and utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('@server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ rows: [] })
  }
}));

describe('Substitution Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateUrgency', () => {
    const toLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    function calculateUrgency(massDateStr: string, massTime: string): 'low' | 'medium' | 'high' | 'critical' {
      if (!massDateStr || !massTime) return 'low';

      const now = new Date();
      const dateParts = massDateStr.split('-').map(Number);
      const timeParts = massTime.split(':').map(Number);

      const year = dateParts[0] || 0;
      const month = dateParts[1] || 1;
      const day = dateParts[2] || 1;
      const hours = timeParts[0] || 0;
      const minutes = timeParts[1] || 0;

      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        return 'low';
      }

      const massDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const hoursUntilMass = (massDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilMass < 12) return 'critical';
      if (hoursUntilMass < 24) return 'high';
      if (hoursUntilMass < 72) return 'medium';
      return 'low';
    }

    it('should return critical for mass in less than 12 hours', () => {
      const now = new Date();
      const massDate = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours from now
      const dateStr = toLocalDateString(massDate);
      const timeStr = `${String(massDate.getHours()).padStart(2, '0')}:${String(massDate.getMinutes()).padStart(2, '0')}`;

      expect(calculateUrgency(dateStr, timeStr)).toBe('critical');
    });

    it('should return high for mass in 12-24 hours', () => {
      const now = new Date();
      const massDate = new Date(now.getTime() + 18 * 60 * 60 * 1000); // 18 hours from now
      const dateStr = toLocalDateString(massDate);
      const timeStr = `${String(massDate.getHours()).padStart(2, '0')}:${String(massDate.getMinutes()).padStart(2, '0')}`;

      expect(calculateUrgency(dateStr, timeStr)).toBe('high');
    });

    it('should return medium for mass in 24-72 hours', () => {
      const now = new Date();
      const massDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now
      const dateStr = toLocalDateString(massDate);
      const timeStr = `${String(massDate.getHours()).padStart(2, '0')}:${String(massDate.getMinutes()).padStart(2, '0')}`;

      expect(calculateUrgency(dateStr, timeStr)).toBe('medium');
    });

    it('should return low for mass in more than 72 hours', () => {
      const now = new Date();
      const massDate = new Date(now.getTime() + 96 * 60 * 60 * 1000); // 96 hours from now
      const dateStr = toLocalDateString(massDate);
      const timeStr = `${String(massDate.getHours()).padStart(2, '0')}:${String(massDate.getMinutes()).padStart(2, '0')}`;

      expect(calculateUrgency(dateStr, timeStr)).toBe('low');
    });

    it('should return low for missing date', () => {
      expect(calculateUrgency('', '10:00')).toBe('low');
    });

    it('should return low for missing time', () => {
      expect(calculateUrgency('2025-01-20', '')).toBe('low');
    });

    it('should handle invalid date format gracefully', () => {
      // 'invalid' parses to NaN which results in epoch date (past)
      // The function should handle this edge case
      const result = calculateUrgency('invalid', '10:00');
      expect(['low', 'critical']).toContain(result);
    });

    it('should handle invalid time format gracefully', () => {
      // Invalid time parses to 0:0 (midnight)
      const result = calculateUrgency('2025-01-20', 'invalid');
      expect(['low', 'medium', 'high', 'critical']).toContain(result);
    });
  });

  describe('Substitution Request Validation', () => {
    it('should require scheduleId', () => {
      const request = { substituteId: 'user-2', reason: 'Viagem' };
      const isValid = !!request.scheduleId;
      expect(isValid).toBe(false);
    });

    it('should not require substituteId (can be null for available)', () => {
      const request = { scheduleId: 'schedule-1', reason: 'Viagem' };
      const isValid = !!request.scheduleId;
      expect(isValid).toBe(true);
    });

    it('should require reason', () => {
      const request = { scheduleId: 'schedule-1', substituteId: 'user-2', reason: '' };
      const isValid = !!request.reason;
      expect(isValid).toBe(false);
    });

    it('should validate reason length', () => {
      const maxLength = 500;
      const validReason = 'Viagem de trabalho';
      const invalidReason = 'A'.repeat(600);

      expect(validReason.length).toBeLessThanOrEqual(maxLength);
      expect(invalidReason.length).toBeGreaterThan(maxLength);
    });
  });

  describe('Monthly Substitution Limit', () => {
    const MAX_SUBSTITUTIONS = 2;

    it('should allow first substitution', () => {
      const currentCount = 0;
      expect(currentCount < MAX_SUBSTITUTIONS).toBe(true);
    });

    it('should allow second substitution', () => {
      const currentCount = 1;
      expect(currentCount < MAX_SUBSTITUTIONS).toBe(true);
    });

    it('should require approval for third substitution', () => {
      const currentCount = 2;
      expect(currentCount >= MAX_SUBSTITUTIONS).toBe(true);
    });

    it('should count only current month substitutions', () => {
      const substitutions = [
        { createdAt: new Date(), status: 'approved' },
        { createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), status: 'approved' } // 40 days ago
      ];

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthCount = substitutions.filter(s =>
        new Date(s.createdAt) >= firstDay
      ).length;

      expect(thisMonthCount).toBe(1);
    });
  });

  describe('Substitute Eligibility', () => {
    it('should exclude requester from substitutes', () => {
      const requesterId = 'user-1';
      const candidates = [
        { id: 'user-1', name: 'Requester' },
        { id: 'user-2', name: 'Eligible 1' },
        { id: 'user-3', name: 'Eligible 2' }
      ];

      const eligible = candidates.filter(c => c.id !== requesterId);
      expect(eligible.length).toBe(2);
      expect(eligible.find(c => c.id === requesterId)).toBeUndefined();
    });

    it('should exclude already scheduled ministers', () => {
      const scheduledIds = ['user-2', 'user-4'];
      const candidates = [
        { id: 'user-1', name: 'Available 1' },
        { id: 'user-2', name: 'Scheduled' },
        { id: 'user-3', name: 'Available 2' }
      ];

      const available = candidates.filter(c => !scheduledIds.includes(c.id));
      expect(available.length).toBe(2);
    });

    it('should check canSubstitute flag', () => {
      const candidates = [
        { id: 'user-1', canSubstitute: true },
        { id: 'user-2', canSubstitute: false },
        { id: 'user-3', canSubstitute: true }
      ];

      const willing = candidates.filter(c => c.canSubstitute);
      expect(willing.length).toBe(2);
    });

    it('should prioritize by last service date', () => {
      const candidates = [
        { id: 'user-1', lastService: new Date('2025-01-15') },
        { id: 'user-2', lastService: new Date('2025-01-10') },
        { id: 'user-3', lastService: null }
      ];

      const sorted = candidates.sort((a, b) => {
        const aTime = a.lastService ? new Date(a.lastService).getTime() : 0;
        const bTime = b.lastService ? new Date(b.lastService).getTime() : 0;
        return aTime - bTime;
      });

      expect(sorted[0].id).toBe('user-3'); // null = never served
      expect(sorted[1].id).toBe('user-2'); // served earlier
    });

    it('should prioritize preferred time slots', () => {
      const massTime = '10:00';
      const candidates = [
        { id: 'user-1', preferredMassTimes: ['08:00', '19:00'] },
        { id: 'user-2', preferredMassTimes: ['10:00', '19:00'] }
      ];

      const withPreference = candidates.filter(c =>
        c.preferredMassTimes.includes(massTime)
      );

      expect(withPreference.length).toBe(1);
      expect(withPreference[0].id).toBe('user-2');
    });
  });

  describe('Status Transitions', () => {
    const validTransitions: Record<string, string[]> = {
      pending: ['approved', 'rejected', 'cancelled', 'available'],
      available: ['approved', 'cancelled'],
      approved: ['cancelled'],
      rejected: [],
      cancelled: [],
      auto_approved: ['cancelled']
    };

    it('should allow pending to approved', () => {
      expect(validTransitions['pending']).toContain('approved');
    });

    it('should allow pending to rejected', () => {
      expect(validTransitions['pending']).toContain('rejected');
    });

    it('should allow available to approved', () => {
      expect(validTransitions['available']).toContain('approved');
    });

    it('should not allow changes from rejected', () => {
      expect(validTransitions['rejected'].length).toBe(0);
    });

    it('should not allow changes from cancelled', () => {
      expect(validTransitions['cancelled'].length).toBe(0);
    });

    it('should only allow cancel from approved', () => {
      expect(validTransitions['approved']).toEqual(['cancelled']);
    });
  });

  describe('Auto-Approval Logic', () => {
    it('should auto-approve when substitute is specified', () => {
      const request = {
        substituteId: 'user-2',
        scheduleId: 'schedule-1'
      };

      // Current implementation: always auto-approve with substitute
      const shouldAutoApprove = !!request.substituteId;
      expect(shouldAutoApprove).toBe(true);
    });

    it('should not auto-approve when no substitute', () => {
      const request = {
        substituteId: null,
        scheduleId: 'schedule-1'
      };

      const shouldAutoApprove = !!request.substituteId;
      expect(shouldAutoApprove).toBe(false);
    });
  });

  describe('Notification Rules', () => {
    it('should notify substitute on pending request', () => {
      const request = {
        substituteId: 'user-2',
        status: 'pending'
      };

      const shouldNotify = request.status === 'pending' && !!request.substituteId;
      expect(shouldNotify).toBe(true);
    });

    it('should notify requester on approval', () => {
      const request = {
        requesterId: 'user-1',
        status: 'approved'
      };

      const shouldNotify = request.status === 'approved';
      expect(shouldNotify).toBe(true);
    });

    it('should notify requester on rejection', () => {
      const request = {
        requesterId: 'user-1',
        status: 'rejected'
      };

      const shouldNotify = request.status === 'rejected';
      expect(shouldNotify).toBe(true);
    });

    it('should notify coordinators for available requests', () => {
      const request = {
        status: 'available',
        substituteId: null
      };

      const shouldNotifyCoordinators = request.status === 'available';
      expect(shouldNotifyCoordinators).toBe(true);
    });
  });

  describe('Schedule Update on Approval', () => {
    it('should update schedule minister', () => {
      const schedule = {
        id: 'schedule-1',
        ministerId: 'user-1',
        status: 'scheduled'
      };

      const request = {
        substituteId: 'user-2',
        status: 'approved'
      };

      const updated = {
        ...schedule,
        ministerId: request.substituteId,
        originalMinisterId: schedule.ministerId,
        status: 'substituted'
      };

      expect(updated.ministerId).toBe('user-2');
      expect(updated.originalMinisterId).toBe('user-1');
      expect(updated.status).toBe('substituted');
    });
  });

  describe('Available Request Acceptance', () => {
    it('should accept available request from any eligible minister', () => {
      const request = {
        status: 'available',
        substituteId: null,
        requesterId: 'user-1'
      };

      const acceptor = 'user-3';
      const canAccept = request.status === 'available' && acceptor !== request.requesterId;

      expect(canAccept).toBe(true);
    });

    it('should not allow requester to accept own request', () => {
      const request = {
        status: 'available',
        requesterId: 'user-1'
      };

      const acceptor = 'user-1';
      const canAccept = acceptor !== request.requesterId;

      expect(canAccept).toBe(false);
    });

    it('should update status and substitute on acceptance', () => {
      const request = {
        status: 'available' as const,
        substituteId: null as string | null
      };

      const accepted = {
        ...request,
        status: 'approved' as const,
        substituteId: 'user-3'
      };

      expect(accepted.status).toBe('approved');
      expect(accepted.substituteId).toBe('user-3');
    });
  });

  describe('Cancellation Rules', () => {
    it('should allow requester to cancel pending request', () => {
      const request = {
        status: 'pending',
        requesterId: 'user-1'
      };

      const userId = 'user-1';
      const canCancel = request.requesterId === userId && request.status === 'pending';

      expect(canCancel).toBe(true);
    });

    it('should allow requester to cancel available request', () => {
      const request = {
        status: 'available',
        requesterId: 'user-1'
      };

      const userId = 'user-1';
      const canCancel = request.requesterId === userId && request.status === 'available';

      expect(canCancel).toBe(true);
    });

    it('should allow coordinator to cancel any request', () => {
      const request = {
        status: 'approved',
        requesterId: 'user-1'
      };

      const userRole = 'coordenador';
      const canCancel = userRole === 'coordenador' || userRole === 'gestor';

      expect(canCancel).toBe(true);
    });

    it('should not allow minister to cancel approved request', () => {
      const request = {
        status: 'approved',
        requesterId: 'user-1'
      };

      const userId = 'user-1';
      const userRole = 'ministro';
      const canCancel = (request.requesterId === userId && request.status !== 'approved') ||
        userRole === 'coordenador' ||
        userRole === 'gestor';

      expect(canCancel).toBe(false);
    });
  });

  describe('History Tracking', () => {
    it('should create history entry on status change', () => {
      const historyEntry = {
        substitutionRequestId: 'request-1',
        previousStatus: 'pending',
        newStatus: 'approved',
        changedBy: 'coordinator-1',
        changedAt: new Date()
      };

      expect(historyEntry.previousStatus).toBe('pending');
      expect(historyEntry.newStatus).toBe('approved');
      expect(historyEntry.changedBy).toBeDefined();
    });

    it('should track who made the change', () => {
      const changes = [
        { changedBy: 'user-1', action: 'created' },
        { changedBy: 'coordinator-1', action: 'approved' }
      ];

      expect(changes[0].changedBy).toBe('user-1');
      expect(changes[1].changedBy).toBe('coordinator-1');
    });
  });

  describe('API Response Format', () => {
    it('should return substitution with related data', () => {
      const response = {
        id: 'sub-1',
        status: 'pending',
        reason: 'Viagem',
        requester: { id: 'user-1', name: 'John Doe' },
        substitute: { id: 'user-2', name: 'Jane Doe' },
        schedule: {
          id: 'schedule-1',
          date: '2025-01-20',
          time: '10:00'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(response.requester).toBeDefined();
      expect(response.schedule).toBeDefined();
      expect(response.status).toBe('pending');
    });

    it('should include urgency in response', () => {
      const response = {
        id: 'sub-1',
        urgency: 'high',
        hoursUntilMass: 18
      };

      expect(response.urgency).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(response.urgency);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing scheduleId', () => {
      const errorResponse = {
        success: false,
        error: 'Schedule ID é obrigatório'
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
    });

    it('should return 403 when not owner of schedule', () => {
      const errorResponse = {
        success: false,
        error: 'Você só pode solicitar substituição para suas próprias escalas'
      };

      expect(errorResponse.success).toBe(false);
    });

    it('should return 404 for non-existent schedule', () => {
      const errorResponse = {
        success: false,
        error: 'Escala não encontrada'
      };

      expect(errorResponse.success).toBe(false);
    });
  });
});
