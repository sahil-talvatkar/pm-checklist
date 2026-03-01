import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CloudUpload,
  Globe,
  Calendar,
  Layers,
} from "lucide-react";

import {
  PMTask,
  FilterState,
  UpdatePMPayload,
  HistoryRecord,
  Notification,
  CalendarData,
  CalendarDayCell,
  CalendarEquipmentRow,
} from "./types/pm";
import { SheetSelector } from "./components/SheetSelector";
import { pmApi, UploadStatus } from "./api/pmApi";
import { Header, ActivePage } from "./components/Header";
import { StatsCard } from "./components/StatsCard";
import { FilterBar } from "./components/FilterBar";
import { PMTable } from "./components/PMTable";
import { ToastContainer } from "./components/ToastContainer";
import { NotificationPanel } from "./components/NotificationPanel";
import { HistoryPage } from "./components/HistoryPage";
import { UploadPage } from "./components/UploadPage";
import { CalendarView } from "./components/CalendarView";
import { CalendarCompleteModal } from "./components/CalendarCompleteModal";
import { SchedulerPage } from "./components/SchedulerPage";
import { HomePage } from "./components/HomePage";
import { WelcomeToast } from "./components/WelcomeToast";
import { generateNotifications } from "./data/mockData";
import { cn } from "./utils/cn";

