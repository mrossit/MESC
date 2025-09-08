import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Eye, 
  UserCheck, 
  UserX,
  Phone,
  Mail,
  MapPin,
  CalendarIcon,
  Church
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Minister {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  role: string;
  birthDate?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredPosition?: number;
  preferredTimes?: string[];
  availableForSpecialEvents?: boolean;
  canServeAsCouple?: boolean;
  spouseUserId?: string;
  experience?: string;
  specialSkills?: string[];
  liturgicalTraining?: string[];
  lastService?: string;
  totalServices?: number;
  formationCompleted?: string[];
  observations?: string;
  active?: boolean;
}

// Mapa das 20 posições litúrgicas
const LITURGICAL_POSITIONS = {
  1: "Auxiliar 1 - Coordenação",
  2: "Auxiliar 2 - Coordenação",
  3: "Recolher Santíssimo 1",
  4: "Recolher Santíssimo 2",
  5: "Velas 1",
  6: "Velas 2",
  7: "Procissão com vela 1",
  8: "Procissão com vela 2",
  9: "Purificação/Exposição 1",
  10: "Purificação/Exposição 2",
  11: "Purificação/Exposição 3",
  12: "Purificação/Exposição 4",
  13: "Mezanino 1",
  14: "Mezanino 2",
  15: "Mezanino 3",
  16: "Lateral Nave 1",
  17: "Lateral Nave 2",
  18: "Lateral Nave 3",
  19: "Lateral Nave 4",
  20: "Lateral Nave 5"
};

const MASS_TIMES = ["7h", "9h", "11h", "12h", "17h", "19h"];

const SPECIAL_SKILLS = [
  "Liturgia",
  "Canto",
  "Leitura",
  "Acólito",
  "Coordenação",
  "Formação"
];

