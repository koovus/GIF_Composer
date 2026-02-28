import { useRef, useState, useCallback, useEffect } from "react";
import { Trash2, GripVertical, X } from "lucide-react";
import type { Chunk } from "@shared/schema";

interface CompositionStripProps {
  chunks: Chunk[];
  onRemoveChunk: (id: string) => void;
  onReorder: (chunks: Chunk[]) => void;
  onClearAll: () => void;
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  return `${s}s`;
}

function StripItem({
  chunk,
  index,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: {
  chunk: Chunk;
  index: number;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    video.onloadeddata = () => {
      video.currentTime = (chunk.startTime + chunk.endTime) / 2;
    };

    video.onseeked = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const thumbW = 120;
      const thumbH = Math.round(thumbW / chunk.aspectRatio);
      canvas.width = thumbW;
      canvas.height = thumbH;
      ctx.drawImage(video, 0, 0, thumbW, thumbH);
      video.remove();
    };

    video.src = chunk.videoUrl;
    video.load();

    return () => video.remove();
  }, [chunk.videoUrl, chunk.startTime, chunk.endTime]);

  const duration = chunk.endTime - chunk.startTime;

  return (
    <div
      data-testid={`strip-item-${chunk.id}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`
        group relative flex-shrink-0 rounded-md cursor-grab active:cursor-grabbing transition-all duration-100
        ${isDragging ? "opacity-30" : ""}
        ${isDragOver ? "ring-2 ring-teal" : ""}
      `}
      style={{ width: "100px" }}
    >
      <div className="relative rounded-md overflow-hidden" style={{ borderTop: `2px solid ${chunk.color}` }}>
        <canvas
          ref={canvasRef}
          className="w-full bg-navy-dark"
          style={{ aspectRatio: `${chunk.aspectRatio}` }}
        />
        <button
          data-testid={`button-strip-remove-${chunk.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-2.5 w-2.5 text-white/80" />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 flex items-center justify-between">
          <span className="text-[8px] font-mono" style={{ color: chunk.color }}>
            {index + 1}
          </span>
          <span className="text-[8px] font-mono text-white/50">
            {duration.toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}

export function CompositionStrip({
  chunks,
  onRemoveChunk,
  onReorder,
  onClearAll,
}: CompositionStripProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDrop = useCallback(() => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      const newChunks = [...chunks];
      const [moved] = newChunks.splice(dragIdx, 1);
      newChunks.splice(dragOverIdx, 0, moved);
      onReorder(newChunks);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, dragOverIdx, chunks, onReorder]);

  const totalDuration = chunks.reduce((acc, c) => acc + (c.endTime - c.startTime), 0);

  if (chunks.length === 0) {
    return (
      <div
        data-testid="composition-strip-empty"
        className="flex items-center justify-center h-full gap-3 text-center"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0.3, 0.5, 0.7, 0.5, 0.3].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-muted-foreground/15"
                style={{ height: `${h * 24}px` }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground/40 font-mono">
            Click chunks above to build your composition
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center h-full gap-2 px-3" data-testid="composition-strip">
      <div className="flex items-center gap-1.5 flex-shrink-0 pr-2 border-r border-border/30">
        <span className="text-[10px] font-mono text-muted-foreground">
          {chunks.length} clips
        </span>
        <span className="text-[10px] font-mono text-teal px-1 py-0.5 bg-teal/10 rounded">
          {totalDuration.toFixed(1)}s
        </span>
        <button
          data-testid="button-clear-composition"
          onClick={onClearAll}
          className="p-1 rounded text-muted-foreground/40 hover:text-destructive transition-colors ml-1"
          title="Clear all"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-1">
        {chunks.map((chunk, idx) => (
          <StripItem
            key={chunk.id}
            chunk={chunk}
            index={idx}
            onRemove={() => onRemoveChunk(chunk.id)}
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIdx !== null && dragIdx !== idx) setDragOverIdx(idx);
            }}
            onDragEnd={handleDrop}
            isDragging={dragIdx === idx}
            isDragOver={dragOverIdx === idx}
          />
        ))}
      </div>
    </div>
  );
}
