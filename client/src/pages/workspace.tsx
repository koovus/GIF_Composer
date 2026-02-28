import { useState, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { VideoUpload } from "@/components/video-upload";
import { ChunkGrid } from "@/components/chunk-grid";
import { CompositionStrip } from "@/components/composition-strip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { VideoFile, Chunk } from "@shared/schema";
import {
  Zap,
  Shuffle,
  Sparkles,
  Loader2,
  Check,
  Dice5,
  CheckSquare,
  Square,
  Settings2,
  X,
  Trash2,
} from "lucide-react";
import { GifEncoder, captureVideoFrames } from "@/lib/gif-encoder";

const VIDEO_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFA07A",
  "#A78BFA",
  "#F472B6",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#FB923C",
  "#95E1D3",
];

const CHUNK_SIZES = [
  { label: "0.5s", value: 0.5 },
  { label: "1s", value: 1 },
  { label: "1.5s", value: 1.5 },
  { label: "2s", value: 2 },
  { label: "3s", value: 3 },
];

function generateChunks(video: VideoFile, chunkDuration: number): Chunk[] {
  const chunks: Chunk[] = [];
  const aspectRatio = video.width && video.height ? video.width / video.height : 16 / 9;
  let t = 0;
  let idx = 0;
  while (t < video.duration) {
    const end = Math.min(t + chunkDuration, video.duration);
    if (end - t < 0.1) break;
    chunks.push({
      id: `${video.id}-${idx}`,
      videoId: video.id,
      videoUrl: video.url,
      videoName: video.name,
      startTime: t,
      endTime: end,
      color: video.color,
      aspectRatio,
    });
    t = end;
    idx++;
  }
  return chunks;
}

