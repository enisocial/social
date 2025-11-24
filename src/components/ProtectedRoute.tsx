import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/hooks/useRole';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'moderator' | 'both';
}

export const ProtectedRoute = ({ children, requiredRole = 'admin' }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, isAdminOrModerator, loading } = useRole();

  useEffect(() => {
    if (!loading) {
      const hasAccess = 
        (requiredRole === 'admin' && isAdmin) ||
        (requiredRole === 'moderator' && isModerator) ||
        (requiredRole === 'both' && isAdminOrModerator);

      if (!hasAccess) {
        const message = requiredRole === 'admin' 
          ? 'Accès refusé - Privilèges administrateur requis'
          : 'Accès refusé - Privilèges de modération requis';
        toast.error(message);
        navigate('/');
      }
    }
  }, [isAdmin, isModerator, isAdminOrModerator, loading, navigate, requiredRole]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  const hasAccess = 
    (requiredRole === 'admin' && isAdmin) ||
    (requiredRole === 'moderator' && isModerator) ||
    (requiredRole === 'both' && isAdminOrModerator);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};
