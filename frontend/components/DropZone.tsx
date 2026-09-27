// src/components/DropZone.tsx
"use client";

import { useRef, useState } from "react";
import { UploadCloud, File as FileIcon, X, Loader2, Sparkles, ScanLine } from "lucide-react";
import type { UploadState } from "@/lib/types";

interface DropZoneProps {
  onStateChange: (state: UploadState) => void;
}

export function DropZone({ onStateChange }: DropZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // DYNAMIC API URL: Reads Vercel env variable in production, falls back to localhost for dev
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const handleFile = (f: File) => {
    if (!["image/jpeg", "image/png"].includes(f.type)) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setImageDataUrl(null);
  };

  const executeInspection = async () => {
    if (!file) return;
    setIsPending(true);
    onStateChange({ status: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/diagnose`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("FastAPI inference failed.");
      const result = await response.json();
      
      onStateChange({ status: "success", result, imageDataUrl: imageDataUrl! });
    } catch (error: any) {
      onStateChange({ status: "error", message: error.message || "Unknown error occurred" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto h-full justify-center">
      <div
        role="region"
        aria-label="File drop zone"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => !file && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center overflow-hidden
          min-h-[400px] rounded-[32px] 
          transition-all duration-500 ease-out select-none group
          ${file && !isPending ? "cursor-default" : "cursor-pointer"}
        `}
      >
        <div className={`absolute inset-0 rounded-[32px] transition-opacity duration-500 ${!file || isPending ? "marching-ants opacity-100" : "opacity-0 border-2 border-gray-200 dark:border-white/10"}`} />
        
        <div className={`absolute inset-[2px] rounded-[30px] transition-all duration-700 overflow-hidden
          ${isDragging 
            ? "bg-gradient-to-br from-indigo-50/90 to-cyan-50/90 dark:from-indigo-900/30 dark:to-cyan-900/30 backdrop-blur-sm" 
            : file 
              ? "bg-white dark:bg-[#111]" 
              : "bg-white/80 dark:bg-[#0a0a0a]/80 group-hover:bg-gray-50/90 dark:group-hover:bg-white/[0.04]"}`} 
        >
          {isPending && imageDataUrl && (
            <div className="absolute inset-0 w-full h-full">
              <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 grayscale blur-[2px]" style={{ backgroundImage: `url(${imageDataUrl})` }} />
              <div className="absolute inset-0 bg-[#111]/40 mix-blend-multiply dark:mix-blend-overlay" />
              <div className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_20px_#22d3ee,0_0_40px_#22d3ee] animate-scanner z-20">
                <div className="absolute inset-x-0 bottom-full h-24 bg-gradient-to-t from-cyan-400/30 to-transparent" />
              </div>
            </div>
          )}
        </div>

        <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
          {isPending ? (
            <PendingState />
          ) : file ? (
            <FileState file={file} onClear={clearFile} />
          ) : (
            <IdleState isDragging={isDragging} />
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      <div className="mt-2">
        <button
          onClick={executeInspection}
          disabled={!file || isPending}
          className="
            relative overflow-hidden w-full flex items-center justify-center gap-3
            h-16 px-6 rounded-2xl text-lg font-extrabold tracking-wide
            transition-all duration-500 ease-out
            disabled:opacity-40 disabled:cursor-not-allowed
            bg-slate-900 dark:bg-white text-white dark:text-black
            hover:scale-[1.02] active:scale-95 shadow-xl hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]
            group
          "
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
          {isPending ? (
            <><Loader2 size={24} className="animate-spin" /><span className="relative z-10">Executing Payload…</span></>
          ) : (
            <><Sparkles size={20} className="text-amber-300 dark:text-amber-500 group-hover:animate-spin-slow" /><span className="relative z-10">Execute Inspection</span></>
          )}
        </button>
      </div>
    </div>
  );
}

function IdleState({ isDragging }: { isDragging: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center pointer-events-none">
      <div className={`flex items-center justify-center w-28 h-28 rounded-full transition-all duration-700 ${isDragging ? "bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-[0_0_50px_rgba(99,102,241,0.5)] scale-110" : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 animate-float"}`}>
        <UploadCloud size={52} strokeWidth={1.5} />
      </div>
      <div>
        <p className={`text-2xl font-extrabold tracking-tight transition-colors duration-500 ${isDragging ? "text-indigo-600 dark:text-cyan-400" : "text-gray-900 dark:text-white"}`}>
          {isDragging ? "Drop payload here" : "Drag & Drop Image"}
        </p>
        <p className="mt-3 text-lg text-gray-500 dark:text-gray-400 font-medium">
          or <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-300 dark:decoration-indigo-700 underline-offset-4 cursor-pointer pointer-events-auto hover:text-indigo-700 transition-colors">browse local files</span>
        </p>
      </div>
    </div>
  );
}

function FileState({ file, onClear }: { file: File; onClear: (e: React.MouseEvent) => void }) {
  const sizeMiB = (file.size / 1024 / 1024).toFixed(2);
  return (
    <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
      <div className="flex items-center justify-center w-28 h-28 rounded-[2rem] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 animate-float">
        <FileIcon size={52} strokeWidth={1.5} />
      </div>
      <div className="text-center w-full px-6">
        <p className="text-2xl font-extrabold text-gray-900 dark:text-white truncate">{file.name}</p>
        <p className="text-base font-bold text-gray-500 dark:text-gray-400 mt-2 tracking-wide uppercase">
          {file.type.split("/")[1]?.toUpperCase() ?? "IMG"} • {sizeMiB} MB
        </p>
      </div>
      <button type="button" onClick={onClear} className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all bg-gray-100 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-6 py-3 rounded-full hover:scale-105 active:scale-95 z-20 relative">
        <X size={18} strokeWidth={3} /> Clear Selection
      </button>
    </div>
  );
}

function PendingState() {
  return (
    <div className="flex flex-col items-center gap-6 backdrop-blur-md bg-white/40 dark:bg-black/40 p-10 rounded-3xl border border-white/20 shadow-2xl">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-cyan-500/40 animate-ping" />
        <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_40px_rgba(34,211,238,0.6)]">
          <ScanLine size={52} className="text-white animate-pulse" strokeWidth={2} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight drop-shadow-md">Orchestrating Inference</p>
        <p className="mt-2 text-lg text-gray-700 dark:text-gray-300 font-bold">Model actively scanning…</p>
      </div>
    </div>
  );
}