const DEFAULT_FILTERS: FilterState = {
  equipmentName: "",
  dueDate: "",
  pmId: "",
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type DashboardView = "checklist" | "calendar";

interface CalendarModalState {
  open: boolean;
  equipRow: CalendarEquipmentRow | null;
  day: number;
  month: number;
  year: number;
  cell: CalendarDayCell | null;
}

export function App() {
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sourceType, setSourceType] = useState<string>("local");
  const [excelFormat, setExcelFormat] = useState<string>("unknown");
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [allSheets, setAllSheets] = useState<string[]>([]);
  const [showSheetModal, setShowSheetModal] = useState(false);

  // Page navigation
  const [activePage, setActivePage] = useState<ActivePage>("home");
  const [dashboardView, setDashboardView] = useState<DashboardView>("checklist");

  // History
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Upload / Excel status
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);

  // Calendar data
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);

  // Calendar complete modal
  const [calendarModal, setCalendarModal] = useState<CalendarModalState>({
    open: false,
    equipRow: null,
    day: 0,
    month: 0,
    year: 0,
    cell: null,
  });

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Welcome Toast — shown on page load / reload
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const welcomeShownRef = useRef(false);

  // ── Fetch upload status ──────────────────────────────────────────────────
  const fetchUploadStatus = useCallback(async () => {
    try {
      // First check /get-upload-status — it now checks online config first internally
      const status = await pmApi.getUploadStatus();

      // Also explicitly check online config to get full worksheet list
      const onlineCfg = await pmApi.getOnlineConfig();
      if (onlineCfg.connected && onlineCfg.spreadsheet_id) {
        const worksheetTitles = (onlineCfg.worksheets || []).map((w: {title: string}) => w.title);
        const activeWs = onlineCfg.active_worksheet || (worksheetTitles[0] ?? "Sheet1");
        const onlineStatus: UploadStatus = {
          uploaded: true,
          source_type: "google_sheets_live",
          label: onlineCfg.label || "Google Sheets",
          url: onlineCfg.sheet_url,
          message: `Connected to Google Sheets — worksheet: ${activeWs}`,
          total_rows: status.total_rows || 0,
          today_tasks: status.today_tasks || 0,
          excel_format: "calendar",
          active_sheet: activeWs,
          available_sheets: worksheetTitles.length > 0 ? worksheetTitles : [activeWs],
          total_sheets: worksheetTitles.length || 1,
        };
        setUploadStatus(onlineStatus);
        setSourceType("google_sheets_live");
        setExcelFormat("calendar");
        setActiveSheet(activeWs);
        // Always set allSheets so Scheduler and SheetSelector work
        if (worksheetTitles.length > 0) {
          setAllSheets(worksheetTitles);
        } else if (activeWs) {
          setAllSheets([activeWs]);
        }
        return onlineStatus;
      }

      // Local file path
      setUploadStatus(status);
      if (status.source_type) setSourceType(status.source_type);
      if (status.excel_format) setExcelFormat(status.excel_format);
      if (status.active_sheet) setActiveSheet(status.active_sheet);
      if (status.available_sheets && status.available_sheets.length > 0) {
        setAllSheets(status.available_sheets);
      }
      return status;
    } catch {
      setUploadStatus({
        uploaded: false,
        message: "Backend not connected.",
        total_rows: 0,
        today_tasks: 0,
      });
      return null;
    }
  }, []);

  // ── Fetch today's PM tasks ───────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNoDataMessage(null);

    try {
      const result = await pmApi.getTodaysPM();

      if (result.sourceType) setSourceType(result.sourceType);
      if (result.excelFormat) setExcelFormat(result.excelFormat);
      if (result.activeSheet) setActiveSheet(result.activeSheet);
      if (result.allSheets && result.allSheets.length > 0) setAllSheets(result.allSheets);

      // If calendar data is embedded in the response, use it
      if (result.calendarData) {
        setCalendarData(result.calendarData);
      }

      // Auto-switch to calendar view if format is calendar
      if (result.excelFormat === "calendar") {
        setDashboardView("calendar");
      }

      if (!result.hasData) {
        setTasks([]);
        setNoDataMessage(result.message);
      } else {
        setTasks(result.tasks);
        setNoDataMessage(null);
        const notifs = generateNotifications(result.tasks);
        setNotifications(notifs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load PM tasks";
      if (
        msg.toLowerCase().includes("no excel") ||
        msg.toLowerCase().includes("no_file") ||
        msg.toLowerCase().includes("upload") ||
        msg.toLowerCase().includes("no data source")
      ) {
        setError(null);
        setNoDataMessage(
          "No data source connected yet. Please go to the Upload tab to connect Google Sheets or upload an Excel file."
        );
      } else {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Fetch full calendar data ─────────────────────────────────────────────
  const fetchCalendarData = useCallback(async () => {
    try {
      const data = await pmApi.getCalendarData();
      if (data) setCalendarData(data);
    } catch {
      // silently ignore
    }
  }, []);

  // ── Fetch history ────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await pmApi.getHistory();
      // Merge with any in-session completions (avoid duplicates by PM_ID+Due_Date)
      setHistoryRecords((prev) => {
        const sessionOnly = prev.filter(
          (p) =>
            p.id.startsWith("H-session-") &&
            !data.some(
              (d) => d.PM_ID === p.PM_ID && d.Due_Date === p.Due_Date
            )
        );
        return [...data, ...sessionOnly];
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load history";
      toast.error(msg);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUploadStatus().then(() => {
      fetchTasks();
    });
  }, [fetchUploadStatus, fetchTasks]);

  // ── Show welcome toast once after data loads (calendar or tasks) ──────────
  useEffect(() => {
    if (welcomeShownRef.current) return;
    // Show as soon as we have calendar data OR when loading finishes (even no data)
    if (!isLoading && (calendarData || tasks.length > 0 || noDataMessage)) {
      welcomeShownRef.current = true;
      setTimeout(() => setShowWelcomeToast(true), 800);
    }
  }, [isLoading, calendarData, tasks, noDataMessage]);

  // ── When switching views ───────────────────────────────────────────────────
  useEffect(() => {
    if (activePage === "history") {
      fetchHistory();
    }
  }, [activePage, fetchHistory]);

  // ── When switching to calendar view ───────────────────────────────────────
  useEffect(() => {
    if (dashboardView === "calendar" && !calendarData) {
      fetchCalendarData();
    }
  }, [dashboardView, calendarData, fetchCalendarData]);

  // ── After upload or source change ─────────────────────────────────────────
  const handleUploadSuccess = useCallback(async () => {
    toast.success("✅ Data source updated! Refreshing PM data...", { duration: 3000 });
    setCalendarData(null); // Clear old calendar data
    // Fetch status first to get sheets, then fetch tasks
    const status = await fetchUploadStatus();
    if (status) {
      // If online, populate allSheets immediately from status
      if (status.available_sheets && status.available_sheets.length > 0) {
        setAllSheets(status.available_sheets);
      }
      if (status.active_sheet) {
        setActiveSheet(status.active_sheet);
      }
      if (status.source_type) {
        setSourceType(status.source_type);
      }
    }
    setTimeout(() => {
      fetchTasks();
    }, 400);
  }, [fetchTasks, fetchUploadStatus]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof FilterState, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const handleResetFilters = () => setFilters(DEFAULT_FILTERS);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesPmId =
        !filters.pmId || task.PM_ID.toLowerCase().includes(filters.pmId.toLowerCase());
      const matchesEquipment =
        !filters.equipmentName || task.Equipment_Name === filters.equipmentName;
      const matchesDueDate = !filters.dueDate || task.Due_Date === filters.dueDate;
      return matchesPmId && matchesEquipment && matchesDueDate;
    });
  }, [tasks, filters]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.Status === "Completed").length;
    const pending = tasks.filter((t) => t.Status === "Pending").length;
    const overdue = tasks.filter((t) => t.Status === "Overdue").length;
    return { total, completed, pending, overdue };
  }, [tasks]);

  const equipmentNames = useMemo(
    () => [...new Set(tasks.map((t) => t.Equipment_Name))].sort(),
    [tasks]
  );

  // ── Notifications ─────────────────────────────────────────────────────────
  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleMarkAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const handleMarkRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const handleDeleteNotif = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  const handleClearAllNotifs = () => setNotifications([]);

  // ── Save a standard-format task ───────────────────────────────────────────
  const handleSave = useCallback(
    async (pmId: string, comment: string) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const task = tasks.find((t) => t.PM_ID === pmId);

      const payload: UpdatePMPayload = {
        pm_id: pmId,
        status: "Completed",
        completed_on: today,
        comment,
        completed_by: "Technician",
        // Calendar-specific fields from the task record
        equipment_name: task?.Equipment_Name,
        crane_no: task?.Crane_No,
        location: task?.Location,
        sl_no: task?.SL_NO,
        day: task?.Day,
        month: task?.Month,
        year: task?.Year,
      };

      try {
        const result = await pmApi.updatePM(payload);

        setTasks((prev) =>
          prev.map((t) =>
            t.PM_ID === pmId
              ? { ...t, Status: "Completed", Completed_On: today, Comment: comment, Completed_By: "Technician" }
              : t
          )
        );

        if (task) {
          const histEntry: HistoryRecord = {
            id: `H-session-${Date.now()}`,
            PM_ID: task.PM_ID,
            Equipment_Name: task.Equipment_Name,
            PM_Task: task.PM_Task,
            Due_Date: task.Due_Date,
            Completed_On: today,
            Completed_By: "Technician",
            Comment: comment,
            Status: "Completed",
            action: "Task Completed",
            timestamp: new Date().toISOString(),
          };
          setHistoryRecords((prev) => [histEntry, ...prev]);
        }

        // Add notification
        const newNotif: Notification = {
          id: `notif-completed-${pmId}-${Date.now()}`,
          type: "completed",
          title: "✅ Task Completed",
          message: `${pmId} has been marked as completed and written to ${
            sourceType !== "local" ? "online source cache" : "Excel file"
          }.`,
          PM_ID: pmId,
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);

        // Refresh calendar if in calendar format
        if (excelFormat === "calendar") {
          setTimeout(() => fetchCalendarData(), 1000);
        }

        toast.success(
          `✅ ${result.message || `PM task ${pmId} marked as completed!`}`,
          { duration: 4000 }
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update PM task";
        toast.error(`❌ ${msg}`);
        throw err;
      }
    },
    [tasks, sourceType, excelFormat, fetchCalendarData]
  );

  // ── Calendar task click → open modal ─────────────────────────────────────
  const handleCalendarTaskClick = useCallback(
    (_equipment: string, day: number, cell: CalendarDayCell, equipRow: CalendarEquipmentRow) => {
      if (!calendarData) return;
      setCalendarModal({
        open: true,
        equipRow,
        day,
        month: calendarData.month,
        year: calendarData.year,
        cell,
      });
    },
    [calendarData]
  );

  // ── Calendar modal confirm ────────────────────────────────────────────────
  const handleCalendarConfirm = useCallback(
    async (completedBy: string, comment: string, actCode: string) => {
      const { equipRow, day, month, year } = calendarModal;
      if (!equipRow) return;
      const equipment = equipRow.equipment;
      const today = format(new Date(), "yyyy-MM-dd");
      const pmId = `PM-${(equipRow.crane_no || equipment).replace(/\s+/g, "-").slice(0, 20)}-${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;

      const payload: UpdatePMPayload = {
        pm_id: pmId,
        status: "Completed",
        completed_on: today,
        comment,
        completed_by: completedBy,
        act_value: actCode,
        equipment_name: equipment,
        crane_no: equipRow.crane_no,
        location: equipRow.location,
        sl_no: equipRow.sl_no,
        day,
        month,
        year,
      };

      const result = await pmApi.updatePM(payload);

      // Update calendar data in state — use the selected act code for coloring
      setCalendarData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          calendar_matrix: prev.calendar_matrix.map((eq) => {
            if (eq.equipment !== equipment) return eq;
            return {
              ...eq,
              days: eq.days.map((d) =>
                d.day === day
                  ? { ...d, act: actCode, status: "Completed" as const }
                  : d
              ),
            };
          }),
        };
      });

      // Also update tasks list if that task exists
      setTasks((prev) =>
        prev.map((t) =>
          t.Equipment_Name === equipment && t.Day === day
            ? { ...t, Status: "Completed", Completed_On: today, Comment: comment, Completed_By: completedBy }
            : t
        )
      );

      // Add history entry (session only — will be replaced by real data on next fetchHistory)
      const histEntry: HistoryRecord = {
        id: `H-session-${Date.now()}`,
        PM_ID: pmId,
        Equipment_Name: equipment,
        SL_NO: equipRow.sl_no,
        Crane_No: equipRow.crane_no,
        Location: equipRow.location,
        PM_Task: `Preventive Maintenance — ${equipRow.crane_no || equipment}`,
        Due_Date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        Completed_On: today,
        Completed_By: completedBy,
        Comment: comment,
        Status: "Completed",
        action: "Task Completed (Calendar)",
        timestamp: new Date().toISOString(),
        Act_Value: actCode,
        Sheet_Name: activeSheet ?? undefined,
        Day: day,
        Month: month,
        Year: year,
      };
      setHistoryRecords((prev) => [histEntry, ...prev]);

      // Notification
      const newNotif: Notification = {
        id: `notif-cal-${equipment}-${day}-${Date.now()}`,
        type: "completed",
        title: "✅ Calendar PM Completed",
        message: `${equipment} — Day ${day}: ACT code "${actCode}" written to Excel with matching color.`,
        Equipment_Name: equipment,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);

      toast.success(
        `✅ ${result.message || `${equipment} Day ${day} PM completed and saved to Excel!`}`,
        { duration: 4500 }
      );
    },
    [calendarModal]
  );

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const headers = ["PM_ID","Equipment_Name","PM_Task","Due_Date","Status","Completed_By","Completed_On","Comment"];
    const rows = tasks.map((t) => [
      t.PM_ID, `"${t.Equipment_Name}"`, `"${t.PM_Task}"`,
      t.Due_Date, t.Status, t.Completed_By, t.Completed_On, `"${t.Comment}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = `PM_Checklist_${today}.csv`;
    link.click();
    toast.success("📊 CSV exported successfully!");
  };

  const completionPercent =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const isExcelLoaded =
    (uploadStatus?.uploaded ?? false) ||
    sourceType === "google_sheets_live" ||
    allSheets.length > 0;
  const isOnlineSource = sourceType !== "local" && sourceType !== "mock";
  const isCalendarFormat = excelFormat === "calendar";

  const currentMonth = calendarData ? MONTH_NAMES[calendarData.month - 1] : "";
  const currentYear = calendarData?.year ?? new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer />

      {/* ── Welcome Toast (WhatsApp-style) ──────────────────────────────── */}
      <WelcomeToast
        calendarData={calendarData}
        isLoading={isLoading}
        onNavigateToDashboard={() => setActivePage("dashboard")}
        onDismiss={() => setShowWelcomeToast(false)}
        visible={showWelcomeToast}
      />

      {/* Notification Panel */}
      {showNotifPanel && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifPanel(false)}
          onMarkAllRead={handleMarkAllRead}
          onMarkRead={handleMarkRead}
          onDelete={handleDeleteNotif}
          onClearAll={handleClearAllNotifs}
        />
      )}

      {/* Calendar Complete Modal */}
      {calendarModal.open && calendarModal.cell && calendarModal.equipRow && (
        <CalendarCompleteModal
          equipRow={calendarModal.equipRow}
          day={calendarModal.day}
          month={calendarModal.month}
          year={calendarModal.year}
          cell={calendarModal.cell}
          onConfirm={handleCalendarConfirm}
          onClose={() => setCalendarModal((prev) => ({ ...prev, open: false }))}
        />
      )}

      <Header
        pendingCount={stats.pending}
        completedCount={stats.completed}
        overdueCount={stats.overdue}
        unreadNotifCount={unreadNotifCount}
        activePage={activePage}
        onPageChange={(page) => setActivePage(page)}
        onNotificationClick={() => setShowNotifPanel((prev) => !prev)}
        onExport={handleExport}
        isExcelLoaded={isExcelLoaded}
        isOnlineSource={isOnlineSource}
        sourceLabel={uploadStatus?.label}
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Sheet Selector Modal */}
        {showSheetModal && (
          <SheetSelector
            asModal={true}
            activeSheet={activeSheet}
            onSheetSelected={(sheetName, fmt) => {
              setActiveSheet(sheetName);
              setExcelFormat(fmt);
              setShowSheetModal(false);
              setTimeout(() => {
                fetchTasks();
                fetchUploadStatus();
              }, 300);
            }}
            onClose={() => setShowSheetModal(false)}
          />
        )}

        {/* ── HOME PAGE ────────────────────────────────────────────────────── */}
        {activePage === "home" && (
          <HomePage
            calendarData={calendarData}
            isLoading={isLoading}
            isExcelLoaded={isExcelLoaded}
            isDemo={sourceType === "mock"}
            onGoToDashboard={() => setActivePage("dashboard")}
            onGoToUpload={() => setActivePage("upload")}
            onRefresh={fetchTasks}
          />
        )}

        {/* ── DASHBOARD PAGE ──────────────────────────────────────────────── */}
        {activePage === "dashboard" && (
          <>
            {/* Multi-sheet quick-switch bar */}
            {allSheets.length > 1 && !isLoading && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                <Layers className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="text-xs text-indigo-800 font-medium flex-1">
                  <strong>Multi-sheet file loaded.</strong> Active sheet:{" "}
                  <strong className="text-indigo-700">"{activeSheet}"</strong>
                  {" "}— {allSheets.length} sheets available ({allSheets.slice(0, 5).join(", ")}{allSheets.length > 5 ? "..." : ""})
                </span>
                <button
                  onClick={() => setShowSheetModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex-shrink-0"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Switch Sheet
                </button>
              </div>
            )}

            {/* Banner */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl px-6 py-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Today's PM Checklist</h2>
                  <p className="text-blue-200 text-sm mt-0.5">
                    {format(new Date(), "EEEE, MMMM dd, yyyy")} — Daily Preventive Maintenance Tasks
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {isCalendarFormat && (
                      <span className="flex items-center gap-1 text-xs bg-purple-500/40 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30 font-medium">
                        <Calendar className="w-3 h-3" />
                        Calendar Format — {currentMonth} {currentYear}
                      </span>
                    )}
                    {isOnlineSource && uploadStatus?.url && (
                      <a
                        href={uploadStatus.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-300 hover:text-white underline underline-offset-2"
                      >
                        <Globe className="w-3 h-3" />
                        {uploadStatus.label || "Online Source"} — Live Data
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="flex-shrink-0 min-w-[200px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-blue-200">Completion Progress</span>
                  <span className="text-sm font-bold text-white">{completionPercent}%</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <p className="text-xs text-blue-200 mt-1">
                  {stats.completed} of {stats.total} tasks completed
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total Tasks" value={stats.total} icon={<ClipboardList className="w-full h-full" />} color="blue" subtitle="Today's schedule" />
              <StatsCard title="Pending" value={stats.pending} icon={<Clock className="w-full h-full" />} color="red" subtitle="Awaiting action" />
              <StatsCard title="Completed" value={stats.completed} icon={<CheckCircle2 className="w-full h-full" />} color="green" subtitle="Done today" />
              <StatsCard title="Overdue" value={stats.overdue} icon={<AlertTriangle className="w-full h-full" />} color="orange" subtitle="Past due date" />
            </div>

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Failed to Load PM Tasks</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                  <button onClick={fetchTasks} className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 underline">
                    Try again →
                  </button>
                </div>
              </div>
            )}

            {/* No Data Message */}
            {!isLoading && !error && noDataMessage && (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl px-6 py-10 flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <ClipboardList className="w-10 h-10 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-700 font-semibold text-lg">No PM Tasks Found for Today</p>
                  <p className="text-gray-500 text-sm mt-2 max-w-md leading-relaxed">{noDataMessage}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  {!isExcelLoaded && (
                    <button
                      onClick={() => setActivePage("upload")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                    >
                      <CloudUpload className="w-4 h-4" />
                      Connect Data Source
                    </button>
                  )}
                  {isCalendarFormat && calendarData && (
                    <button
                      onClick={() => setDashboardView("calendar")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                    >
                      <Calendar className="w-4 h-4" />
                      View Full Calendar
                    </button>
                  )}
                  <button
                    onClick={fetchTasks}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                  >
                    Refresh Tasks
                  </button>
                </div>
              </div>
            )}

            {/* Overdue Warning Banner */}
            {stats.overdue > 0 && !isLoading && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">
                    ⚠️ {stats.overdue} overdue task{stats.overdue > 1 ? "s" : ""}
                  </span>{" "}
                  require immediate attention.
                </p>
                <button
                  onClick={() => setShowNotifPanel(true)}
                  className="ml-auto text-xs font-semibold text-orange-700 hover:text-orange-900 whitespace-nowrap underline"
                >
                  View alerts →
                </button>
              </div>
            )}

            {/* ── View Toggle (Calendar / Checklist) ──────────────────────── */}
            {!noDataMessage && !isLoading && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1.5 w-fit">
                <button
                  onClick={() => setDashboardView("checklist")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                    dashboardView === "checklist"
                      ? "bg-white text-blue-700 shadow-md"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <ClipboardList className="w-4 h-4" />
                  Checklist View
                </button>
                {(isCalendarFormat || calendarData) && (
                  <button
                    onClick={() => setDashboardView("calendar")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                      dashboardView === "calendar"
                        ? "bg-white text-purple-700 shadow-md"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Calendar className="w-4 h-4" />
                    Calendar View
                    {isCalendarFormat && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                        Detected
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* ── CHECKLIST VIEW ──────────────────────────────────────────── */}
            {!noDataMessage && dashboardView === "checklist" && (
              <>
                <FilterBar
                  filters={filters}
                  equipmentNames={equipmentNames}
                  onFilterChange={handleFilterChange}
                  onReset={handleResetFilters}
                  onRefresh={fetchTasks}
                  isLoading={isLoading}
                  totalCount={tasks.length}
                  filteredCount={filteredTasks.length}
                />
                <PMTable tasks={filteredTasks} onSave={handleSave} isLoading={isLoading} />
              </>
            )}

            {/* ── CALENDAR VIEW ───────────────────────────────────────────── */}
            {dashboardView === "calendar" && (
              <>
                {calendarData ? (
                  <CalendarView
                    calendarData={calendarData}
                    onTaskClick={(equip, day, cell, row) =>
                      handleCalendarTaskClick(equip, day, cell, row)
                    }
                  />
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center gap-4">
                    <Calendar className="w-12 h-12 text-gray-300" />
                    <div className="text-center">
                      <p className="text-gray-600 font-semibold">
                        {isLoading ? "Loading calendar data..." : "No calendar data available"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {!isCalendarFormat
                          ? "Calendar view is available when your Excel file uses the calendar format (LOCATION | DAY | PLAN/ACT rows)."
                          : "Loading calendar from your Excel file..."}
                      </p>
                    </div>
                    {!isLoading && (
                      <button
                        onClick={fetchCalendarData}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl"
                      >
                        <Calendar className="w-4 h-4" />
                        Load Calendar
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── HISTORY PAGE ─────────────────────────────────────────────────── */}
        {activePage === "history" && (
          <HistoryPage
            records={historyRecords}
            isLoading={historyLoading}
            onRefresh={fetchHistory}
          />
        )}

        {/* ── UPLOAD PAGE ──────────────────────────────────────────────────── */}
        {activePage === "upload" && (
          <UploadPage
            uploadStatus={uploadStatus}
            onUploadSuccess={handleUploadSuccess}
            onRefreshStatus={fetchUploadStatus}
            onNavigateToScheduler={() => setActivePage("scheduler")}
          />
        )}

        {/* ── SCHEDULER PAGE ───────────────────────────────────────────────── */}
        {activePage === "scheduler" && (
          <SchedulerPage
            activeSheet={activeSheet}
            allSheets={allSheets}
            isExcelLoaded={isExcelLoaded}
            isOnline={isOnlineSource}
            hasAppsScript={false}
            onScheduleApplied={() => {
              toast.success("✅ Schedule applied! Refreshing dashboard data...", { duration: 3500 });
              // Immediately refresh all data so dashboard is up-to-date when user arrives
              fetchTasks();
              fetchCalendarData();
              fetchUploadStatus();
            }}
            onGoToUpload={() => setActivePage("upload")}
            onGoToDashboard={() => {
              setActivePage("dashboard");
              setDashboardView("calendar");
            }}
          />
        )}

        {/* Footer */}
        <footer className="text-center py-4 border-t border-gray-200 mt-4">
          <p className="text-xs text-gray-400">
            PM Checklist System • Preventive Maintenance Management •{" "}
            {format(new Date(), "yyyy")}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Backend: FastAPI + Python + Pandas + OpenPyXL | Frontend: React + Vite + Tailwind CSS
            {isCalendarFormat && " | Format: Calendar Grid (PLAN/ACT)"}
            {isOnlineSource && " | Data: Google Sheets/Drive Live"}
          </p>
        </footer>
      </main>
    </div>
  );
}
