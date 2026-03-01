import axios, { AxiosError } from "axios";
import {
  PMTask,
  UpdatePMPayload,
  HistoryRecord,
  SourceConfig,
  TestConnectionResult,
  SetSourcePayload,
  CalendarData,
  SheetListResponse,
  SelectSheetResult,
  GenerateSchedulePayload,
  GenerateScheduleResult,
  OnlineStatus,
  CredentialsStatus,
  ConnectResult,
  OnlineUpdatePMPayload,
  GoogleWorksheet,
} from "../types/pm";
import { mockPMTasks, mockHistoryRecords } from "../data/mockData";
import { format } from "date-fns";

// ── Config ────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "https://pm-checklist-backend-production.up.railway.app";
const USE_MOCK_DATA = false;

// ── Axios Instance ────────────────────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ── Mock Store ────────────────────────────────────────────────────────────────
let mockDataStore: PMTask[] = [...mockPMTasks];
let mockHistoryStore: HistoryRecord[] = [...mockHistoryRecords];

// ── API Response Types ────────────────────────────────────────────────────────
interface TodaysPMResponse {
  data: PMTask[];
  total: number;
  date: string;
  message: string;
  has_data: boolean;
  source_type?: string;
  excel_format?: string;
  calendar_data?: CalendarData | null;
  active_sheet?: string;
  all_sheets?: string[];
}

interface HistoryResponse {
  data: HistoryRecord[];
  total: number;
  has_data: boolean;
  message: string;
}

export interface UploadStatus {
  uploaded: boolean;
  source_type?: string;
  label?: string;
  url?: string | null;
  message: string;
  total_rows: number;
  today_tasks: number;
  file_size_bytes?: number;
  last_modified?: string;
  columns?: string[];
  excel_format?: string;
  active_sheet?: string;
  available_sheets?: string[];
  total_sheets?: number;
}

export interface UploadResult {
  message: string;
  filename: string;
  excel_format: string;
  total_rows: number;
  columns_found: string[];
  today_tasks: number;
  total_equipment?: number;
  preview: PMTask[] | Record<string, string>[];
  sheets?: import("../types/pm").SheetInfo[];
  total_sheets?: number;
  active_sheet?: string;
}

export interface SetSourceResult {
  message: string;
  source_type: string;
  label: string;
  excel_format?: string;
  total_rows?: number;
  today_tasks?: number;
  columns_found?: string[];
}

export interface RefreshResult {
  message: string;
  total_rows: number;
  today_tasks: number;
  excel_format?: string;
  refreshed_at: string;
}

export interface GetTodaysPMResult {
  tasks: PMTask[];
  message: string;
  hasData: boolean;
  sourceType?: string;
  excelFormat?: string;
  calendarData?: CalendarData | null;
  activeSheet?: string;
  allSheets?: string[];
}

// ── Error Helper ──────────────────────────────────────────────────────────────
function extractError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const axErr = error as AxiosError<{
      detail: string | { message?: string; error?: string };
    }>;
    const detail = axErr.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail !== null) {
      return detail.message || detail.error || JSON.stringify(detail);
    }
    if (
      axErr.code === "ERR_NETWORK" ||
      axErr.code === "ECONNREFUSED" ||
      axErr.message.includes("Network Error")
    ) {
      return "Cannot connect to backend. Make sure FastAPI is running on https://pm-checklist-backend-production.up.railway.app";
    }
    return axErr.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── PM API ────────────────────────────────────────────────────────────────────
