import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Info,
  RefreshCw,
  Database,
  Eye,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  File,
  Columns,
  Calendar,
  Globe,
  Link2,
  Wifi,
  WifiOff,
  Settings,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Users,
  Zap,
  Layers,
  Download,
} from "lucide-react";
import { cn } from "../utils/cn";
import { pmApi, UploadResult, UploadStatus, SetSourceResult } from "../api/pmApi";
import { SourceConfig, TestConnectionResult, SheetInfo } from "../types/pm";
import { SheetSelector } from "./SheetSelector";
import { format } from "date-fns";

interface UploadPageProps {
  uploadStatus: UploadStatus | null;
  onUploadSuccess: () => void;
  onRefreshStatus: () => Promise<unknown>;
  onNavigateToScheduler?: () => void;
}

const REQUIRED_COLUMNS = [
  "PM_ID", "Equipment_Name", "PM_Task", "Due_Date",
  "Status", "Completed_By", "Completed_On", "Comment",
];

const SAMPLE_ROWS = [
  {
    PM_ID: "PM-001", Equipment_Name: "Air Compressor",
    PM_Task: "Check filters and belts", Due_Date: format(new Date(), "yyyy-MM-dd"),
    Status: "Pending", Completed_By: "", Completed_On: "", Comment: "",
  },
  {
    PM_ID: "PM-002", Equipment_Name: "CNC Machine #1",
    PM_Task: "Lubricate spindle", Due_Date: format(new Date(), "yyyy-MM-dd"),
    Status: "Pending", Completed_By: "", Completed_On: "", Comment: "",
  },
];

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-all"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-500" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
};

type TabType = "sheets" | "local" | "online";

