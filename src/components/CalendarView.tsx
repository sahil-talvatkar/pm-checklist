import React, { useState } from "react";
import { CalendarData, CalendarDayCell, CalendarEquipmentRow } from "../types/pm";
import { cn } from "../utils/cn";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Hash,
} from "lucide-react";

interface CalendarViewProps {
  calendarData: CalendarData;
  onTaskClick?: (equipment: string, day: number, cell: CalendarDayCell, row: CalendarEquipmentRow) => void;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_ABBR = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Map Excel fill hex → Tailwind-compatible inline style for cell background
// We use inline style so any of the 15 codes gets its exact color
function getActCellInlineStyle(actValue: string, isPlanned: boolean, isToday: boolean, status: string): React.CSSProperties {
  if (!isPlanned) return { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6" };

  const v = actValue?.trim() ?? "";

  // Color map: value → { bg hex, text hex }
  const COLOR_MAP: Record<string, { bg: string; text: string }> = {
    "√":       { bg: "#C6EFCE", text: "#276221" },
    "SHUTDOWN":{ bg: "#FFFF00", text: "#7D6608" },
    "√+S":     { bg: "#FFD700", text: "#7D6608" },
    "BD":      { bg: "#FF0000", text: "#FFFFFF" },
    "√+BD":    { bg: "#FF6666", text: "#7B0000" },
    "B.C":     { bg: "#BDD7EE", text: "#1F4E79" },
    "C":       { bg: "#D9D2E9", text: "#20124D" },
    "W.R":     { bg: "#D9D9D9", text: "#000000" },
    "T":       { bg: "#D9EAD3", text: "#0C343D" },
    "W":       { bg: "#CFE2F3", text: "#0D3349" },
    "O":       { bg: "#FFF2CC", text: "#7D4E00" },
    "F":       { bg: "#EAD1DC", text: "#4A235A" },
    "M":       { bg: "#FCE5CD", text: "#7F4800" },
    "L":       { bg: "#D9EAD3", text: "#274E13" },
    "L.N":     { bg: "#F4CCCC", text: "#660000" },
  };

  // If no act value yet (pending or overdue)
  if (!v) {
    if (status === "Overdue") {
      // Past day, planned but not done → orange highlight
      return { backgroundColor: "#FFF7ED", borderColor: "#FB923C", outline: "2px solid #F97316" };
    }
    if (status === "Pending") {
      return isToday
        ? { backgroundColor: "#DBEAFE", borderColor: "#3B82F6", outline: "2px solid #3B82F6" }
        : { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" };
    }
    return { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" };
  }

  // Check exact match first
  if (COLOR_MAP[v]) {
    const c = COLOR_MAP[v];
    return {
      backgroundColor: c.bg,
      color: c.text,
      borderColor: c.bg,
      fontWeight: 700,
    };
  }

  // √/2 style partial match
  if (v.startsWith("√")) {
    return { backgroundColor: "#C6EFCE", color: "#276221", borderColor: "#C6EFCE", fontWeight: 700 };
  }

  // Unknown code — orange tint
  return { backgroundColor: "#FCE5CD", color: "#7F4800", borderColor: "#FCE5CD", fontWeight: 700 };
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

function getEquipStats(equipRow: CalendarEquipmentRow, todayDay?: number) {
  const planned   = equipRow.days.filter((d) => d.is_planned);
  const completed = planned.filter((d) =>
    d.status === "Completed" || (d.act && (d.act.startsWith("√") || d.act.trim() !== ""))
  );
  const overdue = planned.filter((d) => {
    if (d.status === "Overdue") return true;
    if (todayDay && d.day < todayDay && !d.act && d.status !== "Completed") return true;
    return false;
  });
  const pending = planned.filter((d) =>
    d.status === "Pending" &&
    !d.act &&
    !(todayDay && d.day < todayDay)
  );
  return { planned: planned.length, completed: completed.length, overdue: overdue.length, pending: pending.length };
}

export const CalendarView: React.FC<CalendarViewProps> = ({ calendarData, onTaskClick }) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [showLegend, setShowLegend]     = useState(true);

  const { calendar_matrix, day_columns, month, year, today_day } = calendarData;

  const toggleExpand = (key: string) =>
    setExpandedRows((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );

  // Overall stats — pass today_day so overdue is counted correctly
  const totalPlanned   = calendar_matrix.reduce((s, eq) => s + getEquipStats(eq, today_day).planned, 0);
  const totalCompleted = calendar_matrix.reduce((s, eq) => s + getEquipStats(eq, today_day).completed, 0);
  const totalOverdue   = calendar_matrix.reduce((s, eq) => s + getEquipStats(eq, today_day).overdue, 0);
  const totalPending   = calendar_matrix.reduce((s, eq) => s + getEquipStats(eq, today_day).pending, 0);
  const completionPct  = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-violet-700 to-purple-700 rounded-xl px-6 py-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Monthly PM Calendar</h2>
              <p className="text-purple-200 text-sm mt-0.5">
                {MONTH_NAMES[month - 1]} {year} — Crane Preventive Maintenance Schedule
              </p>
              <p className="text-purple-300 text-xs mt-0.5 font-mono">
                Format: SL.NO | CRANE NO | LOCATION | PLAN/ACT rows
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex-shrink-0 min-w-[220px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-purple-200">Monthly Completion</span>
              <span className="text-sm font-bold text-white">{completionPct}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-xs text-purple-200 mt-1">
              {totalCompleted} / {totalPlanned} planned tasks done
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Cranes",         value: calendar_matrix.length, color: "bg-white/20"        },
            { label: "Total Planned",  value: totalPlanned,            color: "bg-white/20"        },
            { label: "Completed",      value: totalCompleted,          color: "bg-emerald-500/30"  },
            { label: "Overdue",        value: totalOverdue,            color: "bg-orange-500/30"   },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl px-3 py-2 text-center", s.color)}>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-purple-200 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowLegend((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Calendar Legend & Format Guide</span>
          </div>
          {showLegend
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>
        {showLegend && (
          <div className="px-5 pb-4 pt-2 border-t border-gray-100 space-y-4">

            {/* All 15 code swatches */}
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">📋 ACT Code Color Legend (all codes written to Excel with matching cell color):</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { value: "√",        label: "PM Done",         bg: "#C6EFCE", text: "#276221" },
                  { value: "SHUTDOWN", label: "Major Shutdown",  bg: "#FFFF00", text: "#7D6608" },
                  { value: "√+S",      label: "Shutdown & PM",   bg: "#FFD700", text: "#7D6608" },
                  { value: "BD",       label: "Breakdown",       bg: "#FF0000", text: "#FFFFFF" },
                  { value: "√+BD",     label: "Breakdown & PM",  bg: "#FF6666", text: "#7B0000" },
                  { value: "B.C",      label: "Barrel Coupling", bg: "#BDD7EE", text: "#1F4E79" },
                  { value: "C",        label: "Compound",        bg: "#D9D2E9", text: "#20124D" },
                  { value: "W.R",      label: "Wire Rope",       bg: "#D9D9D9", text: "#000000" },
                  { value: "T",        label: "Tong",            bg: "#D9EAD3", text: "#0C343D" },
                  { value: "W",        label: "Wheel",           bg: "#CFE2F3", text: "#0D3349" },
                  { value: "O",        label: "Oil",             bg: "#FFF2CC", text: "#7D4E00" },
                  { value: "F",        label: "Floating Shaft",  bg: "#EAD1DC", text: "#4A235A" },
                  { value: "M",        label: "Motor",           bg: "#FCE5CD", text: "#7F4800" },
                  { value: "L",        label: "Liner",           bg: "#D9EAD3", text: "#274E13" },
                  { value: "L.N",      label: "Lock Nut",        bg: "#F4CCCC", text: "#660000" },
                ].map((item) => (
                  <div
                    key={item.value}
                    className="flex items-center gap-2 p-1.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div
                      className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center text-xs font-black flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: item.bg, color: item.text }}
                    >
                      {item.value.length > 3 ? item.value.slice(0, 3) : item.value}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-700 font-mono">{item.value}</p>
                      <p className="text-[9px] text-gray-400 truncate">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Pending (no ACT)",   bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5", symbol: "—"  },
                { label: "Today's Column",      bg: "#DBEAFE", text: "#2563EB", border: "#3B82F6", symbol: "▶"  },
                { label: "No PM Scheduled",     bg: "#F9FAFB", text: "#CBD5E1", border: "#F3F4F6", symbol: ""   },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-md border-2 flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: item.bg, color: item.text, borderColor: item.border }}
                  >
                    {item.symbol}
                  </div>
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              💡 <strong>Click any ACT cell</strong> to open the code selector dropdown. Choose the correct PM code and it will be written to your Excel file with the matching cell color.
            </p>
          </div>
        )}
      </div>

      {/* ── Calendar Grid ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: `${Math.max(900, day_columns.length * 42 + 420)}px` }}>
            <thead>
              {/* Column header row */}
              <tr className="bg-gray-800 text-white">
                {/* Fixed columns */}
                <th className="sticky left-0 z-20 bg-gray-800 px-3 py-3 text-center text-xs font-bold uppercase border-r border-gray-600 w-12">
                  <Hash className="w-3.5 h-3.5 mx-auto" />
                  <div className="text-[9px] font-semibold mt-0.5">SL.NO</div>
                </th>
                <th className="sticky left-12 z-20 bg-gray-800 px-3 py-3 text-left text-xs font-bold uppercase border-r border-gray-600 min-w-[180px]">
                  Crane No
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-gray-600 min-w-[80px]">
                  Location
                </th>
                <th className="px-2 py-3 text-xs font-bold uppercase border-r border-gray-600 min-w-[60px] text-center">
                  Row
                </th>

                {/* Day columns */}
                {day_columns.map((day) => {
                  const isToday  = day === today_day;
                  const dow      = getDayOfWeek(year, month, day);
                  const isWeekend = dow === 0 || dow === 6;
                  return (
                    <th
                      key={day}
                      className={cn(
                        "px-0.5 py-2 text-center min-w-[38px] border-r border-gray-600",
                        isToday   && "bg-blue-600",
                        !isToday  && isWeekend  && "bg-gray-700",
                        !isToday  && !isWeekend && "bg-gray-800"
                      )}
                    >
                      <div className="text-[9px] font-medium text-gray-300">{DAY_ABBR[dow]}</div>
                      <div className={cn("text-sm font-bold", isToday ? "text-white" : "text-gray-200")}>
                        {day}
                      </div>
                      {isToday && (
                        <div className="text-[8px] font-bold text-blue-200 mt-0.5">TODAY</div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {calendar_matrix.map((equipRow) => {
                const stats          = getEquipStats(equipRow, today_day);
                const isExpanded     = expandedRows.includes(equipRow.equipment);
                const rowPct         = stats.planned > 0
                  ? Math.round((stats.completed / stats.planned) * 100)
                  : 0;

                return (
                  <React.Fragment key={equipRow.equipment}>
                    {/* ── Equipment Row ──────────────────────────────────── */}
                    <tr className="hover:bg-gray-50/60 transition-colors group">

                      {/* SL.NO */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/60 px-2 py-0 border-r border-gray-200 text-center w-12">
                        <div className="py-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                            {equipRow.sl_no || "—"}
                          </span>
                        </div>
                      </td>

                      {/* CRANE NO */}
                      <td
                        className="sticky left-12 z-10 bg-white group-hover:bg-gray-50/60 px-3 py-0 border-r border-gray-200 cursor-pointer min-w-[180px]"
                        onClick={() => toggleExpand(equipRow.equipment)}
                      >
                        <div className="flex items-start gap-2 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 leading-tight truncate">
                              {equipRow.crane_no || equipRow.equipment}
                            </p>
                            {/* Mini progress bar */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    rowPct >= 80 ? "bg-emerald-500" :
                                    rowPct >= 50 ? "bg-amber-500"   : "bg-red-500"
                                  )}
                                  style={{ width: `${rowPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-gray-400 font-semibold flex-shrink-0">{rowPct}%</span>
                            </div>
                            <div className="flex gap-2 mt-1 text-[9px] font-semibold">
                              <span className="text-emerald-600">✓{stats.completed}</span>
                              <span className="text-red-500">◷{stats.pending}</span>
                              {stats.overdue > 0 && <span className="text-orange-500">⚠{stats.overdue}</span>}
                            </div>
                          </div>
                          <button className="flex-shrink-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            {isExpanded
                              ? <ChevronUp   className="w-3.5 h-3.5 text-gray-400" />
                              : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="px-3 py-0 border-r border-gray-200 min-w-[80px]">
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {equipRow.location || "—"}
                        </span>
                      </td>

                      {/* PLAN/ACT label column */}
                      <td className="px-1 py-1 border-r border-gray-200 text-center min-w-[60px]">
                        <div className="flex flex-col gap-0.5 items-center">
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded w-full text-center">
                            PLAN
                          </span>
                          <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded w-full text-center">
                            ACT
                          </span>
                        </div>
                      </td>

                      {/* Day cells */}
                      {equipRow.days.map((cell) => {
                        const isToday    = cell.day === today_day;
                        const actStyle   = getActCellInlineStyle(cell.act, cell.is_planned, isToday, cell.status);
                        // Cannot click if: already has an ACT value written, OR completed
                        const canClick   = cell.is_planned && !cell.act && cell.status !== "Completed";

                        return (
                          <td
                            key={cell.day}
                            className={cn(
                              "px-0.5 py-1 border-r border-gray-100",
                              isToday && "bg-blue-50/40"
                            )}
                          >
                            <div className="flex flex-col gap-0.5 items-center">
                              {/* PLAN cell */}
                              <div className={cn(
                                "w-full h-7 flex items-center justify-center rounded text-[11px] font-bold border transition-all",
                                cell.is_planned
                                  ? "bg-purple-50 border-purple-200 text-purple-700"
                                  : "bg-gray-50 border-gray-100 text-gray-200"
                              )}>
                                {cell.plan || (cell.is_planned ? "√" : "")}
                              </div>

                              {/* ACT cell — inline colored by code */}
                              <div
                                onClick={() => {
                                  if (canClick) {
                                    onTaskClick?.(equipRow.equipment, cell.day, cell, equipRow);
                                  }
                                }}
                                className={cn(
                                  "w-full h-7 flex items-center justify-center rounded text-[11px] border transition-all",
                                  canClick && "cursor-pointer hover:opacity-80 hover:shadow-md active:scale-95",
                                  !canClick && cell.is_planned && "cursor-default",
                                  !cell.is_planned && "cursor-default"
                                )}
                                style={actStyle}
                                title={
                                  cell.is_planned
                                    ? `Crane: ${equipRow.crane_no || equipRow.equipment}\nLocation: ${equipRow.location}\nDay ${cell.day} | Plan: ${cell.plan || "√"} | Act: ${cell.act || "—"} | Status: ${cell.status}${canClick ? "\n▶ Click to update" : ""}`
                                    : ""
                                }
                              >
                                {cell.act
                                  ? <span className="font-black text-[10px]">{cell.act}</span>
                                  : cell.is_planned
                                    ? <span style={{ color: "#CBD5E1" }}>—</span>
                                    : null
                                }
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* ── Expanded Stats Row ─────────────────────────────── */}
                    {isExpanded && (
                      <tr className="bg-violet-50/60 border-t border-violet-100">
                        <td className="sticky left-0 z-10 bg-violet-50/60 px-2 py-2 border-r border-violet-100" />
                        <td className="sticky left-12 z-10 bg-violet-50/60 px-3 py-2 border-r border-violet-100">
                          <p className="text-[9px] font-bold text-violet-600 uppercase tracking-wide">Monthly Summary</p>
                        </td>
                        <td colSpan={2} className="px-3 py-2 border-r border-violet-100">
                          <p className="text-[9px] text-violet-500 font-semibold">{equipRow.crane_no}</p>
                          <p className="text-[9px] text-violet-400">{equipRow.location}</p>
                        </td>
                        <td colSpan={day_columns.length} className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: "Planned",   v: stats.planned,   icon: <Calendar     className="w-3 h-3" />, cls: "text-violet-700 bg-violet-100" },
                              { label: "Completed", v: stats.completed, icon: <CheckCircle2 className="w-3 h-3" />, cls: "text-emerald-700 bg-emerald-100" },
                              { label: "Pending",   v: stats.pending,   icon: <Clock        className="w-3 h-3" />, cls: "text-red-700 bg-red-100" },
                              { label: "Overdue",   v: stats.overdue,   icon: <AlertTriangle className="w-3 h-3" />, cls: "text-orange-700 bg-orange-100" },
                              { label: "Rate",      v: `${rowPct}%`,    icon: null,                                   cls: "text-blue-700 bg-blue-100" },
                            ].map((s) => (
                              <div key={s.label} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold", s.cls)}>
                                {s.icon}
                                {s.label}: <strong>{s.v}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* ── Totals Footer ─────────────────────────────────────────────── */}
            <tfoot className="border-t-2 border-gray-300 bg-gray-50">
              <tr>
                <td className="sticky left-0 z-10 bg-gray-50 px-2 py-3 border-r border-gray-200 text-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase">Total</span>
                </td>
                <td className="sticky left-12 z-10 bg-gray-50 px-3 py-3 border-r border-gray-200">
                  <p className="text-xs font-bold text-gray-700">Monthly Totals</p>
                  <p className="text-[10px] text-gray-500">{calendar_matrix.length} cranes</p>
                </td>
                <td className="px-3 py-3 border-r border-gray-200">
                  <p className="text-[10px] text-gray-500">
                    ✓{totalCompleted} / {totalPlanned}
                  </p>
                </td>
                <td className="px-2 py-3 border-r border-gray-200">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-purple-700">PLAN</span>
                    <span className="text-[9px] font-bold text-teal-700">ACT</span>
                  </div>
                </td>
                {day_columns.map((day) => {
                  const dayPlanned   = calendar_matrix.filter((eq) => eq.days.find((d) => d.day === day)?.is_planned).length;
                  const dayCompleted = calendar_matrix.filter((eq) => {
                    const d = eq.days.find((c) => c.day === day);
                    return d?.is_planned && d.status === "Completed";
                  }).length;
                  const isToday = day === today_day;

                  return (
                    <td
                      key={day}
                      className={cn(
                        "px-0.5 py-3 text-center border-r border-gray-100",
                        isToday && "bg-blue-50"
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={cn("text-[10px] font-bold", dayPlanned > 0 ? "text-purple-700" : "text-gray-200")}>
                          {dayPlanned || ""}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold",
                          dayCompleted > 0  ? "text-emerald-700" :
                          dayPlanned > 0    ? "text-red-400"     : "text-gray-200"
                        )}>
                          {dayPlanned > 0 ? dayCompleted : ""}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom hint */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <p className="text-xs text-gray-500">
            💡 <strong>Click any ACT cell</strong> to mark that PM as completed and write √ back to your Excel sheet.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Completed: {totalCompleted}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              Pending: {totalPending}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
              Overdue: {totalOverdue}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
