// src/components/TelemetryWidget.tsx
"use client";

import { useState } from "react";
import type { DetectionResult, UploadState } from "@/lib/types";
import { ShieldAlert, ShieldCheck, ChevronDown, Info, Cpu, Loader2, ArrowRight, Download } from "lucide-react";
import { exportClinicalReport } from "@/lib/exportReport";

interface TelemetryWidgetProps {
  uploadState: UploadState;
  onReset: () => void;
}

export function TelemetryWidget({ uploadState, onReset }: TelemetryWidgetProps) {
  const { status } = uploadState;

  if (status === "idle") return <IdlePanel />;
  if (status === "uploading" || status === "analyzing") return <LoadingPanel status={status} />;
  if (status === "streaming" && !uploadState.isConnected) return <LoadingPanel status="uploading" />;
  if (status === "error") return <ErrorPanel message={uploadState.message} onReset={onReset} />;
  
  // Extract result for both static success and streaming
  // @ts-ignore
  const result = uploadState.result;
  if (!result) return <IdlePanel />;

  // @ts-ignore
  const imageDataUrl = uploadState.imageDataUrl;
  return <ResultPanel result={result} imageDataUrl={imageDataUrl} onReset={onReset} isStream={status === "streaming"} />;
}

function IdlePanel() {
  return (
    <div className="flex flex-col gap-6">
      <div className="p-10 flex flex-col items-center gap-6 text-center bg-gray-50/80 dark:bg-white/[0.02] rounded-[32px] border border-gray-100 dark:border-white/5 metric-card hover:border-gray-200 dark:hover:border-white/10">
        <div className="w-20 h-20 rounded-[28px] bg-white dark:bg-[#111] shadow-lg shadow-gray-200/50 dark:shadow-none flex items-center justify-center border border-gray-100 dark:border-white/5">
          <Info size={36} className="text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Awaiting Payload</p>
          <p className="mt-3 text-base text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
            System standing by. Upload imagery to generate a high-fidelity anomaly report.
          </p>
        </div>
      </div>
      <ModelInfoCard />
    </div>
  );
}

function LoadingPanel({ status }: { status: "uploading" | "analyzing" }) {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="p-10 flex flex-col items-center gap-6 text-center bg-cyan-50/80 dark:bg-cyan-500/10 rounded-[32px] border border-cyan-100 dark:border-cyan-500/20 metric-card shadow-xl shadow-cyan-500/10">
        <div className="w-20 h-20 rounded-[28px] bg-white dark:bg-cyan-950 flex items-center justify-center border border-cyan-100 dark:border-cyan-800">
          <Loader2 size={36} className="animate-spin text-cyan-600 dark:text-cyan-400" strokeWidth={2} />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {status === "uploading" ? "Connecting Stream" : "Active Scan in Progress"}
          </p>
          <p className="mt-3 text-base text-cyan-700/70 dark:text-cyan-300 font-bold">
            Routing to AI cluster…
          </p>
        </div>
      </div>
      <ModelInfoCard />
    </div>
  );
}

function ErrorPanel({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div className="p-8 rounded-[32px] bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 shadow-xl shadow-rose-500/10">
        <p className="text-sm font-black text-rose-600 dark:text-rose-400 mb-3 uppercase tracking-widest">Execution Failed</p>
        <p className="text-lg text-rose-900 dark:text-rose-200 font-bold leading-relaxed break-words">{message}</p>
      </div>
      <button onClick={onReset} className="h-16 w-full rounded-2xl text-lg font-extrabold bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 transition-all shadow-xl">
        Acknowledge & Retry
      </button>
    </div>
  );
}

