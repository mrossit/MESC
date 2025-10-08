import React, { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CachedAuthGuard as AuthGuard } from "@/components/cached-auth-guard";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAUpdatePrompt } from "@/components/pwa-update-prompt";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { checkCacheVersion } from "@/lib/cacheManager";
import { useActivityMonitor } from "@/hooks/useActivityMonitor";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { SessionIndicator } from "@/components/SessionIndicator";
// import { VersionChecker } from "@/components/VersionChecker";
// import { initVersionControl } from "@/lib/version";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Approvals from "@/pages/approvals";
import ChangePassword from "@/pages/change-password";
import ChangePasswordRequired from "@/pages/change-password-required";
import Ministers from "@/pages/Ministers";
import MinistersDirectory from "@/pages/MinistersDirectory";
import Schedules from "@/pages/Schedules";
import QuestionnaireUnified from "@/pages/QuestionnaireUnified";
import QuestionnaireResponses from "@/pages/QuestionnaireResponses";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Substitutions from "@/pages/Substitutions";
import AutoScheduleGeneration from "@/pages/AutoScheduleGeneration";
import Formation from "@/pages/formation";
import Communication from "@/pages/communication";
import Install from "@/pages/install";
import UserManagement from "@/pages/UserManagement";
import QRCodeShare from "@/pages/QRCodeShare";
import NotFound from "@/pages/not-found";
import Reports from "@/pages/Reports";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={() => <Login />} />
      <Route path="/login" component={() => <Login />} />
      <Route path="/register" component={() => <Register />} />
      <Route path="/change-password" component={() => <ChangePassword />} />
      <Route path="/change-password-required" component={() => <ChangePasswordRequired />} />
      <Route path="/install" component={() => <Install />} />
      
      {/* Protected routes */}
      <Route path="/dashboard">
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      </Route>
      
      <Route path="/schedules/substitutions">
        <AuthGuard>
          <Substitutions />
        </AuthGuard>
      </Route>
      
      <Route path="/schedules/auto-generation">
        <AuthGuard allowedRoles={["gestor", "coordenador"]}>
          <AutoScheduleGeneration />
        </AuthGuard>
      </Route>
      
      <Route path="/schedules/:action?">
        <AuthGuard>
          <Schedules />
        </AuthGuard>
      </Route>
      
      <Route path="/questionnaire">
        <AuthGuard>
          <QuestionnaireUnified />
        </AuthGuard>
      </Route>
      
      <Route path="/questionnaire-responses">
        <AuthGuard allowedRoles={["coordenador", "gestor"]}>
          <QuestionnaireResponses />
        </AuthGuard>
      </Route>
      
      <Route path="/profile">
        <AuthGuard>
          <Profile />
        </AuthGuard>
      </Route>
      
      <Route path="/settings">
        <AuthGuard>
          <Settings />
        </AuthGuard>
      </Route>
      
      <Route path="/ministers">
        <AuthGuard allowedRoles={["gestor", "coordenador"]}>
          <Ministers />
        </AuthGuard>
      </Route>
      
      <Route path="/ministros">
        <AuthGuard allowedRoles={["gestor", "coordenador"]}>
          <Ministers />
        </AuthGuard>
      </Route>
      
      <Route path="/ministers-directory">
        <AuthGuard>
          <MinistersDirectory />
        </AuthGuard>
      </Route>
      
      <Route path="/formation/:track?/:module?/:lesson?">
        <AuthGuard>
          <Formation />
        </AuthGuard>
      </Route>
      
      <Route path="/communication">
        <AuthGuard>
          <Communication />
        </AuthGuard>
      </Route>

      <Route path="/reports">
        <AuthGuard allowedRoles={["gestor", "coordenador"]}>
          <Reports />
        </AuthGuard>
      </Route>
      
      <Route path="/approvals">
        <AuthGuard allowedRoles={["gestor", "coordenador"]}>
          <Approvals />
        </AuthGuard>
      </Route>
      
      <Route path="/user-management">
        <AuthGuard allowedRoles={["gestor", "coordenador"]}>
          <UserManagement />
        </AuthGuard>
      </Route>
      
      
      <Route path="/qrcode">
        <AuthGuard allowedRoles={["gestor", "coordenador"]}>
          <QRCodeShare />
        </AuthGuard>
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Monitor de atividade - logout automático após 10min de inatividade
  useActivityMonitor();

  // Verifica periodicamente se há nova versão e atualiza automaticamente
  useVersionCheck();

  // Verificar versão do cache ao iniciar a aplicação
  useEffect(() => {
    checkCacheVersion();

    // Inicializar controle de versão (comentado temporariamente para debug)
    // initVersionControl().catch(error => {
    //   console.error('Erro ao inicializar controle de versão:', error);
    // });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="mesc-ui-theme">
        <TooltipProvider>
          <SessionIndicator />
          <Toaster />
          <PWAUpdatePrompt />
          <PWAInstallPrompt />
          {/* <VersionChecker /> */}
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
