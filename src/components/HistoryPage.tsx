/**
 * HistoryPage.tsx — Full PM History Log
 * ──────────────────────────────────────
 * Shows ALL records: Completed, Overdue, Pending
 * Columns exactly match the Excel sheet format:
 *   SL.NO | CRANE NO | LOCATION | DATE | DAY | PLAN | ACT | COMPLETED BY | COMPLETED ON | COMMENT | STATUS
 *
 * Completed_On is shown as the ACTUAL date when the task was ticked off —
 * read from the cell comment written by update_calendar_excel().
 */

import React, { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { HistoryRecord } from "../types/pm";
import { ACT_CODE_MAP, getActCodeStyle } from "../types/pm";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
  History,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  User,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  RefreshCw,
  ClipboardList,
  TrendingUp,
  FileSpreadsheet,
  MapPin,
  Hash,
  Tag,
  AlertTriangle,
  BarChart3,
  X,
  Circle,
  CheckCheck,
} from "lucide-react";
import { cn } from "../utils/cn";

interface HistoryPageProps {
  records: HistoryRecord[];
  isLoading: boolean;
  onRefresh: () => void;
}

// ── ACT Value Badge ───────────────────────────────────────────────────────────
const ActBadge: React.FC<{ value: string }> = ({ value }) => {
  if (!value || value === "—") {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  const style = getActCodeStyle(value);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border",
        style.color,
        style.textColor,
        style.borderColor
      )}
    >
      {value}
    </span>
  );
};

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, string> = {
    Completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Overdue:   "bg-orange-100  text-orange-800  border-orange-300",
    Pending:   "bg-red-100     text-red-800     border-red-300",
  };
  const icon: Record<string, string> = {
    Completed: "✅",
    Overdue:   "⚠️",
    Pending:   "🔴",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap",
        cfg[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
      )}
    >
      {icon[status] ?? "•"} {status}
    </span>
  );
};

// ── Date helpers ──────────────────────────────────────────────────────────────
function safeParseISO(s: string | undefined) {
  if (!s) return null;
  try {
    return parseISO(s.length === 10 ? s + "T00:00:00" : s);
  } catch {
    return null;
  }
}

function getDateLabel(dateStr: string): string {
  const d = safeParseISO(dateStr);
  if (!d) return dateStr;
  if (isToday(d))     return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM dd, yyyy");
}

function formatDate(dateStr: string | undefined, fmt = "dd-MMM-yyyy"): string {
  if (!dateStr) return "—";
  const d = safeParseISO(dateStr);
  if (!d) return dateStr;
  try { return format(d, fmt); } catch { return dateStr; }
}

function getDayOfWeek(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const d = safeParseISO(dateStr);
  if (!d) return "—";
  try { return format(d, "EEE"); } catch { return "—"; }
}

