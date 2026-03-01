/**
 * HOME PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 * Landing page showing:
 *  • Live stats summary cards
 *  • Today's crane PM tasks
 *  • Overdue crane tasks (highlighted)
 *  • Tomorrow's upcoming tasks
 *  • Quick-action button to enter PM Checklist System
 */

import React, { useMemo } from "react";
import { format, addDays } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarDays,
  ArrowRight,
  ClipboardList,
  Wrench,
  MapPin,
  Hash,
  TrendingUp,
  Zap,
  ChevronRight,
  RefreshCw,
  Info,
  Sun,
  Sunrise,
  CalendarClock,
  ShieldAlert,
  Activity,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { CalendarData, CalendarEquipmentRow, CalendarDayCell } from "../types/pm";
import { cn } from "../utils/cn";

interface HomePageProps {
  calendarData: CalendarData | null;
  isLoading: boolean;
  isExcelLoaded: boolean;
  isDemo: boolean;
  onGoToDashboard: () => void;
  onGoToUpload: () => void;
  onRefresh: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface CraneTask {
  sl_no: string;
  crane_no: string;
  location: string;
  equipment: string;
  plan: string;
  act: string;
  day: number;
  status: CalendarDayCell["status"];
  row: CalendarEquipmentRow;
  cell: CalendarDayCell;
}

function getDayTasks(
  matrix: CalendarEquipmentRow[],
  targetDay: number
): CraneTask[] {
  const tasks: CraneTask[] = [];
  for (const row of matrix) {
    const cell = row.days.find((d) => d.day === targetDay);
    if (!cell || !cell.is_planned) continue;
    tasks.push({
      sl_no: row.sl_no,
      crane_no: row.crane_no,
      location: row.location,
      equipment: row.equipment,
      plan: cell.plan,
      act: cell.act,
      day: targetDay,
      status: cell.status,
      row,
      cell,
    });
  }
  return tasks;
}

function getOverdueTasks(matrix: CalendarEquipmentRow[], todayDay: number): CraneTask[] {
  const tasks: CraneTask[] = [];
  for (const row of matrix) {
    for (const cell of row.days) {
      if (cell.day >= todayDay) continue;
      if (!cell.is_planned) continue;
      // Overdue = status is "Overdue" OR (past day + planned + no act value completed)
      const isOverdue =
        cell.status === "Overdue" ||
        (cell.status === "Pending" && !cell.act && cell.day < todayDay) ||
        (!cell.act && cell.day < todayDay && cell.is_planned);
      if (!isOverdue) continue;
      // Skip if actually completed
      if (cell.act && (cell.act.startsWith("√") || cell.status === "Completed")) continue;
      tasks.push({
        sl_no: row.sl_no,
        crane_no: row.crane_no,
        location: row.location,
        equipment: row.equipment,
        plan: cell.plan,
        act: cell.act,
        day: cell.day,
        status: "Overdue",
        row,
        cell,
      });
    }
  }
  // Sort by day descending (most recent overdue first)
  return tasks.sort((a, b) => b.day - a.day);
}

// ── Status pill ───────────────────────────────────────────────────────────────
const StatusPill: React.FC<{ status: CraneTask["status"]; act?: string }> = ({ status, act }) => {
  if (act) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="w-3 h-3" />
        {act}
      </span>
    );
  }
  if (status === "Completed")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </span>
    );
  if (status === "Overdue")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
        <AlertTriangle className="w-3 h-3" /> Overdue
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
};

