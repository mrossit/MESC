import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { SortDirection } from '@/hooks/useTableSort';

interface SortableTableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSortKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHeader({
  children,
  sortKey,
  currentSortKey,
  direction,
  onSort,
  className
}: SortableTableHeaderProps) {
  const isActive = currentSortKey === sortKey;

  const getSortIcon = () => {
    if (!isActive || direction === null) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    }
    if (direction === 'asc') {
      return <ChevronUp className="h-4 w-4" />;
    }
    return <ChevronDown className="h-4 w-4" />;
  };

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      {children}
      {getSortIcon()}
    </button>
  );
}