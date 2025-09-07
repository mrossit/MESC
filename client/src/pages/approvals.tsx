import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Layout, PageHeader } from "@/components/layout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Users, 
  User,
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Mail, 
  Phone, 
  Calendar,
  MessageSquare,
  Loader2,
  Church,
  MapPin,
  Building2,
  Heart,
  Eye,
  UserCheck,
  UserX,
  Clock
} from "lucide-react";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  birthDate: string;
  address: string;
  parishOrigin: string;
  timeAsMinister: string;
  motivation: string;
  createdAt: string;
}

export default function Approvals() {
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch("/api/users/pending", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.users || []);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários pendentes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Usuário aprovado com sucesso!"
        });
        fetchPendingUsers();
      } else {
        throw new Error("Erro ao aprovar usuário");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao aprovar usuário",
        variant: "destructive"
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    
    setProcessingUserId(selectedUser.id);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/reject`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (response.ok) {
        toast({
          title: "Usuário rejeitado",
          description: "O usuário foi notificado sobre a rejeição."
        });
        setShowRejectDialog(false);
        setSelectedUser(null);
        setRejectionReason("");
        fetchPendingUsers();
      } else {
        throw new Error("Erro ao rejeitar usuário");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao rejeitar usuário",
        variant: "destructive"
      });
    } finally {
      setProcessingUserId(null);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Layout>
      <PageHeader 
        title="Aprovações Pendentes" 
        description="Gerencie as solicitações de cadastro de novos ministros"
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[rgb(184,150,63)]/20 to-[rgb(160,82,45)]/10 rounded-lg">
              <UserCheck className="w-6 h-6 text-[rgb(160,82,45)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[rgb(74,58,40)]">Solicitações de Cadastro</h2>
              <p className="text-sm text-muted-foreground">Revise e aprove novos ministros</p>
            </div>
          </div>
          <Badge 
            variant={pendingUsers.length > 0 ? "destructive" : "secondary"}
            className="text-sm px-3 py-1"
          >
            <AlertCircle className="w-4 h-4 mr-1" />
            {pendingUsers.length} pendente{pendingUsers.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {pendingUsers.length === 0 ? (
          <Card className="border-[rgb(184,150,63)]/30">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[rgb(184,150,63)]/10 to-[rgb(160,82,45)]/5 rounded-full flex items-center justify-center"
                >
                  <Users className="h-10 w-10 text-[rgb(184,150,63)]" />
                </motion.div>
                <h3 className="text-lg font-medium text-[rgb(74,58,40)]">Nenhuma aprovação pendente</h3>
                <p className="text-muted-foreground mt-2">
                  Não há solicitações de cadastro aguardando aprovação.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-[rgb(184,150,63)]/30 hover:border-[rgb(184,150,63)]/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgb(184,150,63)]/20 to-[rgb(160,82,45)]/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-[rgb(160,82,45)]" />
                        </div>
                        <div className="space-y-3 flex-1">
                          <div>
                            <h3 className="text-lg font-semibold text-[rgb(74,58,40)]">{user.name}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Solicitado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Há {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} dias
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-[rgb(184,150,63)]" />
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-[rgb(184,150,63)]" />
                                <span>{user.phone}</span>
                              </div>
                              {user.whatsapp && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MessageSquare className="w-4 h-4 text-[rgb(184,150,63)]" />
                                  <span>{user.whatsapp}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="w-4 h-4 text-[rgb(184,150,63)]" />
                                <span>{user.parishOrigin}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Heart className="w-4 h-4 text-[rgb(184,150,63)]" />
                                <span>Tempo: {user.timeAsMinister}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-[rgb(184,150,63)]" />
                                <span className="truncate">{user.address}</span>
                              </div>
                            </div>
                          </div>
                          
                          {user.motivation && (
                            <div className="p-3 bg-[rgb(247,244,237)]/50 rounded-lg">
                              <p className="text-sm font-medium text-[rgb(92,72,55)] mb-1">Motivação:</p>
                              <p className="text-sm text-muted-foreground">{user.motivation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-[rgb(160,82,45)] to-[rgb(184,115,51)] hover:from-[rgb(160,82,45)]/90 hover:to-[rgb(184,115,51)]/90"
                          onClick={() => handleApprove(user.id)}
                          disabled={processingUserId === user.id}
                        >
                          {processingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          <span className="ml-1">Aprovar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 hover:bg-red-50 hover:text-red-600"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRejectDialog(true);
                          }}
                          disabled={processingUserId === user.id}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="ml-1">Rejeitar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[rgb(184,150,63)] hover:text-[rgb(184,150,63)]/80"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-1">Detalhes</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <UserX className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <DialogTitle>Rejeitar Cadastro</DialogTitle>
                  <DialogDescription>
                    Rejeitando solicitação de {selectedUser?.name}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Esta ação não pode ser desfeita. O solicitante será notificado por email.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da Rejeição (obrigatório)</Label>
                <Textarea
                  id="reason"
                  placeholder="Explique o motivo da rejeição para o solicitante..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setSelectedUser(null);
                  setRejectionReason("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingUserId === selectedUser?.id || !rejectionReason.trim()}
              >
                {processingUserId === selectedUser?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejeitando...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirmar Rejeição
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}