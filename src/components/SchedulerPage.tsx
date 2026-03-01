import React, { useState, useCallback, useEffect } from "react";
import {
  CalendarRange, AlertTriangle, CheckCircle2, RefreshCw,
  Play, Save, Download, Info, Zap,
  BarChart3, Calendar, Settings2, Eye, FileSpreadsheet,
  ArrowRight, Star, Circle, Table2, Layers, Users,
} from "lucide-react";
import { cn } from "../utils/cn";
import { pmApi } from "../api/pmApi";
import { GenerateScheduleResult, CranePreview, DaySummary } from "../types/pm";

interface SchedulerPageProps {
  activeSheet: string | null;
  allSheets: string[];
  isExcelLoaded: boolean;
  isOnline?: boolean;
  hasAppsScript?: boolean;
  onScheduleApplied: () => void;
  onGoToUpload: () => void;
  onGoToDashboard: () => void;
}

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DOW_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDow(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

// ── Excel-like Sheet Preview ─────────────────────────────────────────────────
interface ExcelSheetPreviewProps {
  result: GenerateScheduleResult;
}

const ExcelSheetPreview: React.FC<ExcelSheetPreviewProps> = ({ result }) => {
  const { crane_preview, month_days, month_name, year, month, validation } = result;
  const days = Array.from({ length: month_days }, (_, i) => i + 1);
  const _criticalSet = new Set(result.critical_cranes); void _criticalSet;

  // Day-of-week row
  const dowRow = days.map((d) => DOW_FULL[getDow(year, month, d)]);

  // Which days have too many cranes / critical coverage
  const dayLoad = validation.day_load as Record<number, number>;
  const dayCriticalLoad = (validation.day_critical_load ?? {}) as Record<number, number>;

  const getCellBg = (crane: CranePreview, day: number): string => {
    const isScheduled = crane.scheduled_days.includes(day);
    if (!isScheduled) return "";
    return crane.type === "CRITICAL" ? "bg-violet-600" : "bg-blue-500";
  };

  const getLoadColor = (count: number): string => {
    if (count === 0) return "text-gray-300";
    if (count === 1) return "text-emerald-600 font-bold";
    if (count === 2) return "text-blue-600 font-bold";
    if (count === 3) return "text-amber-600 font-bold";
    return "text-red-600 font-bold";
  };

  // Consecutive day checker per crane
  const hasConsecutive = (crane: CranePreview): boolean => {
    const sorted = [...crane.scheduled_days].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] === 1) return true;
    }
    return false;
  };

  // Gap between scheduled days
  const getGaps = (crane: CranePreview): number[] => {
    const sorted = [...crane.scheduled_days].sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      gaps.push(sorted[i + 1] - sorted[i]);
    }
    return gaps;
  };

  return (
    <div className="space-y-4">
      {/* ── Excel-like table ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-300 shadow-lg">
        <table className="border-collapse text-[11px] font-mono" style={{ minWidth: `${180 + month_days * 28}px` }}>
          {/* ── Header Row 1: Month title ─── */}
          <thead>
            <tr>
              {/* Fixed columns header */}
              <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-left text-[10px] text-gray-500 font-bold w-8 sticky left-0 z-20">SL</th>
              <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-left text-[10px] text-gray-600 font-bold w-32 sticky left-8 z-20">CRANE NO</th>
              <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-left text-[10px] text-gray-600 font-bold w-24 sticky left-40 z-20">LOCATION</th>
              <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-[10px] text-gray-600 font-bold w-12 sticky left-64 z-20">ROW</th>
              {/* Month header spanning all day columns */}
              <th
                colSpan={month_days}
                className="border border-gray-300 bg-indigo-700 text-white text-center py-2 font-bold text-sm tracking-widest"
              >
                {month_name.toUpperCase()} {year} — PM PLAN SCHEDULE
              </th>
              <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-[10px] text-gray-600 font-bold w-14">FREQ</th>
              <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-[10px] text-gray-600 font-bold w-16">GAPS</th>
              <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-[10px] text-gray-600 font-bold w-16">STATUS</th>
            </tr>

            {/* ── Header Row 2: Day of week ─── */}
            <tr>
              <th className="border border-gray-300 bg-gray-50 px-1 py-1 sticky left-0 z-20" />
              <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-[9px] text-gray-400 sticky left-8 z-20">DAY ▸</th>
              <th className="border border-gray-300 bg-gray-50 sticky left-40 z-20" />
              <th className="border border-gray-300 bg-gray-50 px-1 py-1 text-[9px] text-gray-500 font-bold text-center sticky left-64 z-20">DAY</th>
              {dowRow.map((dow, i) => {
                const d = i + 1;
                const isWe = getDow(year, month, d) === 0 || getDow(year, month, d) === 6;
                return (
                  <th
                    key={d}
                    className={cn(
                      "border border-gray-300 text-center py-1 text-[9px] font-bold w-7",
                      isWe ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-500"
                    )}
                  >
                    {dow}
                  </th>
                );
              })}
              <th className="border border-gray-300 bg-gray-50" />
              <th className="border border-gray-300 bg-gray-50" />
              <th className="border border-gray-300 bg-gray-50" />
            </tr>

            {/* ── Header Row 3: Day numbers ─── */}
            <tr>
              <th className="border border-gray-300 bg-amber-50 px-1 py-1 sticky left-0 z-20" />
              <th className="border border-gray-300 bg-amber-50 px-2 py-1 text-[9px] text-amber-700 font-bold sticky left-8 z-20">DATE ▸</th>
              <th className="border border-gray-300 bg-amber-50 sticky left-40 z-20" />
              <th className="border border-gray-300 bg-amber-50 text-center text-[9px] font-bold text-amber-700 sticky left-64 z-20">DATE</th>
              {days.map((d) => {
                const load = dayLoad[d] || 0;
                const isWe = getDow(year, month, d) === 0 || getDow(year, month, d) === 6;
                return (
                  <th
                    key={d}
                    className={cn(
                      "border border-gray-300 text-center py-1 text-[10px] font-bold w-7",
                      isWe ? "bg-blue-50" : "bg-amber-50",
                      load > result.max_cranes_per_day ? "bg-red-100" : ""
                    )}
                    title={`Day ${d}: ${load} crane${load !== 1 ? "s" : ""} scheduled`}
                  >
                    <span className={cn("block", getLoadColor(load))}>{d}</span>
                  </th>
                );
              })}
              <th className="border border-gray-300 bg-amber-50 text-center text-[9px] font-bold text-amber-700">COUNT</th>
              <th className="border border-gray-300 bg-amber-50 text-center text-[9px] font-bold text-amber-700">DAY GAP</th>
              <th className="border border-gray-300 bg-amber-50 text-center text-[9px] font-bold text-amber-700">VALID</th>
            </tr>
          </thead>

          <tbody>
            {crane_preview.map((crane, idx) => {
              const isCrit = crane.type === "CRITICAL";
              const gaps = getGaps(crane);
              const minGap = gaps.length > 0 ? Math.min(...gaps) : null;
              const consec = hasConsecutive(crane);

              return (
                <React.Fragment key={crane.crane}>
                  {/* ── PLAN row ─────────────────────────────────────────── */}
                  <tr className={cn(
                    "hover:bg-yellow-50 transition-colors group",
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  )}>
                    {/* SL.NO */}
                    <td className={cn(
                      "border border-gray-300 text-center text-[10px] font-bold sticky left-0 z-10",
                      idx % 2 === 0 ? "bg-white group-hover:bg-yellow-50" : "bg-gray-50 group-hover:bg-yellow-50"
                    )}>
                      {idx + 1}
                    </td>

                    {/* CRANE NO */}
                    <td className={cn(
                      "border border-gray-300 px-2 py-1.5 sticky left-8 z-10 min-w-[120px]",
                      idx % 2 === 0 ? "bg-white group-hover:bg-yellow-50" : "bg-gray-50 group-hover:bg-yellow-50"
                    )}>
                      <div className="flex items-center gap-1.5">
                        {isCrit ? (
                          <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                        )}
                        <span className={cn(
                          "font-bold truncate text-[11px]",
                          isCrit ? "text-violet-800" : "text-blue-800"
                        )}>
                          {crane.crane_no || crane.crane.split(" | ")[0]}
                        </span>
                      </div>
                    </td>

                    {/* LOCATION */}
                    <td className={cn(
                      "border border-gray-300 px-2 py-1.5 text-gray-600 text-[10px] sticky left-40 z-10 min-w-[90px] truncate",
                      idx % 2 === 0 ? "bg-white group-hover:bg-yellow-50" : "bg-gray-50 group-hover:bg-yellow-50"
                    )}>
                      {crane.location || "—"}
                    </td>

                    {/* ROW TYPE: PLAN */}
                    <td className={cn(
                      "border border-gray-300 px-1 py-1.5 text-center sticky left-64 z-10",
                      idx % 2 === 0 ? "bg-white group-hover:bg-yellow-50" : "bg-gray-50 group-hover:bg-yellow-50"
                    )}>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded border border-purple-300">
                        PLAN
                      </span>
                    </td>

                    {/* Day cells — PLAN row */}
                    {days.map((d) => {
                      const isScheduled = crane.scheduled_days.includes(d);
                      const isWe = getDow(year, month, d) === 0 || getDow(year, month, d) === 6;
                      const bg = getCellBg(crane, d);

                      return (
                        <td
                          key={d}
                          className={cn(
                            "border border-gray-300 text-center py-1.5 w-7 h-7 transition-all relative",
                            !isScheduled && isWe ? "bg-blue-50/40" : "",
                            !isScheduled && !isWe ? (idx % 2 === 0 ? "bg-white" : "bg-gray-50/40") : "",
                            isScheduled ? bg : "",
                            isScheduled ? "cursor-default" : ""
                          )}
                          title={isScheduled ? `${crane.crane_no}: PM scheduled on Day ${d} (${DOW_FULL[getDow(year, month, d)]})` : `Day ${d}: No PM`}
                        >
                          {isScheduled && (
                            <span className="text-white font-bold text-[13px] leading-none select-none">
                              √
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* FREQ */}
                    <td className="border border-gray-300 text-center">
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        isCrit ? "bg-violet-100 text-violet-700" : "bg-blue-50 text-blue-700"
                      )}>
                        {crane.scheduled_days.length}×
                      </span>
                    </td>

                    {/* GAPS */}
                    <td className="border border-gray-300 text-center">
                      {gaps.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5 justify-center px-0.5">
                          {gaps.map((g, gi) => (
                            <span
                              key={gi}
                              className={cn(
                                "text-[9px] font-bold px-1 py-0.5 rounded",
                                g <= 1 ? "bg-red-100 text-red-700" :
                                g <= 5 ? "bg-amber-50 text-amber-700" :
                                "bg-emerald-50 text-emerald-700"
                              )}
                            >
                              {g}d
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-[9px]">—</span>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="border border-gray-300 text-center">
                      {consec ? (
                        <span className="text-[9px] font-bold text-red-600">⚠️ CONSEC</span>
                      ) : minGap !== null && minGap <= 2 ? (
                        <span className="text-[9px] font-bold text-amber-600">⚡ SHORT</span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-600">✅ OK</span>
                      )}
                    </td>
                  </tr>

                  {/* ── ACT row (empty — shows real sheet structure) ──────── */}
                  <tr className={cn(
                    "opacity-60",
                    idx % 2 === 0 ? "bg-gray-50/30" : "bg-white/60"
                  )}>
                    <td className={cn(
                      "border border-gray-200 sticky left-0 z-10",
                      idx % 2 === 0 ? "bg-gray-50/30" : "bg-white/60"
                    )} />
                    <td className={cn(
                      "border border-gray-200 px-2 py-0.5 text-gray-300 text-[9px] italic sticky left-8 z-10",
                      idx % 2 === 0 ? "bg-gray-50/30" : "bg-white/60"
                    )}>
                      {crane.crane_no || "—"}
                    </td>
                    <td className={cn(
                      "border border-gray-200 px-2 py-0.5 sticky left-40 z-10",
                      idx % 2 === 0 ? "bg-gray-50/30" : "bg-white/60"
                    )} />
                    <td className={cn(
                      "border border-gray-200 text-center sticky left-64 z-10",
                      idx % 2 === 0 ? "bg-gray-50/30" : "bg-white/60"
                    )}>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded border border-gray-200">
                        ACT
                      </span>
                    </td>
                    {days.map((d) => (
                      <td
                        key={d}
                        className="border border-gray-200 text-center py-0.5 w-7 h-5 bg-gray-50/20"
                      />
                    ))}
                    <td className="border border-gray-200" />
                    <td className="border border-gray-200" />
                    <td className="border border-gray-200" />
                  </tr>
                </React.Fragment>
              );
            })}

            {/* ── Daily load summary row ───────────────────────────────────── */}
            <tr className="bg-indigo-50 border-t-2 border-indigo-300">
              <td className="border border-gray-300 bg-indigo-50 sticky left-0 z-10" />
              <td colSpan={2} className="border border-gray-300 bg-indigo-50 px-2 py-1.5 text-[10px] font-bold text-indigo-800 sticky left-8 z-10">
                DAILY TOTAL
              </td>
              <td className="border border-gray-300 bg-indigo-50 sticky left-64 z-10" />
              {days.map((d) => {
                const count = dayLoad[d] || 0;
                const overCap = count > result.max_cranes_per_day;
                return (
                  <td key={d}
                    className={cn("border border-gray-300 text-center py-1.5 w-7 font-bold text-[10px]",
                      overCap ? "bg-red-100" : count > 0 ? "bg-indigo-100" : "bg-red-50"
                    )}
                    title={`Day ${d}: ${count} crane${count !== 1 ? "s" : ""}`}
                  >
                    <span className={cn(count === 0 ? "text-red-500 font-black" : overCap ? "text-red-700" : count === 1 ? "text-emerald-700" : count === 2 ? "text-blue-700" : "text-amber-700")}>
                      {count || "✗"}
                    </span>
                  </td>
                );
              })}
              <td colSpan={3} className="border border-gray-300 bg-indigo-50 text-center text-[10px] font-bold text-indigo-700 px-2">
                Total: {result.total_pm_events} PMs
              </td>
            </tr>

            {/* ── Critical coverage row — every day must have ≥1 critical ── */}
            <tr className="bg-violet-50 border-t border-violet-200">
              <td className="border border-gray-200 bg-violet-50 sticky left-0 z-10" />
              <td colSpan={2} className="border border-gray-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-800 sticky left-8 z-10">
                ⭐ CRITICAL/DAY
              </td>
              <td className="border border-gray-200 bg-violet-50 sticky left-64 z-10" />
              {days.map((d) => {
                const critCount = dayCriticalLoad[d] || 0;
                return (
                  <td key={d}
                    className={cn("border border-gray-200 text-center py-1 w-7 text-[10px] font-bold",
                      critCount > 0 ? "bg-violet-100" : "bg-red-50"
                    )}
                    title={`Day ${d}: ${critCount} critical crane${critCount !== 1 ? "s" : ""}`}
                  >
                    <span className={critCount > 0 ? "text-violet-700" : "text-red-500 font-black"}>
                      {critCount > 0 ? critCount : "✗"}
                    </span>
                  </td>
                );
              })}
              <td colSpan={3} className="border border-gray-200 bg-violet-50 text-center text-[10px] font-bold text-violet-700 px-2">
                {result.critical_coverage_pct ?? 100}% days covered
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center text-[11px]">
        <span className="font-bold text-gray-600">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center text-white font-bold text-[10px]">√</span>
          <span className="text-gray-600">Critical PM</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">√</span>
          <span className="text-gray-600">Normal PM</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-gray-100 border border-gray-200 flex items-center justify-center" />
          <span className="text-gray-400">No PM (ACT row)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-black text-[10px]">✗</span>
          <span className="text-red-600 font-semibold">No crane / No critical — must be fixed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-blue-50 border border-blue-200" />
          <span className="text-gray-500">Weekend</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-bold text-[10px]">⭐</span>
          <span className="text-gray-600">Critical crane coverage row</span>
        </span>
      </div>

      {/* ── Per-crane gap analysis ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {crane_preview.map((crane) => {
          const gaps = getGaps(crane);
          const minGap = gaps.length > 0 ? Math.min(...gaps) : null;
          const isCrit = crane.type === "CRITICAL";
          const consec = hasConsecutive(crane);

          return (
            <div
              key={crane.crane}
              className={cn(
                "rounded-xl border p-3 text-[11px]",
                consec ? "border-red-300 bg-red-50" :
                isCrit ? "border-violet-200 bg-violet-50/60" : "border-blue-200 bg-blue-50/40"
              )}
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                  isCrit ? "bg-violet-200 text-violet-800" : "bg-blue-100 text-blue-800"
                )}>
                  {isCrit ? "⭐ CRIT" : "NORM"}
                </span>
                <span className="font-bold text-gray-800 truncate">
                  {crane.crane_no || crane.crane.split(" | ")[0]}
                </span>
                {consec && <span className="text-red-500 text-[10px] ml-auto">⚠️</span>}
              </div>

              {/* Scheduled days as mini pills */}
              <div className="flex flex-wrap gap-1 mb-2">
                {crane.scheduled_days.map((d) => (
                  <span
                    key={d}
                    className={cn(
                      "text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold",
                      isCrit ? "bg-violet-600 text-white" : "bg-blue-500 text-white"
                    )}
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Gap info */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {gaps.map((g, gi) => (
                    <span
                      key={gi}
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded",
                        g <= 1 ? "bg-red-200 text-red-800" :
                        g <= 4 ? "bg-amber-100 text-amber-800" :
                        "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      +{g}d
                    </span>
                  ))}
                </div>
                <span className={cn(
                  "text-[9px] font-bold",
                  consec ? "text-red-600" :
                  minGap !== null && minGap <= 2 ? "text-amber-600" :
                  "text-emerald-600"
                )}>
                  {consec ? "CONSEC!" : minGap !== null ? `min ${minGap}d` : "ok"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Scheduler Page ───────────────────────────────────────────────────────
export const SchedulerPage: React.FC<SchedulerPageProps> = ({
  activeSheet, allSheets, isExcelLoaded,
  isOnline = false, hasAppsScript = false,
  onScheduleApplied, onGoToUpload, onGoToDashboard,
}) => {
  // suppress unused-var lint until used below
  void isOnline; void hasAppsScript;
  // ── Settings ───────────────────────────────────────────────────────────────
  const [selectedSheet, setSelectedSheet]       = useState<string>(activeSheet || allSheets[0] || "");

  // Sync when online sheets arrive after initial render
  useEffect(() => {
    setSelectedSheet((prev) => (prev ? prev : activeSheet || allSheets[0] || ""));
  }, [activeSheet, allSheets]);

  const [criticalCount, setCriticalCount]       = useState(6);
  const [criticalFreq, setCriticalFreq]         = useState(3);
  const [normalFreq, setNormalFreq]             = useState(2);
  const [maxCranesPerDay, setMaxCranesPerDay]   = useState(2);

  // ── State ──────────────────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying]     = useState(false);
  const [previewResult, setPreviewResult] = useState<GenerateScheduleResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [applied, setApplied]           = useState(false);
  const [activeTab, setActiveTab]       = useState<"config" | "sheet" | "cranes" | "days">("config");

  // ── Generate Preview ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setPreviewResult(null);
    setApplied(false);
    try {
      const result = await pmApi.generateSchedule({
        sheet_name:         selectedSheet || undefined,
        critical_count:     criticalCount,
        critical_freq:      criticalFreq,
        normal_freq:        normalFreq,
        max_cranes_per_day: maxCranesPerDay,
        apply:              false,
      });
      setPreviewResult(result);
      setActiveTab("sheet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate schedule");
    } finally {
      setIsGenerating(false);
    }
  }, [selectedSheet, criticalCount, criticalFreq, normalFreq, maxCranesPerDay]);

  // ── Download Schedule Preview (with √ marks, no disk write) ───────────────
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone,  setDownloadDone]  = useState(false);

  const handleDownloadPreview = useCallback(async () => {
    if (!previewResult) return;
    setIsDownloading(true);
    setDownloadDone(false);
    try {
      await pmApi.downloadSchedulePreview({
        sheet_name:         previewResult.sheet_name,
        critical_count:     previewResult.critical_count,
        critical_freq:      previewResult.critical_freq,
        normal_freq:        previewResult.normal_freq,
        max_cranes_per_day: previewResult.max_cranes_per_day,
        apply:              false,
      });
      setDownloadDone(true);
      // Reset after 4 seconds
      setTimeout(() => setDownloadDone(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }, [previewResult]);

  // ── Apply to Excel ─────────────────────────────────────────────────────────
  const [applyCountdown, setApplyCountdown] = useState<number | null>(null);

  const handleApply = useCallback(async () => {
    if (!previewResult) return;
    setIsApplying(true);
    setError(null);
    try {
      const result = await pmApi.generateSchedule({
        sheet_name:         previewResult.sheet_name,
        critical_count:     previewResult.critical_count,
        critical_freq:      previewResult.critical_freq,
        normal_freq:        previewResult.normal_freq,
        max_cranes_per_day: previewResult.max_cranes_per_day,
        apply:              true,
      });
      setPreviewResult(result);
      setApplied(true);
      onScheduleApplied();
      // Auto-navigate to dashboard after 3s countdown
      let secs = 3;
      setApplyCountdown(secs);
      const tick = setInterval(() => {
        secs -= 1;
        setApplyCountdown(secs);
        if (secs <= 0) {
          clearInterval(tick);
          setApplyCountdown(null);
          onGoToDashboard();
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply schedule");
    } finally {
      setIsApplying(false);
    }
  }, [previewResult, onScheduleApplied, onGoToDashboard]);

  // ── Load bar chart ─────────────────────────────────────────────────────────
  const renderLoadChart = (daySummary: DaySummary[], monthDays: number, maxPerDay: number) => {
    const maxLoad = Math.max(...daySummary.map((d) => d.count), maxPerDay, 1);
    const dayMap: Record<number, DaySummary> = {};
    daySummary.forEach((d) => { dayMap[d.day] = d; });

    return (
      <div className="space-y-1">
        {/* Cap line */}
        <div className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
          <span className="inline-block w-6 h-0.5 bg-red-400 border-dashed border-t border-red-500" />
          Max {maxPerDay} crane{maxPerDay !== 1 ? "s" : ""}/day cap
        </div>
        <div className="flex items-end gap-0.5 h-20 relative">
          {/* Cap line overlay */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 pointer-events-none z-10"
            style={{ bottom: `${(maxPerDay / maxLoad) * 80}px` }}
          />
          {Array.from({ length: monthDays }, (_, i) => i + 1).map((day) => {
            const entry = dayMap[day];
            const count = entry?.count || 0;
            const height = count > 0 ? Math.round((count / maxLoad) * 80) : 0;
            const overCap = count > maxPerDay;
            const isWe = getDow(previewResult!.year, previewResult!.month, day) === 0 ||
                         getDow(previewResult!.year, previewResult!.month, day) === 6;
            return (
              <div
                key={day}
                className="flex-1 flex flex-col items-center justify-end group relative"
                title={entry ? `Day ${day} (${DOW_FULL[getDow(previewResult!.year, previewResult!.month, day)]}): ${entry.cranes.map(c => {
                  const cp = previewResult!.crane_preview.find(x => x.crane === c);
                  return cp?.crane_no || c;
                }).join(", ")}` : `Day ${day}: No PM`}
              >
                {height > 0 && (
                  <div
                    className={cn(
                      "w-full rounded-t transition-all",
                      overCap ? "bg-red-500" :
                      entry?.is_critical_day ? "bg-violet-500" :
                      isWe ? "bg-sky-400" : "bg-blue-400"
                    )}
                    style={{ height: `${height}px` }}
                  />
                )}
                {day % 5 === 0 && (
                  <span className="text-[7px] text-gray-400 mt-0.5 select-none">{day}</span>
                )}
              </div>
            );
          })}
        </div>
        {/* Color key */}
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 pt-1">
          <span><span className="inline-block w-3 h-3 rounded bg-violet-500 mr-1 align-middle" />Critical</span>
          <span><span className="inline-block w-3 h-3 rounded bg-blue-400 mr-1 align-middle" />Normal</span>
          <span><span className="inline-block w-3 h-3 rounded bg-sky-400 mr-1 align-middle" />Weekend</span>
          <span><span className="inline-block w-3 h-3 rounded bg-red-500 mr-1 align-middle" />Over cap</span>
        </div>
      </div>
    );
  };

  // ── No Excel loaded ────────────────────────────────────────────────────────
  if (!isExcelLoaded && allSheets.length === 0) {
    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 rounded-xl px-6 py-5 text-white shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-xl"><CalendarRange className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-bold">Auto PM Scheduler</h2>
            <p className="text-violet-200 text-sm mt-0.5">Upload a blank PM Excel sheet or connect Google Sheets to generate a smart maintenance schedule</p>
          </div>
        </div>
        <div className="bg-white border border-dashed border-gray-300 rounded-xl px-6 py-14 flex flex-col items-center text-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full"><FileSpreadsheet className="w-10 h-10 text-gray-400" /></div>
          <div>
            <p className="text-gray-700 font-semibold text-lg">No Data Source Connected</p>
            <p className="text-gray-500 text-sm mt-2 max-w-md leading-relaxed">
              Upload your blank PMI compliance Excel sheet with PLAN/ACT rows, or connect a Google Sheet from the Upload tab.
              The scheduler will read all cranes and generate an optimized, balanced schedule.
            </p>
          </div>
          <button onClick={onGoToUpload} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm">
            <ArrowRight className="w-4 h-4" />Go to Upload / Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header Banner ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 rounded-xl px-6 py-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-xl"><CalendarRange className="w-6 h-6 text-white" /></div>
          <div>
            <h2 className="text-xl font-bold">Auto PM Scheduler</h2>
            <p className="text-violet-200 text-sm mt-0.5">
              Configure → Generate → Preview Excel sheet → Apply √ marks to PLAN rows only
            </p>
          </div>
        </div>
        {applied && (
          <div className="flex items-center gap-2 bg-emerald-500/30 border border-emerald-400/40 rounded-xl px-4 py-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span className="text-sm font-bold text-emerald-200">Schedule Applied ✅</span>
          </div>
        )}
      </div>

      {/* ── Configuration Card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-violet-600" />
          Scheduler Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {/* Sheet Selector */}
          <div className="xl:col-span-1">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Target Sheet</label>
            <select
              value={selectedSheet}
              onChange={(e) => { setSelectedSheet(e.target.value); setPreviewResult(null); setApplied(false); }}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50"
            >
              {allSheets.length === 0
                ? <option value="">No sheets available</option>
                : allSheets.map((s) => <option key={s} value={s}>{s}</option>)
              }
            </select>
            <p className="text-[10px] text-gray-400 mt-1">Sheet to generate schedule for</p>
          </div>

          {/* Critical Count */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Critical Cranes (First N)</label>
            <input
              type="number" min={1} max={50} value={criticalCount}
              onChange={(e) => { setCriticalCount(Number(e.target.value)); setPreviewResult(null); }}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50 font-bold text-violet-700"
            />
            <p className="text-[10px] text-gray-400 mt-1">First N cranes = CRITICAL priority</p>
          </div>

          {/* Critical Frequency */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Critical Freq <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[9px] rounded-full font-bold">per month</span>
            </label>
            <div className="flex items-center gap-1">
              {[2, 3, 4].map((n) => (
                <button key={n} onClick={() => { setCriticalFreq(n); setPreviewResult(null); }}
                  className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-all",
                    criticalFreq === n ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-400 hover:border-violet-300"
                  )}>
                  {n}×
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Times/month for CRITICAL cranes</p>
          </div>

          {/* Normal Frequency */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Normal Freq <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded-full font-bold">per month</span>
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => { setNormalFreq(n); setPreviewResult(null); }}
                  className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-all",
                    normalFreq === n ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-400 hover:border-blue-300"
                  )}>
                  {n}×
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Times/month for NORMAL cranes</p>
          </div>

          {/* ── Max Cranes Per Day — KEY NEW CONTROL ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Max Cranes / Day
              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded-full font-bold">daily cap</span>
            </label>
            {/* Stepper */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMaxCranesPerDay(Math.max(1, maxCranesPerDay - 1)); setPreviewResult(null); }}
                className="w-9 h-10 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-bold text-lg hover:bg-amber-100 transition-all flex items-center justify-center leading-none"
              >−</button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-black text-amber-700 leading-none">{maxCranesPerDay}</div>
                <div className="text-[9px] text-amber-500 font-medium mt-0.5">crane{maxCranesPerDay !== 1 ? "s" : ""}/day</div>
              </div>
              <button
                onClick={() => { setMaxCranesPerDay(Math.min(10, maxCranesPerDay + 1)); setPreviewResult(null); }}
                className="w-9 h-10 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-bold text-lg hover:bg-amber-100 transition-all flex items-center justify-center leading-none"
              >+</button>
            </div>
            {/* Quick preset buttons */}
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => { setMaxCranesPerDay(n); setPreviewResult(null); }}
                  className={cn("flex-1 text-[10px] py-1 rounded-lg border font-bold transition-all",
                    maxCranesPerDay === n
                      ? "border-amber-500 bg-amber-100 text-amber-800"
                      : "border-gray-200 text-gray-400 hover:border-amber-300"
                  )}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Max cranes allowed on same day</p>
          </div>
        </div>

        {/* ── Rules Summary ───────────────────────────────────────────────── */}
        <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {[
            { icon: <Star className="w-3.5 h-3.5 text-violet-600" />,   label: "Critical",        value: `First ${criticalCount} → ${criticalFreq}×/mo`,  color: "text-violet-700" },
            { icon: <Circle className="w-3.5 h-3.5 text-blue-500" />,   label: "Normal",          value: `Rest → ${normalFreq}×/mo`,                       color: "text-blue-700" },
            { icon: <Users className="w-3.5 h-3.5 text-amber-500" />,   label: "Daily Cap",       value: `Max ${maxCranesPerDay} crane${maxCranesPerDay!==1?"s":""}/day`, color: "text-amber-700" },
            { icon: <Zap className="w-3.5 h-3.5 text-rose-500" />,      label: "No Consecutive",  value: "≥2 day gap per crane",                           color: "text-rose-700" },
            { icon: <Layers className="w-3.5 h-3.5 text-emerald-500" />,label: "Crane Gap",       value: "Adjacent cranes skip days",                      color: "text-emerald-700" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-gray-500 font-medium">{item.label}</p>
                <p className={cn("font-bold", item.color)}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Generate Button ─────────────────────────────────────────────── */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedSheet}
            className={cn(
              "flex items-center gap-2 px-7 py-3 text-sm font-bold rounded-xl transition-all shadow-md",
              !isGenerating && selectedSheet
                ? "bg-violet-600 hover:bg-violet-700 text-white active:scale-[0.98]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {isGenerating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Play className="w-4 h-4" /> Generate Schedule Preview</>}
          </button>
          {previewResult && !applied && (
            <button onClick={handleGenerate} className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-violet-700 border-2 border-violet-300 bg-violet-50 hover:bg-violet-100 rounded-xl transition-all">
              <RefreshCw className="w-4 h-4" />Regenerate
            </button>
          )}
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Scheduler Error</p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PREVIEW RESULTS                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {previewResult && (
        <div className="space-y-5">

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ⬇  PROMINENT DOWNLOAD BANNER — always visible after preview   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className={cn(
            "rounded-xl border-2 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-md transition-all",
            downloadDone
              ? "border-emerald-400 bg-emerald-50"
              : "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50"
          )}>
            {/* Left: icon + text */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn(
                "p-2.5 rounded-xl flex-shrink-0",
                downloadDone ? "bg-emerald-100" : "bg-blue-100"
              )}>
                {downloadDone
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  : <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                }
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "text-sm font-bold",
                  downloadDone ? "text-emerald-800" : "text-blue-900"
                )}>
                  {downloadDone
                    ? "✅ Download started! Check your downloads folder."
                    : "⬇ Download Schedule with Plan Updates"}
                </p>
                <p className={cn(
                  "text-xs mt-0.5 leading-relaxed",
                  downloadDone ? "text-emerald-700" : "text-blue-700"
                )}>
                  {downloadDone
                    ? `pm_schedule_${previewResult.month_name}_${previewResult.year}.xlsx — contains all √ marks in PLAN rows`
                    : `Get the Excel file with √ marks already filled in the PLAN rows for ${previewResult.month_name} ${previewResult.year}. Original formatting, merged cells, and ACT rows are untouched.`
                  }
                </p>
              </div>
            </div>

            {/* Right: download button + info chips */}
            <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
              {/* Quick info chips */}
              <div className="hidden lg:flex flex-col gap-1 text-[10px] text-blue-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                  {previewResult.critical_cranes.length} Critical cranes
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  {previewResult.normal_cranes.length} Normal cranes
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {previewResult.total_pm_events} √ marks total
                </span>
              </div>

              {/* THE DOWNLOAD BUTTON */}
              <button
                onClick={handleDownloadPreview}
                disabled={isDownloading}
                className={cn(
                  "flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-[0.97]",
                  isDownloading
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : downloadDone
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                {isDownloading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Generating…</>
                ) : downloadDone ? (
                  <><CheckCircle2 className="w-4 h-4" />Downloaded ✓</>
                ) : (
                  <><Download className="w-4 h-4" />Download Excel with √ Marks</>
                )}
              </button>

              {/* File label */}
              {!downloadDone && !isDownloading && (
                <div className="text-[10px] text-blue-500 text-center leading-tight">
                  <p className="font-bold">pm_schedule_{previewResult.month_name}_{previewResult.year}.xlsx</p>
                  <p>Ready to download instantly</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Summary Stats ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-3">
            {[
              { label: "Sheet",            value: previewResult.sheet_name,                        color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200" },
              { label: "Month",            value: `${previewResult.month_name} ${previewResult.year}`, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
              { label: "Total Cranes",     value: previewResult.total_cranes,                       color: "text-gray-800",   bg: "bg-gray-50 border-gray-200" },
              { label: "Critical",         value: previewResult.critical_cranes.length,             color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
              { label: "Normal",           value: previewResult.normal_cranes.length,               color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
              { label: "Total PM Events",  value: previewResult.total_pm_events,                    color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200" },
              { label: "Max / Day",        value: `≤${previewResult.max_cranes_per_day}`,          color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
              { label: "Day Coverage",     value: `${previewResult.coverage_pct ?? 100}%`,         color: (previewResult.coverage_pct ?? 100) === 100 ? "text-emerald-700" : "text-red-700",  bg: (previewResult.coverage_pct ?? 100) === 100 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200" },
              { label: "Critical/Day",     value: `${previewResult.critical_coverage_pct ?? 100}%`,color: (previewResult.critical_coverage_pct ?? 100) === 100 ? "text-emerald-700" : "text-orange-700", bg: (previewResult.critical_coverage_pct ?? 100) === 100 ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200" },
            ].map((item) => (
              <div key={item.label} className={cn("rounded-xl border p-3 shadow-sm", item.bg)}>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
                <p className={cn("text-lg font-bold mt-0.5 truncate", item.color)}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 bg-gray-50/70">
              {[
                { id: "sheet",  label: "📊 Excel Sheet Preview", icon: <Table2 className="w-3.5 h-3.5" /> },
                { id: "cranes", label: "🏗️ Per-Crane Detail",    icon: <Eye className="w-3.5 h-3.5" /> },
                { id: "days",   label: "📅 Day-by-Day Summary",  icon: <Calendar className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all",
                    activeTab === tab.id
                      ? "border-violet-500 text-violet-700 bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/70"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              ))}

              {/* Validation badge */}
              <div className="ml-auto flex items-center gap-2 px-4">
                {(previewResult.coverage_pct ?? 100) === 100 && (previewResult.critical_coverage_pct ?? 100) === 100 ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />Full Coverage ✅
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                    <AlertTriangle className="w-3 h-3" />Coverage Gap
                  </span>
                )}
                {previewResult.validation.valid ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />Rules OK
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                    <AlertTriangle className="w-3 h-3" />{previewResult.validation.issues.length} Issue{previewResult.validation.issues.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* ── Tab Content ───────────────────────────────────────────── */}
            <div className="p-5">

              {/* ── TAB: Excel Sheet Preview ─────────────────────────────── */}
              {activeTab === "sheet" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Table2 className="w-4 h-4 text-violet-600" />
                      <span className="font-bold">Excel Sheet Preview</span>
                      <span className="text-gray-400">— exactly how your sheet will look after applying</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        PLAN rows show √ · ACT rows remain empty
                      </span>
                    </div>
                  </div>
                  <ExcelSheetPreview result={previewResult} />
                </div>
              )}

              {/* ── TAB: Per-Crane Detail ─────────────────────────────────── */}
              {activeTab === "cranes" && (
                <div className="divide-y divide-gray-50">
                  {previewResult.crane_preview.map((crane: CranePreview) => {
                    const isCrit = crane.type === "CRITICAL";
                    const gaps = (() => {
                      const sorted = [...crane.scheduled_days].sort((a, b) => a - b);
                      const g: number[] = [];
                      for (let i = 0; i < sorted.length - 1; i++) g.push(sorted[i + 1] - sorted[i]);
                      return g;
                    })();

                    return (
                      <div key={crane.crane} className="py-4 flex items-start gap-4">
                        {/* Type badge */}
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 mt-0.5",
                          isCrit ? "bg-violet-100 text-violet-700 border-violet-300" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          {isCrit ? "⭐ CRITICAL" : "NORMAL"}
                        </span>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-800">{crane.crane_no || crane.crane.split(" | ")[0]}</p>
                            {crane.location && <span className="text-xs text-gray-400">@ {crane.location}</span>}
                            <span className="text-xs text-gray-400">({crane.frequency}×/month)</span>
                          </div>
                          {/* Scheduled day pills */}
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {crane.scheduled_days.map((d) => (
                              <span key={d} className={cn(
                                "text-[11px] px-2.5 py-1 rounded-full font-bold border",
                                isCrit ? "bg-violet-100 text-violet-800 border-violet-300" : "bg-blue-50 text-blue-800 border-blue-200"
                              )}>
                                {DOW_FULL[getDow(previewResult.year, previewResult.month, d)]} {d}
                              </span>
                            ))}
                          </div>
                          {/* Gaps */}
                          {gaps.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-gray-400">Gaps:</span>
                              {gaps.map((g, gi) => (
                                <span key={gi} className={cn(
                                  "px-2 py-0.5 rounded-full font-semibold",
                                  g <= 1 ? "bg-red-100 text-red-700" : g <= 4 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                )}>
                                  +{g} days
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Mini calendar */}
                        <div className="flex-shrink-0 hidden md:block">
                          <div className="grid grid-cols-7 gap-0.5 w-44">
                            {DOW.map((d) => (
                              <div key={d} className="text-center text-[8px] text-gray-400 font-bold">{d}</div>
                            ))}
                            {Array.from({ length: getDow(previewResult.year, previewResult.month, 1) }).map((_, i) => (
                              <div key={`p${i}`} />
                            ))}
                            {Array.from({ length: previewResult.month_days }, (_, i) => i + 1).map((d) => {
                              const sched = crane.scheduled_days.includes(d);
                              return (
                                <div key={d} className={cn(
                                  "aspect-square flex items-center justify-center rounded text-[8px] font-bold",
                                  sched
                                    ? isCrit ? "bg-violet-600 text-white" : "bg-blue-500 text-white"
                                    : "text-gray-300"
                                )}>
                                  {sched ? "√" : d}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── TAB: Day-by-Day Summary ───────────────────────────────── */}
              {activeTab === "days" && (
                <div className="space-y-5">
                  {/* Load chart */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-violet-600" />
                      Daily PM Load — {previewResult.month_name} {previewResult.year}
                    </h4>
                    {renderLoadChart(previewResult.day_summary, previewResult.month_days, previewResult.max_cranes_per_day)}
                  </div>

                  {/* Coverage summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                    {[
                      { label: "Days Covered", value: `${previewResult.days_covered ?? previewResult.month_days}/${previewResult.month_days}`, pct: previewResult.coverage_pct ?? 100, color: (previewResult.coverage_pct ?? 100) === 100 ? "text-emerald-700" : "text-red-700", bg: (previewResult.coverage_pct ?? 100) === 100 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200" },
                      { label: "Critical/Day", value: `${previewResult.days_with_critical ?? previewResult.month_days}/${previewResult.month_days}`, pct: previewResult.critical_coverage_pct ?? 100, color: (previewResult.critical_coverage_pct ?? 100) === 100 ? "text-emerald-700" : "text-orange-700", bg: (previewResult.critical_coverage_pct ?? 100) === 100 ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200" },
                      { label: "Total PM Events", value: previewResult.total_pm_events, pct: 100, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
                      { label: "Validation", value: previewResult.validation.valid ? "✅ Passed" : `⚠️ ${previewResult.validation.issues.length} issues`, pct: previewResult.validation.valid ? 100 : 50, color: previewResult.validation.valid ? "text-emerald-700" : "text-orange-700", bg: previewResult.validation.valid ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200" },
                    ].map((s) => (
                      <div key={s.label} className={cn("rounded-xl border p-3", s.bg)}>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{s.label}</p>
                        <p className={cn("text-base font-bold mt-0.5", s.color)}>{s.value}</p>
                        <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", s.pct === 100 ? "bg-emerald-500" : s.pct >= 80 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(100, Number(s.pct))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Day table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Day</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Date</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Cranes Scheduled</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">Count</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">Critical</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">vs Cap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.day_summary.map((ds: DaySummary, idx: number) => {
                          const overCap = ds.count > previewResult.max_cranes_per_day;
                          const dow = getDow(previewResult.year, previewResult.month, ds.day);
                          const isWe = dow === 0 || dow === 6;
                          return (
                            <tr key={ds.day} className={cn(
                              "border-b border-gray-50",
                              overCap ? "bg-red-50" : isWe ? "bg-blue-50/30" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                            )}>
                              <td className="px-4 py-2.5 font-bold text-gray-800">
                                <span className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs",
                                  overCap ? "bg-red-500 text-white" :
                                  ds.is_critical_day ? "bg-violet-600 text-white" : "bg-blue-500 text-white"
                                )}>
                                  {ds.day}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-600">
                                {DOW_FULL[dow]}, {previewResult.month_name.slice(0, 3)} {ds.day}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {ds.cranes.map((c) => {
                                    const cp = previewResult.crane_preview.find((x) => x.crane === c);
                                    return (
                                      <span key={c} className={cn(
                                        "px-2 py-0.5 rounded-full font-semibold border text-[10px]",
                                        cp?.type === "CRITICAL"
                                          ? "bg-violet-100 text-violet-700 border-violet-300"
                                          : "bg-blue-50 text-blue-700 border-blue-200"
                                      )}>
                                        {cp?.crane_no || c.split(" | ")[0]}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full font-bold text-sm",
                                  overCap ? "bg-red-100 text-red-700" :
                                  ds.count === previewResult.max_cranes_per_day ? "bg-amber-100 text-amber-700" :
                                  "bg-emerald-100 text-emerald-700"
                                )}>
                                  {ds.count}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {overCap ? (
                                  <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">⚠️ OVER ({previewResult.max_cranes_per_day} cap)</span>
                                ) : ds.count === previewResult.max_cranes_per_day ? (
                                  <span className="text-[10px] font-bold text-amber-600">= cap</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600">✅ OK</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Validation issues */}
                  {previewResult.validation.issues.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />Validation Issues
                      </h4>
                      {previewResult.validation.issues.map((issue, i) => (
                        <div key={i} className={cn(
                          "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                          issue.startsWith("❌") ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}>
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {previewResult.validation.valid && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span><strong>All validation rules passed!</strong> No consecutive days, correct frequencies, balanced load, daily cap respected.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Apply / Download Actions ────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Save className="w-4 h-4 text-emerald-600" />
              Apply Schedule to Excel
            </h3>

            {applied ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">
                    ✅ Schedule Applied! {previewResult.cells_written} √ marks written to PLAN rows
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Sheet: <strong>{previewResult.sheet_name}</strong> — ACT rows, formatting, merged cells are completely untouched.
                  </p>

                  {/* Online-no-script notice */}
                  {previewResult.online && !previewResult.apps_script_used && previewResult.applied && (
                    <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <p className="font-bold mb-1">📥 Download & Re-upload to Google Sheets</p>
                        <p>
                          Apps Script is not configured, so the <strong>√ marks were written into
                          pm_scheduled.xlsx</strong> (a local copy). Click{" "}
                          <strong>"Download Scheduled Excel"</strong> below to get the file with all
                          √ marks, then upload it back to Google Sheets to apply the plan.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Online-with-script success */}
                  {previewResult.online && previewResult.apps_script_used && (
                    <div className="mt-3 flex items-center gap-2 bg-emerald-100 border border-emerald-300 rounded-xl px-4 py-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <p className="text-xs text-emerald-800 font-semibold">
                        ✅ Written directly to Google Sheets via Apps Script — all teammates can see the updated plan immediately.
                      </p>
                    </div>
                  )}

                  {/* Auto-navigate countdown */}
                  {applyCountdown !== null && (
                    <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                      <p className="text-xs text-blue-800 font-semibold">
                        Redirecting to Dashboard in <strong>{applyCountdown}s</strong> to view the updated schedule…
                      </p>
                      <button
                        onClick={() => { setApplyCountdown(null); onGoToDashboard(); }}
                        className="ml-auto text-xs font-bold text-blue-700 hover:text-blue-900 underline whitespace-nowrap"
                      >
                        Go now →
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 mt-3 flex-wrap">
                    <button
                      onClick={() => { setApplyCountdown(null); onGoToDashboard(); }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      <ArrowRight className="w-4 h-4" />View in Dashboard
                    </button>
                    <button
                      onClick={handleDownloadPreview}
                      disabled={isDownloading}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all",
                        isDownloading
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      )}
                    >
                      {isDownloading
                        ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating…</>
                        : <><Download className="w-4 h-4" />Download Excel (with √ marks)</>}
                    </button>
                    <button
                      onClick={() => pmApi.downloadScheduled()}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      <Download className="w-4 h-4" />Download Applied Copy (pm_scheduled.xlsx)
                    </button>
                    <button onClick={() => { setPreviewResult(null); setApplied(false); setApplyCountdown(null); }}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                      <RefreshCw className="w-4 h-4" />Generate New Schedule
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Preview shown above.</strong> Clicking "Apply to Excel" will write √ tick marks into the PLAN rows of sheet{" "}
                    <strong>"{previewResult.sheet_name}"</strong> only on scheduled days.
                    ACT rows, cell colors, merged cells, and all formatting remain completely unchanged.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  <button
                    onClick={handleApply}
                    disabled={isApplying}
                    className={cn(
                      "flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all shadow-sm",
                      !isApplying
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isApplying
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Applying √ marks…</>
                      : <><Save className="w-4 h-4" /> Apply Schedule → Write √ to Excel (Server)</>}
                  </button>
                  <button
                    onClick={handleDownloadPreview}
                    disabled={isDownloading}
                    className={cn(
                      "flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all shadow-md",
                      isDownloading
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]"
                    )}
                  >
                    {isDownloading
                      ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating…</>
                      : <><Download className="w-4 h-4" />⬇ Download Excel with √ Marks</>}
                  </button>
                  <button onClick={() => pmApi.downloadExcel()}
                    className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-gray-600 border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">
                    <Download className="w-4 h-4" />Download Original (No Changes)
                  </button>
                </div>
                <div className="mt-3 space-y-1.5 text-[11px] text-gray-500">
                  <p>⬇ <strong>Download Excel with √ Marks</strong> — instantly get the Excel file with all planned √ ticks added. No server files are modified.</p>
                  <p>✅ <strong>Apply to Excel (Server)</strong> — writes √ tick marks into PLAN rows on the server copy. ACT rows, colors, merged cells and all formatting remain untouched.</p>
                  {previewResult.online && <p>🌐 <strong>Online mode:</strong> Download the Excel file and upload it to Google Sheets to share the schedule with your team.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
