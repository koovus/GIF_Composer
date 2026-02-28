import { useRef, useState, useCallback, useEffect } from "react";
import { Trash2, GripVertical, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Segment, VideoFile } from "@shared/schema";

interface TimelineProps {
  segments: Segment[];
  videos: VideoFile[];
  onRemoveSegment: (id: string) => void;
  onReorderSegments: (segments: Segment[]) => void;
  onShuffleSegments: () => void;
  onSelectSegment: (segment: Segment) => void;
  activeSegmentId: string | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

const SEGMENT_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFA07A",
  "#95E1D3",
  "#A78BFA",
  "#F472B6",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#FB923C",
];

export function getSegmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

export function Timeline({
  segments,
  videos,
  onRemoveSegment,
  onReorderSegments,
  onShuffleSegments,
  onSelectSegment,
  activeSegmentId,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const totalDuration = segments.reduce(
    (acc, s) => acc + (s.endTime - s.startTime),
    0
  );

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIdx !== null && dragIdx !== idx) {
        setDragOverIdx(idx);
      }
    },
    [dragIdx]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
        const newSegments = [...segments];
        const [moved] = newSegments.splice(dragIdx, 1);
        newSegments.splice(dragOverIdx, 0, moved);
        onReorderSegments(newSegments);
      }
      setDragIdx(null);
      setDragOverIdx(null);
    },
    [dragIdx, dragOverIdx, segments, onReorderSegments]
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  if (segments.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-navy-light/50 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-muted-foreground/50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 6v12" />
            <path d="M10 6v12" />
            <path d="M14 6v12" />
            <path d="M18 6v12" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Timeline is empty</p>
          <p className="text-xs text-muted-foreground/60 font-mono mt-1">
            Select a video and mark IN/OUT points to add segments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {segments.length} segment{segments.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] font-mono text-teal px-1.5 py-0.5 bg-teal/10 rounded">
            {formatTime(totalDuration)} total
          </span>
        </div>
        <Button
          data-testid="button-shuffle-segments"
          size="sm"
          variant="ghost"
          onClick={onShuffleSegments}
          className="h-7 gap-1.5 text-xs font-mono text-salmon"
        >
          <Shuffle className="h-3 w-3" />
          Shuffle
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div
              ref={containerRef}
              className="flex items-stretch gap-1 p-3 min-w-min h-full"
              onDrop={handleDrop}
            >
              {segments.map((segment, idx) => {
                const segDuration = segment.endTime - segment.startTime;
                const widthPercent = totalDuration > 0 ? (segDuration / totalDuration) * 100 : 100 / segments.length;
                const minWidth = 120;

                return (
                  <div
                    key={segment.id}
                    data-testid={`timeline-segment-${segment.id}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectSegment(segment)}
                    className={`
                      group relative flex flex-col rounded-md cursor-pointer transition-all duration-150 flex-shrink-0
                      ${dragIdx === idx ? "opacity-40 scale-95" : ""}
                      ${dragOverIdx === idx ? "ring-2 ring-teal" : ""}
                      ${activeSegmentId === segment.id ? "ring-2 ring-white/50" : ""}
                    `}
                    style={{
                      minWidth: `${minWidth}px`,
                      width: `${Math.max(widthPercent, 8)}%`,
                      backgroundColor: `${segment.color}15`,
                      borderLeft: `3px solid ${segment.color}`,
                    }}
                  >
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <GripVertical className="h-3 w-3 text-muted-foreground/40 flex-shrink-0 cursor-grab" />
                      <span
                        className="text-[10px] font-mono font-medium truncate flex-1"
                        style={{ color: segment.color }}
                      >
                        {segment.videoName}
                      </span>
                      <button
                        data-testid={`button-remove-segment-${segment.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSegment(segment.id);
                        }}
                        className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <div className="flex-1 flex items-center px-2">
                      <div className="w-full h-4 rounded-sm overflow-hidden relative" style={{ backgroundColor: `${segment.color}20` }}>
                        <div
                          className="absolute inset-y-0 left-0 rounded-sm"
                          style={{
                            width: "100%",
                            background: `linear-gradient(90deg, ${segment.color}40, ${segment.color}20)`,
                          }}
                        />
                        {Array.from({ length: Math.min(20, Math.ceil(segDuration * 4)) }).map((_, i, arr) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px"
                            style={{
                              left: `${(i / arr.length) * 100}%`,
                              backgroundColor: `${segment.color}30`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2 py-1 text-[9px] font-mono text-muted-foreground">
                      <span>{formatTime(segment.startTime)}</span>
                      <span style={{ color: segment.color + "99" }}>
                        {formatTime(segDuration)}
                      </span>
                      <span>{formatTime(segment.endTime)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-3 py-1.5 border-t border-border/30">
            <div className="flex items-center gap-1">
              {segments.map((segment) => {
                const segDuration = segment.endTime - segment.startTime;
                const pct = totalDuration > 0 ? (segDuration / totalDuration) * 100 : 100 / segments.length;
                return (
                  <div
                    key={segment.id}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: segment.color,
                      opacity: activeSegmentId === segment.id ? 1 : 0.4,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
