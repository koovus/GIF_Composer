import { useRef, useState, useCallback, useEffect } from "react";
import { Check } from "lucide-react";
import type { Chunk } from "@shared/schema";

interface ChunkGridProps {
  chunks: Chunk[];
  selectedIds: Set<string>;
  onToggleChunk: (chunkId: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ChunkCard({
  chunk,
  isSelected,
  onToggle,
}: {
  chunk: Chunk;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailReady, setThumbnailReady] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    video.onloadeddata = () => {
      const midTime = (chunk.startTime + chunk.endTime) / 2;
      video.currentTime = midTime;
    };

    video.onseeked = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const thumbW = 320;
      const thumbH = Math.round(thumbW / chunk.aspectRatio);
      canvas.width = thumbW;
      canvas.height = thumbH;
      ctx.drawImage(video, 0, 0, thumbW, thumbH);
      setThumbnailReady(true);
      video.remove();
    };

    video.src = chunk.videoUrl;
    video.load();

    return () => {
      video.remove();
    };
  }, [chunk.videoUrl, chunk.startTime, chunk.endTime]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    hoverTimeoutRef.current = setTimeout(() => {
      const vid = videoRef.current;
      if (vid) {
        vid.currentTime = chunk.startTime;
        vid.play().catch(() => {});
      }
    }, 200);
  }, [chunk.startTime]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
    }
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onTimeUpdate = () => {
      if (vid.currentTime >= chunk.endTime) {
        vid.currentTime = chunk.startTime;
      }
    };

    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => vid.removeEventListener("timeupdate", onTimeUpdate);
  }, [chunk.startTime, chunk.endTime]);

  const duration = chunk.endTime - chunk.startTime;

  return (
    <button
      data-testid={`chunk-card-${chunk.id}`}
      onClick={onToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        group relative rounded-md transition-all duration-150 cursor-pointer text-left hover-elevate
        ${isSelected ? "ring-2" : "opacity-70 hover:opacity-100"}
      `}
      style={{
        boxShadow: isSelected ? `0 0 12px ${chunk.color}30, inset 0 0 0 2px ${chunk.color}` : undefined,
      }}
    >
      <div
        className="relative bg-navy-dark rounded-md overflow-hidden"
        style={{ aspectRatio: `${chunk.aspectRatio}` }}
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover ${isHovering ? "opacity-0" : "opacity-100"} transition-opacity`}
        />

        <video
          ref={videoRef}
          src={chunk.videoUrl}
          muted
          playsInline
          preload="none"
          className={`absolute inset-0 w-full h-full object-cover ${isHovering ? "opacity-100" : "opacity-0"} transition-opacity`}
        />

        {!thumbnailReady && !isHovering && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-dark">
            <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-coral rounded-full animate-spin" />
          </div>
        )}

        {isSelected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10"
            style={{ backgroundColor: chunk.color }}
          >
            <Check className="h-3 w-3 text-white" />
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4">
          <div className="flex items-center justify-between gap-1">
            <span
              className="text-[9px] font-mono font-semibold truncate"
              style={{ color: chunk.color }}
            >
              {chunk.videoName.replace(/\.[^.]+$/, '')}
            </span>
            <span className="text-[9px] font-mono text-white/60 flex-shrink-0">
              {formatTime(chunk.startTime)}-{formatTime(chunk.endTime)}
            </span>
          </div>
        </div>

        <div
          className="absolute top-0 inset-x-0 h-[3px] rounded-t-md"
          style={{ backgroundColor: chunk.color }}
        />

        {!isSelected && (
          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors rounded-md" />
        )}
      </div>
    </button>
  );
}

export function ChunkGrid({ chunks, selectedIds, onToggleChunk }: ChunkGridProps) {
  if (chunks.length === 0) return null;

  return (
    <div
      data-testid="chunk-grid"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2"
    >
      {chunks.map((chunk) => (
        <ChunkCard
          key={chunk.id}
          chunk={chunk}
          isSelected={selectedIds.has(chunk.id)}
          onToggle={() => onToggleChunk(chunk.id)}
        />
      ))}
    </div>
  );
}
