"use client";

import React from "react";
import { Sparkles, ArrowDown, Files } from "lucide-react";
import { UploadFile } from "../types";
import { formatBytes } from "../utils";

interface ConversionStatsProps {
  files: UploadFile[];
}

export default function ConversionStats({ files }: ConversionStatsProps) {
  const successFiles = files.filter((f) => f.status === "success");
  
  if (successFiles.length === 0) return null;

  const totalOriginal = successFiles.reduce((acc, curr) => acc + curr.size, 0);
  const totalConverted = successFiles.reduce((acc, curr) => acc + (curr.convertedSize || 0), 0);
  const savedBytes = totalOriginal - totalConverted;
  const averageReduction = totalOriginal > 0 
    ? Math.round(((totalOriginal - totalConverted) / totalOriginal) * 100)
    : 0;

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm animate-fade-in">
      {/* Total Storage Saved */}
      <div className="flex items-center gap-4 p-2">
        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex-shrink-0">
          <ArrowDown className="w-5 h-5 animate-bounce" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Saved</p>
          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 truncate">
            {formatBytes(Math.max(0, savedBytes))}
          </p>
        </div>
      </div>

      {/* Average Compression percentage */}
      <div className="flex items-center gap-4 p-2 border-t sm:border-t-0 sm:border-x border-zinc-200/60 dark:border-zinc-800/60">
        <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Average Savings</p>
          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 truncate">
            {averageReduction}% lighter
          </p>
        </div>
      </div>

      {/* Processed Count */}
      <div className="flex items-center gap-4 p-2 border-t sm:border-t-0 border-zinc-200/60 dark:border-zinc-800/60">
        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex-shrink-0">
          <Files className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Files Converted</p>
          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 truncate">
            {successFiles.length} of {files.length}
          </p>
        </div>
      </div>
    </div>
  );
}
