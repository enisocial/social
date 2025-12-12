import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VoicePostsSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border mb-6">
      <div className="p-6 text-center">
        <Mic className="w-12 h-12 text-pink-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Partagez vos pensées vocalement
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Exprimez-vous de manière plus personnelle et authentique avec les posts vocaux.
        </p>
        <Button
          onClick={() => navigate('/voice-posts')}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          <Mic className="w-4 h-4 mr-2" />
          Créer un post vocal
        </Button>
      </div>
    </div>
  );
};
