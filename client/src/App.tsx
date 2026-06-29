import React, { useEffect, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CachedAuthGuard as AuthGuard } from "@/components/cached-auth-guard";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { UpdateNotification } from "@/components/update-notification";
import { checkCacheVersion } from "@/lib/cacheManager";
import { checkInactivityAndClear } from "@/lib/version";
import { useActivityMonitor } from "@/hooks/useActivityMonitor";
import { useNativePushNotificationBridge } from "@/hooks/useNativePushNotificationBridge";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { SessionIndicator } from "@/components/SessionIndicator";
import { SentryErrorBoundary } from "@/lib/monitoring";
import { isNativeRuntime } from "@/lib/api-url";

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const AppErrorFallback = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold">Algo saiu do previsto</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Recarregue a página. Se continuar acontecendo, a coordenação já poderá analisar o erro.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Recarregar
      </button>
    </div>
  </div>
);

// Lazy load all pages for code splitting
// Public pages - keep these eager loaded for better initial UX
import Login from "@/pages/login";
import Register from "@/pages/register";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfUse from "@/pages/terms-of-use";
import AccountDeletion from "@/pages/account-deletion";

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
const FormationAdmin = lazy(() => import("@/pages/FormationAdmin"));
const Communication = lazy(() => import("@/pages/communication"));
const Install = lazy(() => import("@/pages/install"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Reports = lazy(() => import("@/pages/Reports"));
const Metrics = lazy(() => import("@/pages/Metrics"));
const AdorationDraw = lazy(() => import("@/pages/AdorationDraw"));
const ActivityLogs = lazy(() => import("@/pages/ActivityLogs"));
const Insights = lazy(() => import("@/pages/Insights"));
const Library = lazy(() => import("@/pages/Library"));
const Gamification = lazy(() => import("@/pages/Gamification"));

function RouterWithHooks() {
  // Monitor de atividade - logout automático após 10min de inatividade
  useActivityMonitor();

  // Verifica periodicamente se há nova versão e atualiza automaticamente
  useVersionCheck();

  // Escuta ações de notificações nativas e abre a rota correta dentro do app.
  useNativePushNotificationBridge();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Public routes - eagerly loaded */}
        <Route path="/" component={() => <Login />} />
        <Route path="/login" component={() => <Login />} />
        <Route path="/register" component={() => <Register />} />
        <Route path="/privacy-policy" component={() => <PrivacyPolicy />} />
        <Route path="/terms-of-use" component={() => <TermsOfUse />} />
        <Route path="/account-deletion" component={() => <AccountDeletion />} />

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

        <Route path="/formation/library">
          <AuthGuard>
            <Library />
          </AuthGuard>
        </Route>

        <Route path="/formation-admin">
          <AuthGuard allowedRoles={["gestor", "coordenador"]}>
            <FormationAdmin />
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

        <Route path="/metrics">
          <AuthGuard allowedRoles={["gestor", "coordenador"]}>
            <Metrics />
          </AuthGuard>
        </Route>

        <Route path="/adoration-draw">
          <AuthGuard allowedRoles={["gestor", "coordenador"]}>
            <AdorationDraw />
          </AuthGuard>
        </Route>

        <Route path="/activity-logs">
          <AuthGuard allowedRoles={["gestor", "coordenador"]}>
            <ActivityLogs />
          </AuthGuard>
        </Route>

        <Route path="/insights">
          <AuthGuard allowedRoles={["gestor", "coordenador"]}>
            <Insights />
          </AuthGuard>
        </Route>

        <Route path="/gamification">
          <AuthGuard>
            <Gamification />
          </AuthGuard>
        </Route>

        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const isNativeApp = isNativeRuntime();

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
    <SentryErrorBoundary fallback={<AppErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="mesc-ui-theme">
          <TooltipProvider>
            <SessionIndicator />
            <Toaster />
            {!isNativeApp && <UpdateNotification />}
            {!isNativeApp && <PWAInstallPrompt />}
            <RouterWithHooks />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SentryErrorBoundary>
  );
}

export default App;
