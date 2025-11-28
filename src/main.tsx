import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Start rendering immediately - no QueryClient wrapper needed in main
// QueryClient is already in App.tsx
createRoot(document.getElementById("root")!).render(<App />);
// PRÉCHARGEMENT ULTRA-RAPIDE AU DÉMARRAGE
const preloadApp = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await preloadEverything(user.id);
    }
  } catch (error) {
    console.warn('Préchargement failed:', error);
  }
};

preloadApp();

