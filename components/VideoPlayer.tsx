
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

    // We check if Hls is globally available. In a real environment we'd use import Hls from 'hls.js';
    // For this environment, we'll try standard video playback first.
    // Most modern browsers support HLS natively or it might require the hls.js library.
    
    video.src = channel.url;
    video.play().catch(e => console.error("Playback failed", e));

    return () => {
      video.pause();
      video.src = "";
    };
  }, [channel]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-xl shadow-2xl border border-slate-800">
      <video
        ref={videoRef}
        controls
        className="max-w-full max-h-full w-full h-full object-contain"
        autoPlay
      />
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-3">
        {channel.logo && <img src={channel.logo} alt={channel.name} className="w-6 h-6 object-contain" />}
        <span className="text-white font-medium text-sm">{channel.name}</span>
      </div>
    </div>
  );
};

export default VideoPlayer;
