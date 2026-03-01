import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Calendar,
  Table2,
  HelpCircle,
  X,
  Download,
} from "lucide-react";
import { cn } from "../utils/cn";
import { pmApi } from "../api/pmApi";
import { SheetInfo } from "../types/pm";

interface SheetSelectorProps {
  /** Called when user successfully selects a sheet */
  onSheetSelected: (sheetName: string, format: string) => void;
  /** Called to close the modal */
  onClose?: () => void;
  /** Current active sheet */
  activeSheet?: string | null;
  /** Whether this is shown as a modal (true) or inline (false) */
  asModal?: boolean;
}

const FORMAT_BADGE: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  calendar: {
    label: "Calendar (PLAN/ACT)",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Calendar className="w-3 h-3" />,
  },
  standard: {
    label: "Standard PM",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Table2 className="w-3 h-3" />,
  },
  unknown: {
    label: "Unknown Format",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <HelpCircle className="w-3 h-3" />,
  },
};

export const SheetSelector: React.FC<SheetSelectorProps> = ({
  onSheetSelected,
  onClose,
  activeSheet,
  asModal = false,
}) => {
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<{
    sheetName: string;
    todayTasks: number;
    overdueTasks: number;
    format: string;
    hasData: boolean;
  } | null>(null);

  const loadSheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pmApi.getSheets();
      setSheets(res.sheets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sheets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();
  }, []);

  const handleSelect = async (sheetName: string) => {
    setSelecting(sheetName);
    setSelectedResult(null);
    try {
      const res = await pmApi.selectSheet(sheetName);
      setSelectedResult({
        sheetName,
        todayTasks: res.today_tasks,
        overdueTasks: res.overdue_tasks,
        format: res.excel_format,
        hasData: res.has_data,
      });
      // Update local is_active flags
      setSheets((prev) =>
        prev.map((s) => ({ ...s, is_active: s.name === sheetName }))
      );
      // Notify parent after short delay for UX
      setTimeout(() => {
        onSheetSelected(sheetName, res.excel_format);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select sheet");
    } finally {
      setSelecting(null);
    }
  };

  const handleDownload = () => {
    pmApi.downloadExcel();
  };

  const content = (
    <div className={cn("space-y-4", asModal ? "p-6" : "p-0")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl flex-shrink-0">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Select Sheet to Load</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Your Excel file has multiple sheets. Choose which one to display in the dashboard.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <FileSpreadsheet className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Only the selected sheet will be loaded and updated.</strong>{" "}
          All other sheets remain completely unchanged. You can switch sheets anytime from the Upload tab.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-3">
          <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
          <span className="text-sm text-gray-500">Reading sheet names from Excel file...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to load sheets</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
            <button
              onClick={loadSheets}
              className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 underline"
            >
              Try again →
            </button>
          </div>
        </div>
      )}

      {/* Sheet List */}
      {!loading && !error && sheets.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {sheets.length} Sheet{sheets.length > 1 ? "s" : ""} Found
            </p>
            <button
              onClick={loadSheets}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {sheets.map((sheet) => {
            const badge = FORMAT_BADGE[sheet.format] || FORMAT_BADGE.unknown;
            const isCurrentActive = sheet.name === (activeSheet || sheets.find((s) => s.is_active)?.name);
            const isSelecting = selecting === sheet.name;
            const isJustSelected = selectedResult?.sheetName === sheet.name;

            return (
              <button
                key={sheet.name}
                onClick={() => !isSelecting && handleSelect(sheet.name)}
                disabled={!!selecting}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all",
                  isCurrentActive
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30",
                  !!selecting && !isSelecting && "opacity-50 cursor-not-allowed",
                  isSelecting && "border-indigo-400 bg-indigo-50"
                )}
              >
                {/* Sheet Icon */}
                <div
                  className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    isCurrentActive ? "bg-indigo-100" : "bg-gray-100"
                  )}
                >
                  <FileSpreadsheet
                    className={cn(
                      "w-5 h-5",
                      isCurrentActive ? "text-indigo-600" : "text-gray-500"
                    )}
                  />
                </div>

                {/* Sheet Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-sm font-bold truncate",
                        isCurrentActive ? "text-indigo-800" : "text-gray-800"
                      )}
                    >
                      {sheet.name}
                    </span>
                    {isCurrentActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500 text-white font-bold flex-shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
                        badge.color
                      )}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                    {isJustSelected && selectedResult && (
                      <span className="text-[10px] text-gray-500">
                        {selectedResult.todayTasks} today ·{" "}
                        {selectedResult.overdueTasks} overdue
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Action */}
                <div className="flex-shrink-0">
                  {isSelecting ? (
                    <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                  ) : isJustSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : isCurrentActive ? (
                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Result Summary */}
      {selectedResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-800">
              Sheet "{selectedResult.sheetName}" loaded!
            </p>
          </div>
          <p className="text-xs text-emerald-700">
            {selectedResult.hasData
              ? `Found ${selectedResult.todayTasks} task(s) for today and ${selectedResult.overdueTasks} overdue.`
              : "No tasks found for today in this sheet — try a different sheet or check the date columns."}
          </p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">
            🔄 Dashboard will refresh with this sheet's data...
          </p>
        </div>
      )}

      {/* Download Button */}
      {!loading && sheets.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors group"
          >
            <Download className="w-3.5 h-3.5 group-hover:text-blue-600 transition-colors" />
            Download current Excel file (with all updates applied)
          </button>
        </div>
      )}
    </div>
  );

  if (!asModal) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
};
