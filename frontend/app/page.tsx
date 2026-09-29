// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { DropZone } from "@/components/DropZone";
import { ResultCanvas } from "@/components/ResultCanvas";
import { TelemetryWidget } from "@/components/TelemetryWidget";
import type { UploadState } from "@/lib/types";
import { Moon, Sun } from "lucide-react";
import Image from "next/image";

export default function DashboardPage() {
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isSystemDark) {
      setIsDark(true);
      root.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleStateChange = useCallback((s: UploadState) => setUploadState(s), []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const hasResult = uploadState.status === "success";

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-white transition-colors duration-500">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 hidden dark:block">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full mix-blend-screen filter blur-[150px] opacity-70 animate-blob" />
        <div className="absolute top-[30%] right-[-10%] w-[700px] h-[700px] bg-cyan-600/15 rounded-full mix-blend-screen filter blur-[150px] opacity-60 animate-blob" style={{ animationDelay: "3s" }} />
        <div className="absolute bottom-[-20%] left-[30%] w-[800px] h-[800px] bg-indigo-600/15 rounded-full mix-blend-screen filter blur-[150px] opacity-50 animate-blob" style={{ animationDelay: "6s" }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <nav className="sticky top-0 z-50 bg-white/60 dark:bg-[#050505]/60 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/5 transition-colors duration-500 animate-fade-in w-full">
          <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="flex h-16 items-center justify-between">
              
              <div className="flex items-center gap-4">
                <Image alt="NexGen Logo" className="object-contain drop-shadow-md" height={48} src="/nexgen_logo.png" width={48}/>
                <span className="font-extrabold text-2xl tracking-tighter bg-gradient-to-r from-violet-600 to-cyan-500 dark:from-violet-400 dark:to-cyan-300 bg-clip-text text-transparent animate-text-shimmer">
                  NexGen NeuroVision
                </span>
              </div>

              <div className="hidden lg:flex items-center gap-6 px-6 py-1.5 rounded-full bg-white/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/5 shadow-inner backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide">
                    API Ping: {uploadState.status === "success" && uploadState.result?.latency_ms ? `${uploadState.result.latency_ms}ms` : "--ms"}
                  </span>
                </div>
                <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide">VRAM: 2.1GB</span>
                </div>
              </div>

              <button onClick={toggleTheme} className="group px-5 py-2.5 rounded-full bg-white/80 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-white/10 shadow-sm">
                {isDark ? (
                  <><Moon size={18} className="group-hover:-rotate-12 transition-transform duration-300" /><span className="text-sm font-bold tracking-wide">Dark Mode</span></>
                ) : (
                  <><Sun size={18} className="group-hover:rotate-45 transition-transform duration-300" /><span className="text-sm font-bold tracking-wide">Light Mode</span></>
                )}
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 py-12 lg:py-16 perspective-1000 flex-1 w-full">
          <div className="mb-12 max-w-4xl animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h1 className="pb-2 text-5xl lg:text-7xl font-extrabold tracking-tighter text-balance drop-shadow-sm bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-500 to-slate-900 dark:from-white dark:via-cyan-400 dark:to-white bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
              Medical Diagnostics
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-500 leading-relaxed font-medium">
              Upload magnetic resonance imagery. Our ResNet50 inference engine will reconstruct the spatial geometry and orchestrate brain tumor classification with flawless precision.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 auto-rows-fr">
            
            <div 
              className="lg:col-span-2 bento-card spotlight-card bg-white/80 dark:bg-[#0c0c0c]/80 backdrop-blur-xl rounded-3xl border border-gray-200/60 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col min-h-[600px] animate-fade-up" 
              style={{ animationDelay: "200ms" }}
              onMouseMove={handleMouseMove}
            >
              <div className="relative z-20 flex items-center justify-between px-6 py-4 bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-6">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400 hover:scale-110 transition-transform"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400 hover:scale-110 transition-transform"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400 hover:scale-110 transition-transform"></div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    Diagnostic Node
                  </span>
                </div>
              </div>

              <div className="relative z-20 flex-1 flex flex-col bg-transparent p-4 sm:p-8">
                {hasResult && uploadState.status === "success" ? (
                  <div className="w-full h-full animate-fade-in flex flex-col group/canvas">
                    <ResultCanvas imageDataUrl={uploadState.imageDataUrl} result={uploadState.result} />
                  </div>
                ) : (
                  <div className="w-full h-full animate-fade-in flex items-center justify-center">
                    <DropZone onStateChange={handleStateChange} />
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="h-full flex flex-col animate-fade-up" style={{ animationDelay: "300ms" }}>
                <div 
                  className="bento-card spotlight-card bg-white/80 dark:bg-[#0c0c0c]/80 backdrop-blur-xl rounded-3xl border border-gray-200/60 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden h-full"
                  onMouseMove={handleMouseMove}
                >
                  <div className="relative z-20 px-6 py-4 bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      Orchestration Telemetry
                    </span>
                  </div>
                  <div className="relative z-20 p-6 flex-1 flex flex-col overflow-y-auto">
                    <TelemetryWidget
                      uploadState={uploadState}
                      onReset={() => handleStateChange({ status: "idle" })}
                    />
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}