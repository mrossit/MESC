import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useCsrfToken, addCsrfHeader } from "@/hooks/useCsrfToken";
import { authAPI } from "@/lib/auth";
import {
  Trophy,
  Medal,
  Star,
  Flame,
  Award,
  Crown,
  Zap,
  Heart,
  Shield,
  Target,
  TrendingUp,
  Users,
  BookOpen,
  Church,
  Calendar,
  Gift,
  Sparkles,
  Lock,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2
} from "lucide-react";

interface GamificationProfile {
  points: number;
  level: number;
  levelName: string;
  levelColor: string;
  levelProgress: number;
  nextLevelPoints: number | null;
  currentStreak: number;
  longestStreak: number;
  massesServed: number;
  substitutionsHelped: number;
  materialsCompleted: number;
  rank: number;
  badges: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    rarity: string;
    iconName: string;
    iconColor: string;
    pointsAwarded: number;
    earnedAt: string;
    isFeatured: boolean;
    isSecret: boolean;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    points: number;
    description: string;
    createdAt: string;
  }>;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  points: number;
  level: number;
  userName: string;
  userPhotoUrl: string | null;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  period: string;
}

interface BadgeInfo {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  iconName: string;
  iconColor: string;
  pointsAwarded: number;
  requirement: { type: string; value: number; description: string };
  earned: boolean;
  isSecret?: boolean;
}

// Icon mapping
const getIcon = (iconName: string, className: string = "h-6 w-6") => {
  const icons: Record<string, React.ReactNode> = {
    Trophy: <Trophy className={className} />,
    Medal: <Medal className={className} />,
    Star: <Star className={className} />,
    Flame: <Flame className={className} />,
    Award: <Award className={className} />,
    Crown: <Crown className={className} />,
    Zap: <Zap className={className} />,
    Heart: <Heart className={className} />,
    Shield: <Shield className={className} />,
    Target: <Target className={className} />,
    TrendingUp: <TrendingUp className={className} />,
    Users: <Users className={className} />,
    BookOpen: <BookOpen className={className} />,
    Church: <Church className={className} />,
    GraduationCap: <BookOpen className={className} />,
    Brain: <Sparkles className={className} />,
    Building: <Church className={className} />,
    Rocket: <Zap className={className} />
  };
  return icons[iconName] || <Star className={className} />;
};

// Rarity colors
const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'uncommon': return 'bg-green-100 text-green-700 border-green-300';
    case 'rare': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'epic': return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'legendary': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const getRarityLabel = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'Comum';
    case 'uncommon': return 'Incomum';
    case 'rare': return 'Raro';
    case 'epic': return 'Epico';
    case 'legendary': return 'Lendario';
    default: return rarity;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'participation': return 'Participacao';
    case 'formation': return 'Formacao';
    case 'community': return 'Comunidade';
    case 'streak': return 'Sequencia';
    case 'milestone': return 'Marco';
    case 'special': return 'Especial';
    default: return category;
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'mass_served': return 'Missa servida';
    case 'substitution_offered': return 'Substituicao oferecida';
    case 'substitution_accepted': return 'Substituicao aceita';
    case 'material_completed': return 'Material completado';
    case 'quiz_completed': return 'Quiz completado';
    case 'quiz_perfect': return 'Quiz perfeito';
    case 'streak_bonus': return 'Bonus de sequencia';
    case 'badge_earned': return 'Badge conquistado';
    case 'login_bonus': return 'Bonus diario';
    case 'first_action': return 'Boas vindas';
    case 'community_help': return 'Ajuda comunitaria';
    case 'special_event': return 'Evento especial';
    default: return action;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
};

