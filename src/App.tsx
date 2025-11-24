import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { PageTransition } from "@/components/PageTransition";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { UserProtectedRoute } from "@/components/UserProtectedRoute";
import { MessengerProvider } from "@/contexts/MessengerContext";
import { ChatBubbleManager } from "@/components/messenger/ChatBubbleManager";
import { RoutePreloader } from "@/components/RoutePreloader";

// Lazy load pages for better performance
const Splash = lazy(() => import("./pages/Splash"));
const Feed = lazy(() => import("./pages/Feed"));
const Auth = lazy(() => import("./pages/Auth"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Admin = lazy(() => import("./pages/AdminDashboardNew"));
const Moderator = lazy(() => import("./pages/ModeratorDashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const FindFriends = lazy(() => import("./pages/FindFriends"));
const Friends = lazy(() => import("./pages/Friends"));
const FriendSuggestions = lazy(() => import("./pages/FriendSuggestions"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupDetail = lazy(() => import("./pages/GroupDetail"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const SellProduct = lazy(() => import("./pages/SellProduct"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Explore = lazy(() => import("./pages/Explore"));
const LiveStreams = lazy(() => import("./pages/LiveStreams"));
const LiveStreamDetail = lazy(() => import("./pages/LiveStreamDetail"));
const AlbumDetail = lazy(() => import("./pages/AlbumDetail"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

// OPTIMIZED QueryClient - Balanced speed + resilience
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Strategic staleTime based on data volatility
      staleTime: 2 * 60 * 1000, // 2 minutes (reduced for fresher data)
      gcTime: 10 * 60 * 1000, // 10 minutes cache
      
      // FIXED: Enable smart refetching for better UX
      refetchOnWindowFocus: 'always', // Refresh critical data on focus
      refetchOnReconnect: true, // Recover after network issues
      refetchOnMount: true, // Ensure fresh data on component mount
      
      // FIXED: Add retry with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) return false;
        // Retry network errors up to 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      
      networkMode: 'online',
      
      // Performance optimization
      structuralSharing: true, // Reduce re-renders
    },
    mutations: {
      retry: 1, // One retry for mutations
      networkMode: 'online',
      
      // Optimistic updates enabled
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // Global error handling could be added here
      }
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Splash /></PageTransition>} />
          <Route path="/feed" element={<PageTransition><UserProtectedRoute><Feed /></UserProtectedRoute></PageTransition>} />
          <Route path="/explore" element={<PageTransition><UserProtectedRoute><Explore /></UserProtectedRoute></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/notifications" element={<PageTransition><UserProtectedRoute><Notifications /></UserProtectedRoute></PageTransition>} />
          <Route path="/messages" element={<PageTransition><UserProtectedRoute><Messages /></UserProtectedRoute></PageTransition>} />
          <Route path="/messages/:conversationId" element={<Navigate to="/messages" replace />} />
          <Route path="/profile/:username" element={<PageTransition><UserProtectedRoute><ProfilePage /></UserProtectedRoute></PageTransition>} />
          <Route path="/profile/:userId" element={<PageTransition><UserProtectedRoute><ProfilePage /></UserProtectedRoute></PageTransition>} />
          <Route path="/post/:postId" element={<PageTransition><PostDetail /></PageTransition>} />
          <Route path="/admin-dashboard" element={<PageTransition><AdminProtectedRoute><Admin /></AdminProtectedRoute></PageTransition>} />
          <Route path="/admin" element={<PageTransition><AdminProtectedRoute><Admin /></AdminProtectedRoute></PageTransition>} />
          <Route path="/moderator" element={<PageTransition><ProtectedRoute requiredRole="both"><Moderator /></ProtectedRoute></PageTransition>} />
          <Route path="/settings" element={<PageTransition><UserProtectedRoute><Settings /></UserProtectedRoute></PageTransition>} />
          <Route path="/settings/notifications" element={<PageTransition><UserProtectedRoute><NotificationSettings /></UserProtectedRoute></PageTransition>} />
          <Route path="/analytics" element={<PageTransition><UserProtectedRoute><Analytics /></UserProtectedRoute></PageTransition>} />
          <Route path="/find-friends" element={<PageTransition><UserProtectedRoute><FindFriends /></UserProtectedRoute></PageTransition>} />
          <Route path="/friends" element={<PageTransition><UserProtectedRoute><Friends /></UserProtectedRoute></PageTransition>} />
          <Route path="/friend-suggestions" element={<PageTransition><UserProtectedRoute><FriendSuggestions /></UserProtectedRoute></PageTransition>} />
          <Route path="/groups" element={<PageTransition><UserProtectedRoute><Groups /></UserProtectedRoute></PageTransition>} />
          <Route path="/groups/:groupId" element={<PageTransition><UserProtectedRoute><GroupDetail /></UserProtectedRoute></PageTransition>} />
          <Route path="/marketplace" element={<PageTransition><UserProtectedRoute><Marketplace /></UserProtectedRoute></PageTransition>} />
          <Route path="/marketplace/product/:id" element={<PageTransition><UserProtectedRoute><ProductDetail /></UserProtectedRoute></PageTransition>} />
          <Route path="/marketplace/sell" element={<PageTransition><UserProtectedRoute><SellProduct /></UserProtectedRoute></PageTransition>} />
          <Route path="/live" element={<PageTransition><UserProtectedRoute><LiveStreams /></UserProtectedRoute></PageTransition>} />
          <Route path="/lives" element={<PageTransition><UserProtectedRoute><LiveStreams /></UserProtectedRoute></PageTransition>} />
          <Route path="/live-streams" element={<Navigate to="/live" replace />} />
          <Route path="/live/:streamId" element={<PageTransition><UserProtectedRoute><LiveStreamDetail /></UserProtectedRoute></PageTransition>} />
          <Route path="/albums/:albumId" element={<PageTransition><UserProtectedRoute><AlbumDetail /></UserProtectedRoute></PageTransition>} />
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <MessengerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RoutePreloader />
            <AnimatedRoutes />
            <ChatBubbleManager />
          </BrowserRouter>
        </MessengerProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
