import { lazy } from 'react';

// Lazy load das páginas para melhor performance
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Login = lazy(() => import('@/pages/login'));
const Register = lazy(() => import('@/pages/register'));
const ChangePassword = lazy(() => import('@/pages/change-password'));
const ChangePasswordRequired = lazy(() => import('@/pages/change-password-required'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Ministers = lazy(() => import('@/pages/Ministers'));
const MinistersDirectory = lazy(() => import('@/pages/MinistersDirectory'));
const Approvals = lazy(() => import('@/pages/approvals'));
const ScheduleCalendar = lazy(() => import('@/pages/ScheduleCalendar'));
const Formation = lazy(() => import('@/pages/formation'));
const QuestionnaireUnified = lazy(() => import('@/pages/QuestionnaireUnified'));
const QuestionnaireResponses = lazy(() => import('@/pages/QuestionnaireResponses'));
const ScheduleVisualization = lazy(() => import('@/pages/ScheduleVisualization'));
const AutoScheduleGeneration = lazy(() => import('@/pages/AutoScheduleGeneration'));
const QRCodeShare = lazy(() => import('@/pages/QRCodeShare'));
const Communication = lazy(() => import('@/pages/communication'));
const Install = lazy(() => import('@/pages/install'));
const NotFound = lazy(() => import('@/pages/not-found'));

export type RouteRole = 'gestor' | 'coordenador' | 'ministro';

export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  requiresAuth: boolean;
  allowedRoles?: RouteRole[];
  title?: string;
  showInMenu?: boolean;
  icon?: string;
}

export const routes: RouteConfig[] = [
  // Rotas públicas
  {
    path: '/login',
    component: Login,
    requiresAuth: false,
    title: 'Login',
    showInMenu: false
  },
  {
    path: '/register',
    component: Register,
    requiresAuth: false,
    title: 'Cadastro',
    showInMenu: false
  },
  {
    path: '/install',
    component: Install,
    requiresAuth: false,
    title: 'Instalar App',
    showInMenu: false
  },

  // Rotas autenticadas - Todos os usuários
  {
    path: '/',
    component: Dashboard,
    requiresAuth: true,
    title: 'Dashboard',
    showInMenu: true,
    icon: 'Home'
  },
  {
    path: '/dashboard',
    component: Dashboard,
    requiresAuth: true,
    title: 'Dashboard',
    showInMenu: false
  },
  {
    path: '/profile',
    component: Profile,
    requiresAuth: true,
    title: 'Perfil',
    showInMenu: true,
    icon: 'User'
  },
  {
    path: '/settings',
    component: Settings,
    requiresAuth: true,
    title: 'Configurações',
    showInMenu: true,
    icon: 'Settings'
  },
  {
    path: '/change-password',
    component: ChangePassword,
    requiresAuth: true,
    title: 'Alterar Senha',
    showInMenu: false
  },
  {
    path: '/change-password-required',
    component: ChangePasswordRequired,
    requiresAuth: true,
    title: 'Alterar Senha Obrigatório',
    showInMenu: false
  },
  {
    path: '/ministers-directory',
    component: MinistersDirectory,
    requiresAuth: true,
    title: 'Diretório de Ministros',
    showInMenu: true,
    icon: 'Users'
  },
  {
    path: '/schedule',
    component: ScheduleCalendar,
    requiresAuth: true,
    title: 'Escala de Missas',
    showInMenu: true,
    icon: 'Calendar'
  },
  {
    path: '/formation/:track?',
    component: Formation,
    requiresAuth: true,
    title: 'Formação',
    showInMenu: true,
    icon: 'GraduationCap'
  },
  {
    path: '/questionnaire',
    component: QuestionnaireUnified,
    requiresAuth: true,
    title: 'Questionário',
    showInMenu: true,
    icon: 'ClipboardList'
  },
  {
    path: '/communication',
    component: Communication,
    requiresAuth: true,
    title: 'Comunicação',
    showInMenu: true,
    icon: 'MessageSquare'
  },

  // Rotas restritas - Gestores e Coordenadores
  {
    path: '/ministers',
    component: Ministers,
    requiresAuth: true,
    allowedRoles: ['gestor', 'coordenador'],
    title: 'Gestão de Ministros',
    showInMenu: true,
    icon: 'UserCog'
  },
  {
    path: '/approvals',
    component: Approvals,
    requiresAuth: true,
    allowedRoles: ['gestor', 'coordenador'],
    title: 'Aprovações Pendentes',
    showInMenu: true,
    icon: 'CheckSquare'
  },
  {
    path: '/schedule-visualization',
    component: ScheduleVisualization,
    requiresAuth: true,
    allowedRoles: ['gestor', 'coordenador'],
    title: 'Visualizar Escalas',
    showInMenu: true,
    icon: 'Eye'
  },
  {
    path: '/schedule-generation',
    component: AutoScheduleGeneration,
    requiresAuth: true,
    allowedRoles: ['gestor', 'coordenador'],
    title: 'Gerar Escalas',
    showInMenu: true,
    icon: 'Sparkles'
  },
  {
    path: '/questionnaire-responses',
    component: QuestionnaireResponses,
    requiresAuth: true,
    allowedRoles: ['gestor', 'coordenador'],
    title: 'Respostas dos Questionários',
    showInMenu: true,
    icon: 'FileText'
  },
  {
    path: '/qrcode',
    component: QRCodeShare,
    requiresAuth: true,
    allowedRoles: ['gestor', 'coordenador'],
    title: 'QR Code',
    showInMenu: true,
    icon: 'QrCode'
  },

  // Fallback
  {
    path: '*',
    component: NotFound,
    requiresAuth: false,
    title: '404',
    showInMenu: false
  }
];

// Função helper para obter rotas por role
export function getRoutesByRole(role?: RouteRole): RouteConfig[] {
  return routes.filter(route => {
    if (!route.showInMenu) return false;
    if (!route.allowedRoles) return true;
    return role && route.allowedRoles.includes(role);
  });
}

// Função helper para verificar permissão de rota
export function hasRoutePermission(path: string, role?: RouteRole): boolean {
  const route = routes.find(r => r.path === path);
  if (!route) return false;
  if (!route.requiresAuth) return true;
  if (!route.allowedRoles) return true;
  return role ? route.allowedRoles.includes(role) : false;
}