import { useState, useEffect, useRef, memo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bug,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Activity,
  Wifi,
  WifiOff,
  Server,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { APP_VERSION } from '@/lib/queryClient';

interface DebugPanelProps {
  isConnected: boolean;
  renderCount?: number;
}

import { getRenderTracking } from '@/lib/debug';

interface APIError {
  timestamp: number;
  url: string;
  status?: number;
  message: string;
}

export const DebugPanel = memo(({ isConnected, renderCount = 0 }: DebugPanelProps) => {
  const [location] = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [apiErrors, setApiErrors] = useState<APIError[]>([]);
  const [showRenderTracking, setShowRenderTracking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Get current user
  const { data: authData, error: authError } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });

  // Monitor API errors by intercepting fetch
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Track errors
        if (!response.ok && response.status !== 304) {
          const url = typeof args[0] === 'string' ? args[0] : args[0].url;
          setApiErrors(prev => [
            {
              timestamp: Date.now(),
              url,
              status: response.status,
              message: `${response.status} ${response.statusText}`,
            },
            ...prev.slice(0, 9), // Keep last 10 errors
          ]);
        }

        return response;
      } catch (error: any) {
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        setApiErrors(prev => [
          {
            timestamp: Date.now(),
            url,
            message: error.message || 'Network error',
          },
          ...prev.slice(0, 9),
        ]);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Clear all caches
  const handleClearCaches = async () => {
    try {
      // Clear React Query cache
      queryClient.clear();

      // Clear localStorage
      const keysToKeep = ['mesc-ui-theme']; // Keep theme
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      alert('✅ All caches cleared!');
    } catch (error) {
      console.error('Error clearing caches:', error);
      alert('❌ Error clearing caches. Check console.');
    }
  };

  // Hard reload without cache
  const handleHardReload = () => {
    window.location.reload();
  };

  // Clear API errors
  const clearErrors = () => {
    setApiErrors([]);
  };

  // Get render tracking info
  const renderTrackingInfo = getRenderTracking()
    .sort((a, b) => b[1] - a[1]) // Sort by render count descending
    .slice(0, 10); // Top 10

  if (!isVisible) {
    // Minimized floating button
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-[9999] shadow-lg bg-yellow-100 border-yellow-400 hover:bg-yellow-200"
        onClick={() => setIsVisible(true)}
      >
        <Bug className="h-4 w-4 mr-2" />
        Debug
      </Button>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`fixed z-[9999] transition-all ${isDragging ? 'cursor-move' : 'cursor-default'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '280px' : '400px',
        maxHeight: '80vh',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      <Card className="shadow-2xl border-2 border-yellow-500 bg-white dark:bg-gray-900 overflow-hidden">
        <CardHeader
          className="pb-3 cursor-move bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4 text-yellow-600" />
              Debug Panel
              <Badge variant="outline" className="text-xs">DEV</Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-7 w-7 p-0"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
            {/* App Info */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">App Info</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Version:</span>
                  <Badge variant="outline">{APP_VERSION}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Route:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{location}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">User Role:</span>
                  <Badge variant={authData?.user?.role === 'gestor' ? 'default' : 'secondary'}>
                    {authData?.user?.role || 'loading...'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">User:</span>
                  <span className="text-xs truncate max-w-[200px]">{authData?.user?.name || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* WebSocket Status */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Connection</h3>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">WebSocket Connected</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-600 font-medium">Polling Mode</span>
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  </>
                )}
              </div>
            </div>

            {/* API Errors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                  API Errors ({apiErrors.length})
                </h3>
                {apiErrors.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearErrors}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {apiErrors.length === 0 ? (
                <Alert className="py-2 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <AlertDescription className="text-xs text-green-700">
                    No API errors
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-1 max-h-[150px] overflow-y-auto">
                  {apiErrors.map((error, idx) => (
                    <Alert key={idx} variant="destructive" className="py-2">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        <div className="font-medium">{error.status || 'ERR'}: {error.message}</div>
                        <div className="text-xs opacity-70 truncate">{error.url}</div>
                        <div className="text-xs opacity-50">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>

            {/* Render Tracking */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                  Render Tracking
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRenderTracking(!showRenderTracking)}
                  className="h-6 px-2 text-xs"
                >
                  {showRenderTracking ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
              {showRenderTracking && (
                <div className="space-y-1 text-xs max-h-[150px] overflow-y-auto">
                  {renderTrackingInfo.length === 0 ? (
                    <p className="text-muted-foreground text-center py-2">
                      No components tracked yet
                    </p>
                  ) : (
                    renderTrackingInfo.map(([component, count]) => (
                      <div
                        key={component}
                        className="flex justify-between items-center py-1 px-2 bg-muted rounded"
                      >
                        <span className="truncate max-w-[250px]">{component}</span>
                        <Badge variant="outline" className="text-xs">
                          {count}x
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* React Query Cache */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                Cache Info
              </h3>
              <div className="text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Queries cached:</span>
                  <Badge variant="outline">
                    {queryClient.getQueryCache().getAll().length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mutations cached:</span>
                  <Badge variant="outline">
                    {queryClient.getMutationCache().getAll().length}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCaches}
                  className="text-xs h-8"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Caches
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHardReload}
                  className="text-xs h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Hard Reload
                </Button>
              </div>
            </div>

            {/* System Info */}
            <div className="space-y-1 text-xs text-muted-foreground border-t pt-2">
              <div className="flex items-center gap-1">
                <Server className="h-3 w-3" />
                <span>
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                   navigator.userAgent.includes('Firefox') ? 'Firefox' :
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>Memory: {(performance as any).memory ?
                  `${Math.round((performance as any).memory.usedJSHeapSize / 1048576)}MB` :
                  'N/A'}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
});

DebugPanel.displayName = 'DebugPanel';
