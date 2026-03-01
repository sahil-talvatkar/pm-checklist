import React from "react";
import { format } from "date-fns";
import { Wrench, Bell, Download, Activity, ClipboardList, History, CloudUpload, CalendarRange, Home } from "lucide-react";
import { cn } from "../utils/cn";

export type ActivePage = "home" | "dashboard" | "history" | "upload" | "demo" | "scheduler";

interface HeaderProps {
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
  unreadNotifCount: number;
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  onNotificationClick: () => void;
  onExport: () => void;
  isExcelLoaded?: boolean;
  isOnlineSource?: boolean;
  sourceLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  pendingCount,
  completedCount,
  overdueCount,
  unreadNotifCount,
  activePage,
  onPageChange,
  onNotificationClick,
  onExport,
  isExcelLoaded = false,
  isOnlineSource = false,
  sourceLabel,
}) => {
  const today = new Date();
  const dayName = format(today, "EEEE");
  const dateStr = format(today, "MMMM dd, yyyy");

  const NAV_TABS = [
    {
      id: "home" as ActivePage,
      label: "Home",
      icon: <Home className="w-4 h-4" />,
      badge: undefined,
      badgeColor: "bg-sky-500",
    },
    {
      id: "dashboard" as ActivePage,
      label: "PM Checklist",
      icon: <ClipboardList className="w-4 h-4" />,
      badge: pendingCount + overdueCount > 0 ? String(pendingCount + overdueCount) : undefined,
      badgeColor: "bg-red-500",
    },
    {
      id: "history" as ActivePage,
      label: "History",
      icon: <History className="w-4 h-4" />,
      badge: completedCount > 0 ? String(completedCount) : undefined,
      badgeColor: "bg-emerald-500",
    },
    {
      id: "upload" as ActivePage,
      label: "Upload",
      icon: <CloudUpload className="w-4 h-4" />,
      dot: true,
      dotColor: isExcelLoaded ? "bg-emerald-400" : "bg-amber-400 animate-pulse",
      dotTitle: isExcelLoaded ? "Excel file loaded" : "No Excel file uploaded",
    },
    {
      id: "scheduler" as ActivePage,
      label: "Scheduler",
      icon: <CalendarRange className="w-4 h-4" />,
      badge: "AUTO",
      badgeColor: "bg-violet-500",
    },
  ] as const;

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white shadow-xl sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
                <Wrench className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight tracking-tight">
                  PM Checklist System
                </h1>
                <p className="text-blue-300 text-xs font-medium flex items-center gap-1.5 mt-0.5">
                  <Activity className="w-3 h-3" />
                  Preventive Maintenance Management
                </p>
              </div>
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center bg-white/10 rounded-xl p-1 gap-0.5 border border-white/10 flex-wrap">
              {NAV_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onPageChange(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
                    activePage === tab.id
                      ? tab.id === "scheduler"
                        ? "bg-white text-violet-800 shadow-md"
                        : tab.id === "home"
                        ? "bg-white text-sky-800 shadow-md"
                        : "bg-white text-slate-800 shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>

                  {"badge" in tab && tab.badge && (
                    <span
                      className={cn(
                        "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white",
                        tab.badgeColor,
                        activePage !== tab.id && "opacity-80"
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}

                  {"dot" in tab && tab.dot && (
                    <span
                      className={cn("ml-0.5 w-2 h-2 rounded-full", tab.dotColor)}
                      title={tab.dotTitle}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Date Badge */}
            <div className="text-right hidden sm:block">
              <p className="text-xs text-blue-300 font-medium">{dayName}</p>
              <p className="text-sm font-semibold text-white">{dateStr}</p>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={onNotificationClick}
                className={cn(
                  "p-2.5 rounded-xl transition-all border",
                  unreadNotifCount > 0
                    ? "bg-orange-500/20 border-orange-400/40 hover:bg-orange-500/30"
                    : "bg-white/10 border-white/10 hover:bg-white/20"
                )}
                title={`${unreadNotifCount} unread notifications`}
              >
                <Bell
                  className={cn(
                    "w-5 h-5",
                    unreadNotifCount > 0 ? "text-orange-300" : "text-white"
                  )}
                />
              </button>
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1 shadow-lg animate-pulse border-2 border-slate-900">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </div>

            {/* Export Button */}
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all border border-blue-500 shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            <span>{pendingCount} Pending</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>{completedCount} Completed</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block animate-pulse" />
            <span>{overdueCount} Overdue</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-slate-400">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isExcelLoaded
                  ? isOnlineSource ? "bg-blue-400 animate-pulse" : "bg-emerald-400"
                  : "bg-amber-400 animate-pulse"
              )}
            />
            <span>
              {isExcelLoaded
                ? isOnlineSource
                  ? `🌐 ${sourceLabel || "Online Source"}`
                  : "Excel DB: Connected"
                : "No Data Source"}
            </span>
          </div>
          <div className="hidden sm:block text-slate-400 border-l border-white/10 pl-4">
            {activePage === "home"       && "🏠 Home — Today / Overdue / Tomorrow"}
            {activePage === "dashboard"  && "📋 PM Checklist System"}
            {activePage === "history"    && "📜 PM History Log"}
            {activePage === "upload"     && "🌐 Data Source Manager"}
            {activePage === "scheduler"  && "🗓️ Auto PM Scheduler"}
          </div>
        </div>
      </div>
    </header>
  );
};
