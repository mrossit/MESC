import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  url: string;
  title?: string;
}

export function VideoPlayer({ url, title }: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detecta tipo de vídeo (YouTube, Vimeo, ou direto)
  const getVideoType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    return 'direct';
  };

  const videoType = getVideoType(url);

  // Extrai ID do YouTube
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Extrai ID do Vimeo
  const getVimeoId = (url: string) => {
    const regExp = /vimeo.*\/(\d+)/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const renderPlayer = () => {
    if (videoType === 'youtube') {
      const videoId = getYouTubeId(url);
      if (!videoId) {
        return <ErrorFallback message="URL do YouTube inválida" />;
      }

      return (
        <iframe
          className="w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title || "Vídeo formativo"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (videoType === 'vimeo') {
      const videoId = getVimeoId(url);
      if (!videoId) {
        return <ErrorFallback message="URL do Vimeo inválida" />;
      }

      return (
        <iframe
          className="w-full h-full rounded-lg"
          src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`}
          title={title || "Vídeo formativo"}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Vídeo direto (MP4, WebM, etc.)
    return (
      <video
        className="w-full h-full rounded-lg"
        controls
        controlsList="nodownload"
      >
        <source src={url} type="video/mp4" />
        <source src={url} type="video/webm" />
        Seu navegador não suporta vídeos HTML5.
      </video>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-black aspect-video">
          {renderPlayer()}
        </div>
        {title && (
          <div className="p-4">
            <h4 className="font-medium text-sm">{title}</h4>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorFallback({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="text-center p-8">
        <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}
