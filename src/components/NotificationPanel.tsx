import React from "react";
import { Notification } from "../types/pm";
import { format, formatDistanceToNow } from "date-fns";
import {
  X,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { cn } from "../utils/cn";

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const notifConfig = {
  overdue: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    dot: "bg-orange-500",
    label: "Overdue",
    labelColor: "text-orange-700 bg-orange-100",
  },
  pending: {
    icon: <Clock className="w-4 h-4" />,
    bg: "bg-red-50 border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    dot: "bg-red-500",
    label: "Pending",
    labelColor: "text-red-700 bg-red-100",
  },
  completed: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    bg: "bg-emerald-50 border-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    dot: "bg-emerald-500",
    label: "Completed",
    labelColor: "text-emerald-700 bg-emerald-100",
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    bg: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    dot: "bg-blue-500",
    label: "Info",
    labelColor: "text-blue-700 bg-blue-100",
  },
};

interface NotifCardProps {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotifCard: React.FC<NotifCardProps> = ({ notif, onMarkRead, onDelete }) => {
  const config = notifConfig[notif.type];
  const timeAgo = formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true });
  const fullDate = format(new Date(notif.timestamp), "MMM dd, yyyy HH:mm");

  return (
    <div
      className={cn(
        "relative border rounded-xl p-3.5 transition-all group",
        config.bg,
        !notif.read && "shadow-sm"
      )}
    >
      {/* Unread dot */}
      {!notif.read && (
        <span
          className={cn(
            "absolute top-3 right-3 w-2.5 h-2.5 rounded-full animate-pulse",
            config.dot
          )}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn("p-2 rounded-lg flex-shrink-0 mt-0.5", config.iconBg)}>
          <div className={config.iconColor}>{config.icon}</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className={cn("text-xs font-bold", !notif.read ? "text-gray-900" : "text-gray-600")}>
              {notif.title}
            </p>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", config.labelColor)}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
          {notif.PM_ID && (
            <p className="text-[10px] font-mono text-gray-400 mt-1">
              ID: {notif.PM_ID}
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-1.5" title={fullDate}>
            🕐 {timeAgo}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-black/5">
        {!notif.read && (
          <button
            onClick={() => onMarkRead(notif.id)}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <CheckCheck className="w-3 h-3" />
            Mark read
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors ml-auto"
        >
          <Trash2 className="w-3 h-3" />
          Dismiss
        </button>
      </div>
    </div>
  );
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
  onDelete,
  onClearAll,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const grouped = {
    overdue: notifications.filter((n) => n.type === "overdue"),
    pending: notifications.filter((n) => n.type === "pending"),
    completed: notifications.filter((n) => n.type === "completed"),
    info: notifications.filter((n) => n.type === "info"),
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Notifications</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Summary Chips */}
        <div className="flex gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0 flex-wrap">
          {Object.entries(grouped).map(([type, items]) =>
            items.length > 0 ? (
              <span
                key={type}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-semibold border",
                  notifConfig[type as keyof typeof notifConfig].labelColor,
                  "border-transparent"
                )}
              >
                {items.length} {type}
              </span>
            ) : null
          )}
        </div>

        {/* Action Buttons */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
            <button
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold transition-colors",
                unreadCount > 0
                  ? "text-blue-600 hover:text-blue-800"
                  : "text-gray-300 cursor-not-allowed"
              )}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-20">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <div>
                <p className="text-gray-500 font-semibold">No Notifications</p>
                <p className="text-gray-400 text-sm mt-1">
                  You're all caught up! Notifications will appear here.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Overdue first - most critical */}
              {grouped.overdue.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Critical — Overdue
                  </p>
                  <div className="space-y-2">
                    {grouped.overdue.map((n) => (
                      <NotifCard key={n.id} notif={n} onMarkRead={onMarkRead} onDelete={onDelete} />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending */}
              {grouped.pending.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Reminders
                  </p>
                  <div className="space-y-2">
                    {grouped.pending.map((n) => (
                      <NotifCard key={n.id} notif={n} onMarkRead={onMarkRead} onDelete={onDelete} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {grouped.completed.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Recent Completions
                  </p>
                  <div className="space-y-2">
                    {grouped.completed.map((n) => (
                      <NotifCard key={n.id} notif={n} onMarkRead={onMarkRead} onDelete={onDelete} />
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              {grouped.info.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    System Info
                  </p>
                  <div className="space-y-2">
                    {grouped.info.map((n) => (
                      <NotifCard key={n.id} notif={n} onMarkRead={onMarkRead} onDelete={onDelete} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            Notifications auto-refresh with task updates
          </p>
        </div>
      </div>
    </>
  );
};
