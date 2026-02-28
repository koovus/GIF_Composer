import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { VideoUpload } from "@/components/video-upload";
import { VideoPanel } from "@/components/video-panel";
import { Timeline, getSegmentColor } from "@/components/timeline";
import { ExportPanel } from "@/components/export-panel";
import type { VideoFile, Segment } from "@shared/schema";
import { Film, Layers, Zap } from "lucide-react";

export default function Workspace() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);

  const handleUpload = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("videos", file));

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const uploaded = await res.json();

        const videoPromises = uploaded.map(
          (v: any) =>
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
                });
              };
              video.src = v.url;
            })
        );

        const newVideos = await Promise.all(videoPromises);
        setVideos((prev) => [...prev, ...newVideos]);

        if (newVideos.length > 0 && !activeVideoId) {
          setActiveVideoId(newVideos[0].id);
        }

        toast({
          title: "Videos uploaded",
          description: `${newVideos.length} video${newVideos.length > 1 ? "s" : ""} added to workspace`,
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Could not upload video files. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [activeVideoId, toast]
  );

  const handleRemoveVideo = useCallback(
    (videoId: string) => {
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      setSegments((prev) => prev.filter((s) => s.videoId !== videoId));
      if (activeVideoId === videoId) {
        setActiveVideoId(null);
      }
      fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    },
    [activeVideoId]
  );

  const handleSetSegmentStart = useCallback(
    (time: number) => {
      setSegmentStart(time);
      toast({
        title: "IN point set",
        description: `Start: ${formatTime(time)} — now set an OUT point`,
      });
    },
    [toast]
  );

  const handleSetSegmentEnd = useCallback(
    (time: number) => {
      if (segmentStart === null) {
        toast({
          title: "Set IN point first",
          description: "Mark an IN point before setting OUT",
          variant: "destructive",
        });
        return;
      }

      if (!activeVideoId) return;

      const video = videos.find((v) => v.id === activeVideoId);
      if (!video) return;

      const start = Math.min(segmentStart, time);
      const end = Math.max(segmentStart, time);

      if (end - start < 0.1) {
        toast({
          title: "Segment too short",
          description: "Select a longer segment (at least 0.1s)",
          variant: "destructive",
        });
        return;
      }

      const newSegment: Segment = {
        id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        videoId: video.url.split("/").pop() || video.id,
        videoName: video.name,
        startTime: start,
        endTime: end,
        color: getSegmentColor(segments.length),
      };

      setSegments((prev) => [...prev, newSegment]);
      setSegmentStart(null);

      toast({
        title: "Segment added",
        description: `${formatTime(start)} → ${formatTime(end)} from ${video.name}`,
      });
    },
    [segmentStart, activeVideoId, videos, segments.length, toast]
  );

  const handleRemoveSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleShuffleSegments = useCallback(() => {
    setSegments((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const handleSelectSegment = useCallback((segment: Segment) => {
    setActiveSegmentId(segment.id);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="page-workspace">
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border/50 bg-navy-dark/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-coral/30 blur-lg rounded-full" />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-coral/20 border border-coral/30">
              <Zap className="h-4 w-4 text-coral" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              GIF Composer
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground">
              Experimental GIF Creation Tool
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <Film className="h-3 w-3" />
            <span>{videos.length} video{videos.length !== 1 ? "s" : ""}</span>
            <span className="text-border">|</span>
            <Layers className="h-3 w-3" />
            <span>{segments.length} segment{segments.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <VideoUpload onUpload={handleUpload} isUploading={isUploading} />

              {videos.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                    Source Videos
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {videos.map((video) => (
                      <VideoPanel
                        key={video.id}
                        video={video}
                        isActive={activeVideoId === video.id}
                        onSelect={() => setActiveVideoId(video.id)}
                        onRemove={() => handleRemoveVideo(video.id)}
                        onSetSegmentStart={handleSetSegmentStart}
                        onSetSegmentEnd={handleSetSegmentEnd}
                        currentTime={currentTime}
                        onTimeUpdate={setCurrentTime}
                      />
                    ))}
                  </div>
                </div>
              )}

              {videos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-teal/10 blur-3xl rounded-full" />
                    <div className="relative w-24 h-24 rounded-full bg-navy-light/30 flex items-center justify-center">
                      <Film className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Start by uploading video clips
                    </p>
                    <p className="text-xs text-muted-foreground/50 font-mono max-w-xs">
                      Upload multiple videos, scrub through them, select
                      segments, and compose experimental GIFs
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-[200px] min-h-[160px] border-t border-border/50 bg-navy-dark/30">
            <Timeline
              segments={segments}
              videos={videos}
              onRemoveSegment={handleRemoveSegment}
              onReorderSegments={setSegments}
              onShuffleSegments={handleShuffleSegments}
              onSelectSegment={handleSelectSegment}
              activeSegmentId={activeSegmentId}
            />
          </div>
        </div>

        <div className="w-56 border-l border-border/50 bg-navy-dark/20 p-3 flex flex-col gap-4 overflow-y-auto hidden md:flex">
          <ExportPanel segments={segments} />

          {segmentStart !== null && (
            <div className="p-2.5 rounded-md bg-teal/5 border border-teal/20 animate-slide-in">
              <p className="text-[10px] font-mono text-teal uppercase font-semibold">
                IN Point Set
              </p>
              <p className="text-xs font-mono text-foreground mt-1">
                {formatTime(segmentStart)}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                Now set an OUT point
              </p>
            </div>
          )}

          <div className="mt-auto space-y-2 pt-4 border-t border-border/30">
            <h4 className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
              How to use
            </h4>
            <div className="space-y-1.5">
              {[
                "Upload video clips",
                "Click a video to select it",
                "Scrub to position & click IN",
                "Scrub to end & click OUT",
                "Drag segments to reorder",
                "Hit Export to create GIF",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[9px] font-mono text-coral/60 mt-0.5 w-3 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}
