import { useState, useEffect } from 'react';
import { Schedule, ScheduleAssignment, SubstitutionRequest, Minister } from '../types';
import { invalidateScheduleCache } from '@/lib/cacheManager';
import { toast } from '@/hooks/use-toast';

export function useScheduleData(currentMonth: Date) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionRequest[]>([]);
  const [ministers, setMinisters] = useState<Minister[]>([]);
  const [loading, setLoading] = useState(true);

  // Invalidar cache ao montar
  useEffect(() => {
    invalidateScheduleCache();
  }, []);

  // Fetch data when month changes
  useEffect(() => {
    fetchSchedules();
    fetchMinisters();
  }, [currentMonth]);

  const fetchSchedules = async () => {
    try {
      const response = await fetch(
        `/api/schedules?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
        setAssignments(data.assignments || []);
        setSubstitutions(data.substitutions || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMinisters = async () => {
    try {
      const response = await fetch('/api/ministers', { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        const sortedMinisters = data.sort((a: Minister, b: Minister) => {
          if (a.active && !b.active) return -1;
          if (!a.active && b.active) return 1;
          return a.name.localeCompare(b.name);
        });
        setMinisters(sortedMinisters);
      }
    } catch (error) {
      console.error('Error fetching ministers:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar lista de ministros',
        variant: 'destructive'
      });
    }
  };

  return {
    schedules,
    assignments,
    substitutions,
    ministers,
    loading,
    refetch: fetchSchedules
  };
}
