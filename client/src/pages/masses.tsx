import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Calendar,
  AlertCircle
} from "lucide-react";
import type { MassTimeConfig } from "@shared/schema";

export default function Masses() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: massTimes = [], isLoading, error } = useQuery({
    queryKey: ["/api/mass-times"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Mock mass data based on the design
  const massCards = [
    {
      name: "Missa Dominical",
      schedule: "Domingos, 08:00",
      ministersNeeded: 6,
      duration: "1h 30min",
      lastScheduled: "26/01/2025",
      status: "active",
      image: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=300&h=200&fit=crop"
    },
    {
      name: "Missa das Crianças", 
      schedule: "Domingos, 10:00",
      ministersNeeded: 4,
      duration: "1h 15min",
      lastScheduled: "26/01/2025",
      status: "active",
      image: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=300&h=200&fit=crop"
    },
    {
      name: "Missa Solene",
      schedule: "Domingos, 19:00", 
      ministersNeeded: 8,
      duration: "2h",
      lastScheduled: "26/01/2025",
      status: "active",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop"
    },
    {
      name: "Missa Semanal",
      schedule: "Terças, 19:00",
      ministersNeeded: 2,
      duration: "45min", 
      lastScheduled: "21/01/2025",
      status: "active",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop"
    }
  ];

  const weeklySchedule = [
    { day: "Domingo", masses: ["08:00", "10:00", "19:00"] },
    { day: "Segunda", masses: [] },
    { day: "Terça", masses: ["19:00"] },
    { day: "Quarta", masses: ["19:00"] },
    { day: "Quinta", masses: ["19:00"] },
    { day: "Sexta", masses: ["19:00"] },
    { day: "Sábado", masses: ["19:00"] }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
            Ativa
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary">
            Inativa
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2 items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h1 className="text-2xl font-bold text-gray-900">Erro ao carregar</h1>
              </div>
              <p className="mt-4 text-sm text-gray-600 text-center">
                Não foi possível carregar as configurações de missas.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Missas</h1>
            <p className="text-muted-foreground mt-1">Configurar horários e informações das missas</p>
          </div>
          <div className="flex items-center gap-3">
            <Button data-testid="button-new-mass">
              <Plus className="w-4 h-4 mr-2" />
              Nova Missa
            </Button>
          </div>
        </div>

        {/* Masses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {massCards.map((mass, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" data-testid={`card-mass-${index}`}>
              <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                <img 
                  src={mass.image} 
                  alt={mass.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-foreground" data-testid={`text-mass-name-${index}`}>
                    {mass.name}
                  </h3>
                  {getStatusBadge(mass.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-4" data-testid={`text-mass-schedule-${index}`}>
                  {mass.schedule}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ministros necessários:</span>
                    <span className="font-medium text-foreground" data-testid={`text-ministers-needed-${index}`}>
                      {mass.ministersNeeded}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duração estimada:</span>
                    <span className="font-medium text-foreground" data-testid={`text-duration-${index}`}>
                      {mass.duration}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Último agendamento:</span>
                    <span className="font-medium text-foreground" data-testid={`text-last-scheduled-${index}`}>
                      {mass.lastScheduled}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" size="sm" data-testid={`button-edit-${index}`}>
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button className="flex-1" size="sm" data-testid={`button-view-schedule-${index}`}>
                    <Calendar className="w-4 h-4 mr-1" />
                    Ver Escala
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mass Schedule Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Resumo Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weeklySchedule.map((day, index) => (
                <div key={index} className="text-center" data-testid={`day-schedule-${index}`}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {day.day}
                  </h4>
                  <div className="space-y-2">
                    {day.masses.length > 0 ? (
                      day.masses.map((time, timeIndex) => (
                        <div 
                          key={timeIndex} 
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                          data-testid={`mass-time-${index}-${timeIndex}`}
                        >
                          {time}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem missas</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
