"use client";

import React, { useRef, useState } from "react";
import { Upload, Image as ImageIcon, Sparkles } from "lucide-react";

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function Dropzone({ onFilesSelected, disabled = false }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateAndProcessFiles = React.useCallback((rawFiles: FileList | File[] | null) => {
    if (!rawFiles) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
    const filteredFiles: File[] = [];

    const fileList = Array.from(rawFiles);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (validTypes.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|webp|avif)$/i)) {
        filteredFiles.push(file);
      }
    }

    if (filteredFiles.length > 0) {
      onFilesSelected(filteredFiles);
    }
  }, [onFilesSelected]);

  // Support pasting image directly from clipboard (e.g. Cmd+V or Ctrl+V)
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            // Assign a sensible name if it's a raw clipboard paste
            const namedFile = file.name === "image.png" 
              ? new File([file], `clipboard-${Date.now()}.png`, { type: file.type })
              : file;
            pastedFiles.push(namedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        validateAndProcessFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [disabled, validateAndProcessFiles]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;

    validateAndProcessFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    validateAndProcessFiles(e.target.files);
    // Reset standard input value to allow uploading same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      className={`relative group w-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-12 px-6 text-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? "border-brand-primary bg-brand-glow/10 scale-[1.01] shadow-lg animate-border-pulse"
          : "border-zinc-200 dark:border-zinc-800 hover:border-brand-primary/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
      } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
        onChange={handleChange}
        className="hidden"
      />

      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
        <Sparkles className="w-3 h-3" /> Local & Secure
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className={`p-4 rounded-full transition-all duration-300 ${
          isDragActive 
            ? "bg-brand-primary text-white scale-110 shadow-md"
            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 group-hover:bg-brand-primary/10 group-hover:text-brand-primary group-hover:scale-105"
        }`}>
          <Upload className="w-8 h-8" />
        </div>

        <div className="flex flex-col gap-1 max-w-sm">
          <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Drag & drop images, <span className="text-brand-primary font-medium hover:underline">browse</span>, or paste (Ctrl+V)
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Supports JPG, PNG, WebP, and AVIF formats
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400 dark:text-zinc-600 font-medium">
          <div className="flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5" /> High-Res Output
          </div>
          <span>•</span>
          <div>Clipboard Paste</div>
          <span>•</span>
          <div>Auto-Rotate EXIF</div>
        </div>
      </div>
    </div>
  );
}
