import { Navbar } from '@/components/Navbar';
import { Shield } from 'lucide-react';
import { ModerationQueue } from '@/components/admin/ModerationQueue';

export default function ModeratorDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Panneau de Modération
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez le contenu signalé et modérez la plateforme
          </p>
        </div>

        <ModerationQueue />
      </main>
    </div>
  );
}
