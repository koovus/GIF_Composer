import { useState } from "react";
import { Download, Settings2, Loader2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Segment, ExportSettings } from "@shared/schema";
import { GifEncoder, captureVideoFrames } from "@/lib/gif-encoder";

interface ExportPanelProps {
  segments: Segment[];
}

export function ExportPanel({ segments }: ExportPanelProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    width: 480,
    height: 270,
    fps: 10,
    quality: 80,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleExport = async () => {
    if (segments.length === 0 || isExporting) return;

    setIsExporting(true);
    setProgress(0);
    setIsComplete(false);

    try {
      const encoder = new GifEncoder(settings.width, settings.height);
      const delay = Math.round(1000 / settings.fps);

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const video = document.querySelector(
          `video[src="${segment.videoId}"]`
        ) as HTMLVideoElement | null;

        const videoUrl = `/api/videos/${segment.videoId}`;
        const urlToUse = video?.src || videoUrl;

        const frames = await captureVideoFrames(
          urlToUse,
          segment.startTime,
          segment.endTime,
          settings.width,
          settings.height,
          settings.fps
        );

        for (const frame of frames) {
          encoder.addFrame(frame, delay);
        }

        setProgress(((i + 1) / segments.length) * 90);
      }

      setProgress(95);
      const blob = encoder.encode();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gif-composition-${Date.now()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setIsComplete(true);
      setTimeout(() => {
        setIsComplete(false);
        setIsExporting(false);
        setProgress(0);
      }, 3000);
    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
      setProgress(0);
    }
  };

  const totalDuration = segments.reduce(
    (acc, s) => acc + (s.endTime - s.startTime),
    0
  );
  const estimatedFrames = Math.ceil(totalDuration * settings.fps);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
          Export
        </h3>
        <button
          data-testid="button-toggle-settings"
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {showSettings && (
        <div className="space-y-2 p-2.5 rounded-md bg-navy-light/50 border border-border/30 animate-slide-in">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">
                Width
              </label>
              <select
                data-testid="select-width"
                value={settings.width}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    width: Number(e.target.value),
                    height: Math.round(Number(e.target.value) * 0.5625),
                  }))
                }
                className="w-full mt-0.5 bg-background border border-border/50 rounded text-xs font-mono p-1.5 text-foreground"
              >
                <option value="320">320px</option>
                <option value="480">480px</option>
                <option value="640">640px</option>
                <option value="800">800px</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">
                FPS
              </label>
              <select
                data-testid="select-fps"
                value={settings.fps}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, fps: Number(e.target.value) }))
                }
                className="w-full mt-0.5 bg-background border border-border/50 rounded text-xs font-mono p-1.5 text-foreground"
              >
                <option value="5">5 fps</option>
                <option value="8">8 fps</option>
                <option value="10">10 fps</option>
                <option value="15">15 fps</option>
                <option value="24">24 fps</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>
              ~{estimatedFrames} frames
            </span>
            <span>
              {settings.width}x{settings.height}
            </span>
          </div>
        </div>
      )}

      {isExporting && (
        <div className="space-y-2 animate-slide-in">
          <Progress
            value={progress}
            className="h-2 bg-navy-light"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">
              {isComplete ? "Complete!" : "Encoding..."}
            </span>
            <span className="text-[10px] font-mono text-teal">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      )}

      <Button
        data-testid="button-export-gif"
        onClick={handleExport}
        disabled={segments.length === 0 || isExporting}
        className="w-full gap-2 font-mono text-sm bg-coral text-white border-coral-dark"
      >
        {isExporting ? (
          isComplete ? (
            <>
              <Check className="h-4 w-4" />
              Downloaded!
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          )
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Export GIF
          </>
        )}
      </Button>

      {segments.length === 0 && (
        <p className="text-[10px] font-mono text-muted-foreground/60 text-center">
          Add segments to the timeline to export
        </p>
      )}
    </div>
  );
}
