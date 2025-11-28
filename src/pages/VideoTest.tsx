import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';

const VideoTest = () => {
  const [muted, setMuted] = useState(true);

  return (
    <FacebookFeedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Audio Vidéo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMuted(!muted)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                {muted ? 'Activer son' : 'Couper son'}
              </button>
              <span>Status: {muted ? 'Muet' : 'Avec son'}</span>
            </div>

            <div className="relative h-80 bg-gray-200 rounded-lg overflow-hidden">
              <video
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                className="w-full h-full object-cover"
                autoPlay
                muted={muted}
                loop
                playsInline
                controls
              />
            </div>

            <p className="text-sm text-gray-600">
              Test: La vidéo devrait être muette par défaut et avoir du son quand activé.
            </p>
          </CardContent>
        </Card>
      </div>
    </FacebookFeedLayout>
  );
};

export default VideoTest;