export default function Gamification() {
  const [selectedBadge, setSelectedBadge] = useState<BadgeInfo | null>(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'alltime'>('alltime');

  const { toast } = useToast();
  const { csrfToken } = useCsrfToken();
  const queryClient = useQueryClient();

  // Get current user
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });
  const user = authData?.user;

  // Fetch gamification profile
  const { data: profile, isLoading: profileLoading } = useQuery<GamificationProfile>({
    queryKey: ['/api/gamification/profile'],
    queryFn: async () => {
      const response = await fetch('/api/gamification/profile', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    }
  });

  // Fetch leaderboard
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<LeaderboardResponse>({
    queryKey: ['/api/gamification/leaderboard', leaderboardPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/gamification/leaderboard?period=${leaderboardPeriod}&limit=20`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    }
  });

  // Fetch all badges
  const { data: badgesData } = useQuery<{ badges: BadgeInfo[] }>({
    queryKey: ['/api/gamification/badges'],
    queryFn: async () => {
      const response = await fetch('/api/gamification/badges', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch badges');
      return response.json();
    }
  });

  // Claim daily bonus mutation
  const claimDailyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/gamification/claim-daily', {
        method: 'POST',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim bonus');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: `+${data.points} pontos!`,
        description: data.leveledUp ? `Parabens! Voce subiu para o nivel ${data.newLevel}!` : 'Bonus diario coletado!'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('ja coletado')) {
        toast({ title: 'Bonus ja coletado', description: 'Volte amanha para coletar novamente!' });
      } else {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      }
    }
  });

  // Feature badge mutation
  const featureBadgeMutation = useMutation({
    mutationFn: async ({ badgeId, featured }: { badgeId: string; featured: boolean }) => {
      const response = await fetch('/api/gamification/feature-badge', {
        method: 'POST',
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include',
        body: JSON.stringify({ badgeId, featured })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to feature badge');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
      toast({ title: 'Badge atualizado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  // Group badges by category
  const badgesByCategory = badgesData?.badges.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, BadgeInfo[]>) || {};

  if (profileLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-7 w-7 text-yellow-500" />
              Gamificacao
            </h1>
            <p className="text-muted-foreground">
              Acompanhe seu progresso e conquistas
            </p>
          </div>

          <Button
            onClick={() => claimDailyMutation.mutate()}
            disabled={claimDailyMutation.isPending}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            <Gift className="h-4 w-4 mr-2" />
            {claimDailyMutation.isPending ? 'Coletando...' : 'Bonus Diario'}
          </Button>
        </div>

        {/* Profile Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Stats Card */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Level & Points */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-${profile?.levelColor || 'gray'}-400 to-${profile?.levelColor || 'gray'}-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                      {profile?.level || 1}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{profile?.levelName || 'Iniciante'}</h2>
                      <p className="text-2xl font-bold text-primary">{profile?.points?.toLocaleString() || 0} pontos</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso para nivel {(profile?.level || 1) + 1}</span>
                      <span>{profile?.levelProgress || 0}%</span>
                    </div>
                    <Progress value={profile?.levelProgress || 0} className="h-3" />
                    {profile?.nextLevelPoints && (
                      <p className="text-xs text-muted-foreground">
                        Faltam {(profile.nextLevelPoints - profile.points).toLocaleString()} pontos
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{profile?.rank || '-'}</p>
                    <p className="text-xs text-muted-foreground">Ranking</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{profile?.currentStreak || 0}</p>
                    <p className="text-xs text-muted-foreground">Semanas seguidas</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{profile?.massesServed || 0}</p>
                    <p className="text-xs text-muted-foreground">Missas servidas</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{profile?.badges?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Badges</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Featured Badges */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Badges em Destaque
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.badges?.filter(b => b.isFeatured).length ? (
                <div className="flex flex-wrap gap-3">
                  {profile.badges.filter(b => b.isFeatured).map(badge => (
                    <TooltipProvider key={badge.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`p-3 rounded-lg border-2 ${getRarityColor(badge.rarity)} cursor-pointer`}>
                            {getIcon(badge.iconName, "h-8 w-8")}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{badge.name}</p>
                          <p className="text-xs">{badge.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Clique em um badge para destaca-lo
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="badges" className="space-y-4">
          <TabsList>
            <TabsTrigger value="badges">
              <Award className="h-4 w-4 mr-2" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="h-4 w-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              Historico
            </TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-6">
            {Object.entries(badgesByCategory).map(([category, badges]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg capitalize">
                    {getCategoryLabel(category)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {badges.map(badge => {
                      const isEarned = badge.earned;
                      return (
                        <div
                          key={badge.id}
                          onClick={() => setSelectedBadge(badge)}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                            isEarned
                              ? getRarityColor(badge.rarity)
                              : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            {isEarned ? (
                              getIcon(badge.iconName, "h-10 w-10")
                            ) : (
                              <Lock className="h-10 w-10" />
                            )}
                            <p className="text-xs font-medium text-center line-clamp-2">
                              {badge.name}
                            </p>
                          </div>
                          {isEarned && (
                            <CheckCircle className="absolute -top-1 -right-1 h-5 w-5 text-green-500 bg-white rounded-full" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Ranking
                  </CardTitle>
                  <div className="flex gap-2">
                    {(['alltime', 'monthly', 'weekly'] as const).map(period => (
                      <Button
                        key={period}
                        variant={leaderboardPeriod === period ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLeaderboardPeriod(period)}
                      >
                        {period === 'alltime' ? 'Geral' : period === 'monthly' ? 'Mes' : 'Semana'}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboardData?.leaderboard.map((entry, index) => {
                      const isCurrentUser = entry.userId === user?.id;
                      const isTop3 = index < 3;

                      return (
                        <div
                          key={entry.userId}
                          className={`flex items-center gap-4 p-3 rounded-lg ${
                            isCurrentUser
                              ? 'bg-primary/10 border border-primary'
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {entry.rank}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                              {entry.userName}
                              {isCurrentUser && ' (Voce)'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Nivel {entry.level}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold">{entry.points.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">pontos</p>
                          </div>

                          {isTop3 && (
                            <div>
                              {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                              {index === 1 && <Medal className="h-5 w-5 text-gray-400" />}
                              {index === 2 && <Medal className="h-5 w-5 text-orange-600" />}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Current user if not in list */}
                    {leaderboardData?.currentUser && (
                      <>
                        <Separator className="my-4" />
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/10 border border-primary">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-muted text-muted-foreground">
                            {leaderboardData.currentUser.rank}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-primary">
                              {leaderboardData.currentUser.userName} (Voce)
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Nivel {leaderboardData.currentUser.level}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold">{leaderboardData.currentUser.points.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">pontos</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {profile?.recentActivity?.map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {activity.points > 0 ? '+' : ''}{activity.points}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{getActionLabel(activity.action)}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {formatDate(activity.createdAt)}
                        </div>
                      </div>
                    ))}

                    {(!profile?.recentActivity || profile.recentActivity.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma atividade recente
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Badge Detail Dialog */}
        <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedBadge && (
                  <div className={`p-2 rounded-lg ${getRarityColor(selectedBadge.rarity)}`}>
                    {getIcon(selectedBadge.iconName, "h-8 w-8")}
                  </div>
                )}
                {selectedBadge?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedBadge?.description}
              </DialogDescription>
            </DialogHeader>

            {selectedBadge && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={getRarityColor(selectedBadge.rarity)}>
                    {getRarityLabel(selectedBadge.rarity)}
                  </Badge>
                  <Badge variant="outline">
                    {getCategoryLabel(selectedBadge.category)}
                  </Badge>
                  {selectedBadge.pointsAwarded > 0 && (
                    <Badge variant="secondary">
                      +{selectedBadge.pointsAwarded} pontos
                    </Badge>
                  )}
                </div>

                {selectedBadge.requirement && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Como obter:</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedBadge.requirement.description}
                    </p>
                  </div>
                )}

                {selectedBadge.earned && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>Conquistado</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const badge = profile?.badges?.find(b => b.id === selectedBadge.id);
                        if (badge) {
                          featureBadgeMutation.mutate({
                            badgeId: badge.id,
                            featured: !badge.isFeatured
                          });
                        }
                      }}
                      disabled={featureBadgeMutation.isPending}
                    >
                      {profile?.badges?.find(b => b.id === selectedBadge.id)?.isFeatured
                        ? 'Remover destaque'
                        : 'Destacar no perfil'}
                    </Button>
                  </div>
                )}

                {!selectedBadge.earned && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-5 w-5" />
                    <span>Ainda nao conquistado</span>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
