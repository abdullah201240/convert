"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  ArrowRight,
  Maximize2,
  X
} from "lucide-react";
import { UploadFile } from "../types";
import { formatBytes } from "../utils";

interface ImageCardProps {
  file: UploadFile;
  onConvert: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ImageCard({ file, onConvert, onDownload, onDelete }: ImageCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [originalDims, setOriginalDims] = useState<{ width: number; height: number } | null>(
    file.originalDimensions || null
  );
  const isDragging = useRef(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Measure natural dimensions of the uploaded image
  useEffect(() => {
    if (!originalDims && file.previewUrl) {
      const img = new Image();
      img.onload = () => {
        setOriginalDims({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = file.previewUrl;
    }
  }, [file.previewUrl, originalDims]);

  // Squoosh slider movement handler
  const handleMove = React.useCallback((clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  }, [handleMove]);

  const handleMouseUp = React.useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (isPreviewOpen) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isPreviewOpen, handleMouseMove, handleTouchMove, handleMouseUp]);

  return (
    <>
      <div className="relative group w-full bg-card dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 animate-slide-up">
        {/* Image Thumbnail with Overlay Hover Preview */}
        <div className="relative w-20 h-20 bg-zinc-100 dark:bg-zinc-950 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-100 dark:border-zinc-900 group/thumb">
          <img
            src={file.previewUrl}
            alt={file.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
          />
          {file.status === "success" && file.convertedUrl && (
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 text-white rounded-xl"
              title="Compare original & converted"
            >
              <Eye className="w-5 h-5 animate-pulse" />
            </button>
          )}
        </div>

        {/* Metadata & Progress Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 w-full text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[240px]" title={file.name}>
              {file.name}
            </h3>
            <div className="flex items-center justify-center md:justify-start gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded">
                {file.file.type.split("/")[1] || "IMAGE"}
              </span>
              {file.status === "success" && file.outputFormat && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                  → {file.outputFormat.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{formatBytes(file.size)}</span>
            {file.status === "success" && file.convertedSize && (
              <>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold text-brand-primary">
                  {formatBytes(file.convertedSize)}
                </span>
                <span className="font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                  -{file.reduction}%
                </span>
              </>
            )}
            {/* Dimensions display */}
            {originalDims && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline-flex items-center gap-1 ml-1">
                <span>({originalDims.width} × {originalDims.height}px</span>
                {file.convertedDimensions && (
                  <span>→ {file.convertedDimensions.width} × {file.convertedDimensions.height}px</span>
                )}
                <span>)</span>
              </span>
            )}
          </div>

          {/* Progress bar during converting state */}
          {file.status === "converting" && (
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-brand-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          )}

          {file.status === "failed" && file.error && (
            <p className="text-[11px] text-rose-500 font-medium truncate mt-1">
              Error: {file.error}
            </p>
          )}
        </div>

        {/* Status Indicators & Individual Control Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5">
            {file.status === "idle" && (
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                Ready
              </span>
            )}
            {file.status === "converting" && (
              <span className="text-xs font-semibold text-brand-primary flex items-center gap-1.5 bg-brand-primary/10 px-2.5 py-1 rounded-full">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
              </span>
            )}
            {file.status === "success" && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Done
              </span>
            )}
            {file.status === "failed" && (
              <span className="text-xs font-semibold text-rose-500 flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-1 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" /> Failed
              </span>
            )}

            {file.status === "success" && file.convertedUrl && (
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {file.status === "idle" && (
              <button
                onClick={() => onConvert(file.id)}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-all shadow-sm hover:shadow active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Convert
              </button>
            )}

            {file.status === "success" && (
              <button
                onClick={() => onDownload(file.id)}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm hover:shadow active:scale-95 animate-fade-in"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}

            <button
              onClick={() => onDelete(file.id)}
              disabled={file.status === "converting"}
              className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
              title="Remove image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Squoosh-Style Quality Comparison Modal */}
      {isPreviewOpen && file.convertedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-8 animate-fade-in">
          <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] md:h-[80vh]">
            
            {/* Header info */}
            <div className="flex items-center justify-between p-4 md:px-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
              <div className="min-w-0">
                <h2 className="text-sm md:text-base font-semibold text-zinc-100 truncate pr-4">
                  Comparing: {file.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] md:text-xs">
                  <span className="text-zinc-500">Original ({file.file.type.split("/")[1] || "img"}):</span>
                  <span className="text-zinc-300 font-medium">{formatBytes(file.size)}</span>
                  {originalDims && (
                    <span className="text-zinc-400">[{originalDims.width}×{originalDims.height}px]</span>
                  )}
                  <span className="text-zinc-700">•</span>
                  <span className="text-zinc-500">{(file.outputFormat || "AVIF").toUpperCase()}:</span>
                  <span className="text-brand-primary font-semibold">{formatBytes(file.convertedSize || 0)}</span>
                  {file.convertedDimensions && (
                    <span className="text-brand-primary/80">[{file.convertedDimensions.width}×{file.convertedDimensions.height}px]</span>
                  )}
                  <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                    -{file.reduction}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onDownload(file.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Download {(file.outputFormat || "AVIF").toUpperCase()}
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slider comparison area */}
            <div className="flex-1 relative bg-zinc-900 overflow-hidden flex items-center justify-center p-4">
              <div 
                ref={sliderContainerRef}
                className="relative w-full h-full max-h-[60vh] max-w-3xl rounded-2xl overflow-hidden border border-zinc-800 shadow-lg select-none cursor-ew-resize"
                onMouseDown={() => { isDragging.current = true; }}
                onTouchStart={() => { isDragging.current = true; }}
                onMouseMove={(e) => { if (isDragging.current) handleMove(e.clientX); }}
                onTouchMove={(e) => { if (isDragging.current && e.touches[0]) handleMove(e.touches[0].clientX); }}
              >
                {/* Underlayer (Right side): Converted AVIF */}
                <img
                  src={file.convertedUrl}
                  alt="Converted AVIF"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]"
                />
                
                {/* Overlayer (Left side): Original Image (Clipped) */}
                <img
                  src={file.previewUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"
                  style={{ 
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                  }}
                />

                {/* Squoosh drag divider element */}
                <div 
                  className="absolute inset-y-0 pointer-events-none border-r border-brand-primary"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-primary border-2 border-white shadow-lg flex items-center justify-center text-white pointer-events-auto">
                    <Maximize2 className="w-3.5 h-3.5 rotate-45" />
                  </div>
                </div>

                {/* Left/Right floating badges */}
                <div className="absolute bottom-4 left-4 bg-zinc-950/80 px-2.5 py-1 rounded-md text-[10px] font-semibold text-zinc-300 border border-zinc-800/80 pointer-events-none backdrop-blur-sm">
                  Original
                </div>
                <div className="absolute bottom-4 right-4 bg-zinc-950/80 px-2.5 py-1 rounded-md text-[10px] font-semibold text-zinc-300 border border-zinc-800/80 pointer-events-none backdrop-blur-sm">
                  {(file.outputFormat || "AVIF").toUpperCase()} (Optimized)
                </div>
              </div>
            </div>

            {/* Slider bottom label */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950/50 text-center text-xs text-zinc-500">
              Drag the center slider left and right to inspect the quality difference.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