// ── Excel Export ──────────────────────────────────────────────────────────────
function exportToExcel(records: HistoryRecord[]) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Full PM Log ──────────────────────────────────────────────────
  const header = [
    "SL.NO", "CRANE NO", "LOCATION",
    "DATE", "DAY",
    "PLAN", "ACT VALUE",
    "COMPLETED BY", "COMPLETED ON",
    "COMMENT", "STATUS", "SHEET",
  ];

  const rows = records.map((r, i) => [
    r.SL_NO || i + 1,
    r.Crane_No  || r.Equipment_Name || "—",
    r.Location  || "—",
    formatDate(r.Due_Date),
    getDayOfWeek(r.Due_Date),
    "√",                                 // PLAN is always √ when it exists
    r.Act_Value || (r.Status === "Completed" ? "√" : ""),
    r.Completed_By  || "—",
    r.Completed_On  ? formatDate(r.Completed_On) : "—",
    r.Comment       || "",
    r.Status,
    r.Sheet_Name    || "—",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [
    { wch: 8  }, // SL.NO
    { wch: 22 }, // CRANE NO
    { wch: 18 }, // LOCATION
    { wch: 14 }, // DATE
    { wch: 6  }, // DAY
    { wch: 8  }, // PLAN
    { wch: 12 }, // ACT VALUE
    { wch: 18 }, // COMPLETED BY
    { wch: 15 }, // COMPLETED ON
    { wch: 35 }, // COMMENT
    { wch: 12 }, // STATUS
    { wch: 16 }, // SHEET
  ];
  XLSX.utils.book_append_sheet(wb, ws, "PM History");

  // ── Sheet 2: Monthly Summary ──────────────────────────────────────────────
  const monthGroups: Record<string, HistoryRecord[]> = {};
  records.forEach((r) => {
    const key = r.Due_Date ? formatDate(r.Due_Date, "MMM-yyyy") : "Unknown";
    (monthGroups[key] = monthGroups[key] || []).push(r);
  });

  const summaryHeader = ["Month", "Total PMs", "Completed", "Overdue", "Pending", "Completion %"];
  const summaryRows = Object.entries(monthGroups).map(([m, recs]) => {
    const completed = recs.filter((r) => r.Status === "Completed").length;
    const overdue   = recs.filter((r) => r.Status === "Overdue").length;
    const pending   = recs.filter((r) => r.Status === "Pending").length;
    return [
      m, recs.length, completed, overdue, pending,
      recs.length > 0 ? `${Math.round((completed / recs.length) * 100)}%` : "0%",
    ];
  });
  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
  wsSummary["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Monthly Summary");

  // ── Sheet 3: Crane Summary ────────────────────────────────────────────────
  const craneGroups: Record<string, HistoryRecord[]> = {};
  records.forEach((r) => {
    const key = r.Crane_No || r.Equipment_Name || "Unknown";
    (craneGroups[key] = craneGroups[key] || []).push(r);
  });

  const craneHeader = [
    "SL.NO", "CRANE NO", "LOCATION",
    "Total PMs", "Completed", "Overdue", "Pending",
    "Last PM Date", "Last ACT Code",
  ];
  const craneRows = Object.entries(craneGroups).map(([crane, recs], i) => {
    const completed = recs.filter((r) => r.Status === "Completed").length;
    const overdue   = recs.filter((r) => r.Status === "Overdue").length;
    const pending   = recs.filter((r) => r.Status === "Pending").length;
    const last      = recs[recs.length - 1];
    return [
      i + 1, crane,
      recs[0]?.Location || "—",
      recs.length, completed, overdue, pending,
      last?.Due_Date ? formatDate(last.Due_Date) : "—",
      last?.Act_Value || "—",
    ];
  });
  const wsCrane = XLSX.utils.aoa_to_sheet([craneHeader, ...craneRows]);
  wsCrane["!cols"] = [
    { wch: 8 }, { wch: 22 }, { wch: 18 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 16 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCrane, "Crane Summary");

  XLSX.writeFile(wb, `PM_History_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`);
}

// ── Expanded Row Detail ───────────────────────────────────────────────────────
const ExpandedDetail: React.FC<{
  record: HistoryRecord;
  onClose: () => void;
}> = ({ record, onClose }) => (
  <tr>
    <td colSpan={13} className="p-0 border-b border-indigo-100">
      <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/60 px-6 py-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Full Record Details
          </p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">PM ID</p>
            <p className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded break-all">
              {record.PM_ID}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">ACT Code</p>
            <ActBadge value={record.Act_Value || "—"} />
            {record.Act_Value && ACT_CODE_MAP[record.Act_Value] && (
              <p className="text-[10px] text-gray-400 mt-1">
                {ACT_CODE_MAP[record.Act_Value].description}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Completed By</p>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                {record.Completed_By ? record.Completed_By[0]?.toUpperCase() : "?"}
              </div>
              <p className="text-xs text-gray-700">{record.Completed_By || "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Completed On</p>
            <p className="text-xs text-gray-700 font-medium">
              {record.Completed_On ? formatDate(record.Completed_On, "dd-MMM-yyyy") : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Comment</p>
            <p className="text-xs text-gray-600 italic bg-white rounded-lg px-2 py-1.5 border border-purple-100">
              {record.Comment ? `"${record.Comment}"` : "No comment"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Sheet Name</p>
            <p className="text-xs text-indigo-700 font-semibold">{record.Sheet_Name || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Due Date</p>
            <p className="text-xs text-gray-700">{formatDate(record.Due_Date)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Equipment Key</p>
            <p className="text-xs text-gray-600 break-all">{record.Equipment_Name}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</p>
            <StatusPill status={record.Status} />
          </div>
        </div>
      </div>
    </td>
  </tr>
);

// ── Monthly Bar Chart ─────────────────────────────────────────────────────────
const MonthlyChart: React.FC<{ records: HistoryRecord[] }> = ({ records }) => {
  const data = useMemo(() => {
    const groups: Record<string, { c: number; o: number; p: number }> = {};
    records.forEach((r) => {
      const key = r.Due_Date ? formatDate(r.Due_Date, "MMM yy") : "?";
      if (!groups[key]) groups[key] = { c: 0, o: 0, p: 0 };
      if (r.Status === "Completed") groups[key].c++;
      else if (r.Status === "Overdue") groups[key].o++;
      else groups[key].p++;
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [records]);

  if (!data.length) return null;
  const max = Math.max(...data.map(([, v]) => v.c + v.o + v.p), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-purple-600" />
        Monthly PM Activity Trend
        <span className="ml-auto flex items-center gap-3 text-[10px] font-normal text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />Completed</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" />Overdue</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-300 inline-block" />Pending</span>
        </span>
      </h4>
      <div className="flex items-end gap-1.5 h-20">
        {data.map(([month, v]) => {
          const total = v.c + v.o + v.p;
          return (
            <div key={month} className="flex-1 flex flex-col items-center gap-0.5" title={`${month}: ${v.c} completed, ${v.o} overdue, ${v.p} pending`}>
              <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${(total / max) * 68}px`, minHeight: "2px" }}>
                <div className="bg-emerald-400 w-full" style={{ height: `${(v.c / total) * 100}%` }} />
                <div className="bg-orange-400 w-full" style={{ height: `${(v.o / total) * 100}%` }} />
                <div className="bg-red-300 w-full"    style={{ height: `${(v.p / total) * 100}%` }} />
              </div>
              <span className="text-[8px] text-gray-400 leading-none">{month.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export const HistoryPage: React.FC<HistoryPageProps> = ({
  records, isLoading, onRefresh,
}) => {
  const [searchQuery,     setSearchQuery]     = useState("");
  const [filterCraneNo,   setFilterCraneNo]   = useState("");
  const [filterLocation,  setFilterLocation]  = useState("");
  const [filterActCode,   setFilterActCode]   = useState("");
  const [filterStatus,    setFilterStatus]    = useState("");
  const [filterMonth,     setFilterMonth]     = useState("");
  const [expandedRows,    setExpandedRows]    = useState<Set<string>>(new Set());
  const [viewMode,        setViewMode]        = useState<"table" | "timeline">("table");
  const [sortField,       setSortField]       = useState<"date" | "crane" | "location" | "status">("date");
  const [sortDir,         setSortDir]         = useState<"asc" | "desc">("desc");

  // ── Filter options ────────────────────────────────────────────────────────
  const craneOptions    = useMemo(() => [...new Set(records.map((r) => r.Crane_No  || r.Equipment_Name).filter(Boolean))].sort(), [records]);
  const locationOptions = useMemo(() => [...new Set(records.map((r) => r.Location).filter(Boolean))].sort(),                        [records]);
  const actCodeOptions  = useMemo(() => [...new Set(records.map((r) => r.Act_Value).filter(Boolean))].sort(),                       [records]);
  const monthOptions    = useMemo(() => {
    const s = new Set<string>();
    records.forEach((r) => { if (r.Due_Date) { try { s.add(formatDate(r.Due_Date, "MMM-yyyy")); } catch {} } });
    return [...s].sort();
  }, [records]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     records.length,
    completed: records.filter((r) => r.Status === "Completed").length,
    overdue:   records.filter((r) => r.Status === "Overdue").length,
    pending:   records.filter((r) => r.Status === "Pending").length,
    cranes:    new Set(records.map((r) => r.Crane_No || r.Equipment_Name).filter(Boolean)).size,
    todayDone: records.filter((r) => {
      try { return r.Due_Date && isToday(parseISO(r.Due_Date + "T00:00:00")) && r.Status === "Completed"; }
      catch { return false; }
    }).length,
  }), [records]);

  // ── Filtered + sorted ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let result = records.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchQ =
        !q ||
        (r.Crane_No  || "").toLowerCase().includes(q) ||
        (r.Location  || "").toLowerCase().includes(q) ||
        (r.SL_NO     || "").toLowerCase().includes(q) ||
        (r.PM_ID     || "").toLowerCase().includes(q) ||
        (r.Completed_By || "").toLowerCase().includes(q) ||
        (r.Comment   || "").toLowerCase().includes(q);

      const matchCrane  = !filterCraneNo  || (r.Crane_No  || r.Equipment_Name) === filterCraneNo;
      const matchLoc    = !filterLocation || r.Location   === filterLocation;
      const matchAct    = !filterActCode  || r.Act_Value  === filterActCode;
      const matchStatus = !filterStatus   || r.Status     === filterStatus;
      const matchMonth  = !filterMonth    || (() => {
        try { return r.Due_Date && formatDate(r.Due_Date, "MMM-yyyy") === filterMonth; }
        catch { return false; }
      })();

      return matchQ && matchCrane && matchLoc && matchAct && matchStatus && matchMonth;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if      (sortField === "date")     cmp = (a.Due_Date  || "").localeCompare(b.Due_Date  || "");
      else if (sortField === "crane")    cmp = (a.Crane_No  || a.Equipment_Name || "").localeCompare(b.Crane_No || b.Equipment_Name || "");
      else if (sortField === "location") cmp = (a.Location  || "").localeCompare(b.Location  || "");
      else if (sortField === "status") {
        const order = { Completed: 0, Overdue: 1, Pending: 2 };
        cmp = (order[a.Status] ?? 3) - (order[b.Status] ?? 3);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [records, searchQuery, filterCraneNo, filterLocation, filterActCode, filterStatus, filterMonth, sortField, sortDir]);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const resetFilters = () => {
    setSearchQuery(""); setFilterCraneNo(""); setFilterLocation("");
    setFilterActCode(""); setFilterStatus(""); setFilterMonth("");
  };

  // ── Timeline grouping ─────────────────────────────────────────────────────
  const timelineGroups = useMemo(() => {
    const groups: Record<string, HistoryRecord[]> = {};
    filteredRecords.forEach((r) => {
      const key = r.Due_Date || r.timestamp?.split("T")[0] || "Unknown";
      (groups[key] = groups[key] || []).push(r);
    });
    return Object.entries(groups).sort(([a], [b]) =>
      sortDir === "desc" ? b.localeCompare(a) : a.localeCompare(b)
    );
  }, [filteredRecords, sortDir]);

  // ── Sort header helper ────────────────────────────────────────────────────
  const SortTh: React.FC<{ field: typeof sortField; children: React.ReactNode; className?: string }> = ({
    field, children, className,
  }) => (
    <th
      className={cn("px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group", className)}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <span className={cn("text-[9px] transition-opacity", sortField === field ? "opacity-100" : "opacity-0 group-hover:opacity-40")}>
          {sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "▼"}
        </span>
      </span>
    </th>
  );

  // ── Row background by status ──────────────────────────────────────────────
  function rowBg(status: string, idx: number) {
    if (status === "Completed") return "bg-emerald-50/40 hover:bg-emerald-50";
    if (status === "Overdue")   return "bg-orange-50/40  hover:bg-orange-50";
    return idx % 2 === 0 ? "bg-white hover:bg-red-50/30" : "bg-gray-50/40 hover:bg-red-50/30";
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-purple-100 rounded-full" />
            <div className="w-14 h-14 border-4 border-purple-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-gray-500 font-medium">Loading History Records…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header Banner ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-xl px-6 py-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">PM History Log</h2>
              <p className="text-purple-200 text-sm mt-0.5">
                All PM records — Completed, Overdue & Pending · Exact Excel sheet format
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-white/15 hover:bg-white/25 rounded-lg transition-all border border-white/20"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => exportToExcel(filteredRecords)}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-purple-700 hover:bg-purple-50 rounded-lg transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Total",     value: stats.total,     icon: <ClipboardList className="w-3.5 h-3.5" />, color: "text-white" },
            { label: "Completed", value: stats.completed,  icon: <CheckCircle2  className="w-3.5 h-3.5" />, color: "text-emerald-300" },
            { label: "Overdue",   value: stats.overdue,    icon: <AlertTriangle  className="w-3.5 h-3.5" />, color: "text-orange-300" },
            { label: "Pending",   value: stats.pending,    icon: <Circle         className="w-3.5 h-3.5" />, color: "text-red-300" },
            { label: "Today ✓",   value: stats.todayDone,  icon: <CheckCheck     className="w-3.5 h-3.5" />, color: "text-sky-300" },
            { label: "Cranes",    value: stats.cranes,     icon: <TrendingUp     className="w-3.5 h-3.5" />, color: "text-purple-200" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2 border border-white/15">
              <div className={cn("flex items-center gap-1 mb-1", s.color)}>{s.icon}<span className="text-[10px] font-medium">{s.label}</span></div>
              <p className="text-lg font-black text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Completed */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700">{stats.completed}</p>
            <p className="text-sm font-semibold text-emerald-600">Completed PMs</p>
            <p className="text-xs text-emerald-500 mt-0.5">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% of total
            </p>
          </div>
        </div>
        {/* Overdue */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-orange-700">{stats.overdue}</p>
            <p className="text-sm font-semibold text-orange-600">Overdue PMs</p>
            <p className="text-xs text-orange-500 mt-0.5">Past scheduled date</p>
          </div>
        </div>
        {/* Pending */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <Clock className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-red-700">{stats.pending}</p>
            <p className="text-sm font-semibold text-red-600">Pending PMs</p>
            <p className="text-xs text-red-500 mt-0.5">Upcoming / not yet done</p>
          </div>
        </div>
      </div>

      {/* ── Monthly Trend ─────────────────────────────────────────────────── */}
      {records.length > 0 && <MonthlyChart records={records} />}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search crane, location, technician, comment…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
            />
          </div>
          {/* Crane */}
          <div className="relative">
            <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterCraneNo} onChange={(e) => setFilterCraneNo(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 appearance-none">
              <option value="">All Cranes</option>
              {craneOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* Location */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 appearance-none">
              <option value="">All Locations</option>
              {locationOptions.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {/* ACT Code */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterActCode} onChange={(e) => setFilterActCode(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 appearance-none">
              <option value="">All ACT Codes</option>
              {actCodeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {/* Status */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 appearance-none">
              <option value="">All Status</option>
              <option value="Completed">✅ Completed</option>
              <option value="Overdue">⚠️ Overdue</option>
              <option value="Pending">🔴 Pending</option>
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative sm:w-44">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 appearance-none">
              <option value="">All Months</option>
              {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 sm:ml-auto">
            <button onClick={() => setViewMode("table")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                viewMode === "table" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              📋 Table
            </button>
            <button onClick={() => setViewMode("timeline")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                viewMode === "timeline" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              📅 Timeline
            </button>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              <span className="font-bold text-gray-800">{filteredRecords.length}</span>
              {" "}of{" "}
              <span className="font-bold text-gray-800">{records.length}</span>
              {" "}records
            </p>
            {(searchQuery || filterCraneNo || filterLocation || filterActCode || filterStatus || filterMonth) && (
              <button onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TABLE VIEW                                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="p-5 bg-gray-100 rounded-full">
                <History className="w-10 h-10 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-gray-600 font-semibold text-lg">No Records Found</p>
                <p className="text-gray-400 text-sm mt-1">Adjust your filters or refresh</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-900 to-indigo-800 text-white">
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider w-10">#</th>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />SL.NO</span>
                    </th>
                    <SortTh field="crane">
                      <TrendingUp className="w-3 h-3" />CRANE NO
                    </SortTh>
                    <SortTh field="location">
                      <MapPin className="w-3 h-3" />LOCATION
                    </SortTh>
                    <SortTh field="date">
                      <Calendar className="w-3 h-3" />DATE
                    </SortTh>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">DAY</th>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">PLAN</th>
                    <SortTh field="status">
                      <Tag className="w-3 h-3" />ACT VALUE
                    </SortTh>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />COMPLETED BY</span>
                    </th>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />COMPLETED ON</span>
                    </th>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />COMMENT</span>
                    </th>
                    <SortTh field="status">STATUS</SortTh>
                    <th className="px-3 py-3.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => {
                    const isExpanded = expandedRows.has(record.id);
                    const bg = rowBg(record.Status, index);

                    return (
                      <React.Fragment key={record.id}>
                        <tr
                          className={cn(
                            "border-b border-gray-100 cursor-pointer transition-all",
                            bg,
                            isExpanded && "border-indigo-200"
                          )}
                          onClick={() => toggleRow(record.id)}
                        >
                          {/* # */}
                          <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{index + 1}</td>

                          {/* SL.NO */}
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-bold text-gray-700 font-mono bg-gray-100 px-2 py-0.5 rounded">
                              {record.SL_NO || "—"}
                            </span>
                          </td>

                          {/* CRANE NO */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                                record.Status === "Completed" ? "bg-emerald-500" :
                                record.Status === "Overdue"   ? "bg-orange-500"  : "bg-red-400"
                              )} />
                              <span className="text-sm font-bold text-purple-900">
                                {record.Crane_No || record.Equipment_Name || "—"}
                              </span>
                            </div>
                          </td>

                          {/* LOCATION */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[110px]">{record.Location || "—"}</span>
                            </div>
                          </td>

                          {/* DATE */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="text-sm text-gray-700 font-medium">
                              {formatDate(record.Due_Date)}
                            </span>
                          </td>

                          {/* DAY */}
                          <td className="px-3 py-2.5">
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-full",
                              ["Sat", "Sun"].includes(getDayOfWeek(record.Due_Date))
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            )}>
                              {getDayOfWeek(record.Due_Date)}
                            </span>
                          </td>

                          {/* PLAN */}
                          <td className="px-3 py-2.5">
                            <span className="text-sm font-bold text-violet-700">√</span>
                          </td>

                          {/* ACT VALUE */}
                          <td className="px-3 py-2.5">
                            {record.Status === "Completed" ? (
                              <ActBadge value={record.Act_Value || "√"} />
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* COMPLETED BY */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {record.Completed_By ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                  {record.Completed_By[0]?.toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-700">{record.Completed_By}</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </td>

                          {/* COMPLETED ON — actual date from cell comment */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {record.Completed_On ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                <span className="text-sm text-emerald-700 font-medium">
                                  {formatDate(record.Completed_On)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </td>

                          {/* COMMENT */}
                          <td className="px-3 py-2.5 max-w-[160px]">
                            {record.Comment ? (
                              <p className="text-xs text-gray-600 truncate italic" title={record.Comment}>
                                "{record.Comment}"
                              </p>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* STATUS */}
                          <td className="px-3 py-2.5">
                            <StatusPill status={record.Status} />
                          </td>

                          {/* Expand */}
                          <td className="px-3 py-2.5">
                            <button className="text-gray-400 hover:text-purple-600 transition-colors p-0.5">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <ExpandedDetail record={record} onClose={() => toggleRow(record.id)} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredRecords.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} · Click row to expand
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  {filteredRecords.filter((r) => r.Status === "Completed").length} Completed
                </span>
                <span className="flex items-center gap-1 text-orange-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                  {filteredRecords.filter((r) => r.Status === "Overdue").length} Overdue
                </span>
                <span className="flex items-center gap-1 text-red-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  {filteredRecords.filter((r) => r.Status === "Pending").length} Pending
                </span>
              </div>
              <button
                onClick={() => exportToExcel(filteredRecords)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all border border-purple-200"
              >
                <Download className="w-3.5 h-3.5" />
                Export {filteredRecords.length} Records
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TIMELINE VIEW                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {viewMode === "timeline" && (
        <div className="space-y-6">
          {filteredRecords.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-24 gap-4">
              <div className="p-5 bg-gray-100 rounded-full">
                <History className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold">No records match your filters</p>
            </div>
          ) : (
            timelineGroups.map(([dateKey, groupRecs]) => (
              <div key={dateKey}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-full shadow-md whitespace-nowrap">
                    {getDateLabel(dateKey)}
                  </div>
                  <div className="flex-1 h-px bg-purple-100" />
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-400 whitespace-nowrap">
                    <span className="text-emerald-600">{groupRecs.filter((r) => r.Status === "Completed").length}✅</span>
                    <span className="text-orange-500">{groupRecs.filter((r) => r.Status === "Overdue").length}⚠️</span>
                    <span className="text-red-500">{groupRecs.filter((r) => r.Status === "Pending").length}🔴</span>
                  </div>
                </div>

                {/* Items */}
                <div className="relative pl-8">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-300 to-transparent" />
                  <div className="space-y-3">
                    {groupRecs.map((record) => {
                      const isExpanded = expandedRows.has(record.id);
                      return (
                        <div key={record.id} className="relative">
                          {/* Timeline dot */}
                          <div className={cn(
                            "absolute -left-5 top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md z-10",
                            record.Status === "Completed" ? "bg-emerald-500" :
                            record.Status === "Overdue"   ? "bg-orange-500"  : "bg-red-400"
                          )} />

                          <div
                            className={cn(
                              "border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden",
                              record.Status === "Completed" ? "bg-emerald-50 border-emerald-200" :
                              record.Status === "Overdue"   ? "bg-orange-50  border-orange-200"  :
                                                             "bg-white       border-gray-200"
                            )}
                            onClick={() => toggleRow(record.id)}
                          >
                            <div className="p-4">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                {record.SL_NO && (
                                  <span className="text-[10px] font-bold text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">#{record.SL_NO}</span>
                                )}
                                <span className="text-sm font-bold text-purple-900 flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                                  {record.Crane_No || record.Equipment_Name}
                                </span>
                                {record.Location && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />{record.Location}
                                  </span>
                                )}
                                <span className="text-xs text-gray-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  {getDayOfWeek(record.Due_Date)}, {formatDate(record.Due_Date)}
                                </span>
                                {record.Status === "Completed" && record.Act_Value && (
                                  <ActBadge value={record.Act_Value} />
                                )}
                                <StatusPill status={record.Status} />
                                <button className="ml-auto text-gray-400 hover:text-purple-600 transition-colors">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>

                              {/* Completion info row */}
                              {record.Status === "Completed" && (record.Completed_By || record.Completed_On || record.Comment) && (
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                  {record.Completed_By && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />{record.Completed_By}
                                    </span>
                                  )}
                                  {record.Completed_On && (
                                    <span className="flex items-center gap-1 text-emerald-600">
                                      <CheckCircle2 className="w-3 h-3" />Done on {formatDate(record.Completed_On)}
                                    </span>
                                  )}
                                  {record.Comment && (
                                    <span className="flex items-center gap-1 italic truncate max-w-xs">
                                      <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                      "{record.Comment}"
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Overdue warning */}
                              {record.Status === "Overdue" && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-700">
                                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>Scheduled PM was not completed — overdue</span>
                                </div>
                              )}
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="border-t border-gray-100 bg-white/60 px-4 py-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">PM ID</p>
                                    <p className="font-mono text-purple-700 text-[11px] break-all">{record.PM_ID}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Completed On</p>
                                    <p className="font-semibold text-emerald-700">
                                      {record.Completed_On ? formatDate(record.Completed_On, "dd-MMM-yyyy") : "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">ACT Code</p>
                                    <ActBadge value={record.Act_Value || "—"} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Sheet</p>
                                    <p className="font-semibold text-indigo-700">{record.Sheet_Name || "—"}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
