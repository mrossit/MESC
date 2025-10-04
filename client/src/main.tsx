import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./utils/cleanup-ui";

createRoot(document.getElementById("root")!).render(<App />);
