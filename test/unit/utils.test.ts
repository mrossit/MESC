import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
    });

    it('should filter out falsy values', () => {
      const result = cn('class1', false && 'class2', null, undefined, 'class3');
      expect(result).toBe('class1 class3');
    });

    it('should override conflicting Tailwind classes', () => {
      // tailwind-merge deve resolver conflitos
      const result = cn('text-red-500', 'text-blue-500');
      // O último deve prevalecer
      expect(result).toBe('text-blue-500');
    });
  });
});
