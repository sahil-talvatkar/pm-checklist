/**
 * WELCOME TOAST — WhatsApp-style bottom-right notification
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows on page load / refresh with today's PM tasks listed.
 * Plays a notification sound when it appears.
 * Auto-dismisses after 12 seconds with a countdown progress bar.
 * User can manually dismiss or click to navigate.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Bell,
  ChevronRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CalendarData, CalendarDayCell } from "../types/pm";
import { cn } from "../utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CraneTask {
  crane_no: string;
  location: string;
  sl_no: string;
  equipment: string;
  plan: string;
  act: string;
  status: CalendarDayCell["status"];
}

interface WelcomeToastProps {
  calendarData: CalendarData | null;
  isLoading: boolean;
  onNavigateToDashboard: () => void;
  onDismiss: () => void;
  visible: boolean;
}

// ── Sound Generator (Web Audio API — no file needed) ─────────────────────────

function playNotificationSound(muted: boolean) {
  if (muted) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // WhatsApp-style double-ping
    const notes = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 1100, start: 0.15, dur: 0.18 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + dur
      );

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });

    // Close context after sounds finish
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio not supported — silently ignore
  }
}

// ── Helper: get today's tasks from calendar ───────────────────────────────────

function getTodayTasksFromCalendar(
  calendarData: CalendarData
): CraneTask[] {
  const todayDay = calendarData.today_day ?? new Date().getDate();
  const tasks: CraneTask[] = [];

  for (const row of calendarData.calendar_matrix) {
    const cell = row.days.find((d) => d.day === todayDay);
    if (!cell || !cell.is_planned) continue;
    tasks.push({
      crane_no: row.crane_no,
      location: row.location,
      sl_no: row.sl_no,
      equipment: row.equipment,
      plan: cell.plan,
      act: cell.act,
      status: cell.act ? "Completed" : cell.status,
    });
  }
  return tasks;
}

function getOverdueCount(calendarData: CalendarData): number {
  const todayDay = calendarData.today_day ?? new Date().getDate();
  let count = 0;
  for (const row of calendarData.calendar_matrix) {
    for (const cell of row.days) {
      if (cell.day >= todayDay) continue;
      if (!cell.is_planned) continue;
      if (cell.act && (cell.act.startsWith("√") || cell.status === "Completed")) continue;
      if (!cell.act && cell.day < todayDay) count++;
    }
  }
  return count;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TaskRow: React.FC<{ task: CraneTask; index: number }> = ({
  task,
  index,
}) => {
  const isCompleted = task.status === "Completed" || !!task.act;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
        isCompleted
          ? "bg-emerald-50 border border-emerald-100"
          : "bg-amber-50 border border-amber-100"
      )}
    >
      {/* Index */}
      <div
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0",
          isCompleted
            ? "bg-emerald-500 text-white"
            : "bg-amber-500 text-white"
        )}
      >
        {index + 1}
      </div>

      {/* Crane info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Wrench
            className={cn(
              "w-3 h-3 flex-shrink-0",
              isCompleted ? "text-emerald-500" : "text-amber-600"
            )}
          />
          <span className="text-xs font-bold text-slate-800 truncate">
            {task.crane_no || task.equipment}
          </span>
        </div>
        {task.location && (
          <p className="text-[10px] text-slate-400 truncate pl-4">
            {task.location}
          </p>
        )}
      </div>

      {/* Status pill */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Done
          </span>
        ) : (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
            <Clock className="w-2.5 h-2.5" />
            Pending
          </span>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const AUTO_DISMISS_SEC = 15;

export const WelcomeToast: React.FC<WelcomeToastProps> = ({
  calendarData,
  isLoading,
  onNavigateToDashboard,
  onDismiss,
  visible,
}) => {
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(100); // 100 → 0 countdown bar
  const [entering, setEntering] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundPlayedRef = useRef(false);

  // Derived data
  const todayTasks = calendarData ? getTodayTasksFromCalendar(calendarData) : [];
  const overdueCount = calendarData ? getOverdueCount(calendarData) : 0;
  const pendingTasks = todayTasks.filter(
    (t) => t.status !== "Completed" && !t.act
  );
  const completedTasks = todayTasks.filter(
    (t) => t.status === "Completed" || !!t.act
  );

  // Which tasks to show in collapsed view (max 3)
  const previewTasks = todayTasks.slice(0, 3);
  const hiddenCount = todayTasks.length - previewTasks.length;

  // ── Enter animation + sound ───────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    // Small delay for enter animation
    const t = setTimeout(() => {
      setEntering(true);
      if (!soundPlayedRef.current) {
        playNotificationSound(muted);
        soundPlayedRef.current = true;
      }
    }, 300);

    return () => clearTimeout(t);
  }, [visible, muted]);

  // ── Countdown progress bar ────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !entering) return;

    const tick = AUTO_DISMISS_SEC * 10; // total ticks (100ms each)
    let elapsed = 0;

    intervalRef.current = setInterval(() => {
      elapsed++;
      setProgress(Math.max(0, 100 - (elapsed / tick) * 100));
      if (elapsed >= tick) {
        handleDismiss();
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, entering]);

  // ── Dismiss with leave animation ─────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setLeaving(true);
    setTimeout(() => {
      onDismiss();
    }, 400);
  }, [onDismiss]);

  const handleGoToChecklist = useCallback(() => {
    handleDismiss();
    setTimeout(() => onNavigateToDashboard(), 200);
  }, [handleDismiss, onNavigateToDashboard]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  if (!visible) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast wrapper */}
      <div
        className={cn(
          "fixed bottom-5 right-5 z-[9999] w-[340px] max-w-[calc(100vw-2rem)]",
          "transition-all duration-400 ease-out",
          entering && !leaving
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95"
        )}
        style={{
          filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.22))",
        }}
        role="alert"
        aria-live="polite"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-3">
            {/* Bell icon with pulse */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              {pendingTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-white animate-bounce">
                  {pendingTasks.length > 9 ? "9+" : pendingTasks.length}
                </span>
              )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">
                PM Checklist System
              </p>
              <p className="text-blue-200 text-[11px]">
                Daily Task Reminder
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleToggleMute}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Countdown progress bar ────────────────────────────────────── */}
          <div className="h-1 bg-slate-100 w-full">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-100 ease-linear rounded-r-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="p-4 space-y-3">

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <p className="text-sm text-slate-600">Loading today's PM tasks...</p>
              </div>
            )}

            {/* No data state */}
            {!isLoading && !calendarData && (
              <div className="text-center py-2">
                <p className="text-sm font-semibold text-slate-700">
                  No data source connected
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload your Excel sheet to see today's tasks here.
                </p>
              </div>
            )}

            {/* Data loaded — main message */}
            {!isLoading && calendarData && todayTasks.length > 0 && (
              <>
                {/* Summary message */}
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      pendingTasks.length > 0
                        ? "bg-amber-100"
                        : "bg-emerald-100"
                    )}
                  >
                    {pendingTasks.length > 0 ? (
                      <Clock className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 leading-snug">
                      You have{" "}
                      <span
                        className={cn(
                          "font-black",
                          pendingTasks.length > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        )}
                      >
                        {todayTasks.length} task
                        {todayTasks.length !== 1 ? "s" : ""}
                      </span>{" "}
                      today
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {completedTasks.length > 0 && (
                        <span className="text-emerald-600 font-semibold">
                          {completedTasks.length} completed
                        </span>
                      )}
                      {completedTasks.length > 0 && pendingTasks.length > 0 && " · "}
                      {pendingTasks.length > 0 && (
                        <span className="text-amber-600 font-semibold">
                          {pendingTasks.length} pending
                        </span>
                      )}
                      {overdueCount > 0 && (
                        <span className="text-red-600 font-semibold">
                          {" "}· {overdueCount} overdue ⚠️
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Overdue alert */}
                {overdueCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-semibold">
                      {overdueCount} overdue crane PM
                      {overdueCount !== 1 ? "s" : ""} need immediate attention!
                    </p>
                  </div>
                )}

                {/* Task list */}
                <div className="space-y-1.5">
                  {/* Collapsed: show up to 3 */}
                  {!expanded &&
                    previewTasks.map((task, i) => (
                      <TaskRow
                        key={`${task.crane_no}-${i}`}
                        task={task}
                        index={i}
                      />
                    ))}

                  {/* Expanded: show all */}
                  {expanded &&
                    todayTasks.map((task, i) => (
                      <TaskRow
                        key={`${task.crane_no}-${i}`}
                        task={task}
                        index={i}
                      />
                    ))}

                  {/* Show more / collapse toggle */}
                  {hiddenCount > 0 && !expanded && (
                    <button
                      onClick={() => setExpanded(true)}
                      className="w-full text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                    >
                      Show {hiddenCount} more crane
                      {hiddenCount !== 1 ? "s" : ""}
                      <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  )}
                  {expanded && todayTasks.length > 3 && (
                    <button
                      onClick={() => setExpanded(false)}
                      className="w-full text-xs text-slate-500 font-semibold hover:text-slate-700 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-slate-50 transition-all"
                    >
                      Show less
                      <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                  )}
                </div>
              </>
            )}

            {/* No tasks today */}
            {!isLoading && calendarData && todayTasks.length === 0 && (
              <div className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    No PM tasks today! 🎉
                  </p>
                  <p className="text-xs text-slate-400">
                    All clear for today — check tomorrow's schedule.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer CTA ───────────────────────────────────────────────── */}
          {!isLoading && (
            <div className="px-4 pb-4 pt-0 flex gap-2">
              <button
                onClick={handleGoToChecklist}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                Open PM Checklist
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── Timestamp ─────────────────────────────────────────────────── */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="text-[10px] text-slate-300">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-[10px] text-slate-300">
              Auto-dismiss in {Math.ceil((progress / 100) * AUTO_DISMISS_SEC)}s
            </p>
          </div>
        </div>

        {/* WhatsApp-style chat bubble tail */}
        <div
          className="absolute -bottom-0 right-6 w-0 h-0"
          style={{
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid #e2e8f0",
            bottom: "-8px",
          }}
        />
      </div>
    </>
  );
};

export default WelcomeToast;
