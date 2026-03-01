import React from "react";
import {
  FlaskConical, X, Download, RefreshCw,
  Info, Zap, Database, ChevronRight,
} from "lucide-react";

interface DemoBannerProps {
  onExit: () => void;
  onExportExcel: () => void;
  onReset: () => void;
  completedCount: number;
  pendingCount: number;
  totalRecords: number;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  onExit,
  onExportExcel,
  onReset,
  completedCount,
  pendingCount,
  totalRecords,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-xl mb-2">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />

      {/* Floating glow blobs */}
      <div className="absolute top-0 left-1/4 w-64 h-20 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-20 bg-purple-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 px-5 py-4">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left: Icon + label */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0 p-2.5 bg-white/20 rounded-xl border border-white/30 shadow-inner">
              <FlaskConical className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-base leading-tight">
                  🎮 Demo Run Mode
                </span>
                <span className="px-2 py-0.5 bg-yellow-400/30 border border-yellow-300/40 rounded-full text-[10px] font-bold text-yellow-200 uppercase tracking-widest animate-pulse">
                  Simulated
                </span>
              </div>
              <p className="text-purple-200 text-xs mt-0.5">
                Exploring with {totalRecords} demo crane records · No backend connected · Changes stay in browser memory
              </p>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Reset */}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl
                         bg-white/15 hover:bg-white/25 text-white border border-white/20
                         transition-all active:scale-95"
              title="Reset all demo completions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl
                         bg-emerald-500/80 hover:bg-emerald-500 text-white border border-emerald-400/50
                         transition-all active:scale-95 shadow-sm"
              title="Download demo data as .xlsx (same format as real file)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Exit Demo */}
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl
                         bg-white/10 hover:bg-red-500/60 text-white border border-white/20
                         hover:border-red-400/50 transition-all active:scale-95"
              title="Exit Demo Mode"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Demo</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mt-3 mb-2.5" />

        {/* Bottom row: Info pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Stats pills */}
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 border border-white/10">
            <Database className="w-3 h-3 text-purple-200" />
            <span className="text-xs text-purple-100 font-medium">{totalRecords} Cranes</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/20 rounded-lg px-3 py-1.5 border border-emerald-400/20">
            <Zap className="w-3 h-3 text-emerald-300" />
            <span className="text-xs text-emerald-200 font-medium">{completedCount} Completed (session)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/20 rounded-lg px-3 py-1.5 border border-amber-400/20">
            <Info className="w-3 h-3 text-amber-300" />
            <span className="text-xs text-amber-200 font-medium">{pendingCount} Pending Today</span>
          </div>

          {/* Connect hint */}
          <div className="ml-auto flex items-center gap-1 text-purple-300 text-xs hover:text-white transition-colors cursor-default">
            <span>To use real data: Upload tab</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};
