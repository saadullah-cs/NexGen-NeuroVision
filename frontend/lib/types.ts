// src/lib/types.ts

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Detection = {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: BoundingBox;
};

export type DetectionResult = {
  diagnosis: string;
  confidence: number;
  latency_ms: number;
  heatmap_overlay: string;
  bounding_box: BoundingBox | null;
  distribution: Record<string, number>;
};

export type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "analyzing" }
  | { status: "success"; result: DetectionResult; imageDataUrl: string }
  | { status: "streaming"; isConnected: boolean; result?: DetectionResult }
  | { status: "error"; message: string };