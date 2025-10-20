import React, { useEffect, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CachedAuthGuard as AuthGuard } from "@/components/cached-auth-guard";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAUpdatePrompt } from "@/components/pwa-update-prompt";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { UpdateNotification } from "@/components/update-notification";
import { checkCacheVersion } from "@/lib/cacheManager";
import { checkInactivityAndClear } from "@/lib/version";
import { useActivityMonitor } from "@/hooks/useActivityMonitor";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { SessionIndicator } from "@/components/SessionIndicator";

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Lazy load all pages for code splitting
// Public pages - keep these eager loaded for better initial UX
import Login from "@/pages/login";
import Register from "@/pages/register";
import PrivacyPolicy from "@/pages/privacy-policy";

// Protected pages - lazy load to reduce initial bundle
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Approvals = lazy(() => import("@/pages/approvals"));
const ChangePassword = lazy(() => import("@/pages/change-password"));
const ChangePasswordRequired = lazy(() => import("@/pages/change-password-required"));
const MinistersDirectory = lazy(() => import("@/pages/MinistersDirectory"));
const Schedules = lazy(() => import("@/pages/Schedules"));
const QuestionnaireUnified = lazy(() => import("@/pages/QuestionnaireUnified"));
const QuestionnaireResponses = lazy(() => import("@/pages/QuestionnaireResponses"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const Substitutions = lazy(() => import("@/pages/Substitutions"));
const AutoScheduleGeneration = lazy(() => import("@/pages/AutoScheduleGeneration"));
const Formation = lazy(() => import("@/pages/formation"));
const Communication = lazy(() => import("@/pages/communication"));
const Install = lazy(() => import("@/pages/install"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Reports = lazy(() => import("@/pages/Reports"));

function RouterWithHooks() {
  // Monitor de atividade - logout automático após 10min de inatividade
  useActivityMonitor();

  // Verifica periodicamente se há nova versão e atualiza automaticamente
  useVersionCheck();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Public routes - eagerly loaded */}
        <Route path="/" component={() => <Login />} />
        <Route path="/login" component={() => <Login />} />
        <Route path="/register" component={() => <Register />} />
        <Route path="/privacy-policy" component={() => <PrivacyPolicy />} />

        {/* Protected routes - lazy loaded */}
        <Route path="/change-password" component={() => <ChangePassword />} />
        <Route path="/change-password-required" component={() => <ChangePasswordRequired />} />
        <Route path="/install" component={() => <Install />} />

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

        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Verificar versão do cache e inatividade ao iniciar a aplicação
  useEffect(() => {
    checkCacheVersion();
    checkInactivityAndClear();

    // Verificar inatividade periodicamente (a cada hora)
    const inactivityCheck = setInterval(() => {
      checkInactivityAndClear();
    }, 60 * 60 * 1000);

    return () => clearInterval(inactivityCheck);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="mesc-ui-theme">
        <TooltipProvider>
          <SessionIndicator />
          <Toaster />
          <UpdateNotification />
          <PWAInstallPrompt />
          <RouterWithHooks />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
