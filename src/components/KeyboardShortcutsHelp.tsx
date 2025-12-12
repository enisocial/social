import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  shortcuts: Array<{ combo: string; description: string }>;
  trigger?: React.ReactNode;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  trigger
}) => {
  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
      <Keyboard className="w-4 h-4 mr-2" />
      Raccourcis
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Raccourcis Clavier
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map(({ combo, description }, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{description}</span>
              <kbd className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-mono">
                {combo}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Conseil :</strong> Ces raccourcis améliorent l'accessibilité et accélèrent la navigation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
