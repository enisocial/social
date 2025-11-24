import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AutoplayVideoProps {
  src: string;
  className?: string;
}

export const AutoplayVideo = ({ src, className = '' }: AutoplayVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Vidéo visible - lecture automatique
            video.play().catch(() => {
              // Ignorer les erreurs de lecture auto
            });
            setIsPlaying(true);
          } else {
            // Vidéo non visible - pause
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: 0.5, // 50% de la vidéo doit être visible
        rootMargin: '0px'
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative group">
      <video
        ref={videoRef}
        src={src}
        loop
        muted={isMuted}
        playsInline
        className={`w-full ${className}`}
        onClick={toggleMute}
      />
      
      {/* Bouton de contrôle du son */}
      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-label={isMuted ? 'Activer le son' : 'Désactiver le son'}
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5 text-white" />
        ) : (
          <Volume2 className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Indicateur de lecture */}
      {isPlaying && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 rounded text-xs text-white">
          En lecture
        </div>
      )}
    </div>
  );
};
