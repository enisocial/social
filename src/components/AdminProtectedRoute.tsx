import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('AdminProtectedRoute check:', {
        loading,
        userEmail: user?.email,
        userId: user?.id,
        pathname: window.location.pathname
      });

      if (!loading && user) {
        // SPECIAL ADMIN SYSTEM: admin@binkaa.com is automatically admin
        // No database checks needed - this is the system administrator
        if (user.email === 'admin@binkaa.com') {
          console.log('🔑 SYSTEM ADMIN DETECTED: admin@binkaa.com - GRANTING ACCESS');
          setIsAdmin(true);
          setChecking(false);
          return;
        }

        console.log('❌ NOT ADMIN:', user.email);
        // For other users, they are not admins (only admin@binkaa.com is system admin)
        setIsAdmin(false);

        setChecking(false);
      } else if (!loading) {
        console.log('❌ NO USER LOGGED IN');
        setIsAdmin(false);
        setChecking(false);
      }
    };

    checkAdminStatus();

    // Remove timeout to prevent fallback logic that might cause issues
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
