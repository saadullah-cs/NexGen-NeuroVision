// src/components/ResultCanvas.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { DetectionResult } from "@/lib/types";



interface ResultCanvasProps {
  imageDataUrl: string;
  result: DetectionResult;
}

const formatProbability = (val: number) => {
  const percent = val * 100;
  if (percent >= 99.995) return ">99.99";
  if (percent <= 0.005 && percent > 0) return "<0.01";
  return percent.toFixed(2);
};

export function ResultCanvas({ imageDataUrl, result }: ResultCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [imgGeometry, setImgGeometry] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dpr = window.devicePixelRatio ?? 1;
    cursorRef.current = {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr
    };
  };

  const handleMouseLeave = () => {
    cursorRef.current = { x: -1, y: -1 };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let startTime: number | null = null;
    const ANIMATION_DURATION = 600;

    const img = new Image();
    img.src = (showHeatmap && result.heatmap_overlay) ? result.heatmap_overlay : imageDataUrl;
    img.onload = () => {
      const dpr = window.devicePixelRatio ?? 1;
      const cssW = container.clientWidth;
      const cssH = container.clientHeight;
      
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);

      const scale = Math.min(cssW / img.naturalWidth, cssH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const offsetX = (cssW - drawW) / 2;
      const offsetY = (cssH - drawH) / 2;
      
      setImgGeometry({ scale, offsetX, offsetY });

      const drawFrame = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.scale(dpr, dpr);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(offsetX, offsetY, drawW, drawH, 20);
        ctx.clip();
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        ctx.restore();

        const { x: cursorX, y: cursorY } = cursorRef.current;
        const cx = cursorX / dpr;
        const cy = cursorY / dpr;

        if (cursorX > -1 && cursorY > -1) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.moveTo(0, cy);
          ctx.lineTo(cssW, cy);
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, cssH);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
          ctx.strokeStyle = "rgba(34, 211, 238, 0.8)";
          ctx.stroke();
        }

        animationFrameId = requestAnimationFrame(drawFrame);
      };

      animationFrameId = requestAnimationFrame(drawFrame);
    };
    
    const handleResize = () => {
       if(img.complete) {
           startTime = null;
           img.onload?.(new Event('load'));
       }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

  }, [imageDataUrl, result, showHeatmap]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] flex items-center justify-center rounded-[20px] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block drop-shadow-2xl transition-opacity duration-500 ease-in-out cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {result.bounding_box && (
        <div
          className="absolute border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse pointer-events-none rounded-sm"
          style={{
            left: imgGeometry.offsetX + result.bounding_box.x * imgGeometry.scale,
            top: imgGeometry.offsetY + result.bounding_box.y * imgGeometry.scale,
            width: result.bounding_box.width * imgGeometry.scale,
            height: result.bounding_box.height * imgGeometry.scale,
          }}
        />
      )}

      {result.heatmap_overlay && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-white/70 dark:bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-white/10 shadow-lg">
          <label htmlFor="heatmap-toggle" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            Toggle Activation Map
          </label>
          <button
            id="heatmap-toggle"
            role="switch"
            aria-checked={showHeatmap}
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showHeatmap ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${showHeatmap ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
      )}

      <div className="absolute bottom-6 inset-x-6 z-10 p-6 rounded-2xl bg-white/70 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
            Diagnosis
          </span>
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white drop-shadow-sm">
            {result.diagnosis}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
            Confidence
          </span>
          <span className="text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400 drop-shadow-sm">
            {formatProbability(result.confidence)}%
          </span>
        </div>
      </div>
    </div>
  );
}