import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pushNotificationService } from "./services/push-notifications.service";

// Inicializa o serviço de Push Notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  pushNotificationService.initialize().then(() => {
    console.log('[Main] Push Notifications service initialized');
  }).catch(error => {
    console.error('[Main] Error initializing push notifications:', error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
