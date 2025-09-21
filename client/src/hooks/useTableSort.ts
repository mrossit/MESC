import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

export function useTableSort<T>(
  data: T[],
  defaultSortKey?: keyof T,
  defaultDirection: SortDirection = 'asc'
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: defaultSortKey || null,
    direction: defaultSortKey ? defaultDirection : null
  });

  const handleSort = (key: keyof T) => {
    setSortConfig(prevConfig => {
      // If clicking the same column
      if (prevConfig.key === key) {
        // Cycle through: asc -> desc -> null
        if (prevConfig.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (prevConfig.direction === 'desc') {
          return { key: null, direction: null };
        }
      }
      // If clicking a different column, start with asc
      return { key, direction: 'asc' };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase(), 'pt-BR');
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        // Convert to string for comparison
        comparison = String(aValue).localeCompare(String(bValue), 'pt-BR');
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return {
    sortedData,
    sortConfig,
    handleSort
  };
}