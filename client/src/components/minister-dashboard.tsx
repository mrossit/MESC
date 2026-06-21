import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  HelpCircle,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MinisterTutorial, useShouldShowTutorial } from "@/components/minister-tutorial";
import { PrayerDialog } from "@/components/PrayerDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LITURGICAL_POSITIONS } from "@shared/constants";
import { useLocation } from "wouter";
import { useDebugRender } from "@/lib/debug";
import { parseScheduleDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  mobileConfirmSchedule,
  mobileGetMissionHome,
  mobileGetSchedulesMonth,
  mobileRequestSubstitution,
  shouldUseMobileAuth,
} from "@/lib/mobile-auth-session";
import {
  createMobileIdempotencyKey,
  type MobileMissionSchedule,
  type MobileNotice,
  type MobilePendingAction,
} from "@shared/mobileClient";

interface ScheduleAssignment {
  id: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  scheduleTitle: string;
  confirmationStatus?: string | null;
  canConfirm?: boolean;
  canRequestSubstitution?: boolean;
  source?: "web" | "mobile";
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface FamilyMember {
  id: string;
  relationshipType: string;
  user: {
    id: string;
    name: string;
    email: string;
    photoUrl?: string;
  };
}

interface FamilySchedule {
  memberName: string;
  relationshipType: string;
  date: string;
  massTime: string;
  position: number;
}

interface MinisterDashboardProps {
  userName?: string;
}

function mobileScheduleToAssignment(schedule: MobileMissionSchedule): ScheduleAssignment {
  return {
    id: schedule.id,
    date: schedule.date ?? "",
    massTime: schedule.time,
    position: schedule.position ?? 0,
    confirmed: schedule.confirmationStatus === "confirmed",
    scheduleTitle: schedule.type,
    confirmationStatus: schedule.confirmationStatus,
    canConfirm: schedule.canConfirm,
    canRequestSubstitution: schedule.canRequestSubstitution,
    source: "mobile",
  };
}

function mobilePendingActionToNotification(action: MobilePendingAction): Notification {
  return {
    id: action.id,
    title: action.title,
    message: action.subtitle ?? "",
    type: action.type,
    read: false,
    createdAt: action.dueAt ?? new Date().toISOString(),
    actionUrl: action.deepLink,
  };
}

function mobileNoticeToNotification(notice: MobileNotice): Notification {
  return {
    id: notice.id,
    title: notice.title,
    message: notice.message,
    type: notice.type,
    read: notice.read,
    createdAt: notice.createdAt ?? new Date().toISOString(),
    actionUrl: notice.deepLink,
  };
}

export function MinisterDashboard({ userName }: MinisterDashboardProps) {
  // Track renders in debug panel (development only)
  useDebugRender('MinisterDashboard');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isPrayerOpen, setIsPrayerOpen] = useState(false);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleAssignment[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [familySchedules, setFamilySchedules] = useState<FamilySchedule[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const shouldShowTutorial = useShouldShowTutorial();
  const [, setLocation] = useLocation();
  const useNativeMission = shouldUseMobileAuth();
  const mobileMissionMonth = format(new Date(), "yyyy-MM");

  const mobileMissionQueryKey = ["mobile", "mission-home", mobileMissionMonth];
  const mobileSchedulesQueryKey = ["mobile", "schedules-month", mobileMissionMonth];

  const { data: mobileMissionHome, isLoading: loadingMobileMission } = useQuery({
    queryKey: mobileMissionQueryKey,
    queryFn: () => mobileGetMissionHome({ month: mobileMissionMonth }),
    enabled: useNativeMission,
    staleTime: 60 * 1000,
  });

  const { data: mobileSchedulesMonth, isLoading: loadingMobileSchedules } = useQuery({
    queryKey: mobileSchedulesQueryKey,
    queryFn: () => mobileGetSchedulesMonth({ month: mobileMissionMonth }),
    enabled: useNativeMission,
    staleTime: 60 * 1000,
  });

  const confirmPresenceMutation = useMutation({
    mutationFn: (scheduleId: string) => mobileConfirmSchedule(
      scheduleId,
      { status: "confirmed" },
      { idempotencyKey: createMobileIdempotencyKey() },
    ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileMissionQueryKey }),
        queryClient.invalidateQueries({ queryKey: mobileSchedulesQueryKey }),
      ]);
      toast({
        title: "Presença confirmada",
        description: "Sua confirmação foi registrada na escala.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Não foi possível confirmar",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const requestSubstitutionMutation = useMutation({
    mutationFn: (scheduleId: string) => mobileRequestSubstitution(
      {
        scheduleId,
        reason: "Solicitado pelo app nativo.",
      },
      { idempotencyKey: createMobileIdempotencyKey() },
    ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileMissionQueryKey }),
        queryClient.invalidateQueries({ queryKey: mobileSchedulesQueryKey }),
      ]);
      toast({
        title: "Substituição solicitada",
        description: "A coordenação já pode acompanhar o pedido.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Não foi possível solicitar",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const mobileScheduleAssignments = useMemo(() => {
    const byId = new Map<string, ScheduleAssignment>();

    for (const schedule of mobileSchedulesMonth?.schedules ?? []) {
      byId.set(schedule.id, mobileScheduleToAssignment(schedule));
    }

    if (mobileMissionHome?.nextMission) {
      byId.set(
        mobileMissionHome.nextMission.id,
        mobileScheduleToAssignment(mobileMissionHome.nextMission),
      );
    }

    return Array.from(byId.values())
      .filter((schedule) => Boolean(schedule.date))
      .sort((left, right) =>
        `${left.date} ${left.massTime}`.localeCompare(`${right.date} ${right.massTime}`),
      );
  }, [mobileMissionHome?.nextMission, mobileSchedulesMonth?.schedules]);

  const mobileNotifications = useMemo(() => {
    const pending = mobileMissionHome?.pendingActions.map(mobilePendingActionToNotification) ?? [];
    const notices = mobileMissionHome?.notices.map(mobileNoticeToNotification) ?? [];
    return [...pending, ...notices].slice(0, 5);
  }, [mobileMissionHome?.notices, mobileMissionHome?.pendingActions]);

  useEffect(() => {
    if (shouldShowTutorial) {
      setIsTutorialOpen(true);
    }
  }, [shouldShowTutorial]);

  useEffect(() => {
    if (useNativeMission) return;

    fetchUpcomingSchedules();
    fetchNotifications();
    fetchFamilySchedules();
  }, [useNativeMission]);

  const fetchUpcomingSchedules = async () => {
    try {
      const response = await fetch("/api/schedules/minister/upcoming");
      if (response.ok) {
        const data = await response.json();
        setUpcomingSchedules(data.assignments || []);
      }
    } catch (error) {
      console.error("Error fetching upcoming schedules:", error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        // Pegar as 3 notificações mais recentes
        setNotifications(data.slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchFamilySchedules = async () => {
    try {
      // Primeiro, buscar familiares
      const familyResponse = await fetch("/api/profile/family");
      if (!familyResponse.ok) {
        setLoadingFamily(false);
        return;
      }

      const familyMembers: FamilyMember[] = await familyResponse.json();

      if (familyMembers.length === 0) {
        setLoadingFamily(false);
        return;
      }

      // Para cada familiar, buscar suas próximas escalas
      const schedules: FamilySchedule[] = [];

      for (const member of familyMembers) {
        try {
          const schedulesResponse = await fetch(`/api/schedules/minister/upcoming?ministerId=${member.user.id}`);
          if (schedulesResponse.ok) {
            const data = await schedulesResponse.json();
            const memberSchedules = data.assignments || [];

            // Adicionar as próximas 2 escalas de cada familiar
            memberSchedules.slice(0, 2).forEach((schedule: ScheduleAssignment) => {
              schedules.push({
                memberName: member.user.name,
                relationshipType: member.relationshipType,
                date: schedule.date,
                massTime: schedule.massTime,
                position: schedule.position
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching schedules for family member ${member.user.name}:`, error);
        }
      }

      setFamilySchedules(schedules);
    } catch (error) {
      console.error("Error fetching family schedules:", error);
    } finally {
      setLoadingFamily(false);
    }
  };

  const handleOpenTutorial = () => {
    setIsTutorialOpen(true);
  };

  const displaySchedules = useNativeMission ? mobileScheduleAssignments : upcomingSchedules;
  const displayNotifications = useNativeMission ? mobileNotifications : notifications;
  const displayFamilySchedules = useNativeMission ? [] : familySchedules;
  const displayLoadingSchedules = useNativeMission
    ? loadingMobileMission || loadingMobileSchedules
    : loadingSchedules;
  const displayLoadingNotifications = useNativeMission
    ? loadingMobileMission
    : loadingNotifications;
  const displayLoadingFamily = useNativeMission ? false : loadingFamily;

  const nextSchedule = displaySchedules[0];
  const unreadCount = displayNotifications.filter((notification) => !notification.read).length;
  const firstName = userName?.split(" ")[0] || "Ministro";
  const nextScheduleDate = nextSchedule?.date
    ? format(parseScheduleDate(nextSchedule.date), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : null;

  const getMassTimeLabel = (time: string) => {
    const times: Record<string, string> = {
      "saturday_evening": "Sábado 19h",
      "sunday_7am": "Domingo 7h",
      "sunday_9am": "Domingo 9h",
      "sunday_11am": "Domingo 11h",
      "sunday_7pm": "Domingo 19h"
    };
    return times[time] || time;
  };

  const getCompactPositionLabel = (position: number) => {
    if (!position) return "Posição a definir";

    const liturgicalName = LITURGICAL_POSITIONS[position];
    if (liturgicalName) {
      return `P${position}: ${liturgicalName}`;
    }
    return `Posição ${position}`;
  };

  const getRelationshipLabel = (relationshipType: string) => {
    const relationships: Record<string, string> = {
      "spouse": "Cônjuge",
      "parent": "Pai/Mãe",
      "child": "Filho(a)",
      "sibling": "Irmão/Irmã"
    };
    return relationships[relationshipType] || relationshipType;
  };

  return (
    <>
      {/* Tutorial Modal */}
      <MinisterTutorial
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Prayer Dialog */}
      <PrayerDialog
        open={isPrayerOpen}
        onOpenChange={setIsPrayerOpen}
      />

      <div className="space-y-3 sm:space-y-4">
        <Card className="liquid-glass border-0">
          <CardContent className="p-3 sm:p-5">
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.45fr_0.95fr] lg:items-stretch">
              <div className="flex flex-col justify-between rounded-lg bg-gradient-to-br from-white/50 via-white/25 to-sage/20 p-3 dark:from-white/10 dark:via-white/5 dark:to-amber-900/10 sm:min-h-[220px] sm:p-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="liquid-glass-chip border-0 px-2.5 py-1 text-[11px] font-semibold text-burgundy dark:text-amber-100">
                      App oficial em beta
                    </Badge>
                    <Badge className="border-sage/30 bg-sage/15 px-2.5 py-1 text-[11px] font-semibold text-sage-dark dark:text-sage-light">
                      Multi-comunidades
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paz e bem, {firstName}</p>
                    <h2 className="mt-1 text-[1.4rem] font-bold leading-tight text-foreground sm:text-3xl">
                      Sua missão da semana em um só lugar
                    </h2>
                  </div>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Veja sua próxima escala, acompanhe avisos da comunidade e mantenha sua disponibilidade em dia.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => setLocation("/schedules")}
                    className="liquid-glass-chip liquid-glass-interactive min-h-[5.25rem] rounded-lg px-3 py-3 text-left"
                  >
                    <Calendar className="mb-2 h-4 w-4 text-burgundy dark:text-amber-200" />
                    <span className="block text-xs font-semibold text-foreground">Escalas</span>
                    <span className="block text-[11px] text-muted-foreground">{displaySchedules.length} próximas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation("/questionnaire")}
                    className="liquid-glass-chip liquid-glass-interactive min-h-[5.25rem] rounded-lg px-3 py-3 text-left"
                  >
                    <CheckCircle className="mb-2 h-4 w-4 text-sage-dark dark:text-sage-light" />
                    <span className="block text-xs font-semibold text-foreground">Responder</span>
                    <span className="block text-[11px] text-muted-foreground">Disponibilidade</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation("/schedules/substitutions")}
                    className="liquid-glass-chip liquid-glass-interactive min-h-[5.25rem] rounded-lg px-3 py-3 text-left"
                  >
                    <Users className="mb-2 h-4 w-4 text-purple-700 dark:text-purple-200" />
                    <span className="block text-xs font-semibold text-foreground">Substituir</span>
                    <span className="block text-[11px] text-muted-foreground">Ajudar irmãos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrayerOpen(true)}
                    className="liquid-glass-chip liquid-glass-interactive min-h-[5.25rem] rounded-lg px-3 py-3 text-left"
                  >
                    <Heart className="mb-2 h-4 w-4 text-red-700 dark:text-red-200" />
                    <span className="block text-xs font-semibold text-foreground">Oração</span>
                    <span className="block text-[11px] text-muted-foreground">Alma de Cristo</span>
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-white/50 bg-white/40 p-3 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="liquid-glass-chip flex h-9 w-9 items-center justify-center rounded-lg">
                      <Sparkles className="h-4 w-4 text-burgundy dark:text-amber-200" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Próxima missão</p>
                      <p className="text-sm font-semibold text-foreground">
                        {nextSchedule ? "Você está escalado" : "Sem escala próxima"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenTutorial}
                    className="h-8 shrink-0 gap-1 px-2 text-xs"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Ajuda
                  </Button>
                </div>

                {displayLoadingSchedules ? (
                  <div className="flex min-h-[128px] items-center justify-center rounded-lg bg-white/30 text-sm text-muted-foreground dark:bg-white/5">
                    Carregando sua próxima escala...
                  </div>
                ) : nextSchedule ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setLocation(`/schedules?date=${nextSchedule.date}`)}
                      className="liquid-glass-interactive w-full rounded-lg border border-white/50 bg-white/30 p-3 text-left dark:border-white/10 dark:bg-white/5 sm:p-4"
                    >
                      <p className="text-sm font-semibold capitalize text-foreground">
                        {nextScheduleDate ?? "Data a confirmar"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="liquid-glass-chip inline-flex max-w-full items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          {getMassTimeLabel(nextSchedule.massTime)}
                        </span>
                        <span className="liquid-glass-chip inline-flex max-w-full items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium">
                          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="min-w-0 truncate">{getCompactPositionLabel(nextSchedule.position)}</span>
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-burgundy dark:text-amber-100">
                        Abrir detalhes da escala
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </button>

                    {useNativeMission && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            !nextSchedule.canConfirm ||
                            nextSchedule.confirmed ||
                            confirmPresenceMutation.isPending
                          }
                          onClick={() => confirmPresenceMutation.mutate(nextSchedule.id)}
                          className="h-9"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {nextSchedule.confirmed
                            ? "Presença confirmada"
                            : confirmPresenceMutation.isPending
                              ? "Confirmando..."
                              : "Confirmar presença"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            !nextSchedule.canRequestSubstitution ||
                            requestSubstitutionMutation.isPending
                          }
                          onClick={() => requestSubstitutionMutation.mutate(nextSchedule.id)}
                          className="h-9"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          {requestSubstitutionMutation.isPending
                            ? "Solicitando..."
                            : "Pedir substituição"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-sage/40 bg-white/30 p-4 text-sm text-muted-foreground dark:bg-white/5">
                    Nenhuma escala publicada para você nos próximos dias. Quando houver novidade, ela aparece aqui primeiro.
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/30 px-3 py-2 dark:bg-white/5">
                    <p className="text-lg font-bold text-foreground">{unreadCount}</p>
                    <p className="text-[11px] text-muted-foreground">avisos novos</p>
                  </div>
                  <div className="rounded-lg bg-white/30 px-3 py-2 dark:bg-white/5">
                    <p className="text-lg font-bold text-foreground">{displayFamilySchedules.length}</p>
                    <p className="text-[11px] text-muted-foreground">escalas familiares</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Próximas Escalas */}
      <Card className="liquid-glass border-0">
        <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-neutral-accentWarm dark:text-amber-600" />
            Minhas Próximas Escalas
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          {displayLoadingSchedules ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-neutral-peachCream/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Calendar className="h-8 w-8 text-neutral-accentWarm/50 dark:text-gray-600" />
              </div>
              <p className="text-muted-foreground">Carregando escalas...</p>
            </div>
          ) : displaySchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-neutral-peachCream/30 rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-neutral-accentWarm/50 dark:text-gray-600" />
              </div>
              <p className="text-muted-foreground font-medium mb-2">Nenhuma escala próxima</p>
              <p className="text-sm text-muted-foreground/70 max-w-sm">
                Você não possui escalas programadas para os próximos dias
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {displaySchedules.slice(0, 5).map((schedule) => (
                <button
                  key={schedule.id}
                  type="button"
                  className="liquid-glass-interactive flex w-full cursor-pointer flex-col gap-3 rounded-lg border border-white/50 bg-white/30 p-3 text-left transition-colors dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => setLocation(`/schedules?date=${schedule.date}`)}
                >
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {schedule.date
                          ? format(parseScheduleDate(schedule.date), "dd 'de' MMMM", { locale: ptBR })
                          : "Data a confirmar"}
                      </p>
                      <Badge variant="secondary" className="max-w-full text-xs">
                        <span className="truncate">{getCompactPositionLabel(schedule.position)}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{getMassTimeLabel(schedule.massTime)}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 self-end text-muted-foreground sm:self-center" />
                </button>
              ))}
              {displaySchedules.length > 5 && (
                <div className="text-center pt-2">
                  <Button 
                    variant="link" 
                    className="text-primary hover:text-primary/80"
                    onClick={() => setLocation('/schedules')}
                  >
                    Ver todas ({displaySchedules.length} escalas)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formação - ocultada para ministros, exibida apenas para gestores/coordenadores */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notificações */}
        <Card className="liquid-glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MessageCircle className="h-4 w-4 text-orange-500" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayLoadingNotifications ? (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2 animate-pulse">
                  <Bell className="h-6 w-6 text-orange-500/70" />
                </div>
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : displayNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                  <Bell className="h-6 w-6 text-orange-500/70" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {displayNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`liquid-glass-interactive cursor-pointer rounded-lg border p-2 transition-colors ${
                      notification.read
                        ? "border-white/40 bg-white/25 dark:border-white/10 dark:bg-white/5"
                        : "border-orange-200 bg-orange-50/80 dark:border-orange-800 dark:bg-orange-900/10"
                    }`}
                    onClick={() => {
                      if (notification.actionUrl) {
                        setLocation(notification.actionUrl);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {displayNotifications.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setLocation('/communication')}
                  >
                    Ver todas
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Família MESC */}
        {displayLoadingFamily ? (
          <Card className="liquid-glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Users className="h-4 w-4 text-purple-500" />
                Família MESC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2 animate-pulse">
                  <Users className="h-6 w-6 text-purple-500/70" />
                </div>
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            </CardContent>
          </Card>
        ) : displayFamilySchedules.length > 0 ? (
          <Card className="liquid-glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Users className="h-4 w-4 text-purple-500" />
                Família MESC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {displayFamilySchedules.map((schedule, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-purple-200 bg-purple-50/80 p-2 dark:border-purple-800 dark:bg-purple-900/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {schedule.memberName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getRelationshipLabel(schedule.relationshipType)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {format(parseScheduleDate(schedule.date), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">
                            {getMassTimeLabel(schedule.massTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="mt-2 max-w-full text-xs">
                      <span className="truncate">{getCompactPositionLabel(schedule.position)}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Estatísticas Pessoais */}
        <Card className="liquid-glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-green-600 dark:text-green-300" />
              Jornada do Ministro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50/80 p-3 dark:border-green-800 dark:bg-green-900/10">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-300" />
                  <p className="text-sm font-semibold text-foreground">Presença e formação</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Acompanhe sua caminhada ministerial, módulos de formação e histórico de serviço.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => setLocation("/formation")}
              >
                Abrir formação
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avisos e Comunicados */}
      <Card className="liquid-glass border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Novidades do app oficial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-sage dark:bg-sage-light"></div>
              <div>
                <p className="text-sm font-medium text-foreground">Beta com multi-comunidades</p>
                <p className="text-xs text-muted-foreground">
                  A paróquia está preparando a experiência para comunidades e equipes novas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-burgundy dark:bg-amber-300"></div>
              <div>
                <p className="text-sm font-medium text-foreground">Sua resposta melhora a próxima escala</p>
                <p className="text-xs text-muted-foreground">
                  Disponibilidade, substituições e avisos ajudam a coordenação a publicar escalas mais justas.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
