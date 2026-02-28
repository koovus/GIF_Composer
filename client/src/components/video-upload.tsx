import { useCallback, useState } from "react";
import { Upload, Film, Loader2 } from "lucide-react";

interface VideoUploadProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  hasVideos: boolean;
}

export function VideoUpload({ onUpload, isUploading, hasVideos }: VideoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("video/")
      );
      if (files.length > 0) onUpload(files);
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "video/*";
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length > 0) onUpload(files);
    };
    input.click();
  }, [onUpload]);

  if (hasVideos) {
    return (
      <button
        data-testid="button-add-more-videos"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isUploading ? undefined : handleFileSelect}
        disabled={isUploading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md border border-dashed transition-all duration-200 text-sm
          ${isDragOver ? "border-teal bg-teal/5" : "border-border/50 hover:border-coral/40 hover:bg-coral/5"}
          ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}
        `}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 text-coral animate-spin" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-xs font-mono text-muted-foreground">
          {isUploading ? "Uploading..." : "Add more videos"}
        </span>
      </button>
    );
  }

  return (
    <div
      data-testid="drop-zone-upload"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isUploading ? undefined : handleFileSelect}
      className={`
        relative cursor-pointer rounded-md border-2 border-dashed transition-all duration-300
        flex flex-col items-center justify-center gap-4 py-20 px-6
        ${
          isDragOver
            ? "border-teal bg-teal/5 scale-[1.005]"
            : "border-muted-foreground/15 hover:border-coral/40 hover:bg-coral/5"
        }
        ${isUploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      {isUploading ? (
        <>
          <Loader2 className="h-10 w-10 text-coral animate-spin" />
          <p className="text-sm font-mono text-muted-foreground">
            Processing videos...
          </p>
        </>
      ) : (
        <>
          <div className="relative">
            <div className="absolute inset-0 bg-coral/15 rounded-full blur-2xl animate-pulse-glow" />
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-coral/10 border border-coral/20">
              {isDragOver ? (
                <Film className="h-8 w-8 text-teal" />
              ) : (
                <Upload className="h-8 w-8 text-coral" />
              )}
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-base font-medium text-foreground">
              Drop video clips here to get started
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              MP4, MOV, WEBM — upload multiple files at once
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground/40 mt-2">
            <span>Auto-chunked into segments</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
            <span>Click to select</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
            <span>Export as GIF</span>
          </div>
        </>
      )}
    </div>
  );
}
