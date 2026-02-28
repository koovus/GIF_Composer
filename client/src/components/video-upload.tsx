import { useCallback, useState } from "react";
import { Upload, Film, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoUploadProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}

export function VideoUpload({ onUpload, isUploading }: VideoUploadProps) {
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

  return (
    <div
      data-testid="drop-zone-upload"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isUploading ? undefined : handleFileSelect}
      className={`
        relative cursor-pointer rounded-md border-2 border-dashed transition-all duration-300
        flex flex-col items-center justify-center gap-3 p-6
        ${
          isDragOver
            ? "border-teal bg-teal/5 scale-[1.01]"
            : "border-muted-foreground/20 hover:border-coral/50 hover:bg-coral/5"
        }
        ${isUploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      {isUploading ? (
        <>
          <Loader2 className="h-8 w-8 text-coral animate-spin" />
          <p className="text-sm font-mono text-muted-foreground">
            Uploading...
          </p>
        </>
      ) : (
        <>
          <div className="relative">
            <div className="absolute inset-0 bg-coral/20 rounded-full blur-xl animate-pulse-glow" />
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-coral/10 border border-coral/20">
              {isDragOver ? (
                <Film className="h-6 w-6 text-teal" />
              ) : (
                <Upload className="h-6 w-6 text-coral" />
              )}
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Drop videos here or click to browse
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              MP4, MOV, WEBM supported
            </p>
          </div>
        </>
      )}
    </div>
  );
}
