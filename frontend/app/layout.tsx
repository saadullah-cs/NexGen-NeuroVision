// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DefectScan — Quality Inspection Platform",
  description: "Enterprise-grade automated visual defect detection powered by ONNX.",
  robots: "index, follow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-50 antialiased flex flex-col min-h-screen">
        
        {/* Main Application Content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Permanent Digital Watermark */}
        <footer className="w-full py-4 text-center border-t border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-[#050505]/50 backdrop-blur-md z-50">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-500 tracking-widest uppercase">
            Proprietary Architecture Engineered by <span className="text-cyan-600 dark:text-cyan-400 font-black">Saad Ullah</span> | © 2026 NexGen Builds. All Rights Reserved.
          </p>
        </footer>

      </body>
    </html>
  );
}