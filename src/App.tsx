import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { PageTransition } from "@/components/PageTransition";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { UserProtectedRoute } from "@/components/UserProtectedRoute";
import { UnreadProvider } from "@/contexts/UnreadContext";
import { MessengerProvider } from "@/contexts/MessengerContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { supabase } from "@/integrations/supabase/client";

import { RoutePreloader } from "@/components/RoutePreloader";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load pages for better performance
const Splash = lazy(() => import("./pages/Splash"));
const Feed = lazy(() => import("./pages/Feed"));
const Auth = lazy(() => import("./pages/Auth"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Admin = lazy(() => import("./pages/AdminDashboardNew"));
const AdminUserManagement = lazy(() => import("./pages/AdminUserManagement"));
const AdminModeration = lazy(() => import("./pages/AdminModeration"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminSystem = lazy(() => import("./pages/AdminSystem"));
const AdminHelpCenter = lazy(() => import("./pages/admin/AdminHelpCenter"));
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
const TermsOfService = lazy(() => import("./pages/Terms"));
const PrivacyPolicy = lazy(() => import("./pages/Privacy"));
const Help = lazy(() => import("./pages/Help"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const ReportIssue = lazy(() => import("./pages/ReportIssue"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Albums = lazy(() => import("./pages/Albums"));
const Events = lazy(() => import("./pages/Events"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const VideoTest = lazy(() => import("./pages/VideoTest"));
const Messages = lazy(() => import("./pages/Messages"));
const VoicePosts = lazy(() => import("./pages/VoicePosts"));

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

// PRESENCE INITIALIZER - Activé avec délai pour stabilité
const PresenceInitializer = () => {
  useEffect(() => {
    const initPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // Délai pour laisser l'app se stabiliser avant d'initialiser la présence
        setTimeout(() => {
          import('@/services/PresenceService').then(({ presenceService }) => {
            presenceService.initialize(session.user.id);
          });
        }, 3000);
      }
    };
    initPresence();
  }, []);
  return null;
};

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // SYSTEM ADMIN AUTO-REDIRECT - check DB role
  useEffect(() => {
    const checkAdminRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const publicPaths = ['/feed', '/explore', '/', '/auth'];
      if (!publicPaths.includes(location.pathname)) return;

      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole || session.user.email === 'admin@binkaa.com') {
        navigate('/admin-dashboard', { replace: true });
      }
    };

    checkAdminRedirect();
  }, [location.pathname, navigate]);

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Splash /></PageTransition>} />
          <Route path="/feed" element={<PageTransition><UserProtectedRoute><ErrorBoundary><Feed /></ErrorBoundary></UserProtectedRoute></PageTransition>} />
          <Route path="/explore" element={<PageTransition><UserProtectedRoute><Explore /></UserProtectedRoute></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
          <Route path="/help-center" element={<PageTransition><UserProtectedRoute><HelpCenter /></UserProtectedRoute></PageTransition>} />
          <Route path="/report-issue" element={<PageTransition><UserProtectedRoute><ReportIssue /></UserProtectedRoute></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/notifications" element={<PageTransition><UserProtectedRoute><Notifications /></UserProtectedRoute></PageTransition>} />
          <Route path="/messages" element={<PageTransition><UserProtectedRoute><Messages /></UserProtectedRoute></PageTransition>} />
          <Route path="/profile/:username" element={<PageTransition><UserProtectedRoute><Profile /></UserProtectedRoute></PageTransition>} />
          <Route path="/profile/:userId" element={<PageTransition><UserProtectedRoute><Profile /></UserProtectedRoute></PageTransition>} />
          <Route path="/post/:postId" element={<PageTransition><PostDetail /></PageTransition>} />
          <Route path="/admin-dashboard" element={<PageTransition><AdminProtectedRoute><Admin /></AdminProtectedRoute></PageTransition>} />
          <Route path="/admin" element={<PageTransition><AdminProtectedRoute><Admin /></AdminProtectedRoute></PageTransition>} />
          <Route path="/admin/users" element={<PageTransition><AdminProtectedRoute><AdminUserManagement /></AdminProtectedRoute></PageTransition>} />
          <Route path="/admin/moderation" element={<PageTransition><AdminProtectedRoute><AdminModeration /></AdminProtectedRoute></PageTransition>} />
          <Route path="/admin/analytics" element={<PageTransition><AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute></PageTransition>} />
          <Route path="/admin/system" element={<PageTransition><AdminProtectedRoute><AdminSystem /></AdminProtectedRoute></PageTransition>} />
          <Route path="/admin/help" element={<PageTransition><AdminProtectedRoute><AdminHelpCenter /></AdminProtectedRoute></PageTransition>} />
          <Route path="/moderator" element={<PageTransition><ProtectedRoute requiredRole="both"><Moderator /></ProtectedRoute></PageTransition>} />
          <Route path="/settings" element={<PageTransition><UserProtectedRoute><Settings /></UserProtectedRoute></PageTransition>} />
          <Route path="/settings/notifications" element={<PageTransition><UserProtectedRoute><NotificationSettings /></UserProtectedRoute></PageTransition>} />
          <Route path="/complete-profile" element={<PageTransition><UserProtectedRoute><CompleteProfile /></UserProtectedRoute></PageTransition>} />
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
          <Route path="/albums" element={<PageTransition><UserProtectedRoute><Albums /></UserProtectedRoute></PageTransition>} />
          <Route path="/albums/:albumId" element={<PageTransition><UserProtectedRoute><AlbumDetail /></UserProtectedRoute></PageTransition>} />
          <Route path="/events" element={<PageTransition><UserProtectedRoute><Events /></UserProtectedRoute></PageTransition>} />
          <Route path="/privacy-settings" element={<PageTransition><UserProtectedRoute><PrivacySettings /></UserProtectedRoute></PageTransition>} />
          <Route path="/video-test" element={<PageTransition><UserProtectedRoute><VideoTest /></UserProtectedRoute></PageTransition>} />
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          <Route path="/voice-posts" element={<PageTransition><UserProtectedRoute><VoicePosts /></UserProtectedRoute></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <BrowserRouter>
            <UnreadProvider>
              <PresenceProvider>
                <MessengerProvider>
                  <Toaster />
                  <Sonner />
                  <RoutePreloader />
                  <PresenceInitializer />
                  <AnimatedRoutes />
                </MessengerProvider>
              </PresenceProvider>
            </UnreadProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
