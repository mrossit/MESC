import { useState } from "react";
import { isAdmin as isAdminRole } from "@shared/roles";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Calendar,
  Trash2,
  Shuffle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DrawResult {
  minister_id: string;
  minister_name: string;
  monday_of_week: number;
  is_voluntary: boolean;
}

interface AdorationDraw {
  id: string;
  month: number;
  year: number;
  total_ministers_to_draw: number;
  created_by: string;
  created_at: string;
  results: DrawResult[];
}

interface MySchedule {
  drawId: string;
  mondayOfWeek: number;
  date: string;
  isVoluntary: boolean;
  familyMembers: Array<{ id: string; name: string }>;
  availableMondays: Array<{ week: number; date: string }>;
}

export default function AdorationDraw() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedNewMonday, setSelectedNewMonday] = useState<string>("");

  // Fetch current user
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });
  const user = authData?.user;
  const isCoordinator = isAdminRole(user?.role);

  // Fetch draw results
  const {
    data: drawData,
    isLoading,
    error,
    refetch,
  } = useQuery<AdorationDraw | null>({
    queryKey: ["/api/adoration/results", selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await fetch(
        `/api/adoration/results/${selectedYear}/${selectedMonth}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Erro ao buscar sorteio");
      }
      const result = await response.json();
      // O backend retorna { success, message, data } ou diretamente os dados
      // Se result tem a propriedade 'data', retornar result.data (pode ser null)
      // Se não, retornar o result inteiro
      return result.hasOwnProperty('data') ? result.data : result;
    },
  });

  // Create draw mutation
  const createDrawMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/adoration/draw", {
        month: selectedMonth,
        year: selectedYear,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Sorteio realizado com sucesso!",
        description: `O sorteio para ${getMonthName(selectedMonth)}/${selectedYear} foi concluído.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/adoration/results"],
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao realizar sorteio",
        description: error.message || "Ocorreu um erro ao realizar o sorteio.",
      });
    },
  });

  // Delete draw mutation
  const deleteDrawMutation = useMutation({
    mutationFn: async (drawId: string) => {
      const response = await apiRequest("DELETE", `/api/adoration/draw/${drawId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sorteio removido",
        description: "O sorteio foi removido com sucesso.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/adoration/results"],
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover sorteio",
        description: error.message || "Ocorreu um erro ao remover o sorteio.",
      });
    },
  });

  // Fetch my schedule (minister's own adoration schedule)
  const {
    data: mySchedule,
    isLoading: isLoadingMySchedule,
    refetch: refetchMySchedule,
  } = useQuery<MySchedule | null>({
    queryKey: ["/api/adoration/my-schedule", selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await fetch(
        `/api/adoration/my-schedule/${selectedYear}/${selectedMonth}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        return null;
      }
      const result = await response.json();
      return result.data || null;
    },
  });

  // Swap day mutation
  const swapDayMutation = useMutation({
    mutationFn: async ({ drawId, newMondayOfWeek }: { drawId: string; newMondayOfWeek: number }) => {
      const response = await apiRequest("POST", `/api/adoration/swap-day/${drawId}`, {
        newMondayOfWeek,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Dia alterado com sucesso!",
        description: data.message || "Sua escala de adoração foi atualizada.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/adoration/my-schedule"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/adoration/results"],
      });
      setSelectedNewMonday("");
      refetchMySchedule();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao trocar dia",
        description: error.message || "Não foi possível trocar o dia de adoração.",
      });
    },
  });

  const handleSwapDay = () => {
    if (!mySchedule?.drawId || !selectedNewMonday) return;
    swapDayMutation.mutate({
      drawId: mySchedule.drawId,
      newMondayOfWeek: parseInt(selectedNewMonday),
    });
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return monthNames[month - 1] || "Mês inválido";
  };

  const getMonthDates = (month: number, year: number) => {
    const mondays: Date[] = [];
    const date = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
      const current = new Date(year, month - 1, day);
      if (current.getDay() === 1) {
        // Monday
        mondays.push(current);
      }
    }

    return mondays;
  };

  const groupResultsByMonday = (results: DrawResult[]) => {
    const grouped: { [key: number]: DrawResult[] } = {};
    results?.forEach((result) => {
      if (!grouped[result.monday_of_week]) {
        grouped[result.monday_of_week] = [];
      }
      grouped[result.monday_of_week].push(result);
    });
    return grouped;
  };

  const mondays = getMonthDates(selectedMonth, selectedYear);
  const groupedResults = drawData?.results
    ? groupResultsByMonday(drawData.results)
    : {};


  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Sorteio de Adoração ao Santíssimo
            </h1>
            <p className="text-muted-foreground mt-2">
              Sorteio automático de ministros para as segundas-feiras às 22h
            </p>
          </div>
        </div>

        {/* Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Selecionar Mês
            </CardTitle>
            <CardDescription>
              Escolha o mês e ano para visualizar ou realizar o sorteio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Mês</label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {getMonthName(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Ano</label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => currentYear - 1 + i).map(
                      (year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {isCoordinator && (
                <div className="flex items-end">
                  {!drawData ? (
                    <Button
                      onClick={() => createDrawMutation.mutate()}
                      disabled={createDrawMutation.isPending}
                      className="w-full sm:w-auto"
                      data-testid="button-create-draw"
                    >
                      <Shuffle className="mr-2 h-4 w-4" />
                      {createDrawMutation.isPending
                        ? "Sorteando..."
                        : "Realizar Sorteio"}
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="w-full sm:w-auto"
                          data-testid="button-delete-draw"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover Sorteio
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover o sorteio de{" "}
                            {getMonthName(selectedMonth)}/{selectedYear}? Esta
                            ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              drawData && deleteDrawMutation.mutate(drawData.id)
                            }
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Adoration Schedule - For all ministers */}
        {mySchedule && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Minha Escala de Adoração
              </CardTitle>
              <CardDescription>
                Sua escalação para adoração ao Santíssimo neste mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Você está escalado(a) para:</p>
                    <p className="text-xl font-semibold">
                      {mySchedule.date
                        ? format(new Date(mySchedule.date + "T12:00:00"), "dd/MM/yyyy (EEEE)", {
                            locale: ptBR,
                          })
                        : "Data não disponível"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">às 22h</p>
                    {mySchedule.isVoluntary && (
                      <Badge className="bg-green-600 mt-2">Voluntário</Badge>
                    )}
                  </div>

                  {mySchedule.familyMembers && mySchedule.familyMembers.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Familiares escalados neste mês:</p>
                      <ul className="list-disc list-inside">
                        {mySchedule.familyMembers.map((member) => (
                          <li key={member.id}>{member.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Swap Day Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <ArrowRightLeft className="h-4 w-4" />
                    Trocar dia de adoração
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Caso não possa comparecer na data escalada, você pode trocar para outra segunda-feira do mês.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select
                      value={selectedNewMonday}
                      onValueChange={setSelectedNewMonday}
                    >
                      <SelectTrigger className="w-full sm:w-[250px]">
                        <SelectValue placeholder="Selecione a nova data" />
                      </SelectTrigger>
                      <SelectContent>
                        {mySchedule.availableMondays
                          ?.filter((m) => m.week !== mySchedule.mondayOfWeek)
                          .map((monday) => (
                            <SelectItem key={monday.week} value={monday.week.toString()}>
                              {monday.date
                                ? format(new Date(monday.date + "T12:00:00"), "dd/MM (EEEE)", {
                                    locale: ptBR,
                                  })
                                : `Semana ${monday.week}`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={!selectedNewMonday || swapDayMutation.isPending}
                          variant="outline"
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          {swapDayMutation.isPending ? "Trocando..." : "Confirmar Troca"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar troca de dia</AlertDialogTitle>
                          <AlertDialogDescription>
                            Você deseja trocar sua adoração de{" "}
                            <strong>
                              {mySchedule.date
                                ? format(new Date(mySchedule.date + "T12:00:00"), "dd/MM", {
                                    locale: ptBR,
                                  })
                                : "data atual"}
                            </strong>{" "}
                            para{" "}
                            <strong>
                              {selectedNewMonday && mySchedule.availableMondays
                                ? format(
                                    new Date(
                                      mySchedule.availableMondays.find(
                                        (m) => m.week.toString() === selectedNewMonday
                                      )?.date + "T12:00:00" || ""
                                    ),
                                    "dd/MM",
                                    { locale: ptBR }
                                  )
                                : "nova data"}
                            </strong>
                            ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSwapDay}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No schedule message for ministers */}
        {!isLoadingMySchedule && !mySchedule && drawData && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Você não está escalado(a) para adoração neste mês.
            </AlertDescription>
          </Alert>
        )}

        {/* Results Section */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar os resultados do sorteio.
            </AlertDescription>
          </Alert>
        ) : !drawData ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum sorteio encontrado para {getMonthName(selectedMonth)}/
              {selectedYear}. Clique em "Realizar Sorteio" para começar.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Sorteio Realizado
                </CardTitle>
                <CardDescription>
                  Criado em{" "}
                  {drawData.created_at
                    ? format(new Date(drawData.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : "Data não disponível"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {drawData.results?.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ministros Sorteados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{mondays.length}</p>
                      <p className="text-sm text-muted-foreground">
                        Segundas-feiras
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {
                          drawData.results?.filter((r) => r.is_voluntary)
                            .length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Voluntários
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results by Monday */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Distribuição por Segunda-feira
                </CardTitle>
                <CardDescription>
                  Ministros escalados para cada segunda às 22h
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mondays.map((monday, index) => {
                    const weekNumber = index + 1; // 1, 2, 3, 4, 5
                    const ministers = groupedResults[weekNumber] || [];

                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg">
                            {monday
                              ? format(monday, "dd/MM/yyyy (EEEE)", {
                                  locale: ptBR,
                                })
                              : "Data inválida"}
                          </h3>
                          <Badge variant="secondary">
                            {ministers.length}{" "}
                            {ministers.length === 1 ? "ministro" : "ministros"}
                          </Badge>
                        </div>

                        {ministers.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ministro</TableHead>
                                <TableHead className="text-right">
                                  Tipo
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ministers.map((minister, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {minister.minister_name}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {minister.is_voluntary ? (
                                      <Badge className="bg-green-600">
                                        Voluntário
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">Sorteado</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            Nenhum ministro escalado para esta data
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
