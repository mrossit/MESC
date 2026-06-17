import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initClientErrorMonitoring } from "./lib/monitoring";

initClientErrorMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
