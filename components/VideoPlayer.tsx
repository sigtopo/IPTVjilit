
import React, { useEffect, useRef } from 'react';
import { Channel } from '../types';

interface VideoPlayerProps {
  channel: Channel;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ channel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.src = channel.url;
    video.play().catch(e => console.error("Playback failed", e));

    return () => {
      video.pause();
      video.src = "";
    };
  }, [channel]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        controls
        className="w-full h-full object-contain"
        autoPlay
      />
    </div>
  );
};

export default VideoPlayer;
