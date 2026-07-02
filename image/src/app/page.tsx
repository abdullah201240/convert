"use client";

import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { 
  Trash2, 
  Play, 
  Download, 
  Layers, 
  Info,
  Shield,
  Zap,
  CheckCircle,
  FileCheck,
  X
} from "lucide-react";
import Dropzone from "../components/dropzone";
import ImageCard from "../components/image-card";
import ConversionStats from "../components/conversion-stats";
import Header from "../components/header";
import { UploadFile } from "../types";
import { calculateReduction, generateUUID } from "../utils";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function Home() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Conversion Settings States
  const [resizePreset, setResizePreset] = useState<string>("preset-default");
  const [customWidth, setCustomWidth] = useState<number>(980);
  const [customHeight, setCustomHeight] = useState<number>(1252);
  const [useTargetSizeLimit, setUseTargetSizeLimit] = useState<boolean>(true);
  const [qualityScore, setQualityScore] = useState<number>(50);
  const [targetSizeKb, setTargetSizeKb] = useState<number>(150);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        URL.revokeObjectURL(file.previewUrl);
        if (file.convertedUrl) {
          URL.revokeObjectURL(file.convertedUrl);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = generateUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newUploads: UploadFile[] = selectedFiles.map((file) => ({
      id: generateUUID(),
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      convertedUrl: null,
      convertedSize: null,
      status: "idle",
      progress: 0,
      error: null,
      reduction: null,
    }));

    setFiles((prev) => [...prev, ...newUploads]);
    addToast(`Added ${selectedFiles.length} file(s) to queue.`, "info");
  };

  const handleDelete = (id: string) => {
    setFiles((prev) => {
      const fileToDelete = prev.find((f) => f.id === id);
      if (fileToDelete) {
        URL.revokeObjectURL(fileToDelete.previewUrl);
        if (fileToDelete.convertedUrl) {
          URL.revokeObjectURL(fileToDelete.convertedUrl);
        }
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleClearQueue = () => {
    files.forEach((file) => {
      URL.revokeObjectURL(file.previewUrl);
      if (file.convertedUrl) {
        URL.revokeObjectURL(file.convertedUrl);
      }
    });
    setFiles([]);
    addToast("Queue cleared.", "info");
  };

  const convertSingleFile = async (id: string): Promise<boolean> => {
    const fileItem = files.find((f) => f.id === id);
    if (!fileItem || fileItem.status === "converting") return false;

    // Set converting state
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, status: "converting", progress: 10, error: null }
          : f
      )
    );

    // Simulate progress increments
    let progressVal = 10;
    const progressInterval = setInterval(() => {
      progressVal = Math.min(85, progressVal + Math.floor(Math.random() * 15) + 5);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: progressVal } : f))
      );
    }, 150);

    try {
      const formData = new FormData();
      formData.append("file", fileItem.file);

      // Map dynamic target dimensions based on preset
      let targetWidth = 980;
      let targetHeight = 1252;
      if (resizePreset === "preset-custom") {
        targetWidth = customWidth;
        targetHeight = customHeight;
      } else if (resizePreset === "preset-1200") {
        targetWidth = 950;
        targetHeight = 1200;
      } else if (resizePreset === "preset-1000") {
        targetWidth = 1000;
        targetHeight = 1252;
      } else if (resizePreset === "preset-fullhd") {
        targetWidth = 1920;
        targetHeight = 1080;
      } else if (resizePreset === "preset-hd") {
        targetWidth = 1280;
        targetHeight = 720;
      }

      formData.append("width", targetWidth.toString());
      formData.append("height", targetHeight.toString());

      formData.append("quality", qualityScore.toString());
      if (useTargetSizeLimit) {
        formData.append("targetSizeKb", targetSizeKb.toString());
      }

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to convert image");
      }

      const data = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "success",
                progress: 100,
                convertedUrl: data.dataUrl,
                convertedSize: data.size,
                reduction: calculateReduction(f.size, data.size),
              }
            : f
        )
      );
      return true;
    } catch (err: unknown) {
      clearInterval(progressInterval);
      const errMsg = err instanceof Error ? err.message : "An unknown error occurred";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "failed", progress: 0, error: errMsg }
            : f
        )
      );
      addToast(`Failed to convert "${fileItem.name}": ${errMsg}`, "error");
      return false;
    }
  };

  const handleConvertAll = async () => {
    const pendingFiles = files.filter((f) => f.status === "idle" || f.status === "failed");
    if (pendingFiles.length === 0) return;

    setIsProcessingAll(true);
    addToast(`Starting batch conversion of ${pendingFiles.length} images...`, "info");

    const conversionPromises = pendingFiles.map((file) => convertSingleFile(file.id));
    const results = await Promise.all(conversionPromises);
    
    setIsProcessingAll(false);
    
    const succeeded = results.filter(Boolean).length;
    if (succeeded > 0) {
      addToast(`Successfully converted ${succeeded} image(s) to AVIF.`, "success");
    }
  };

  const handleDownloadSingle = (id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (!fileItem || !fileItem.convertedUrl) return;

    const link = document.createElement("a");
    link.href = fileItem.convertedUrl;
    // Set appropriate output extension
    const newName = fileItem.name.replace(/\.[^/.]+$/, "") + ".avif";
    link.download = newName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Downloaded "${newName}"`, "success");
  };

  const handleDownloadAllZip = async () => {
    const successFiles = files.filter((f) => f.status === "success" && f.convertedUrl);
    if (successFiles.length === 0) return;

    addToast("Generating ZIP archive...", "info");

    try {
      const zip = new JSZip();

      successFiles.forEach((file) => {
        if (!file.convertedUrl) return;
        // Parse the base64 content out of the dataUrl
        const base64Content = file.convertedUrl.split(",")[1];
        const avifName = file.name.replace(/\.[^/.]+$/, "") + ".avif";
        zip.file(avifName, base64Content, { base64: true });
      });

      const contentBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(contentBlob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "opticconvert-avif-images.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      addToast("ZIP archive downloaded successfully!", "success");
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "An unknown error occurred";
      addToast("Failed to compile ZIP file: " + errMsg, "error");
    }
  };

  const successCount = files.filter((f) => f.status === "success").length;
  const isQueueEmpty = files.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Header />

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col gap-8 relative">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-72 h-72 rounded-full bg-brand-primary/10 blur-3xl pointer-events-none animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-80 h-80 rounded-full bg-brand-secondary/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" /> Next.js 15 + Sharp Engine
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            High-Fidelity <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">AVIF</span> Image Converter
          </h2>
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-medium">
            Optimize your JPG, PNG, and WebP images. Rotate, sharpen, resize, and convert to premium-quality AVIF files using Sharp server-side.
          </p>
        </div>

        {/* Settings Panel */}
        <div className="w-full z-10 bg-card dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-6 animate-slide-up">
          <div className="flex items-center gap-2 border-b border-zinc-200/60 dark:border-zinc-800 pb-3">
            <div className="p-1.5 bg-brand-primary/10 text-brand-primary rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
              Compression & Resizing Options
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target dimensions */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                Target Bounds & Resize preset
              </label>
              <select
                value={resizePreset}
                onChange={(e) => setResizePreset(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none focus:border-brand-primary transition-all duration-200"
              >
                <option value="preset-default">980 × 1252 (Default Bounding Box)</option>
                <option value="preset-1200">950 × 1200 (Custom Bounds)</option>
                <option value="preset-1000">1000 × 1252 (Custom Portrait)</option>
                <option value="preset-fullhd">1920 × 1080 (Full HD Landscape)</option>
                <option value="preset-hd">1280 × 720 (HD Landscape)</option>
                <option value="preset-custom">Custom Dimensions...</option>
              </select>

              {resizePreset === "preset-custom" && (
                <div className="grid grid-cols-2 gap-3 mt-2 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold">WIDTH (PX)</span>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Math.max(1, parseInt(e.target.value) || 0))}
                      className="px-3 py-2 rounded-xl border border-zinc-205 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold">HEIGHT (PX)</span>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Math.max(1, parseInt(e.target.value) || 0))}
                      className="px-3 py-2 rounded-xl border border-zinc-205 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Target sizing options             {/* Target sizing options */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                Compression Strategy
              </label>

              {/* Quality ceiling slider (Always visible) */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                  <span>{useTargetSizeLimit ? "QUALITY CEILING" : "QUALITY INDEX"}</span>
                  <span className="text-brand-primary">{qualityScore}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={qualityScore}
                  onChange={(e) => setQualityScore(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">
                  {useTargetSizeLimit 
                    ? "Maximum quality boundary limit for the size optimization search." 
                    : "Standard AVIF quality settings factor. Default: 50%."}
                </span>
              </div>

              {/* Toggle switch for target file size limit */}
              <div className="flex items-center justify-between border-t border-zinc-200/60 dark:border-zinc-800/80 pt-3 mt-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-350">Limit Max File Size</span>
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-500">Run optimization loop to stay under size ceiling</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseTargetSizeLimit(!useTargetSizeLimit)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    useTargetSizeLimit ? "bg-brand-primary" : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      useTargetSizeLimit ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Target Size input box */}
              {useTargetSizeLimit && (
                <div className="flex flex-col gap-1 mt-2.5 animate-fade-in">
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase">TARGET SIZE LIMIT</span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={targetSizeKb}
                      onChange={(e) => setTargetSizeKb(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:border-brand-primary outline-none"
                    />
                    <span className="absolute right-3.5 text-xs font-bold text-zinc-400">KB</span>
                  </div>
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">
                    Iteratively optimizes Sharp encoding quality to get as close to {targetSizeKb} KB as possible.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Core Dropzone container */}
        <div className="w-full z-10">
          <Dropzone onFilesSelected={handleFilesSelected} disabled={isProcessingAll} />
        </div>

        {/* Conversion Queue Panel */}
        {!isQueueEmpty && (
          <div className="flex flex-col gap-6 z-10 animate-fade-in">
            {/* Header controls for Queue */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                  Image Queue
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-150 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {files.length} {files.length === 1 ? "image" : "images"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearQueue}
                  disabled={isProcessingAll}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-500 dark:text-zinc-400 hover:bg-rose-500/10 transition-colors border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/20 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Queue
                </button>

                {files.some((f) => f.status === "idle" || f.status === "failed") && (
                  <button
                    onClick={handleConvertAll}
                    disabled={isProcessingAll}
                    className="flex items-center justify-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/95 transition-all shadow-md shadow-brand-primary/10 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Convert All
                  </button>
                )}

                {successCount > 0 && (
                  <button
                    onClick={handleDownloadAllZip}
                    className="flex items-center justify-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/10 hover:shadow-lg animate-fade-in"
                  >
                    <Download className="w-3.5 h-3.5" /> Download ZIP ({successCount})
                  </button>
                )}
              </div>
            </div>

            {/* Statistics Banner */}
            <ConversionStats files={files} />

            {/* Individual Files list */}
            <div className="flex flex-col gap-3">
              {files.map((file) => (
                <ImageCard
                  key={file.id}
                  file={file}
                  onConvert={convertSingleFile}
                  onDownload={handleDownloadSingle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Feature Cards Grid (Inspired by SaaS landers) */}
        {isQueueEmpty && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
            <div className="bg-card dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col gap-3">
              <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl w-fit">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Supercharged Speed</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Async node-native image processing utilizes multiple threads on the server to compress images in milliseconds.
              </p>
            </div>
            <div className="bg-card dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col gap-3">
              <div className="p-2.5 bg-brand-secondary/10 text-brand-secondary rounded-xl w-fit">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Privacy First</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Images are converted strictly on-the-fly. No files are saved to disks or permanent database stores.
              </p>
            </div>
            <div className="bg-card dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Exact Processing Specs</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Includes lanczos3 downscaling to 980x1252, auto-rotation, chroma 4:4:4 sampling, and quality index 50.
              </p>
            </div>
          </div>
        )}

        {/* Exact Specifications Drawer/Alert */}
        <div className="bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 p-4.5 rounded-2xl flex items-start gap-3 mt-4 text-xs">
          <Info className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5 text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-zinc-850 dark:text-zinc-200">Active Sharp Configuration:</span>
            <p className="leading-relaxed">
              Every image will be rotated according to EXIF orientation tag, scaled to fit inside a <code className="bg-zinc-200/50 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-primary">980x1252</code> bounding box with Lanczos3 interpolation, enhanced with smart sharpening, metadata stripped, and encoded to AVIF with <code className="bg-zinc-200/50 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-primary">quality: 50</code>, <code className="bg-zinc-200/50 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-primary">effort: 9</code>, and <code className="bg-zinc-200/50 dark:bg-zinc-800 px-1 py-0.5 rounded text-brand-primary">chromaSubsampling: 4:4:4</code>.
            </p>
          </div>
        </div>
      </main>

      {/* Floating Toasts container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-xs font-semibold transition-all duration-300 animate-slide-up ${
              toast.type === "error"
                ? "bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-450"
                : toast.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-450"
                : "bg-white border-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
              {toast.type === "error" && <X className="w-4 h-4 text-rose-500" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <footer className="w-full py-8 text-center text-[11px] text-zinc-400 dark:text-zinc-650 border-t border-zinc-200/50 dark:border-zinc-900/40">
        &copy; {new Date().getFullYear()} OpticConvert. Secure Local-First Processing Engine. All Rights Reserved.
      </footer>
    </div>
  );
}