function ResultPanel({ result, imageDataUrl, onReset, isStream }: { result: DetectionResult; imageDataUrl?: string; onReset: () => void; isStream: boolean }) {
  const defect_detected = result.diagnosis !== "No Tumor" && result.diagnosis !== "NOMINAL";
  
  const maxConfidence = result.confidence; 
  const primaryDefectType = result.diagnosis.toUpperCase();

  return (
    <div className="flex flex-col gap-6 animate-fade-up h-full">
      <div className={`group p-8 rounded-[32px] border transition-all duration-500 metric-card ${
        defect_detected
          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 hover:shadow-[0_0_40px_rgba(225,29,72,0.15)] hover:border-rose-300 dark:hover:border-rose-500/50"
          : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] hover:border-emerald-300 dark:hover:border-emerald-500/50"
      }`}>
        <div className="flex items-start gap-5">
          <div className={`p-4 rounded-[24px] shadow-sm transition-transform duration-500 group-hover:scale-110 ${defect_detected ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400" : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400"}`}>
            {defect_detected ? <ShieldAlert size={36} /> : <ShieldCheck size={36} />}
          </div>
          <div>
            <p className={`text-2xl font-extrabold tracking-tight ${defect_detected ? "text-rose-900 dark:text-rose-200" : "text-emerald-900 dark:text-emerald-200"}`}>
              {defect_detected ? "Anomaly Detected" : "Quality Standard Met"}
            </p>
            <p className={`mt-2 text-base font-bold ${defect_detected ? "text-rose-700/80 dark:text-rose-400/80" : "text-emerald-700/80 dark:text-emerald-400/80"}`}>
              {defect_detected ? "ResNet50 identified structural faults." : "Asset conforms to reference model."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="group p-8 bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-[32px] flex flex-col items-center justify-center gap-6 text-center metric-card hover:border-gray-300 dark:hover:border-white/20">
          <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest transition-colors group-hover:text-gray-900 dark:group-hover:text-white">Confidence Score</p>
          <ConfidenceRing score={maxConfidence} defect={defect_detected} />
        </div>
        
        <div className="flex flex-col gap-6">
          <MetricCard label="Diagnosis" value={primaryDefectType} isAlert={defect_detected} />
        </div>
      </div>

      {result.distribution && (
        <DistributionCard distribution={result.distribution} />
      )}

      <JsonAccordion result={result} />

      {!isStream && (
        <div className="mt-auto pt-6 flex flex-col gap-4">
          <button 
            onClick={() => exportClinicalReport({
              diagnosis: result.diagnosis,
              confidence: result.confidence,
              latency_ms: result.latency_ms,
              distribution: result.distribution,
              imageDataUrl: imageDataUrl,
              heatmapOverlay: result.heatmap_overlay,
              boundingBox: result.bounding_box
            })}
            className="w-full h-16 rounded-[24px] text-lg font-extrabold text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm hover:shadow-lg active:scale-95 flex items-center justify-center gap-3"
          >
            <Download size={20} /> Export Clinical Report
          </button>
          <button onClick={onReset} className="w-full h-16 rounded-[24px] text-lg font-extrabold text-slate-900 dark:text-white bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 transition-all shadow-sm hover:shadow-xl active:scale-95 flex items-center justify-center gap-3">
            New Inspection <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, isAlert }: { label: string; value: string; isAlert: boolean }) {
  return (
    <div className={`group p-6 bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-[28px] flex-1 flex flex-col items-center justify-center text-center metric-card transition-all duration-300 w-full overflow-hidden ${isAlert ? "hover:border-rose-300 dark:hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(225,29,72,0.1)]" : "hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"}`}>
      <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">{label}</p>
      <span className={`inline-block px-4 py-2 rounded-xl text-base font-bold font-mono break-all break-words leading-tight transition-colors max-w-full text-center ${isAlert ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 group-hover:bg-rose-200 dark:group-hover:bg-rose-900" : "bg-gray-200 text-gray-800 dark:bg-white/10 dark:text-gray-200 group-hover:bg-gray-300 dark:group-hover:bg-white/20"}`} style={{ overflowWrap: 'anywhere' }}>
        {value}
      </span>
    </div>
  );
}

const formatProbability = (val: number) => {
  const percent = val * 100;
  if (percent >= 99.995) return ">99.99";
  if (percent <= 0.005 && percent > 0) return "<0.01";
  return percent.toFixed(2);
};

function DistributionCard({ distribution }: { distribution: Record<string, number> }) {
  const classes = ["Glioma", "Meningioma", "Pituitary", "No Tumor"];
  
  return (
    <div className="p-8 bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-[32px] flex flex-col gap-5 metric-card hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300">
      <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Probability Distribution</p>
      <div className="flex flex-col gap-4">
        {classes.map(cls => {
          const val = distribution[cls] || 0;
          const pct = formatProbability(val);
          return (
            <div key={cls} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-700 dark:text-gray-300">{cls}</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">{pct}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceRing({ score, defect }: { score: number; defect: boolean }) {
  const R = 54;
  const CIRCUM = 2 * Math.PI * R;
  const fill = Math.max(0, Math.min(1, score)) * CIRCUM;
  const gap = CIRCUM - fill;
  
  const strokeColor = defect ? "#e11d48" : "#10b981"; 
  const glowColor = defect ? "rgba(225,29,72,0.6)" : "rgba(16,185,129,0.6)";

  return (
    <div className="relative w-40 h-40 group-hover:scale-110 transition-transform duration-700 ease-out">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90 filter drop-shadow-xl transition-all duration-700" style={{ filter: `drop-shadow(0 0 10px ${glowColor})` }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-white/5" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={strokeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${fill} ${gap}`} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tracking-tighter" style={{ color: strokeColor }}>
          {formatProbability(score)}
        </span>
      </div>
    </div>
  );
}

function syntaxHighlightJson(json: object) {
  let jsonStr = JSON.stringify(json, null, 2);
  jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
          if (/:$/.test(match)) { cls = 'json-key'; } else { cls = 'json-string'; }
      } else if (/true|false/.test(match)) { cls = 'json-boolean';
      } else if (/null/.test(match)) { cls = 'json-null'; }
      return '<span class="' + cls + '">' + match + '</span>';
  });
}

function JsonAccordion({ result }: { result: DetectionResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[28px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0c0c] overflow-hidden metric-card hover:border-gray-300 dark:hover:border-white/20 shadow-inner">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-8 py-6 text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
        <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-widest">Raw Telemetry Payload</span>
        <ChevronDown size={20} className={`text-gray-500 transition-transform duration-500 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`transition-all duration-500 ease-in-out ${open ? "max-h-[500px] border-t border-gray-100 dark:border-white/5 opacity-100" : "max-h-0 opacity-0"}`}>
        <pre className="p-8 text-sm font-mono overflow-y-auto max-h-[500px] bg-gray-50 dark:bg-black/60 shadow-[inset_0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_4px_20px_rgba(0,0,0,0.4)]" dangerouslySetInnerHTML={{ __html: syntaxHighlightJson(result) }} />
      </div>
    </div>
  );
}

function ModelInfoCard() {
  const info = [
    ["Model Engine", "resnet50_neurovision.onnx"],
    ["Dataset Base", "Kaggle Brain Tumor MRI"],
    ["Input Tensor", "1 x 3 x 224 x 224"],
    ["Classes", "4 (Glioma, Meningioma, Pituitary, No Tumor)"]
  ];
  return (
    <div className="rounded-[32px] border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-transparent metric-card hover:border-gray-300 dark:hover:border-white/20">
      <div className="px-8 py-5 flex items-center gap-4 bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
        <Cpu size={20} className="text-indigo-500" />
        <span className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Model Specifications</span>
      </div>
      <div className="flex flex-col p-2">
        {info.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[100px_1fr] items-center px-6 py-4 border-b border-gray-100 dark:border-white/5 last:border-0">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{k}</span>
            <span className="text-sm font-black font-mono text-gray-900 dark:text-white text-right break-all leading-tight pl-4">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}