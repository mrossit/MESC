import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { configureClientRuntime } from "./lib/api-url";
import { initClientErrorMonitoring } from "./lib/monitoring";

configureClientRuntime();
initClientErrorMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
