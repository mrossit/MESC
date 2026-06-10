import { describe, it, expect } from 'vitest';
import {
  ROLES,
  COORDINATOR_ROLES,
  PARISH_WIDE_ROLES,
  ADMIN_ROLES,
  isCoordinator,
  isManager,
  isParishWide,
  isCommunityScoped,
  isAdmin,
  expandRoles,
  getUserScope,
  canEditCommunity,
} from '@shared/roles';

describe('shared/roles', () => {
  describe('isCoordinator', () => {
    it('reconhece todas as variantes de coordenador (incl. legado)', () => {
      expect(isCoordinator('coordenador')).toBe(true);
      expect(isCoordinator('coordenador_comunidade')).toBe(true);
      expect(isCoordinator('coordenador_paroquial')).toBe(true);
    });
    it('rejeita não-coordenadores', () => {
      expect(isCoordinator('gestor')).toBe(false);
      expect(isCoordinator('ministro')).toBe(false);
      expect(isCoordinator(null)).toBe(false);
      expect(isCoordinator(undefined)).toBe(false);
    });
  });

  describe('isManager', () => {
    it('é gestor/reitor apenas', () => {
      expect(isManager('gestor')).toBe(true);
      expect(isManager('reitor')).toBe(true);
      expect(isManager('coordenador_paroquial')).toBe(false);
      expect(isManager('ministro')).toBe(false);
    });
  });

  describe('isParishWide / isCommunityScoped', () => {
    it('paroquial/gestor/reitor têm alcance da paróquia', () => {
      expect(isParishWide('coordenador_paroquial')).toBe(true);
      expect(isParishWide('gestor')).toBe(true);
      expect(isParishWide('reitor')).toBe(true);
    });
    it('comunidade/legado/ministro são escopados', () => {
      expect(isCommunityScoped('coordenador_comunidade')).toBe(true);
      expect(isCommunityScoped('coordenador')).toBe(true);
      expect(isCommunityScoped('ministro')).toBe(true);
      expect(isCommunityScoped('coordenador_paroquial')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('cobre o gate "coordenador OU gestor" de hoje + variantes novas', () => {
      for (const r of [...COORDINATOR_ROLES, 'gestor', 'reitor']) {
        expect(isAdmin(r)).toBe(true);
      }
      expect(isAdmin('ministro')).toBe(false);
    });
  });

  describe('expandRoles', () => {
    it("lista com 'coordenador' passa a aceitar todas as variantes", () => {
      const expanded = expandRoles(['gestor', 'coordenador']);
      expect(expanded).toContain('gestor');
      expect(expanded).toContain('coordenador');
      expect(expanded).toContain('coordenador_comunidade');
      expect(expanded).toContain('coordenador_paroquial');
    });
    it("não expande quando não há coordenador na lista", () => {
      expect(expandRoles(['gestor']).sort()).toEqual(['gestor']);
      expect(expandRoles(['ministro']).sort()).toEqual(['ministro']);
    });
    it('é idempotente / sem duplicatas', () => {
      const a = expandRoles(['coordenador_paroquial']);
      const b = expandRoles(a);
      expect(new Set(a).size).toBe(a.length);
      expect(b.sort()).toEqual(a.sort());
    });
  });

  describe('getUserScope', () => {
    it('paroquial → todas as comunidades', () => {
      expect(getUserScope({ role: 'coordenador_paroquial', homeCommunityId: 'c1' }))
        .toEqual({ all: true });
      expect(getUserScope({ role: 'gestor', homeCommunityId: 'c1' }))
        .toEqual({ all: true });
    });
    it('comunidade/ministro → só a sua comunidade', () => {
      expect(getUserScope({ role: 'coordenador_comunidade', homeCommunityId: 'c2' }))
        .toEqual({ all: false, communityId: 'c2' });
      expect(getUserScope({ role: 'ministro', homeCommunityId: 'c3' }))
        .toEqual({ all: false, communityId: 'c3' });
    });
  });

  describe('canEditCommunity', () => {
    it('paroquial edita qualquer comunidade', () => {
      expect(canEditCommunity({ role: 'coordenador_paroquial', homeCommunityId: 'c1' }, 'c9')).toBe(true);
    });
    it('comunidade só edita a sua', () => {
      const u = { role: 'coordenador_comunidade', homeCommunityId: 'c2' };
      expect(canEditCommunity(u, 'c2')).toBe(true);
      expect(canEditCommunity(u, 'c9')).toBe(false);
      expect(canEditCommunity(u, null)).toBe(false);
    });
  });

  describe('ROLES constant', () => {
    it('expõe os papéis esperados', () => {
      expect(ROLES.COORDENADOR_PAROQUIAL).toBe('coordenador_paroquial');
      expect(ROLES.COORDENADOR_COMUNIDADE).toBe('coordenador_comunidade');
      expect(PARISH_WIDE_ROLES).toContain('coordenador_paroquial');
      expect(ADMIN_ROLES).toContain('gestor');
    });
  });
});
