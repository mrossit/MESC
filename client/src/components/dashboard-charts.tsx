import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar
} from "recharts";
import { TrendingUp, TrendingDown, Users, Calendar, Church, Activity } from "lucide-react";
import { motion } from "framer-motion";

// Dados para o gráfico de barras
const attendanceData = [
  { day: "Dom", ministros: 45, missas: 8 },
  { day: "Seg", ministros: 12, missas: 2 },
  { day: "Ter", ministros: 18, missas: 3 },
  { day: "Qua", ministros: 22, missas: 4 },
  { day: "Qui", ministros: 15, missas: 2 },
  { day: "Sex", ministros: 28, missas: 5 },
  { day: "Sáb", ministros: 35, missas: 6 },
];

// Dados para o gráfico de linha
const monthlyData = [
  { month: "Jan", disponibilidade: 89, participacao: 92 },
  { month: "Fev", disponibilidade: 87, participacao: 88 },
  { month: "Mar", disponibilidade: 92, participacao: 95 },
  { month: "Abr", disponibilidade: 85, participacao: 87 },
  { month: "Mai", disponibilidade: 90, participacao: 91 },
  { month: "Jun", disponibilidade: 94, participacao: 96 },
];

// Dados para o gráfico de pizza
const ministryDistribution = [
  { name: "Ativos", value: 189, color: "#D4AF37" },
  { name: "Inativos", value: 23, color: "#8B4513" },
  { name: "Afastados", value: 15, color: "#CD7F32" },
  { name: "Novatos", value: 20, color: "#DAA520" },
];

// Dados para o gráfico radial
const performanceData = [
  { name: "Presença", value: 92, fill: "#D4AF37" },
  { name: "Pontualidade", value: 88, fill: "#8B4513" },
  { name: "Compromisso", value: 95, fill: "#CD7F32" },
  { name: "Formação", value: 78, fill: "#DAA520" },
];

export function AttendanceChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Presença Semanal</CardTitle>
              <CardDescription>Ministros e missas por dia da semana</CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              ministros: {
                label: "Ministros",
                color: "#D4AF37",
              },
              missas: {
                label: "Missas",
                color: "#8B4513",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="day" 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar 
                  dataKey="ministros" 
                  fill="#D4AF37" 
                  radius={[8, 8, 0, 0]}
                  className="hover:opacity-80 transition-opacity"
                />
                <Bar 
                  dataKey="missas" 
                  fill="#8B4513" 
                  radius={[8, 8, 0, 0]}
                  className="hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TrendChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Tendência Mensal</CardTitle>
              <CardDescription>Disponibilidade vs Participação</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Activity className="w-3 h-3 mr-1" />
                Estável
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              disponibilidade: {
                label: "Disponibilidade",
                color: "#D4AF37",
              },
              participacao: {
                label: "Participação",
                color: "#CD7F32",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorDisp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CD7F32" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#CD7F32" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="disponibilidade" 
                  stroke="#D4AF37" 
                  fillOpacity={1}
                  fill="url(#colorDisp)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="participacao" 
                  stroke="#CD7F32" 
                  fillOpacity={1}
                  fill="url(#colorPart)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DistributionChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Distribuição de Ministros</CardTitle>
          <CardDescription>Status atual do ministério</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <ChartContainer
              config={{
                value: {
                  label: "Ministros",
                },
              }}
              className="h-[250px] w-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ministryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ministryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="space-y-2">
              {ministryDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                  <Badge variant="outline" className="ml-auto">
                    {item.value}
                  </Badge>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <Badge className="bg-gold text-white">
                    {ministryDistribution.reduce((acc, item) => acc + item.value, 0)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PerformanceChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Indicadores de Desempenho</CardTitle>
              <CardDescription>Métricas gerais do ministério</CardDescription>
            </div>
            <Badge className="bg-green-500 text-white">
              Excelente
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              value: {
                label: "Desempenho",
              },
            }}
            className="h-[250px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="10%" 
                outerRadius="100%" 
                data={performanceData}
              >
                <RadialBar
                  minAngle={15}
                  label={{ position: 'insideStart', fill: '#fff' }}
                  background
                  clockWise
                  dataKey="value"
                />
                <Legend 
                  iconSize={10}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {performanceData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-muted rounded-full h-2 w-20">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${item.value}%`,
                        backgroundColor: item.fill 
                      }}
                    />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.value}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}