// ── Crane Card ────────────────────────────────────────────────────────────────
const CraneCard: React.FC<{
  task: CraneTask;
  variant: "today" | "overdue" | "tomorrow";
  index: number;
}> = ({ task, variant, index }) => {
  const isCompleted = task.status === "Completed" || !!task.act;
  const isOverdue = variant === "overdue";
  const isTomorrow = variant === "tomorrow";

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
        isCompleted && "bg-emerald-50 border-emerald-200",
        isOverdue && !isCompleted && "bg-red-50 border-red-200",
        !isCompleted && !isOverdue && isTomorrow && "bg-blue-50 border-blue-200",
        !isCompleted && !isOverdue && !isTomorrow && "bg-white border-gray-200 hover:border-blue-300"
      )}
    >
      {/* Index badge */}
      <div
        className={cn(
          "absolute -top-2 -left-2 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm border-2 border-white",
          isCompleted && "bg-emerald-500 text-white",
          isOverdue && !isCompleted && "bg-red-500 text-white",
          !isCompleted && !isOverdue && isTomorrow && "bg-blue-500 text-white",
          !isCompleted && !isOverdue && !isTomorrow && "bg-slate-500 text-white"
        )}
      >
        {index + 1}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Crane No + Location */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="text-sm font-bold text-slate-800">{task.crane_no}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500">{task.location}</span>
            </div>
            {task.sl_no && (
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-400">SL {task.sl_no}</span>
              </div>
            )}
          </div>

          {/* Plan info */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-slate-500">
              PLAN:{" "}
              <span className="font-semibold text-slate-700">{task.plan || "—"}</span>
            </span>
            {isOverdue && (
              <span className="text-xs text-red-600 font-medium">
                • Day {task.day} missed
              </span>
            )}
            {isTomorrow && (
              <span className="text-xs text-blue-600 font-medium">
                • Scheduled Day {task.day}
              </span>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div className="flex-shrink-0">
          <StatusPill status={task.status} act={task.act || undefined} />
        </div>
      </div>

      {/* Overdue day indicator */}
      {isOverdue && !isCompleted && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700 font-medium">
          <CalendarDays className="w-3 h-3" />
          Was due on Day {task.day} — not completed
        </div>
      )}
    </div>
  );
};

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  countColor: string;
  bgColor: string;
  borderColor: string;
  extraBadge?: React.ReactNode;
}> = ({ icon, title, subtitle, count, countColor, bgColor, borderColor, extraBadge }) => (
  <div className={cn("rounded-xl px-5 py-4 border flex items-center justify-between", bgColor, borderColor)}>
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-lg", countColor.replace("text-", "bg-").replace("800", "200"))}>
        {icon}
      </div>
      <div>
        <h3 className={cn("text-base font-bold", countColor)}>{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {extraBadge}
      <span className={cn("text-2xl font-black", countColor)}>{count}</span>
      <span className="text-xs text-slate-500 font-medium">tasks</span>
    </div>
  </div>
);

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ message: string; icon: React.ReactNode }> = ({ message, icon }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 gap-2">
    <div className="w-10 h-10 text-slate-300">{icon}</div>
    <p className="text-sm">{message}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const HomePage: React.FC<HomePageProps> = ({
  calendarData,
  isLoading,
  isExcelLoaded,
  isDemo,
  onGoToDashboard,
  onGoToUpload,
  onRefresh,
}) => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const todayDay = calendarData?.today_day ?? today.getDate();
  const tomorrowDay = todayDay + 1;

  const todayLabel = format(today, "EEEE, MMMM d, yyyy");
  const tomorrowLabel = format(tomorrow, "EEEE, MMMM d");

  // ── Derived task lists ────────────────────────────────────────────────────
  const todayTasks = useMemo(
    () => (calendarData ? getDayTasks(calendarData.calendar_matrix, todayDay) : []),
    [calendarData, todayDay]
  );

  const overdueTasks = useMemo(
    () => (calendarData ? getOverdueTasks(calendarData.calendar_matrix, todayDay) : []),
    [calendarData, todayDay]
  );

  const tomorrowTasks = useMemo(
    () =>
      calendarData && tomorrowDay <= (calendarData.day_columns.at(-1) ?? 31)
        ? getDayTasks(calendarData.calendar_matrix, tomorrowDay)
        : [],
    [calendarData, tomorrowDay]
  );

  // ── Aggregates ────────────────────────────────────────────────────────────
  const todayCompleted = todayTasks.filter((t) => t.status === "Completed" || !!t.act).length;
  const todayPending = todayTasks.filter((t) => !t.act && t.status !== "Completed").length;
  const totalPlanned = calendarData
    ? calendarData.calendar_matrix.reduce(
        (acc, row) => acc + row.days.filter((d) => d.is_planned).length,
        0
      )
    : 0;
  const totalDone = calendarData
    ? calendarData.calendar_matrix.reduce(
        (acc, row) => acc + row.days.filter((d) => !!d.act).length,
        0
      )
    : 0;
  const completionPct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

  const monthName = calendarData
    ? format(new Date(calendarData.year, calendarData.month - 1, 1), "MMMM yyyy")
    : format(today, "MMMM yyyy");

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white shadow-2xl">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-px h-full bg-white/5 -translate-y-1/2 rotate-12" />
        </div>

        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">

            {/* Left content */}
            <div className="flex-1">
              {/* Date badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-blue-200 mb-4">
                <Sun className="w-4 h-4 text-yellow-300" />
                {todayLabel}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">
                PM Compliance
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                  Dashboard
                </span>
              </h1>
              <p className="text-blue-300 text-base max-w-lg leading-relaxed">
                Monitor today's crane preventive maintenance schedule, track overdue tasks, and plan tomorrow's work — all in one place.
              </p>

              {/* Demo badge */}
              {isDemo && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  DEMO MODE — Simulated Data (20 Cranes)
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={onGoToDashboard}
                  className="group flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  Open PM Checklist System
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                {!isExcelLoaded && !isDemo && (
                  <button
                    onClick={onGoToUpload}
                    className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all"
                  >
                    Connect Excel / Google Sheets
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Right: Monthly summary ring */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              {/* Progress ring */}
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="url(#homeGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - completionPct / 100)}`}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="homeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#34D399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{completionPct}%</span>
                  <span className="text-xs text-blue-300 font-medium">Monthly</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-sm">{monthName}</p>
                <p className="text-blue-300 text-xs">{totalDone} / {totalPlanned} tasks done</p>
              </div>
            </div>
          </div>

          {/* Bottom stat strip */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: <Sun className="w-4 h-4 text-yellow-300" />,
                label: "Today's Tasks",
                value: todayTasks.length,
                sub: `${todayCompleted} done`,
                bg: "bg-yellow-500/10 border-yellow-400/20",
              },
              {
                icon: <Clock className="w-4 h-4 text-amber-300" />,
                label: "Pending Today",
                value: todayPending,
                sub: "awaiting action",
                bg: "bg-amber-500/10 border-amber-400/20",
              },
              {
                icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
                label: "Overdue",
                value: overdueTasks.length,
                sub: "past due date",
                bg: "bg-red-500/10 border-red-400/20",
              },
              {
                icon: <Sunrise className="w-4 h-4 text-cyan-300" />,
                label: "Tomorrow",
                value: tomorrowTasks.length,
                sub: "upcoming tasks",
                bg: "bg-cyan-500/10 border-cyan-400/20",
              },
            ].map((stat, i) => (
              <div key={i} className={cn("rounded-xl border px-4 py-3", stat.bg)}>
                <div className="flex items-center gap-2 mb-1">{stat.icon}<span className="text-xs text-white/70 font-medium">{stat.label}</span></div>
                <div className="text-2xl font-black text-white">{isLoading ? "—" : stat.value}</div>
                <div className="text-xs text-white/50 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NO DATA STATE ─────────────────────────────────────────────────────── */}
      {!isLoading && !isExcelLoaded && !isDemo && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl px-8 py-12 flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="p-5 bg-slate-100 rounded-2xl">
            <ClipboardList className="w-12 h-12 text-slate-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-700">No Data Source Connected</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">
              Upload your PMI compliance Excel sheet or connect Google Sheets to see today's crane tasks, overdue work, and tomorrow's schedule.
            </p>
          </div>
          <button
            onClick={onGoToUpload}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md"
          >
            Connect Data Source
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── LOADING STATE ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-2/3 mb-4" />
              {[0,1,2,3].map((j) => (
                <div key={j} className="h-16 bg-slate-100 rounded-xl mb-2" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── THREE-COLUMN TASK LAYOUT ──────────────────────────────────────────── */}
      {!isLoading && (isExcelLoaded || isDemo) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── TODAY'S TASKS ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <SectionHeader
              icon={<Sun className="w-5 h-5 text-amber-700" />}
              title="Today's Tasks"
              subtitle={format(today, "EEEE, MMM d")}
              count={todayTasks.length}
              countColor="text-amber-800"
              bgColor="bg-amber-50"
              borderColor="border-amber-100"
              extraBadge={
                todayCompleted > 0 ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    {todayCompleted} done
                  </span>
                ) : undefined
              }
            />

            <div className="flex-1 overflow-y-auto max-h-[520px] p-4 space-y-3">
              {todayTasks.length === 0 ? (
                <EmptyState
                  message="No PM tasks scheduled for today"
                  icon={<CheckCircle2 className="w-full h-full" />}
                />
              ) : (
                todayTasks.map((task, i) => (
                  <CraneCard key={`today-${task.crane_no}-${i}`} task={task} variant="today" index={i} />
                ))
              )}
            </div>

            {/* Footer */}
            {todayTasks.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{todayPending} pending · {todayCompleted} completed</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-20 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${todayTasks.length ? (todayCompleted / todayTasks.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="font-semibold text-emerald-600">
                      {todayTasks.length ? Math.round((todayCompleted / todayTasks.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Go to Checklist CTA */}
            <div className="px-4 pb-4">
              <button
                onClick={onGoToDashboard}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <ClipboardList className="w-4 h-4" />
                Mark Tasks in PM Checklist
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── OVERDUE TASKS ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <SectionHeader
              icon={<ShieldAlert className="w-5 h-5 text-red-700" />}
              title="Overdue Tasks"
              subtitle="Requires immediate attention"
              count={overdueTasks.length}
              countColor="text-red-800"
              bgColor="bg-red-50"
              borderColor="border-red-100"
              extraBadge={
                overdueTasks.length > 0 ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-200 text-red-800 border border-red-300 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    URGENT
                  </span>
                ) : undefined
              }
            />

            <div className="flex-1 overflow-y-auto max-h-[520px] p-4 space-y-3">
              {overdueTasks.length === 0 ? (
                <EmptyState
                  message="No overdue tasks — great job! ✅"
                  icon={<CheckCircle2 className="w-full h-full text-emerald-300" />}
                />
              ) : (
                overdueTasks.map((task, i) => (
                  <CraneCard key={`overdue-${task.crane_no}-${task.day}-${i}`} task={task} variant="overdue" index={i} />
                ))
              )}
            </div>

            {/* Overdue summary */}
            {overdueTasks.length > 0 && (
              <div className="border-t border-red-100 px-4 py-3 bg-red-50">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">
                    <strong>{overdueTasks.length}</strong> crane{overdueTasks.length > 1 ? "s" : ""} have missed PM tasks. Complete them immediately and update the ACT row in the checklist.
                  </p>
                </div>
              </div>
            )}

            <div className="px-4 pb-4 pt-2">
              <button
                onClick={onGoToDashboard}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
                disabled={overdueTasks.length === 0}
              >
                <AlertTriangle className="w-4 h-4" />
                Address Overdue in Checklist
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── TOMORROW'S TASKS ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <SectionHeader
              icon={<Sunrise className="w-5 h-5 text-blue-700" />}
              title="Tomorrow's Tasks"
              subtitle={tomorrowLabel}
              count={tomorrowTasks.length}
              countColor="text-blue-800"
              bgColor="bg-blue-50"
              borderColor="border-blue-100"
              extraBadge={
                tomorrowTasks.length > 0 ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-800 border border-blue-300">
                    <CalendarDays className="w-3 h-3" />
                    Plan ahead
                  </span>
                ) : undefined
              }
            />

            <div className="flex-1 overflow-y-auto max-h-[520px] p-4 space-y-3">
              {tomorrowTasks.length === 0 ? (
                <EmptyState
                  message="No PM tasks scheduled for tomorrow"
                  icon={<CalendarDays className="w-full h-full" />}
                />
              ) : (
                tomorrowTasks.map((task, i) => (
                  <CraneCard key={`tomorrow-${task.crane_no}-${i}`} task={task} variant="tomorrow" index={i} />
                ))
              )}
            </div>

            {tomorrowTasks.length > 0 && (
              <div className="border-t border-blue-100 px-4 py-3 bg-blue-50">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>{tomorrowTasks.length}</strong> crane PM{tomorrowTasks.length > 1 ? "s" : ""} scheduled for tomorrow. Prepare tools and technicians in advance.
                  </p>
                </div>
              </div>
            )}

            <div className="px-4 pb-4 pt-2">
              <button
                onClick={onGoToDashboard}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
                disabled={tomorrowTasks.length === 0}
              >
                <CalendarClock className="w-4 h-4" />
                View Full Calendar
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MONTHLY OVERVIEW MINI-CHART ──────────────────────────────────────── */}
      {!isLoading && calendarData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-600" />
              <h3 className="text-base font-bold text-slate-800">Monthly Work Distribution — {monthName}</h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />Completed</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Planned</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Overdue</span>
            </div>
          </div>

          {/* Day-by-day bar chart */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-end gap-0.5 min-w-max">
              {calendarData.day_columns.map((day) => {
                const dayTasks = getDayTasks(calendarData.calendar_matrix, day);
                const done = dayTasks.filter((t) => !!t.act || t.status === "Completed").length;
                const overdue = dayTasks.filter((t) => t.status === "Overdue" && !t.act).length;
                const pending = dayTasks.filter((t) => t.status === "Pending" && !t.act).length;
                const total = dayTasks.length;
                const isToday = day === todayDay;
                const isPast = day < todayDay;

                const maxH = 80;
                const doneH = total ? Math.max(2, (done / Math.max(total, 1)) * maxH) : 0;
                const pendingH = total ? Math.max(pending > 0 ? 2 : 0, (pending / Math.max(total, 1)) * maxH) : 0;
                const overdueH = total ? Math.max(overdue > 0 ? 2 : 0, (overdue / Math.max(total, 1)) * maxH) : 0;

                return (
                  <div key={day} className="flex flex-col items-center gap-1 group">
                    {/* Tooltip */}
                    <div className="hidden group-hover:flex flex-col items-center absolute -translate-y-full mb-1 z-10">
                      <div className="bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                        Day {day}: {done}✓ {overdue > 0 ? `${overdue}⚠` : ""} {pending > 0 ? `${pending}○` : ""}
                      </div>
                    </div>

                    {/* Bar stack */}
                    <div
                      className="relative flex flex-col-reverse items-center gap-0"
                      style={{ height: `${maxH}px`, width: "18px" }}
                      title={`Day ${day}: ${done} done, ${overdue} overdue, ${pending} pending`}
                    >
                      {done > 0 && (
                        <div
                          className="w-full rounded-t-sm bg-emerald-400 transition-all"
                          style={{ height: `${doneH}px` }}
                        />
                      )}
                      {pending > 0 && (
                        <div
                          className="w-full bg-amber-400 transition-all"
                          style={{ height: `${pendingH}px` }}
                        />
                      )}
                      {overdue > 0 && isPast && (
                        <div
                          className="w-full bg-red-400 rounded-t-sm transition-all"
                          style={{ height: `${overdueH}px` }}
                        />
                      )}
                      {total === 0 && (
                        <div className="w-full bg-slate-100 rounded-sm" style={{ height: "4px" }} />
                      )}
                    </div>

                    {/* Day number */}
                    <span
                      className={cn(
                        "text-[9px] font-semibold",
                        isToday ? "text-blue-600 font-black" : isPast ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      {day}
                      {isToday && (
                        <span className="block w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mt-0.5" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK STATS ROW ──────────────────────────────────────────────────── */}
      {!isLoading && calendarData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Cranes",
              value: calendarData.calendar_matrix.length,
              icon: <Wrench className="w-5 h-5" />,
              color: "text-slate-600",
              bg: "bg-slate-50 border-slate-200",
            },
            {
              label: "Monthly Compliance",
              value: `${completionPct}%`,
              icon: <TrendingUp className="w-5 h-5" />,
              color: completionPct >= 80 ? "text-emerald-600" : completionPct >= 50 ? "text-amber-600" : "text-red-600",
              bg: completionPct >= 80 ? "bg-emerald-50 border-emerald-200" : completionPct >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200",
            },
            {
              label: "Tasks Completed",
              value: totalDone,
              icon: <CheckCircle2 className="w-5 h-5" />,
              color: "text-emerald-600",
              bg: "bg-emerald-50 border-emerald-200",
            },
            {
              label: "System Status",
              value: isDemo ? "Demo" : "Live",
              icon: <Activity className="w-5 h-5" />,
              color: isDemo ? "text-amber-600" : "text-emerald-600",
              bg: isDemo ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200",
            },
          ].map((stat, i) => (
            <div key={i} className={cn("rounded-xl border p-4 flex items-center gap-3", stat.bg)}>
              <div className={cn("flex-shrink-0", stat.color)}>{stat.icon}</div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                <p className={cn("text-xl font-black", stat.color)}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ENTER SYSTEM CTA ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="text-white">
          <h3 className="text-lg font-bold">Ready to update PM records?</h3>
          <p className="text-blue-200 text-sm mt-0.5">
            Go to the full PM Checklist System to mark tasks complete, add comments, and update the Excel sheet in real time.
          </p>
        </div>
        <button
          onClick={onGoToDashboard}
          className="group flex-shrink-0 flex items-center gap-2 px-7 py-3.5 bg-white text-blue-700 font-black rounded-xl hover:bg-blue-50 transition-all shadow-md hover:shadow-xl active:scale-95 whitespace-nowrap"
        >
          <ClipboardList className="w-5 h-5" />
          Open PM Checklist System
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </div>
  );
};