export const pmApi = {
  // ── Source Config ──────────────────────────────────────────────────────────
  getSourceConfig: async (): Promise<SourceConfig> => {
    if (USE_MOCK_DATA) {
      await delay(300);
      return {
        source_type: "local",
        url: null,
        sheet_name: null,
        label: "Demo Mode",
        set_at: null,
        local_file_exists: true,
        excel_format: "standard",
      };
    }
    try {
      // /get-source-config is a root-level alias that merges online + local config
      const res = await axiosInstance.get<SourceConfig>("/get-source-config");
      return res.data;
    } catch (error) {
      // Silently return default — backend may not be running yet
      return {
        source_type: "local",
        url: null,
        sheet_name: null,
        label: "Local Excel File",
        set_at: null,
        local_file_exists: false,
        excel_format: "unknown",
      };
    }
  },

  // ── Online Config (Google Sheets live) ────────────────────────────────────
  getOnlineConfig: async (): Promise<{
    connected: boolean;
    sheet_url?: string;
    spreadsheet_id?: string;
    active_worksheet?: string;
    active_worksheet_gid?: string;
    worksheets?: { title: string; gid: string }[];
    label?: string;
    connected_at?: string;
    write_enabled?: boolean;
    script_url_preview?: string;
  }> => {
    try {
      const res = await axiosInstance.get("/online/get-config");
      return res.data;
    } catch {
      return { connected: false };
    }
  },

  setSource: async (payload: SetSourcePayload): Promise<SetSourceResult> => {
    if (USE_MOCK_DATA) {
      await delay(800);
      return { message: "Demo mode.", source_type: payload.source_type, label: payload.label || "Demo" };
    }
    try {
      const res = await axiosInstance.post<SetSourceResult>("/set-source", payload);
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to set source"));
    }
  },

  testConnection: async (url: string): Promise<TestConnectionResult> => {
    if (USE_MOCK_DATA) {
      await delay(1200);
      return {
        success: true,
        message: "Demo — simulated.",
        total_rows: mockDataStore.length,
        today_tasks: 4,
        columns_found: ["PM_ID", "Equipment_Name", "PM_Task", "Due_Date", "Status", "Completed_By", "Completed_On", "Comment"],
        missing_columns: [],
        columns_valid: true,
        preview: mockDataStore.slice(0, 3) as unknown as Record<string, string>[],
      };
    }
    try {
      const res = await axiosInstance.get<TestConnectionResult>("/test-connection", { params: { url } });
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Connection test failed"));
    }
  },

  refreshOnline: async (): Promise<RefreshResult> => {
    if (USE_MOCK_DATA) {
      await delay(1000);
      return { message: "Demo refresh.", total_rows: mockDataStore.length, today_tasks: 4, refreshed_at: new Date().toISOString() };
    }
    try {
      const res = await axiosInstance.post<RefreshResult>("/refresh-online");
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to refresh online data"));
    }
  },

  // ── Upload Status ──────────────────────────────────────────────────────────
  getUploadStatus: async (): Promise<UploadStatus> => {
    if (USE_MOCK_DATA) {
      await delay(400);
      return {
        uploaded: true,
        source_type: "local",
        label: "Demo Mode",
        url: null,
        message: "Demo mode — mock data loaded.",
        total_rows: mockDataStore.length,
        today_tasks: mockDataStore.filter((t) => t.Due_Date === format(new Date(), "yyyy-MM-dd")).length,
        excel_format: "standard",
      };
    }
    try {
      const res = await axiosInstance.get<UploadStatus>("/get-upload-status");
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to get upload status"));
    }
  },

  // ── Upload Excel ───────────────────────────────────────────────────────────
  uploadExcel: async (file: File): Promise<UploadResult> => {
    if (USE_MOCK_DATA) {
      await delay(1200);
      return {
        message: "Demo — file accepted.",
        filename: file.name,
        excel_format: "standard",
        total_rows: mockDataStore.length,
        columns_found: ["PM_ID", "Equipment_Name", "PM_Task", "Due_Date", "Status", "Completed_By", "Completed_On", "Comment"],
        today_tasks: 4,
        preview: mockDataStore.slice(0, 5),
      };
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosInstance.post<UploadResult>("/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to upload Excel file"));
    }
  },

  // ── Get Today's PM ─────────────────────────────────────────────────────────
  getTodaysPM: async (): Promise<GetTodaysPMResult> => {
    if (USE_MOCK_DATA) {
      await delay(800);
      const today = format(new Date(), "yyyy-MM-dd");
      const tasks = mockDataStore.filter((t) => t.Due_Date === today || t.Status === "Overdue");
      return {
        tasks,
        message: tasks.length > 0 ? `Found ${tasks.length} PM tasks.` : `No tasks for today (${today}).`,
        hasData: tasks.length > 0,
        sourceType: "mock",
        excelFormat: "standard",
        calendarData: null,
      };
    }
    try {
      const response = await axiosInstance.get<TodaysPMResponse>("/get-todays-pm");
      return {
        tasks: response.data.data ?? [],
        message: response.data.message,
        hasData: response.data.has_data,
        sourceType: response.data.source_type,
        excelFormat: response.data.excel_format,
        calendarData: response.data.calendar_data ?? null,
        activeSheet: response.data.active_sheet,
        allSheets: response.data.all_sheets,
      };
    } catch (error) {
      throw new Error(extractError(error, "Failed to fetch today's PM tasks"));
    }
  },

  // ── Get Calendar Data ──────────────────────────────────────────────────────
  getCalendarData: async (): Promise<CalendarData | null> => {
    if (USE_MOCK_DATA) return null;
    try {
      const res = await axiosInstance.get<CalendarData>("/get-calendar-data");
      return res.data;
    } catch (error) {
      console.warn("Calendar data fetch failed:", error);
      return null;
    }
  },

  // ── Update PM ──────────────────────────────────────────────────────────────
  updatePM: async (payload: UpdatePMPayload): Promise<{ message: string; excel_format?: string }> => {
    if (USE_MOCK_DATA) {
      await delay(600);
      const index = mockDataStore.findIndex((t) => t.PM_ID === payload.pm_id);
      if (index === -1) throw new Error(`PM task ${payload.pm_id} not found`);
      mockDataStore[index] = {
        ...mockDataStore[index],
        Status: "Completed",
        Completed_On: payload.completed_on,
        Comment: payload.comment,
        Completed_By: payload.completed_by || "Technician",
      };
      const task = mockDataStore[index];
      const historyEntry: HistoryRecord = {
        id: `H-${Date.now()}`,
        PM_ID: task.PM_ID,
        Equipment_Name: task.Equipment_Name,
        PM_Task: task.PM_Task,
        Due_Date: task.Due_Date,
        Completed_On: payload.completed_on,
        Completed_By: payload.completed_by || "Technician",
        Comment: payload.comment,
        Status: "Completed",
        action: "Task Completed",
        timestamp: new Date().toISOString(),
      };
      mockHistoryStore = [historyEntry, ...mockHistoryStore];
      return { message: `PM task ${payload.pm_id} updated.` };
    }
    try {
      // Ensure act_value is included in the payload sent to backend
      const response = await axiosInstance.post<{
        message: string;
        excel_format?: string;
        act_value?: string;
        excel_fill?: string;
        excel_font?: string;
      }>("/update-pm", payload);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to update PM task"));
    }
  },

  // ── Get History ────────────────────────────────────────────────────────────
  getHistory: async (): Promise<HistoryRecord[]> => {
    if (USE_MOCK_DATA) {
      await delay(600);
      return [...mockHistoryStore];
    }
    try {
      const response = await axiosInstance.get<HistoryResponse>("/get-history");
      return response.data.data ?? [];
    } catch (error) {
      throw new Error(extractError(error, "Failed to fetch history"));
    }
  },

  // ── Get All Sheets ─────────────────────────────────────────────────────────
  getSheets: async (): Promise<SheetListResponse> => {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { sheets: [{ name: "Sheet1", format: "standard", is_active: true }], total: 1, active_sheet: "Sheet1" };
    }
    try {
      const res = await axiosInstance.get<SheetListResponse>("/get-sheets");
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to get sheet list"));
    }
  },

  // ── Select Sheet ───────────────────────────────────────────────────────────
  selectSheet: async (sheetName: string): Promise<SelectSheetResult> => {
    if (USE_MOCK_DATA) {
      await delay(500);
      return { message: "Demo mode.", sheet_name: sheetName, excel_format: "standard", today_tasks: 0, overdue_tasks: 0, total_tasks: 0, has_data: false };
    }
    try {
      const res = await axiosInstance.post<SelectSheetResult>("/select-sheet", { sheet_name: sheetName });
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to select sheet"));
    }
  },

  // ── Download Original Excel ────────────────────────────────────────────────
  downloadExcel: () => {
    const url = `${API_BASE_URL}/download-excel`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "pm_data.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // ── Download Schedule-Applied Excel (pm_scheduled.xlsx) ───────────────────
  downloadScheduled: () => {
    const url = `${API_BASE_URL}/download-scheduled`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "pm_scheduled.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // ── Generate Schedule ──────────────────────────────────────────────────────
  generateSchedule: async (payload: GenerateSchedulePayload): Promise<GenerateScheduleResult> => {
    try {
      const res = await axiosInstance.post<GenerateScheduleResult>("/generate-schedule", payload);
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to generate schedule"));
    }
  },

  // ── Download Schedule Preview Excel (with √ marks, no disk write) ──────────
  downloadSchedulePreview: async (payload: GenerateSchedulePayload): Promise<void> => {
    try {
      const response = await axiosInstance.post("/download-schedule-preview", payload, {
        responseType: "blob",
        timeout: 60000,
      });

      // Extract filename from Content-Disposition header if present
      const disposition = response.headers["content-disposition"] as string | undefined;
      let filename = "pm_schedule.xlsx";
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "").trim();
        }
      }

      // Trigger browser download
      const blob = new Blob([response.data as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href    = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(extractError(error, "Failed to download schedule preview"));
    }
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GOOGLE SHEETS LIVE — Online Source API
  // ════════════════════════════════════════════════════════════════════════════

  /** Check if credentials.json exists on the server */
  getCredentialsStatus: async (): Promise<CredentialsStatus> => {
    try {
      const res = await axiosInstance.get<CredentialsStatus>("/online/credentials-status");
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to get credentials status"));
    }
  },

  /** Upload service account JSON credentials to the server */
  uploadCredentials: async (file: File): Promise<{ message: string; service_account_email: string; project_id?: string }> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axiosInstance.post<{ message: string; service_account_email: string; project_id?: string }>(
        "/online/upload-credentials", fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to upload credentials"));
    }
  },

  /** Connect to a Google Spreadsheet by URL */
  connectSpreadsheet: async (spreadsheet_url: string, label?: string): Promise<ConnectResult> => {
    try {
      const res = await axiosInstance.post<ConnectResult>("/online/connect", { spreadsheet_url, label });
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to connect to Google Spreadsheet"));
    }
  },

  /** List all worksheets (tabs) in the connected spreadsheet */
  listWorksheets: async (): Promise<{ worksheets: GoogleWorksheet[]; active_worksheet: string | null; spreadsheet_title: string | null }> => {
    try {
      const res = await axiosInstance.get<{ worksheets: GoogleWorksheet[]; active_worksheet: string | null; spreadsheet_title: string | null; total: number }>("/online/worksheets");
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to list worksheets"));
    }
  },

  /** Switch the active worksheet */
  selectWorksheet: async (worksheet_title: string): Promise<{ message: string; today_tasks: number; overdue_tasks: number }> => {
    try {
      const res = await axiosInstance.post<{ message: string; today_tasks: number; overdue_tasks: number }>("/online/select-worksheet", { worksheet_title });
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to select worksheet"));
    }
  },

  /** Read active worksheet live from Google Sheets (returns calendar data) */
  readOnline: async (): Promise<GetTodaysPMResult> => {
    try {
      const response = await axiosInstance.get<TodaysPMResponse>("/online/read");
      return {
        tasks: response.data.data ?? [],
        message: response.data.message,
        hasData: response.data.has_data,
        sourceType: response.data.source_type,
        excelFormat: response.data.excel_format,
        calendarData: response.data.calendar_data ?? null,
        activeSheet: response.data.active_sheet,
        allSheets: (response.data as unknown as { all_sheets?: string[] }).all_sheets,
      };
    } catch (error) {
      throw new Error(extractError(error, "Failed to read Google Sheets data"));
    }
  },

  /** Mark a PM task complete — writes directly to Google Sheets (live) */
  onlineUpdatePM: async (payload: OnlineUpdatePMPayload): Promise<{ message: string; gs_row: number; gs_col: number }> => {
    try {
      const res = await axiosInstance.post<{ message: string; gs_row: number; gs_col: number }>("/online/update-pm", payload);
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to update Google Sheets"));
    }
  },

  /** Get full online connection status */
  getOnlineStatus: async (): Promise<OnlineStatus> => {
    try {
      const res = await axiosInstance.get<OnlineStatus>("/online/status");
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to get online status"));
    }
  },

  /** Disconnect from Google Sheets and fall back to local */
  disconnectOnline: async (): Promise<{ message: string }> => {
    try {
      const res = await axiosInstance.delete<{ message: string }>("/online/disconnect");
      return res.data;
    } catch (error) {
      throw new Error(extractError(error, "Failed to disconnect"));
    }
  },
};