export const UploadPage: React.FC<UploadPageProps> = ({
  uploadStatus,
  onUploadSuccess,
  onRefreshStatus,
  onNavigateToScheduler,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(
    uploadStatus?.uploaded ? "sheets" : "local"
  );

  // ── Sheet Selector State ───────────────────────────────────────────────────
  const [sheetSelectResult, setSheetSelectResult] = useState<{
    sheetName: string; format: string;
  } | null>(null);

  // ── Online Source State ────────────────────────────────────────────────────
  // ── Online Source (new: CSV + Apps Script approach) ───────────────────────
  const [onlineUrl, setOnlineUrl] = useState("");
  const [scriptUrl, setScriptUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState<SetSourceResult | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [onlineConfig, setOnlineConfig] = useState<{
    connected: boolean; sheet_url?: string; active_worksheet?: string;
    worksheets?: {title:string;gid:string}[]; write_enabled?: boolean;
    label?: string; connected_at?: string; script_url_preview?: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_worksheets, setWorksheets] = useState<{title:string;gid:string}[]>([]);
  const [selectedWs, setSelectedWs] = useState<string>("");
  const [isSwitchingWs, setIsSwitchingWs] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sourceConfig, setSourceConfig] = useState<SourceConfig | null>(null);

  // ── Local Upload State ─────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [uploadedSheets, setUploadedSheets] = useState<SheetInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load source config on mount ────────────────────────────────────────────
  useEffect(() => {
    const base = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
    fetch(`${base}/online/get-config`)
      .then((r) => r.json())
      .then((cfg) => {
        setOnlineConfig(cfg);
        if (cfg.connected) {
          setOnlineUrl(cfg.sheet_url || "");
          setWorksheets(cfg.worksheets || []);
          setSelectedWs(cfg.active_worksheet || "");
          if (!uploadStatus?.uploaded) setActiveTab("online");
        }
      })
      .catch(() => {});
    pmApi.getSourceConfig().then((cfg) => setSourceConfig(cfg)).catch(() => {});
    if (uploadStatus?.uploaded) setActiveTab("sheets");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadStatus?.uploaded]);

  const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

  const handleTestConnection = async () => {
    if (!onlineUrl.trim()) return;
    setIsTesting(true); setTestResult(null); setConnectError(null);
    try {
      // Use /online/test-connection (modular route). Root /test-connection is also a valid alias.
      const res = await fetch(`${API_BASE}/online/test-connection?url=${encodeURIComponent(onlineUrl.trim())}`);
      const data = await res.json();
      setTestResult(data);
      if (data.worksheets) setWorksheets(data.worksheets);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection failed — is the backend running on port 8000?",
        total_rows: 0, today_tasks: 0, columns_found: [],
        missing_columns: [], columns_valid: false,
      });
    } finally { setIsTesting(false); }
  };

  const handleConnect = async () => {
    if (!onlineUrl.trim()) return;
    setIsConnecting(true); setConnectError(null); setConnectResult(null);
    try {
      const res = await fetch(`${API_BASE}/online/set-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_url: onlineUrl.trim(),
          script_url: scriptUrl.trim() || null,
          label: sourceLabel.trim() || "Google Sheets",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.detail?.message || data?.detail || "Failed to connect";
        setConnectError(typeof msg === "string" ? msg : JSON.stringify(msg));
        return;
      }
      setConnectResult({ message: data.message, source_type: "google_sheets_live", label: data.label || "Google Sheets" });
      setOnlineConfig({ connected: true, sheet_url: onlineUrl.trim(), active_worksheet: data.active_worksheet,
        worksheets: data.worksheets || [], write_enabled: !!scriptUrl.trim(), label: sourceLabel || "Google Sheets" });
      setWorksheets(data.worksheets || []);
      setSelectedWs(data.active_worksheet || "");
      onUploadSuccess();
      await onRefreshStatus();
      // Navigate to Scheduler after a short delay so user sees the success message
      if (onNavigateToScheduler) {
        setTimeout(() => onNavigateToScheduler(), 1500);
      }
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to connect");
    } finally { setIsConnecting(false); }
  };

  const handleSwitchWorksheet = async (gid: string, title: string) => {
    setIsSwitchingWs(true);
    try {
      const res = await fetch(`${API_BASE}/online/select-worksheet`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worksheet_title: title, gid }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedWs(title);
        setOnlineConfig((prev) => prev ? { ...prev, active_worksheet: title } : prev);
        onUploadSuccess(); await onRefreshStatus();
      } else { setConnectError(data?.detail?.message || "Failed to switch worksheet"); }
    } catch (err) { setConnectError(err instanceof Error ? err.message : "Failed"); }
    finally { setIsSwitchingWs(false); }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_BASE}/online/disconnect`, { method: "DELETE" });
      setOnlineConfig(null); setConnectResult(null); setTestResult(null);
      setOnlineUrl(""); setScriptUrl(""); setWorksheets([]); setSelectedWs("");
      onUploadSuccess(); await onRefreshStatus();
    } catch { /* ignore */ }
  };

  const handleRefreshOnline = async () => {
    setIsRefreshing(true);
    try { onUploadSuccess(); await onRefreshStatus(); }
    finally { setIsRefreshing(false); }
  };

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (file: File) => {
    setUploadError(null); setUploadResult(null); setUploadedSheets([]);
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setUploadError("Invalid file type. Please select an Excel file (.xlsx or .xls)."); return;
    }
    if (file.size > 50 * 1024 * 1024) { setUploadError("File size exceeds 50MB limit."); return; }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true); setUploadError(null); setUploadResult(null); setUploadedSheets([]);
    try {
      const result = await pmApi.uploadExcel(selectedFile);
      setUploadResult(result);
      if (result.sheets && result.sheets.length > 0) {
        setUploadedSheets(result.sheets);
      }
      onUploadSuccess();
      await onRefreshStatus();
      // Auto-switch to sheets tab if multiple sheets, then navigate to scheduler
      if (result.total_sheets && result.total_sheets > 1) {
        setTimeout(() => setActiveTab("sheets"), 600);
      } else if (onNavigateToScheduler) {
        // Single-sheet: go straight to Scheduler like a local upload should
        setTimeout(() => onNavigateToScheduler(), 1500);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally { setIsUploading(false); }
  };

  const handleClearFile = () => {
    setSelectedFile(null); setUploadResult(null); setUploadError(null); setUploadedSheets([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleSheetSelected = (sheetName: string, fmt: string) => {
    setSheetSelectResult({ sheetName, format: fmt });
    onUploadSuccess();
  };

  const handleDownload = () => pmApi.downloadExcel();

  const isOnlineActive = sourceConfig?.source_type !== "local" && sourceConfig?.url;
  const canConnect = onlineUrl.trim().length > 10;
  const hasMultipleSheets = (uploadStatus?.total_sheets ?? 0) > 1;

  const TABS: { id: TabType; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: "sheets",
      label: "Manage Sheets",
      icon: <Layers className="w-4 h-4" />,
      badge: uploadStatus?.uploaded ? String(uploadStatus.total_sheets ?? 1) : undefined,
      badgeColor: "bg-indigo-100 text-indigo-700",
    },
    {
      id: "local",
      label: "Upload File",
      icon: <Upload className="w-4 h-4" />,
    },
    {
      id: "online",
      label: "Online Source",
      icon: <Globe className="w-4 h-4" />,
      badge: "Soon",
      badgeColor: "bg-blue-100 text-blue-700",
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 rounded-xl px-6 py-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-xl">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Data Source Manager</h2>
            <p className="text-emerald-200 text-sm mt-0.5">
              Upload your Excel file · Select the correct sheet · Track PM tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadStatus?.uploaded && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white/20 hover:bg-white/30 rounded-lg transition-all border border-white/20 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          )}
          <button
            onClick={async () => { await onRefreshStatus(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white/20 hover:bg-white/30 rounded-lg transition-all border border-white/20 flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Current Source Status Card ──────────────────────────────────────── */}
      <div className={cn(
        "rounded-xl border p-5 shadow-sm",
        uploadStatus?.uploaded ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-xl flex-shrink-0",
            uploadStatus?.uploaded ? "bg-emerald-100" : "bg-amber-100"
          )}>
            {uploadStatus?.source_type && uploadStatus.source_type !== "local"
              ? <Globe className={cn("w-5 h-5", uploadStatus.uploaded ? "text-emerald-600" : "text-amber-600")} />
              : <Database className={cn("w-5 h-5", uploadStatus?.uploaded ? "text-emerald-600" : "text-amber-600")} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn("text-sm font-bold",
                uploadStatus?.uploaded ? "text-emerald-800" : "text-amber-800"
              )}>
                {uploadStatus?.uploaded
                  ? `✅ ${uploadStatus.label || "Data Source"} Connected`
                  : "⚠️ No Data Source Connected"}
              </h3>
              {uploadStatus?.source_type === "local" && uploadStatus.uploaded && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200 flex items-center gap-1">
                  <File className="w-3 h-3" /> Local File
                </span>
              )}
              {uploadStatus?.active_sheet && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Sheet: {uploadStatus.active_sheet}
                </span>
              )}
              {hasMultipleSheets && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold border border-purple-200 flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3" />
                  {uploadStatus!.total_sheets} sheets
                </span>
              )}
            </div>
            <p className={cn("text-xs mt-1", uploadStatus?.uploaded ? "text-emerald-700" : "text-amber-700")}>
              {uploadStatus?.message}
            </p>

            {/* Multi-sheet alert */}
            {hasMultipleSheets && (
              <div className="mt-2 flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-800">
                  <strong>Multiple sheets detected!</strong> Currently loading:{" "}
                  <strong>"{uploadStatus?.active_sheet}"</strong>.
                  Go to <strong>Manage Sheets</strong> tab to switch sheets.
                </p>
              </div>
            )}

            {uploadStatus?.uploaded && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { label: "Total Tasks", value: uploadStatus.total_rows, color: "text-blue-700" },
                  { label: "Today's PMs", value: uploadStatus.today_tasks, color: "text-purple-700" },
                  { label: "Sheets", value: uploadStatus.total_sheets ?? 1, color: "text-indigo-700" },
                  {
                    label: "File Size",
                    value: uploadStatus.file_size_bytes ? formatBytes(uploadStatus.file_size_bytes) : "—",
                    color: "text-gray-700",
                  },
                  {
                    label: "Last Modified",
                    value: uploadStatus.last_modified
                      ? format(new Date(uploadStatus.last_modified), "MMM dd, HH:mm")
                      : "—",
                    color: "text-gray-700",
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-lg p-2.5 border border-emerald-100">
                    <p className="text-[10px] text-gray-500 font-medium uppercase">{item.label}</p>
                    <p className={cn("text-base font-bold", item.color)}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {isOnlineActive && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={handleRefreshOnline}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-60"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Refreshing..." : "Re-sync from Online Source"}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  <File className="w-3.5 h-3.5" />
                  Switch to Local File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-bold rounded-lg transition-all",
              activeTab === tab.id
                ? tab.id === "sheets"
                  ? "bg-white text-indigo-700 shadow-md"
                  : tab.id === "local"
                  ? "bg-white text-emerald-700 shadow-md"
                  : "bg-white text-blue-700 shadow-md"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", tab.badgeColor)}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MANAGE SHEETS TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "sheets" && (
        <div className="space-y-5">
          {/* How it works */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Multi-Sheet Excel Support
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: <FileSpreadsheet className="w-5 h-5 text-indigo-600" />,
                  title: "All Sheets Detected",
                  desc: "The system reads all sheet names (e.g. Jan-24, Feb-24... Feb-26) from your uploaded file.",
                  bg: "bg-indigo-100",
                },
                {
                  icon: <CheckCircle2 className="w-5 h-5 text-purple-600" />,
                  title: "You Choose",
                  desc: "Select which month/sheet to load in the dashboard. Switch anytime without re-uploading.",
                  bg: "bg-purple-100",
                },
                {
                  icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
                  title: "Isolated Updates",
                  desc: "When you complete a task, ONLY the selected sheet is updated. All other sheets stay untouched.",
                  bg: "bg-emerald-100",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg flex-shrink-0", item.bg)}>{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!uploadStatus?.uploaded ? (
            /* No file yet */
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <FileSpreadsheet className="w-10 h-10 text-gray-400" />
              </div>
              <div>
                <p className="text-gray-700 font-semibold text-lg">No Excel File Uploaded Yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Upload your Excel file first to see and select sheets.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("local")}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Go to Upload Tab
              </button>
            </div>
          ) : (
            /* Sheet Selector */
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <SheetSelector
                onSheetSelected={handleSheetSelected}
                activeSheet={uploadStatus.active_sheet}
                asModal={false}
              />
            </div>
          )}

          {/* Sheet select result feedback */}
          {sheetSelectResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  Sheet "{sheetSelectResult.sheetName}" is now active
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Format: <strong>{sheetSelectResult.format}</strong> ·
                  Dashboard is refreshing with this sheet's PM tasks.
                </p>
              </div>
            </div>
          )}

          {/* Download button */}
          {uploadStatus?.uploaded && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-gray-600" />
                Download Updated Excel File
              </h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Download the complete Excel file as-is — all sheets included, with any PM completions
                you have saved (√ marks) already written into the appropriate sheet.
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download pm_data.xlsx (All Sheets)
              </button>
              <p className="text-[10px] text-gray-400 mt-2">
                ✅ The downloaded file contains all original sheets plus any updates you made through this system.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          LOCAL UPLOAD TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "local" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT: Drop Zone */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                Upload Your Excel File
              </h3>

              {/* Multi-sheet tip */}
              <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-800 leading-relaxed">
                  <strong>Multi-sheet Excel files supported!</strong> Upload your file with all monthly
                  sheets (Jan-24 to Feb-26). After upload, go to{" "}
                  <strong>Manage Sheets</strong> tab to select which month to display.
                </p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                  isDragging ? "border-emerald-400 bg-emerald-50 scale-[1.01]" :
                  selectedFile ? "border-emerald-300 bg-emerald-50/50 cursor-default" :
                  "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/30"
                )}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls"
                  onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                  className="hidden" />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                      <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleClearFile(); }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                      <X className="w-3.5 h-3.5" /> Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className={cn("p-4 rounded-full transition-all", isDragging ? "bg-emerald-100" : "bg-gray-100")}>
                      <CloudUpload className={cn("w-10 h-10", isDragging ? "text-emerald-500" : "text-gray-400")} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">
                        {isDragging ? "Drop your Excel file here" : "Drag & drop your Excel file"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500 font-medium">
                      .xlsx or .xls • Up to 50MB • Multi-sheet supported
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className={cn(
                  "mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all shadow-sm",
                  selectedFile && !isUploading
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {isUploading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading & reading sheets...</>
                  : <><Upload className="w-4 h-4" /> Upload Excel File</>}
              </button>

              {uploadError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Upload Failed</p>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">{uploadError}</p>
                  </div>
                </div>
              )}

              {uploadResult && !uploadError && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm font-bold text-emerald-800">Upload Successful!</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: "File", value: uploadResult.filename },
                      { label: "Format", value: uploadResult.excel_format || "calendar" },
                      { label: "Today's PMs", value: uploadResult.today_tasks },
                      { label: "Total Sheets", value: uploadResult.total_sheets ?? 1 },
                      { label: "Active Sheet", value: uploadResult.active_sheet ?? "—" },
                      { label: "Equipment", value: uploadResult.total_equipment ?? "—" },
                    ].map((item) => (
                      <div key={item.label} className="bg-white rounded-lg px-3 py-2 border border-emerald-100">
                        <p className="text-[10px] text-gray-400 font-medium uppercase">{item.label}</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Sheets list from upload result */}
                  {uploadedSheets.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        Sheets found in this file:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {uploadedSheets.map((s) => (
                          <span
                            key={s.name}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-semibold border",
                              s.is_active
                                ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            )}
                          >
                            {s.is_active ? "▶ " : ""}{s.name}
                            {s.is_active && " (active)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadResult.total_sheets && uploadResult.total_sheets > 1 && (
                    <button
                      onClick={() => setActiveTab("sheets")}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all mt-2"
                    >
                      <Layers className="w-4 h-4" />
                      Select Sheet to Load →
                    </button>
                  )}

                  <button onClick={() => setShowPreview(!showPreview)}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
                    <Eye className="w-3.5 h-3.5" />
                    {showPreview ? "Hide" : "Show"} Preview
                    {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Format Guide */}
          <div className="space-y-4">
            {/* Calendar format guide */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Calendar Format (Your Format)
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200 mb-3">
                <table className="w-full text-[10px] min-w-[500px]">
                  <tbody>
                    {[
                      {
                        cells: ["SL.NO", "CRANE NO", "LOCATION", "DAY", "Sun", "Mon", "Tue", "Wed", "Thu"],
                        type: "header",
                      },
                      {
                        cells: ["", "", "", "DATE", "1", "2", "3", "4", "5"],
                        type: "date",
                      },
                      {
                        cells: ["1", "BC-1 Crane-550", "BC-1", "PLAN", "√", "", "√", "", ""],
                        type: "plan",
                      },
                      {
                        cells: ["", "", "", "ACT", "", "M", "", "", "√"],
                        type: "act",
                      },
                      {
                        cells: ["2", "BC-2 Crane-550", "BC-2", "PLAN", "", "√", "", "", ""],
                        type: "plan",
                      },
                      {
                        cells: ["", "", "", "ACT", "", "", "W", "", "√"],
                        type: "act",
                      },
                    ].map((row, ri) => (
                      <tr key={ri} className={cn(
                        row.type === "header" ? "bg-slate-800 text-white" :
                        row.type === "date" ? "bg-gray-100 text-gray-700 font-bold" :
                        row.type === "plan" ? "bg-purple-50" :
                        "bg-blue-50"
                      )}>
                        {row.cells.map((cell, ci) => (
                          <td key={ci} className={cn(
                            "px-2 py-1.5 border border-gray-200 whitespace-nowrap",
                            row.type === "header" ? "font-bold text-center" :
                            row.type === "date" ? "text-center" :
                            ci === 3 ? (row.type === "plan" ? "text-purple-700 font-bold" : "text-blue-700 font-bold") :
                            ci > 3 && cell === "√" ? "text-emerald-700 font-bold text-center" :
                            ci > 3 && cell ? "text-orange-600 font-bold text-center" : "text-center"
                          )}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {[
                  { color: "bg-emerald-100 text-emerald-700", label: "√ = Completed" },
                  { color: "bg-orange-100 text-orange-700", label: "M/W/L.N = Overdue code" },
                  { color: "bg-purple-100 text-purple-700", label: "PLAN row = scheduled" },
                  { color: "bg-blue-100 text-blue-700", label: "ACT row = actual" },
                ].map((item) => (
                  <span key={item.label} className={cn("px-2 py-0.5 rounded-full font-semibold", item.color)}>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600" />
                Important Notes
              </h3>
              <ul className="space-y-2.5">
                {[
                  { icon: <Layers className="w-3.5 h-3.5 text-indigo-500" />, text: "Your file can have Jan-24 to Feb-26 and all other months as separate sheets — all are supported." },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />, text: "Only the selected sheet is loaded. When you mark a task complete, ONLY that sheet is updated." },
                  { icon: <Download className="w-3.5 h-3.5 text-blue-500" />, text: "Use the Download button to get the updated file with all your completions (√ marks) written back." },
                  { icon: <Calendar className="w-3.5 h-3.5 text-purple-500" />, text: "The system auto-reads today's date column and shows only today's planned tasks." },
                  { icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />, text: "Past days with PLAN marks but no ACT completion are shown as Overdue." },
                  { icon: <File className="w-3.5 h-3.5 text-gray-500" />, text: "Uploading a new file replaces the current one. The previous file is backed up automatically." },
                ].map((note, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                    <span className="mt-0.5 flex-shrink-0">{note.icon}</span>
                    <span>{note.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowFormatGuide(!showFormatGuide)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Columns className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-gray-800">Standard PM Format (Alternative)</span>
                </div>
                {showFormatGuide ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showFormatGuide && (
                <div className="border-t border-gray-100">
                  <div className="px-5 py-3 space-y-2">
                    {REQUIRED_COLUMNS.map((col, i) => (
                      <div key={col} className="flex items-center gap-3 py-1.5 px-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <code className="text-xs font-bold text-blue-800 flex-1">{col}</code>
                        <span className="text-[10px] text-gray-400">
                          {col === "PM_ID" && "Unique ID (PM-001)"}
                          {col === "Equipment_Name" && "Equipment name"}
                          {col === "PM_Task" && "Task description"}
                          {col === "Due_Date" && "YYYY-MM-DD format"}
                          {col === "Status" && "Pending / Completed / Overdue"}
                          {col === "Completed_By" && "Technician (optional)"}
                          {col === "Completed_On" && "Completion date (optional)"}
                          {col === "Comment" && "Notes (optional)"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full text-xs min-w-[700px]">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                          {REQUIRED_COLUMNS.map((col) => (
                            <th key={col} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SAMPLE_ROWS.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 font-mono font-bold text-purple-700">{row.PM_ID}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.Equipment_Name}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{row.PM_Task}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.Due_Date}</td>
                            <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold text-[10px]">{row.Status}</span></td>
                            <td className="px-3 py-2 text-gray-400 italic">—</td>
                            <td className="px-3 py-2 text-gray-400 italic">—</td>
                            <td className="px-3 py-2 text-gray-400 italic">—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONLINE SOURCE TAB  — CSV read + Apps Script write (no service account)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "online" && (
        <div className="space-y-5">

          {/* ── How it works ─────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Online Google Sheets — No Login Required
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: <Users className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", title: "Team Collaboration", desc: "Everyone opens the same app — all see live data from the same Google Sheet." },
                { icon: <Zap className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-100", title: "Zero Credentials", desc: "No service account, no API key. Just make your sheet publicly viewable and paste the link." },
                { icon: <ShieldCheck className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", title: "Write-back via Apps Script", desc: "Optional: deploy a tiny Apps Script from your sheet to enable saving completions back." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg flex-shrink-0", item.bg)}>{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Current connected status ──────────────────────────────────────── */}
          {onlineConfig?.connected && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl flex-shrink-0">
                    <Wifi className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      ✅ Connected — {onlineConfig.label || "Google Sheets"}
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Active worksheet: <strong>{onlineConfig.active_worksheet}</strong>
                      {onlineConfig.write_enabled && <span className="ml-2 text-emerald-600 font-semibold">• Write-back enabled ✍️</span>}
                    </p>
                    {(onlineConfig.worksheets?.length ?? 0) > 1 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {onlineConfig.worksheets?.map((ws) => (
                          <button key={ws.gid}
                            onClick={() => handleSwitchWorksheet(ws.gid, ws.title)}
                            disabled={isSwitchingWs}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-all",
                              ws.title === (onlineConfig.active_worksheet || selectedWs)
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                            )}>
                            {isSwitchingWs && ws.title === selectedWs ? "…" : ws.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={handleRefreshOnline} disabled={isRefreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-60">
                    <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                    {isRefreshing ? "Refreshing…" : "Refresh"}
                  </button>
                  <button onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all">
                    <WifiOff className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Make sheet public ─────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-600" />
              Step 1 — Make Your Google Sheet Publicly Viewable
            </h3>
            <div className="space-y-3">
              {[
                { n: "1", color: "bg-blue-500", text: "Open your Google Sheet in a browser." },
                { n: "2", color: "bg-blue-500", text: 'Click File → Share → Share with others.' },
                { n: "3", color: "bg-emerald-500", text: 'Under "General access", change to "Anyone with the link".' },
                { n: "4", color: "bg-emerald-500", text: 'Set role to "Viewer". Click Done.' },
                { n: "5", color: "bg-purple-500", text: 'Click "Copy link" — paste it in the URL box below.' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className={cn("w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5", s.color)}>{s.n}</span>
                  <p className="text-xs text-gray-700 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 font-semibold">⚠️ Why "Anyone with the link"?</p>
              <p className="text-xs text-amber-700 mt-0.5">
                The system reads your sheet via Google's public CSV export — no Google account or API key needed.
                The sheet link is only used server-side; it is never exposed to end users.
              </p>
            </div>
          </div>

          {/* ── Step 2: Connect ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              Step 2 — Connect Your Google Sheet
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Google Sheets Share URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/1SjFszZ43.../edit?usp=sharing"
                    value={onlineUrl}
                    onChange={(e) => { setOnlineUrl(e.target.value); setTestResult(null); setConnectResult(null); setConnectError(null); }}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-mono"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Paste the full URL from File → Share → Copy link</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Display Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input type="text" placeholder="e.g. Factory PM Master Sheet — 2025"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={handleTestConnection} disabled={!canConnect || isTesting}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all border-2",
                  canConnect && !isTesting
                    ? "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
                )}>
                {isTesting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Testing Connection…</>
                  : <><Wifi className="w-4 h-4" /> Test Connection</>}
              </button>
              <button onClick={handleConnect} disabled={!canConnect || isConnecting}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-all shadow-sm",
                  canConnect && !isConnecting
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}>
                {isConnecting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</>
                  : <><CheckCircle2 className="w-4 h-4" /> Connect &amp; Use as Source</>}
              </button>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={cn("mt-4 border rounded-xl p-4", testResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <WifiOff className="w-5 h-5 text-red-500" />}
                  <p className={cn("text-sm font-bold", testResult.success ? "text-emerald-800" : "text-red-800")}>
                    {testResult.success ? "✅ Sheet is readable!" : "❌ Connection Failed"}
                  </p>
                </div>
                <p className={cn("text-xs", testResult.success ? "text-emerald-700" : "text-red-700")}>{testResult.message}</p>
                {/* Show worksheets found */}
                {testResult.success && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { label: "Cranes Found", value: (testResult as any).equipment_count ?? "—", color: "text-emerald-700" },
                      { label: "Today's Tasks", value: testResult.today_tasks ?? "—", color: "text-blue-700" },
                      { label: "Overdue", value: (testResult as any).overdue_tasks ?? "—", color: "text-red-700" },
                    ].map((item) => (
                      <div key={item.label} className="bg-white rounded-lg px-2 py-1.5 border border-emerald-100 text-center">
                        <p className="text-[9px] text-gray-400 font-medium uppercase">{item.label}</p>
                        <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {testResult.success && (testResult as any).worksheets?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-gray-600 mb-1">Worksheets found ({(testResult as any).worksheets.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {((testResult as any).worksheets as {title:string;gid:string}[]).map((ws) => (
                        <span key={ws.gid} className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">{ws.title}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Show preview cranes */}
                {testResult.success && (testResult as any).preview?.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-[10px] border border-emerald-200 rounded">
                      <thead><tr className="bg-emerald-100"><th className="px-2 py-1 text-left">SL.NO</th><th className="px-2 py-1 text-left">CRANE NO</th><th className="px-2 py-1 text-left">LOCATION</th></tr></thead>
                      <tbody>
                        {((testResult as any).preview as {sl_no:string;crane_no:string;location:string}[]).map((r, i) => (
                          <tr key={i} className="border-t border-emerald-100">
                            <td className="px-2 py-1">{r.sl_no}</td>
                            <td className="px-2 py-1 font-semibold">{r.crane_no}</td>
                            <td className="px-2 py-1">{r.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Fix instructions when failed */}
                {!testResult.success && (testResult as any).fix && (
                  <div className="mt-3 bg-red-100 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-red-800 mb-1">How to fix:</p>
                    <pre className="text-[10px] text-red-700 whitespace-pre-wrap leading-relaxed">{(testResult as any).fix}</pre>
                  </div>
                )}
                {testResult.success && (
                  <button onClick={handleConnect} disabled={isConnecting}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all">
                    {isConnecting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</> : <><ArrowRight className="w-4 h-4" /> Connect &amp; Use This Sheet</>}
                  </button>
                )}
              </div>
            )}

            {connectError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Connection Failed</p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">{connectError}</p>
                </div>
              </div>
            )}

            {connectResult && !connectError && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-800">🎉 Connected to Google Sheets!</p>
                </div>
                <p className="text-xs text-emerald-700">{connectResult.message}</p>
                {onNavigateToScheduler ? (
                  <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0" />
                    <p className="text-xs text-blue-800 font-semibold">
                      Redirecting to Scheduler in 1.5s — you can generate your PM schedule there.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 mt-2 font-semibold">Go to Home or PM Checklist tab to see today's live tasks.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Step 3: Apps Script for write-back (optional) ─────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => setShowScriptGuide(!showScriptGuide)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-all">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-violet-100 rounded-lg"><Settings className="w-4 h-4 text-violet-600" /></div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-800">Step 3 (Optional) — Enable Write-Back via Apps Script</p>
                  <p className="text-xs text-gray-500">So that completing a task saves back to Google Sheets directly</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">Optional</span>
                {showScriptGuide ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {showScriptGuide && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                  <p className="text-xs text-violet-800 leading-relaxed">
                    <strong>Without Apps Script:</strong> The system reads your sheet live but cannot save completions back to Google Sheets.
                    Completions are shown in the UI but not written to the sheet.<br/>
                    <strong>With Apps Script:</strong> Every time you mark a crane complete, it writes the ACT code and applies colour to the exact cell in Google Sheets.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { n: "1", color: "bg-violet-500", title: 'Open your Google Sheet → Extensions → Apps Script', content: null },
                    { n: "2", color: "bg-violet-500", title: 'Delete any existing code. Paste this script:', content: (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-500 font-mono">Code.gs</span>
                          <CopyButton text={`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(data.spreadsheet_id);
    var sheets = ss.getSheets();
    var ws = null;
    for (var i = 0; i < sheets.length; i++) {
      if (String(sheets[i].getSheetId()) === String(data.gid)) {
        ws = sheets[i]; break;
      }
    }
    if (!ws) ws = ss.getActiveSheet();
    var cell = ws.getRange(data.row, data.col);
    cell.setValue(data.value);
    var colors = {
      "√": ["#C6EFCE","#276221"], "SHUTDOWN": ["#FFFF00","#7D6608"],
      "BD": ["#FF0000","#FFFFFF"], "B.C": ["#BDD7EE","#1F4E79"],
      "C": ["#D9D2E9","#20124D"], "W.R": ["#D9D9D9","#000000"],
      "T": ["#D9EAD3","#0C343D"], "W": ["#CFE2F3","#0D3349"],
      "O": ["#FFF2CC","#7D4E00"], "F": ["#EAD1DC","#4A235A"],
      "M": ["#FCE5CD","#7F4800"], "L": ["#D9EAD3","#274E13"],
      "L.N": ["#F4CCCC","#660000"]
    };
    var c = colors[data.act_value] || colors["√"];
    cell.setBackground(c[0]).setFontColor(c[1]).setFontWeight("bold")
        .setHorizontalAlignment("center");
    if (data.note) cell.setNote(data.note);
    return ContentService.createTextOutput(
      JSON.stringify({status:"ok",row:data.row,col:data.col,value:data.value})
    ).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(
      JSON.stringify({status:"error",message:err.toString()})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}`} />
                        </div>
                        <pre className="bg-gray-900 text-green-300 text-[9px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(data.spreadsheet_id);
    var sheets = ss.getSheets();
    var ws = null;
    for (var i = 0; i < sheets.length; i++) {
      if (String(sheets[i].getSheetId()) === String(data.gid)) {
        ws = sheets[i]; break;
      }
    }
    if (!ws) ws = ss.getActiveSheet();
    var cell = ws.getRange(data.row, data.col);
    cell.setValue(data.value);
    var colors = {
      "√": ["#C6EFCE","#276221"], "SHUTDOWN": ["#FFFF00","#7D6608"],
      "BD": ["#FF0000","#FFFFFF"], "B.C": ["#BDD7EE","#1F4E79"],
      "C": ["#D9D2E9","#20124D"], "W.R": ["#D9D9D9","#000000"],
      "T": ["#D9EAD3","#0C343D"], "W": ["#CFE2F3","#0D3349"],
      "O": ["#FFF2CC","#7D4E00"], "F": ["#EAD1DC","#4A235A"],
      "M": ["#FCE5CD","#7F4800"], "L": ["#D9EAD3","#274E13"],
      "L.N": ["#F4CCCC","#660000"]
    };
    var c = colors[data.act_value] || colors["√"];
    cell.setBackground(c[0]).setFontColor(c[1]).setFontWeight("bold")
        .setHorizontalAlignment("center");
    if (data.note) cell.setNote(data.note);
    return ContentService.createTextOutput(
      JSON.stringify({status:"ok",row:data.row,col:data.col,value:data.value})
    ).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(
      JSON.stringify({status:"error",message:err.toString()})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
                      </div>
                    )},
                    { n: "3", color: "bg-emerald-500", title: 'Click Deploy → New deployment → Web App', content: (
                      <ul className="mt-1 space-y-1 text-xs text-gray-600 list-disc list-inside">
                        <li>Execute as: <strong>Me</strong></li>
                        <li>Who has access: <strong>Anyone</strong></li>
                        <li>Click Deploy → Authorize → Copy the Web App URL</li>
                      </ul>
                    )},
                    { n: "4", color: "bg-emerald-500", title: 'Paste the Web App URL below and reconnect:', content: (
                      <div className="mt-2 space-y-2">
                        <div className="relative">
                          <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="url"
                            placeholder="https://script.google.com/macros/s/AKfy.../exec"
                            value={scriptUrl}
                            onChange={(e) => setScriptUrl(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400">Paste the Apps Script Web App URL above, then click "Connect &amp; Use as Source" in Step 2</p>
                      </div>
                    )},
                  ].map((s) => (
                    <div key={s.n} className="flex gap-3">
                      <span className={cn("w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5", s.color)}>{s.n}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">{s.title}</p>
                        {s.content}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>💡 Tip:</strong> After deploying, when colleagues complete a crane PM task,
                    the ACT cell in Google Sheets is updated with the code and coloured automatically —
                    exactly as if they edited the sheet manually. No re-upload needed.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
