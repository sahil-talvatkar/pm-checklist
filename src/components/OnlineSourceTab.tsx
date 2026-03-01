/**
 * OnlineSourceTab.tsx
 * -------------------
 * Full Google Sheets Live Connection wizard — replaces the old "Online Source"
 * tab content.
 *
 * Flow:
 *  Step 1 — Upload service-account credentials JSON
 *  Step 2 — Enter Google Spreadsheet URL and connect
 *  Step 3 — Pick a worksheet (tab) from the spreadsheet
 *  Step 4 — Read live → Dashboard auto-refreshes
 *
 * Writes go DIRECTLY back to the Google Sheet via the backend's
 * /online/update-pm endpoint — no local file involved.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Globe,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Link2,
  FileJson,
  ShieldCheck,
  Users,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Wifi,
  WifiOff,
  FileSpreadsheet,
  Unplug,
  Eye,
  Copy,
  Check,
  Info,
  ExternalLink,
} from "lucide-react";
import { cn } from "../utils/cn";
import { pmApi } from "../api/pmApi";
import {
  OnlineStatus,
  CredentialsStatus,
  ConnectResult,
} from "../types/pm";
type GoogleWorksheet = import("../types/pm").GoogleWorksheet;

interface OnlineSourceTabProps {
  onConnected: () => void; // called after worksheet selected → triggers dashboard refresh
}

// ── Small helper ──────────────────────────────────────────────────────────────
const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-all border border-gray-200"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-500" />
      ) : (
        <Copy className="w-3 h-3 text-gray-400" />
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const OnlineSourceTab: React.FC<OnlineSourceTabProps> = ({ onConnected }) => {
  // ── Status from server ─────────────────────────────────────────────────────
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus | null>(null);
  const [credsStatus, setCredsStatus] = useState<CredentialsStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // ── Step 1: credential upload ──────────────────────────────────────────────
  const [credFile, setCredFile] = useState<File | null>(null);
  const [uploadingCreds, setUploadingCreds] = useState(false);
  const [credResult, setCredResult] = useState<{ email: string; project: string } | null>(null);
  const [credError, setCredError] = useState<string | null>(null);
  const [isDraggingCred, setIsDraggingCred] = useState(false);
  const credInputRef = useRef<HTMLInputElement>(null);

  // ── Step 2: spreadsheet URL ────────────────────────────────────────────────
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetLabel, setSheetLabel] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState<ConnectResult | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // ── Step 3: worksheet selection ────────────────────────────────────────────
  const [worksheets, setWorksheets] = useState<GoogleWorksheet[]>([]);
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [selectingWs, setSelectingWs] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsSuccess, setWsSuccess] = useState<string | null>(null);

  // ── Misc ───────────────────────────────────────────────────────────────────
  const [showGuide, setShowGuide] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Load status on mount ───────────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const [status, creds] = await Promise.all([
        pmApi.getOnlineStatus(),
        pmApi.getCredentialsStatus(),
      ]);
      setOnlineStatus(status);
      setCredsStatus(creds);
      if (status.active_worksheet) setSelectedWs(status.active_worksheet);
      if (status.worksheets?.length) setWorksheets(status.worksheets);
      if (status.spreadsheet_url) setSheetUrl(status.spreadsheet_url);
    } catch {
      // backend not running — ignore
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // ── Step 1: handle credential file drop/pick ───────────────────────────────
  const handleCredFile = (f: File) => {
    if (!f.name.endsWith(".json")) {
      setCredError("Only .json files are accepted.");
      return;
    }
    setCredFile(f);
    setCredError(null);
    setCredResult(null);
  };

  const handleCredDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCred(false);
    if (e.dataTransfer.files[0]) handleCredFile(e.dataTransfer.files[0]);
  };

  const handleUploadCreds = async () => {
    if (!credFile) return;
    setUploadingCreds(true);
    setCredError(null);
    setCredResult(null);
    try {
      const res = await pmApi.uploadCredentials(credFile);
      setCredResult({ email: res.service_account_email, project: res.project_id ?? "" });
      await refreshStatus();
    } catch (err) {
      setCredError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCreds(false);
    }
  };

  // ── Step 2: connect spreadsheet ────────────────────────────────────────────
  const handleConnect = async () => {
    if (!sheetUrl.trim()) return;
    setConnecting(true);
    setConnectError(null);
    setConnectResult(null);
    try {
      const res = await pmApi.connectSpreadsheet(sheetUrl.trim(), sheetLabel.trim() || undefined);
      setConnectResult(res);
      setWorksheets(res.worksheets);
      setSelectedWs(res.active_worksheet);
      await refreshStatus();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  // ── Step 3: select worksheet ───────────────────────────────────────────────
  const handleSelectWorksheet = async (title: string) => {
    setSelectingWs(true);
    setWsError(null);
    setWsSuccess(null);
    try {
      const res = await pmApi.selectWorksheet(title);
      setSelectedWs(title);
      setWsSuccess(res.message);
      await refreshStatus();
      onConnected(); // trigger dashboard refresh
    } catch (err) {
      setWsError(err instanceof Error ? err.message : "Failed to select worksheet");
    } finally {
      setSelectingWs(false);
    }
  };

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await pmApi.disconnectOnline();
      setConnectResult(null);
      setWorksheets([]);
      setSelectedWs(null);
      setWsSuccess(null);
      setSheetUrl("");
      await refreshStatus();
      onConnected();
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const isConnected = onlineStatus?.connected ?? false;
  const hasCreds    = credsStatus?.has_credentials ?? false;
  const credEmail   = onlineStatus?.service_account_email ?? credsStatus?.service_account_email;
  const currentStep = !hasCreds ? 1 : !isConnected ? 2 : !selectedWs ? 3 : 4;

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading connection status…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Why Google Sheets Live? ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Google Sheets Live — True Multi-User Sync
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Users className="w-5 h-5 text-blue-600" />,
              title: "Real Collaboration",
              desc: "All colleagues see the same live Google Sheet. No file sharing needed.",
              bg: "bg-blue-100",
            },
            {
              icon: <Zap className="w-5 h-5 text-emerald-600" />,
              title: "Writes Directly to Sheet",
              desc: "When you mark a task complete, the √ is written instantly to Google Sheets.",
              bg: "bg-emerald-100",
            },
            {
              icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
              title: "No Local File Needed",
              desc: "No download/upload cycle. Google Sheets IS the database.",
              bg: "bg-purple-100",
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

      {/* ── Current Connection Status Card ─────────────────────────────────── */}
      <div className={cn(
        "rounded-xl border p-4 flex items-center justify-between gap-4",
        isConnected
          ? "bg-emerald-50 border-emerald-200"
          : "bg-gray-50 border-gray-200"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl", isConnected ? "bg-emerald-100" : "bg-gray-100")}>
            {isConnected
              ? <Wifi className="w-5 h-5 text-emerald-600" />
              : <WifiOff className="w-5 h-5 text-gray-400" />}
          </div>
          <div>
            <p className={cn("text-sm font-bold", isConnected ? "text-emerald-800" : "text-gray-600")}>
              {isConnected
                ? `✅ Connected: ${onlineStatus?.spreadsheet_title ?? "Google Spreadsheet"}`
                : "Not connected to any Google Spreadsheet"}
            </p>
            {isConnected && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Active worksheet: <strong>{onlineStatus?.active_worksheet ?? "—"}</strong>
                {credEmail && <span className="ml-2 text-gray-500">· {credEmail}</span>}
              </p>
            )}
            {!isConnected && hasCreds && (
              <p className="text-xs text-gray-500 mt-0.5">
                Credentials ready · {credEmail}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={refreshStatus}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all disabled:opacity-60"
            >
              <Unplug className="w-3.5 h-3.5" />
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          )}
        </div>
      </div>

      {/* ── Step indicator ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0">
        {[
          { n: 1, label: "Upload Credentials" },
          { n: 2, label: "Connect Sheet" },
          { n: 3, label: "Select Worksheet" },
          { n: 4, label: "Live & Syncing" },
        ].map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                currentStep > s.n
                  ? "bg-emerald-500 text-white"
                  : currentStep === s.n
                  ? "bg-blue-600 text-white ring-4 ring-blue-100"
                  : "bg-gray-100 text-gray-400"
              )}>
                {currentStep > s.n ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span className={cn(
                "text-[10px] font-semibold text-center leading-tight",
                currentStep === s.n ? "text-blue-700" : currentStep > s.n ? "text-emerald-600" : "text-gray-400"
              )}>
                {s.label}
              </span>
            </div>
            {i < 3 && (
              <div className={cn(
                "h-0.5 flex-1 mb-5 transition-all",
                currentStep > s.n + 1 ? "bg-emerald-400" : currentStep > s.n ? "bg-blue-300" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 1 — Upload Service Account Credentials
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "bg-white rounded-xl border shadow-sm overflow-hidden",
        currentStep === 1 ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
      )}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              hasCreds ? "bg-emerald-100 text-emerald-700" : "bg-blue-600 text-white"
            )}>
              {hasCreds ? <Check className="w-3.5 h-3.5" /> : "1"}
            </div>
            <h3 className="text-sm font-bold text-gray-800">Upload Service Account Credentials</h3>
          </div>
          {hasCreds && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              ✅ Credentials saved
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* What is a service account */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between text-sm text-blue-700 hover:text-blue-900 font-semibold bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 transition-all"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              How to create a Google Service Account JSON?
            </span>
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showGuide && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                A service account is a Google identity your backend server uses to read and write
                Google Sheets on your behalf — without needing your personal login each time.
              </p>
              {[
                {
                  n: "1", color: "bg-blue-500",
                  title: "Open Google Cloud Console",
                  body: (
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white border border-gray-200 px-2 py-1 rounded font-mono text-blue-700">
                        console.cloud.google.com
                      </code>
                      <a
                        href="https://console.cloud.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ),
                },
                {
                  n: "2", color: "bg-purple-500",
                  title: "Create / select a project → Enable Google Sheets API",
                  body: (
                    <p className="text-xs text-gray-600">
                      Go to <strong>APIs & Services → Library</strong> →
                      search <strong>"Google Sheets API"</strong> → Enable.
                      Also enable <strong>"Google Drive API"</strong>.
                    </p>
                  ),
                },
                {
                  n: "3", color: "bg-emerald-500",
                  title: "Create a Service Account",
                  body: (
                    <p className="text-xs text-gray-600">
                      Go to <strong>IAM & Admin → Service Accounts → Create Service Account</strong>.
                      Give it a name (e.g. "pm-checklist"), click Create.
                      Skip optional role/user steps.
                    </p>
                  ),
                },
                {
                  n: "4", color: "bg-amber-500",
                  title: "Generate & download the JSON key",
                  body: (
                    <p className="text-xs text-gray-600">
                      Click the service account → <strong>Keys tab → Add Key → Create new key →
                      JSON → Create</strong>.  A <code className="font-mono bg-gray-100 px-1 rounded">credentials.json</code> file
                      will download automatically.
                    </p>
                  ),
                },
                {
                  n: "5", color: "bg-red-500",
                  title: "Share your Google Sheet with the service account",
                  body: (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        Open your Google Sheet → <strong>Share → Add the service account email → Editor</strong>.
                      </p>
                      <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        ⚠️ If the sheet is not shared with the service account email, the connection will fail!
                      </p>
                    </div>
                  ),
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-3">
                  <div className={cn("w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5", step.color)}>
                    {step.n}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 mb-1">{step.title}</p>
                    {step.body}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* If already have credentials — show existing email */}
          {hasCreds && credEmail && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Service account active</p>
                <p className="text-xs text-emerald-700 font-mono mt-0.5">{credEmail}</p>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingCred(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDraggingCred(false); }}
            onDrop={handleCredDrop}
            onClick={() => !credFile && credInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
              isDraggingCred ? "border-blue-400 bg-blue-50 scale-[1.01]" :
              credFile ? "border-emerald-300 bg-emerald-50 cursor-default" :
              "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
            )}
          >
            <input
              ref={credInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCredFile(e.target.files[0])}
            />
            {credFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="p-2.5 bg-emerald-100 rounded-xl">
                  <FileJson className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800">{credFile.name}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setCredFile(null); setCredResult(null); }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className={cn("p-3 rounded-full transition-all", isDraggingCred ? "bg-blue-100" : "bg-gray-100")}>
                  <FileJson className={cn("w-8 h-8", isDraggingCred ? "text-blue-500" : "text-gray-400")} />
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {isDraggingCred ? "Drop credentials.json here" : "Drag & drop credentials.json"}
                </p>
                <p className="text-xs text-gray-400">or click to browse · .json only</p>
              </div>
            )}
          </div>

          {credError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{credError}</p>
            </div>
          )}

          {credResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-800">Credentials saved!</p>
                <p className="text-xs text-emerald-700 font-mono mt-0.5">{credResult.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleUploadCreds}
            disabled={!credFile || uploadingCreds}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-all",
              credFile && !uploadingCreds
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {uploadingCreds
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading…</>
              : <><Upload className="w-4 h-4" /> {hasCreds ? "Replace Credentials" : "Upload credentials.json"}</>}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 2 — Connect to Spreadsheet
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "bg-white rounded-xl border shadow-sm overflow-hidden transition-all",
        !hasCreds ? "opacity-50 pointer-events-none" : "",
        currentStep === 2 ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
      )}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            isConnected ? "bg-emerald-100 text-emerald-700" : hasCreds ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
          )}>
            {isConnected ? <Check className="w-3.5 h-3.5" /> : "2"}
          </div>
          <h3 className="text-sm font-bold text-gray-800">Connect to Your Google Spreadsheet</h3>
          {isConnected && (
            <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              ✅ Connected
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Important reminder about sharing */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">Before connecting — share your sheet!</p>
              {credEmail ? (
                <div className="mt-1">
                  <p className="text-xs text-amber-700">
                    Open your Google Sheet → Share → Add this email as <strong>Editor</strong>:
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="text-xs font-mono bg-white border border-amber-200 px-2 py-1 rounded text-amber-900 flex-1 break-all">
                      {credEmail}
                    </code>
                    <CopyBtn text={credEmail} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700 mt-0.5">
                  Upload credentials first, then share your sheet with the service account email shown there.
                </p>
              )}
            </div>
          </div>

          {isConnected && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-emerald-800">
                📊 {onlineStatus?.spreadsheet_title}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5 break-all">
                {onlineStatus?.spreadsheet_url}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {onlineStatus?.worksheets?.length ?? 0} worksheets available
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Google Spreadsheet URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => { setSheetUrl(e.target.value); setConnectError(null); setConnectResult(null); }}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-mono"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Paste the full URL from your browser or from Google Sheets → Share → Copy link
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Display Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Factory PM Master — 2025"
              value={sheetLabel}
              onChange={(e) => setSheetLabel(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>

          {connectError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{connectError}</p>
            </div>
          )}

          {connectResult && !connectError && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">{connectResult.message}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={!sheetUrl.trim() || connecting}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-all shadow-sm",
              sheetUrl.trim() && !connecting
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {connecting
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</>
              : <><FileSpreadsheet className="w-4 h-4" /> {isConnected ? "Reconnect / Change Sheet" : "Connect Spreadsheet"}</>}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 3 — Select Worksheet
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "bg-white rounded-xl border shadow-sm overflow-hidden transition-all",
        !isConnected ? "opacity-50 pointer-events-none" : "",
        currentStep === 3 ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
      )}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            selectedWs && isConnected ? "bg-emerald-100 text-emerald-700" :
            isConnected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
          )}>
            {selectedWs && isConnected ? <Check className="w-3.5 h-3.5" /> : "3"}
          </div>
          <h3 className="text-sm font-bold text-gray-800">
            Select Worksheet (Tab)
          </h3>
          {selectedWs && isConnected && (
            <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              ✅ {selectedWs}
            </span>
          )}
        </div>

        <div className="p-5 space-y-3">
          {worksheets.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              Connect to a spreadsheet first to see available worksheets.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">
                {worksheets.length} worksheet{worksheets.length !== 1 ? "s" : ""} found — click to select:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {worksheets.map((ws) => {
                  const isActive = ws.title === selectedWs;
                  return (
                    <button
                      key={ws.title}
                      onClick={() => handleSelectWorksheet(ws.title)}
                      disabled={selectingWs}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all disabled:opacity-60",
                        isActive
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-emerald-600" : "text-gray-400")} />
                        <div>
                          <p className={cn("text-sm font-semibold", isActive ? "text-emerald-800" : "text-gray-700")}>
                            {ws.title}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {ws.row_count} rows · {ws.col_count} cols
                          </p>
                        </div>
                      </div>
                      {isActive ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {wsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{wsError}</p>
            </div>
          )}

          {wsSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">{wsSuccess}</p>
            </div>
          )}

          {selectingWs && (
            <div className="flex items-center justify-center gap-2 py-3 text-blue-600 text-xs font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading worksheet & refreshing dashboard…
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 4 — Live & Syncing
         ═══════════════════════════════════════════════════════════════════════ */}
      {isConnected && selectedWs && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Wifi className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-800">
                🎉 Live & Syncing with Google Sheets!
              </h3>
              <p className="text-xs text-emerald-600 mt-0.5">
                All PM completions are written directly to your Google Sheet
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Spreadsheet", value: onlineStatus?.spreadsheet_title ?? "—", icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> },
              { label: "Active Worksheet", value: onlineStatus?.active_worksheet ?? "—", icon: <Eye className="w-3.5 h-3.5 text-blue-600" /> },
              { label: "Worksheets", value: String(onlineStatus?.worksheets?.length ?? 0), icon: <Globe className="w-3.5 h-3.5 text-purple-600" /> },
              { label: "Service Account", value: credEmail?.split("@")[0] ?? "—", icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl px-3 py-2.5 border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1">{item.icon}<p className="text-[10px] text-gray-400 font-medium uppercase">{item.label}</p></div>
                <p className="text-xs font-bold text-gray-800 truncate" title={item.value}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-emerald-100 rounded-xl p-3 space-y-1.5 text-xs text-gray-600">
            <p className="font-semibold text-emerald-800 mb-2">How updates flow:</p>
            {[
              "📋 Dashboard loads PM tasks LIVE from the Google Sheet",
              "✅ Clicking Save → writes √ (or chosen code) directly to the Sheet ACT row",
              "🎨 Cell colour is applied automatically (green for √, red for BD, etc.)",
              "📝 Completion details saved as a cell note in the Sheet",
              "👥 All colleagues see updates immediately when they refresh",
            ].map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onConnected}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm"
            >
              <ArrowRight className="w-4 h-4" />
              Open PM Dashboard →
            </button>
            <button
              onClick={refreshStatus}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold bg-white border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// GoogleWorksheet type is used above (type alias)