export default function Workspace() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [chunkDuration, setChunkDuration] = useState(1.5);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [exportWidth, setExportWidth] = useState(480);
  const [exportFps, setExportFps] = useState(10);

  const allChunks = useMemo(
    () => videos.flatMap((v) => generateChunks(v, chunkDuration)),
    [videos, chunkDuration]
  );

  const selectedChunks = useMemo(() => {
    return selectionOrder
      .filter((id) => selectedIds.has(id))
      .map((id) => allChunks.find((c) => c.id === id))
      .filter(Boolean) as Chunk[];
  }, [selectionOrder, selectedIds, allChunks]);

  const handleChangeChunkDuration = useCallback((newDuration: number) => {
    setChunkDuration(newDuration);
    setSelectedIds(new Set());
    setSelectionOrder([]);
  }, []);

  const handleUpload = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("videos", file));

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");

        const uploaded = await res.json();
        const colorStart = videos.length;

        const videoPromises = uploaded.map(
          (v: any, i: number) =>
            new Promise<VideoFile>((resolve) => {
              const video = document.createElement("video");
              video.preload = "metadata";
              video.onloadedmetadata = () => {
                resolve({
                  id: v.id,
                  name: v.name,
                  size: v.size,
                  duration: video.duration,
                  url: v.url,
                  type: v.type,
                  color: VIDEO_COLORS[(colorStart + i) % VIDEO_COLORS.length],
                  width: video.videoWidth || 1920,
                  height: video.videoHeight || 1080,
                });
              };
              video.onerror = () => {
                resolve({
                  id: v.id,
                  name: v.name,
                  size: v.size,
                  duration: 0,
                  url: v.url,
                  type: v.type,
                  color: VIDEO_COLORS[(colorStart + i) % VIDEO_COLORS.length],
                  width: 1920,
                  height: 1080,
                });
              };
              video.src = v.url;
            })
        );

        const newVideos = await Promise.all(videoPromises);
        setVideos((prev) => [...prev, ...newVideos]);

        toast({
          title: "Videos chunked",
          description: `${newVideos.length} video${newVideos.length > 1 ? "s" : ""} auto-sliced into ${chunkDuration}s chunks`,
        });
      } catch {
        toast({
          title: "Upload failed",
          description: "Could not process video files. Try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [videos.length, chunkDuration, toast]
  );

  const handleRemoveVideo = useCallback((videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of prev) {
        if (id.startsWith(videoId + "-")) next.delete(id);
      }
      return next;
    });
    setSelectionOrder((prev) => prev.filter((id) => !id.startsWith(videoId + "-")));
    fetch(`/api/videos/${videoId}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const handleToggleChunk = useCallback((chunkId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
    setSelectionOrder((prev) => {
      if (prev.includes(chunkId)) {
        return prev;
      }
      return [...prev, chunkId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = allChunks.map((c) => c.id);
    setSelectedIds(new Set(allIds));
    setSelectionOrder(allIds);
  }, [allChunks]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionOrder([]);
  }, []);

  const handleRandomPick = useCallback(() => {
    const count = Math.max(3, Math.floor(allChunks.length * 0.3));
    const shuffled = [...allChunks].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    const ids = picked.map((c) => c.id);
    setSelectedIds(new Set(ids));
    setSelectionOrder(ids);
    toast({
      title: "Random selection",
      description: `Picked ${picked.length} random chunks`,
    });
  }, [allChunks, toast]);

  const handleShuffle = useCallback(() => {
    setSelectionOrder((prev) => {
      const active = prev.filter((id) => selectedIds.has(id));
      for (let i = active.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [active[i], active[j]] = [active[j], active[i]];
      }
      return active;
    });
  }, [selectedIds]);

  const handleReorderComposition = useCallback((reordered: Chunk[]) => {
    setSelectionOrder(reordered.map((c) => c.id));
  }, []);

  const handleRemoveFromComposition = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleClearComposition = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionOrder([]);
  }, []);

  const handleExport = useCallback(async () => {
    if (selectedChunks.length === 0 || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    const firstChunkAR = selectedChunks[0]?.aspectRatio || (16 / 9);
    const height = Math.round(exportWidth / firstChunkAR);

    try {
      const encoder = new GifEncoder(exportWidth, height);
      const delay = Math.round(1000 / exportFps);

      for (let i = 0; i < selectedChunks.length; i++) {
        const chunk = selectedChunks[i];
        const frames = await captureVideoFrames(
          chunk.videoUrl,
          chunk.startTime,
          chunk.endTime,
          exportWidth,
          height,
          exportFps,
          chunk.aspectRatio
        );

        for (const frame of frames) {
          encoder.addFrame(frame, delay);
        }
        setExportProgress(((i + 1) / selectedChunks.length) * 90);
      }

      setExportProgress(95);
      const blob = encoder.encode();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gif-composition-${Date.now()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        setIsExporting(false);
        setExportProgress(0);
      }, 3000);
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Could not generate GIF. Try with fewer chunks.",
        variant: "destructive",
      });
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [selectedChunks, isExporting, exportWidth, exportFps, toast]);

  const totalSelectedDuration = selectedChunks.reduce(
    (acc, c) => acc + (c.endTime - c.startTime),
    0
  );

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="page-workspace">
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/40 bg-navy-dark/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-coral/25 blur-lg rounded-full" />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-coral/15 border border-coral/25">
              <Zap className="h-4 w-4 text-coral" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              GIF Composer
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {videos.length > 0 && (
            <>
              <div className="flex items-center gap-1 mr-1">
                <span className="text-[10px] font-mono text-muted-foreground/60 mr-1">chunk:</span>
                {CHUNK_SIZES.map((cs) => (
                  <Button
                    key={cs.value}
                    data-testid={`button-chunk-size-${cs.value}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleChangeChunkDuration(cs.value)}
                    className={`text-[10px] font-mono ${
                      chunkDuration === cs.value
                        ? "bg-teal/20 text-teal"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {cs.label}
                  </Button>
                ))}
              </div>

              <div className="w-px h-5 bg-border/30" />

              <Button
                data-testid="button-select-all"
                size="sm"
                variant="ghost"
                onClick={handleSelectAll}
                className="gap-1 text-[11px] font-mono"
              >
                <CheckSquare className="h-3 w-3" />
                All
              </Button>
              <Button
                data-testid="button-deselect-all"
                size="sm"
                variant="ghost"
                onClick={handleDeselectAll}
                className="gap-1 text-[11px] font-mono"
              >
                <Square className="h-3 w-3" />
                None
              </Button>
              <Button
                data-testid="button-random-pick"
                size="sm"
                variant="ghost"
                onClick={handleRandomPick}
                className="gap-1 text-[11px] font-mono text-salmon"
              >
                <Dice5 className="h-3 w-3" />
                Random
              </Button>

              <div className="w-px h-5 bg-border/30" />

              <Button
                data-testid="button-shuffle"
                size="sm"
                variant="ghost"
                onClick={handleShuffle}
                disabled={selectedChunks.length < 2}
                className="gap-1 text-[11px] font-mono text-teal"
              >
                <Shuffle className="h-3 w-3" />
                Shuffle
              </Button>

              <div className="w-px h-5 bg-border/30" />

              <Button
                data-testid="button-export-settings"
                size="icon"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          <Button
            data-testid="button-export-gif"
            size="sm"
            onClick={handleExport}
            disabled={selectedChunks.length === 0 || isExporting}
            className="gap-1.5 text-xs font-mono bg-coral text-white border-coral-dark"
          >
            {isExporting ? (
              exportComplete ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Done!
                </>
              ) : (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {Math.round(exportProgress)}%
                </>
              )
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Export GIF
                {selectedChunks.length > 0 && (
                  <span className="text-white/60">
                    ({selectedChunks.length})
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </header>

      {showSettings && (
        <div className="px-4 py-2 border-b border-border/30 bg-navy-dark/30 flex items-center gap-4 animate-slide-in">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Width</span>
            <select
              data-testid="select-export-width"
              value={exportWidth}
              onChange={(e) => setExportWidth(Number(e.target.value))}
              className="bg-background border border-border/50 rounded text-xs font-mono px-2 py-1 text-foreground"
            >
              <option value="320">320px</option>
              <option value="480">480px</option>
              <option value="640">640px</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">FPS</span>
            <select
              data-testid="select-export-fps"
              value={exportFps}
              onChange={(e) => setExportFps(Number(e.target.value))}
              className="bg-background border border-border/50 rounded text-xs font-mono px-2 py-1 text-foreground"
            >
              <option value="5">5</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </div>
          {selectedChunks.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground/50">
              ~{Math.ceil(totalSelectedDuration * exportFps)} frames / {totalSelectedDuration.toFixed(1)}s
            </span>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowSettings(false)}
            className="ml-auto"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {isExporting && (
        <div className="px-4 py-1">
          <Progress value={exportProgress} className="h-1 bg-navy-light" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {videos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-xl">
              <VideoUpload
                onUpload={handleUpload}
                isUploading={isUploading}
                hasVideos={false}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  {allChunks.length} chunks from {videos.length} video{videos.length > 1 ? "s" : ""}
                </h2>
                <div className="flex items-center gap-1 flex-wrap">
                  {videos.map((v) => (
                    <div key={v.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/50 group">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                      <span className="text-[9px] font-mono text-muted-foreground/60 truncate max-w-[80px]">
                        {v.name.replace(/\.[^.]+$/, '')}
                      </span>
                      <button
                        data-testid={`button-remove-video-${v.id}`}
                        onClick={() => handleRemoveVideo(v.id)}
                        className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <VideoUpload
                onUpload={handleUpload}
                isUploading={isUploading}
                hasVideos={true}
              />
            </div>

            <ChunkGrid
              chunks={allChunks}
              selectedIds={selectedIds}
              onToggleChunk={handleToggleChunk}
            />
          </div>
        )}
      </div>

      <div className="h-[90px] border-t border-border/40 bg-navy-dark/30 flex-shrink-0">
        <CompositionStrip
          chunks={selectedChunks}
          onRemoveChunk={handleRemoveFromComposition}
          onReorder={handleReorderComposition}
          onClearAll={handleClearComposition}
        />
      </div>
    </div>
  );
}
