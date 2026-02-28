import { useRef, useState, useEffect, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Clock, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoFile } from "@shared/schema";

interface VideoPanelProps {
  video: VideoFile;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onSetSegmentStart: (time: number) => void;
  onSetSegmentEnd: (time: number) => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export function VideoPanel({
  video,
  isActive,
  onSelect,
  onRemove,
  onSetSegmentStart,
  onSetSegmentEnd,
  currentTime,
  onTimeUpdate,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [localTime, setLocalTime] = useState(0);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onLoaded = () => setDuration(vid.duration);
    const onTimeUpd = () => {
      setLocalTime(vid.currentTime);
      if (isActive) onTimeUpdate(vid.currentTime);
    };
    const onEnded = () => setIsPlaying(false);

    vid.addEventListener("loadedmetadata", onLoaded);
    vid.addEventListener("timeupdate", onTimeUpd);
    vid.addEventListener("ended", onEnded);
    return () => {
      vid.removeEventListener("loadedmetadata", onLoaded);
      vid.removeEventListener("timeupdate", onTimeUpd);
      vid.removeEventListener("ended", onEnded);
    };
  }, [isActive, onTimeUpdate]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  }, []);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vid = videoRef.current;
      if (!vid) return;
      const time = parseFloat(e.target.value);
      vid.currentTime = time;
      setLocalTime(time);
      if (isActive) onTimeUpdate(time);
    },
    [isActive, onTimeUpdate]
  );

  const markIn = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSetSegmentStart(localTime);
    },
    [localTime, onSetSegmentStart]
  );

  const markOut = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSetSegmentEnd(localTime);
    },
    [localTime, onSetSegmentEnd]
  );

  return (
    <div
      data-testid={`card-video-${video.id}`}
      onClick={onSelect}
      className={`
        group relative rounded-md transition-all duration-200 cursor-pointer
        ${
          isActive
            ? "ring-2 ring-coral bg-coral/5"
            : "bg-card border border-border hover:border-teal/40"
        }
      `}
    >
      <div className="relative aspect-video bg-navy-dark rounded-t-md">
        <video
          ref={videoRef}
          src={video.url}
          muted={isMuted}
          preload="metadata"
          className="w-full h-full object-contain rounded-t-md"
          playsInline
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            data-testid={`button-play-${video.id}`}
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white ml-0.5" />
            )}
          </button>
        </div>
        <Button
          data-testid={`button-remove-${video.id}`}
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 h-6 w-6 bg-black/40 backdrop-blur-sm text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </Button>
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] font-mono text-white/80">
          {formatTime(localTime)} / {formatTime(duration)}
        </div>
      </div>

      <div className="p-2 space-y-2">
        <div className="flex items-center gap-1.5">
          <Film className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <p className="text-xs font-medium truncate flex-1" title={video.name}>
            {video.name}
          </p>
        </div>

        <div className="relative">
          <input
            data-testid={`slider-scrub-${video.id}`}
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={localTime}
            onChange={handleScrub}
            className="w-full h-1 appearance-none bg-navy-light rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-coral
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(255,107,107,0.5)]"
            style={{
              background: `linear-gradient(to right, #4ECDC4 0%, #4ECDC4 ${(localTime / (duration || 1)) * 100}%, #16213E ${(localTime / (duration || 1)) * 100}%, #16213E 100%)`,
            }}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            data-testid={`button-mute-${video.id}`}
            onClick={toggleMute}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </button>
          <div className="flex-1" />
          <Button
            data-testid={`button-mark-in-${video.id}`}
            size="sm"
            variant="ghost"
            onClick={markIn}
            className="h-6 px-2 text-[10px] font-mono text-teal gap-1"
          >
            <Scissors className="h-2.5 w-2.5" />
            IN
          </Button>
          <Button
            data-testid={`button-mark-out-${video.id}`}
            size="sm"
            variant="ghost"
            onClick={markOut}
            className="h-6 px-2 text-[10px] font-mono text-salmon gap-1"
          >
            <Scissors className="h-2.5 w-2.5" />
            OUT
          </Button>
        </div>
      </div>
    </div>
  );
}

function Film(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M17 3v18" />
      <path d="M3 7h4" />
      <path d="M17 7h4" />
      <path d="M3 12h18" />
      <path d="M3 17h4" />
      <path d="M17 17h4" />
    </svg>
  );
}