export default function Ministers({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });
  
  const user = authData?.user;
  const [ministers, setMinisters] = useState<Minister[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMinister, setSelectedMinister] = useState<Minister | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Minister>>({});
  const [birthDate, setBirthDate] = useState<Date | undefined>();

  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";

  useEffect(() => {
    fetchMinisters();
  }, []);

  const fetchMinisters = async () => {
    try {
      const response = await fetch("/api/ministers", {
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        setMinisters(data);
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar ministros",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching ministers:", error);
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (minister: Minister) => {
    setSelectedMinister(minister);
    setFormData(minister);
    setIsEditMode(false);
    setIsDialogOpen(true);
    if (minister.birthDate) {
      setBirthDate(new Date(minister.birthDate));
    }
  };

  const handleEdit = (minister: Minister) => {
    setSelectedMinister(minister);
    setFormData({
      ...minister,
      birthDate: minister.birthDate,
      address: minister.address,
      city: minister.city,
      zipCode: minister.zipCode,
      emergencyContact: minister.emergencyContact,
      emergencyPhone: minister.emergencyPhone,
      preferredPosition: minister.preferredPosition,
      experience: minister.experience,
      observations: minister.observations,
      active: minister.active,
      availableForSpecialEvents: minister.availableForSpecialEvents,
      canServeAsCouple: minister.canServeAsCouple,
      preferredTimes: minister.preferredTimes || []
    });
    setBirthDate(minister.birthDate ? new Date(minister.birthDate) : undefined);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedMinister) return;
    
    try {
      const dataToSave = {
        ...formData,
        birthDate: birthDate?.toISOString()
      };

      const response = await fetch(`/api/ministers/${selectedMinister.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(dataToSave)
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Dados do ministro atualizados com sucesso"
        });
        fetchMinisters();
        setIsDialogOpen(false);
        setIsEditMode(false);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao atualizar ministro",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving minister:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar dados",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (minister: Minister) => {
    try {
      const response = await fetch(`/api/ministers/${minister.id}/toggle-active`, {
        method: "PATCH",
        credentials: "include"
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: `Ministro ${minister.active ? "desativado" : "ativado"} com sucesso`
        });
        fetchMinisters();
      } else {
        toast({
          title: "Erro",
          description: "Erro ao alterar status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status",
        variant: "destructive"
      });
    }
  };

  const filteredMinisters = ministers.filter(minister =>
    minister.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    minister.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    minister.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getExperienceColor = (experience?: string) => {
    if (!experience || experience === "iniciante") return "secondary";
    if (experience === "sênior") return "default";
    if (experience === "intermediário") return "outline";
    return "secondary";
  };

  const getExperienceLabel = (experience?: string) => {
    if (!experience) return "Iniciante";
    if (experience === "sênior") return "Sênior";
    if (experience === "intermediário") return "Intermediário";
    if (experience === "iniciante") return "Iniciante";
    return "Iniciante";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando ministros...</div>
      </div>
    );
  }

  const content = (
    <div className="max-w-7xl mx-auto p-6 ml-[-4px] mr-[-4px] pl-[8px] pr-[8px] pt-[14px] pb-[14px] space-y-6">

      <Card className="border-opacity-30">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Lista de Ministros</CardTitle>
              <CardDescription>
                {ministers.length} ministros cadastrados • {ministers.filter(m => m.active).length} ativos
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Posição Preferida</TableHead>
                <TableHead>Experiência</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMinisters.map((minister) => (
                <TableRow key={minister.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{minister.name}</div>
                      {minister.city && (
                        <div className="text-sm text-muted-foreground">{minister.city}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {minister.email}
                      </div>
                      {minister.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {minister.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {minister.preferredPosition ? (
                      <Badge variant="outline" className="text-xs">
                        {LITURGICAL_POSITIONS[minister.preferredPosition as keyof typeof LITURGICAL_POSITIONS]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getExperienceColor(minister.experience)}>
                      {getExperienceLabel(minister.experience)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {minister.totalServices || 0} serviços
                    </div>
                  </TableCell>
                  <TableCell>
                    {minister.active ? (
                      <Badge variant="default" className="gap-1">
                        <UserCheck className="h-3 w-3" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <UserX className="h-3 w-3" />
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(minister)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isCoordinator && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(minister)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(minister)}
                          >
                            {minister.active ? (
                              <UserX className="h-4 w-4 text-destructive" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Editar Ministro" : "Detalhes do Ministro"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Atualize as informações do ministro" : "Visualizar informações completas"}
            </DialogDescription>
          </DialogHeader>

          {selectedMinister && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informações Pessoais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <Input 
                      value={selectedMinister.user.name} 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      value={selectedMinister.user.email} 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input 
                      value={selectedMinister.user.phone || ""} 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    {isEditMode ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !birthDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {birthDate ? format(birthDate, "dd/MM/yyyy") : "Selecione uma data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={birthDate}
                            onSelect={setBirthDate}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input 
                        value={birthDate ? format(birthDate, "dd/MM/yyyy") : "-"} 
                        disabled 
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Endereço</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Endereço</Label>
                    <Input 
                      value={formData.address || ""} 
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      disabled={!isEditMode}
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input 
                      value={formData.city || ""} 
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      disabled={!isEditMode}
                    />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input 
                      value={formData.zipCode || ""} 
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                      disabled={!isEditMode}
                    />
                  </div>
                </div>
              </div>

              {/* Contato de Emergência */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Contato de Emergência</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Contato</Label>
                    <Input 
                      value={formData.emergencyContact || ""} 
                      onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                      disabled={!isEditMode}
                    />
                  </div>
                  <div>
                    <Label>Telefone de Emergência</Label>
                    <Input 
                      value={formData.emergencyPhone || ""} 
                      onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})}
                      disabled={!isEditMode}
                    />
                  </div>
                </div>
              </div>

              {/* Informações Ministeriais */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informações Ministeriais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Posição Litúrgica Preferida</Label>
                    {isEditMode ? (
                      <Select 
                        value={formData.preferredPosition?.toString() || ""} 
                        onValueChange={(value) => setFormData({...formData, preferredPosition: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma posição" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LITURGICAL_POSITIONS).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        value={formData.preferredPosition ? LITURGICAL_POSITIONS[formData.preferredPosition as keyof typeof LITURGICAL_POSITIONS] : "-"} 
                        disabled 
                      />
                    )}
                  </div>
                  <div>
                    <Label>Nível de Experiência</Label>
                    {isEditMode ? (
                      <Select 
                        value={formData.experience || "iniciante"} 
                        onValueChange={(value) => setFormData({...formData, experience: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iniciante">Iniciante</SelectItem>
                          <SelectItem value="intermediário">Intermediário</SelectItem>
                          <SelectItem value="sênior">Sênior</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        value={getExperienceLabel(formData.experience)} 
                        disabled 
                      />
                    )}
                  </div>
                </div>

                <div>
                  <Label>Horários de Missa Preferidos</Label>
                  {isEditMode ? (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {MASS_TIMES.map((time) => (
                        <div key={time} className="flex items-center space-x-2">
                          <Checkbox 
                            checked={formData.preferredTimes?.includes(time) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData, 
                                  preferredTimes: [...(formData.preferredTimes || []), time]
                                });
                              } else {
                                setFormData({
                                  ...formData, 
                                  preferredTimes: formData.preferredTimes?.filter(t => t !== time) || []
                                });
                              }
                            }}
                          />
                          <Label>{time}</Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      {formData.preferredTimes?.length ? (
                        formData.preferredTimes.map((time) => (
                          <Badge key={time} variant="secondary">{time}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Nenhum horário selecionado</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Habilidades Especiais</Label>
                  {isEditMode ? (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {SPECIAL_SKILLS.map((skill) => (
                        <div key={skill} className="flex items-center space-x-2">
                          <Checkbox 
                            checked={formData.specialSkills?.includes(skill) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData, 
                                  specialSkills: [...(formData.specialSkills || []), skill]
                                });
                              } else {
                                setFormData({
                                  ...formData, 
                                  specialSkills: formData.specialSkills?.filter(s => s !== skill) || []
                                });
                              }
                            }}
                          />
                          <Label>{skill}</Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      {formData.specialSkills?.length ? (
                        formData.specialSkills.map((skill) => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Nenhuma habilidade selecionada</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={formData.availableForSpecialEvents || false}
                        onCheckedChange={(checked) => setFormData({...formData, availableForSpecialEvents: checked as boolean})}
                        disabled={!isEditMode}
                      />
                      <Label>Disponível para eventos especiais</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={formData.canServeAsCouple || false}
                        onCheckedChange={(checked) => setFormData({...formData, canServeAsCouple: checked as boolean})}
                        disabled={!isEditMode}
                      />
                      <Label>Pode servir em casal</Label>
                    </div>
                  </div>
                  
                  {isCoordinator && (
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                      <Checkbox 
                        checked={formData.active !== false}
                        onCheckedChange={(checked) => setFormData({...formData, active: checked as boolean})}
                        disabled={!isEditMode}
                      />
                      <Label className="font-medium">Ministro Ativo</Label>
                      {!formData.active && (
                        <Badge variant="destructive" className="ml-2">Inativo</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea 
                    value={formData.observations || ""} 
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                    disabled={!isEditMode}
                    rows={3}
                  />
                </div>
              </div>

              {/* Estatísticas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Estatísticas</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{formData.totalServices || 0}</div>
                      <p className="text-xs text-muted-foreground">Total de Serviços</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {formData.formationCompleted?.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Formações Concluídas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {formData.lastService ? 
                          format(new Date(formData.lastService), "dd/MM", { locale: ptBR }) : 
                          "-"
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">Último Serviço</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {isEditMode && (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Salvar Alterações
                </Button>
              </>
            )}
            {!isEditMode && isCoordinator && (
              <Button onClick={() => setIsEditMode(true)}>
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Layout 
      title="Diretório de Ministros"
      subtitle="Conheça os membros do ministério e seus contatos"
    >
      {content}
    </Layout>
  );
}