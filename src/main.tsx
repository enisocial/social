import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Start rendering immediately - no QueryClient wrapper needed in main
// QueryClient is already in App.tsx
createRoot(document.getElementById("root")!).render(<App />);
