export interface PMTask {
  PM_ID: string;
  Equipment_Name: string;
  PM_Task: string;
  Due_Date: string;
  Status: "Pending" | "Completed" | "Overdue";
  Completed_By: string;
  Completed_On: string;
  Comment: string;
  // Calendar extra identifiers
  SL_NO?: string;
  Crane_No?: string;
  Location?: string;
  // Calendar cell info
  Plan_Value?: string;
  Act_Value?: string;
  Day?: number;
  Month?: number;
  Year?: number;
  Row_Index?: number;
  Act_Row_Index?: number;
  Day_Col_Index?: number;
}

// ── ACT Codes ──────────────────────────────────────────────────────────────────
export interface ActCode {
  value: string;           // What gets written to Excel cell
  label: string;           // Display name
  description: string;     // Full description
  color: string;           // Tailwind bg class (UI preview)
  textColor: string;       // Tailwind text class
  borderColor: string;     // Tailwind border class
  excelFill: string;       // Hex fill color for Excel cell (no #)
  excelFont: string;       // Hex font color for Excel cell (no #)
  isCompletion: boolean;   // Does this count as "done"?
  group: string;           // Group label for dropdown
}

export const ACT_CODES: ActCode[] = [
  // ── Normal Completion ───────────────────────────────────────────────────
  {
    value: "√",
    label: "PM Done (√)",
    description: "Normal preventive maintenance completed successfully",
    color: "bg-emerald-100",
    textColor: "text-emerald-800",
    borderColor: "border-emerald-400",
    excelFill: "C6EFCE",
    excelFont: "276221",
    isCompletion: true,
    group: "✅ Completion",
  },
  // ── Shutdowns ───────────────────────────────────────────────────────────
  {
    value: "SHUTDOWN",
    label: "Major Shutdown",
    description: "Major shutdown performed",
    color: "bg-yellow-200",
    textColor: "text-yellow-900",
    borderColor: "border-yellow-500",
    excelFill: "FFFF00",
    excelFont: "7D6608",
    isCompletion: true,
    group: "🔧 Shutdown / PM",
  },
  {
    value: "√+S",
    label: "Shutdown & PM (√)",
    description: "Both shutdown and PM completed together",
    color: "bg-yellow-300",
    textColor: "text-yellow-950",
    borderColor: "border-yellow-600",
    excelFill: "FFD700",
    excelFont: "7D6608",
    isCompletion: true,
    group: "🔧 Shutdown / PM",
  },
  // ── Breakdown ───────────────────────────────────────────────────────────
  {
    value: "BD",
    label: "Breakdown",
    description: "Equipment breakdown occurred",
    color: "bg-red-200",
    textColor: "text-red-900",
    borderColor: "border-red-500",
    excelFill: "FF0000",
    excelFont: "FFFFFF",
    isCompletion: false,
    group: "🔴 Breakdown",
  },
  {
    value: "√+BD",
    label: "Breakdown & PM (√)",
    description: "Breakdown occurred but PM was also completed",
    color: "bg-red-300",
    textColor: "text-red-950",
    borderColor: "border-red-600",
    excelFill: "FF6666",
    excelFont: "7B0000",
    isCompletion: true,
    group: "🔴 Breakdown",
  },
  // ── Component Codes ─────────────────────────────────────────────────────
  {
    value: "B.C",
    label: "Barrel Coupling (B.C)",
    description: "Barrel coupling maintenance/replacement",
    color: "bg-sky-100",
    textColor: "text-sky-800",
    borderColor: "border-sky-400",
    excelFill: "BDD7EE",
    excelFont: "1F4E79",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "C",
    label: "Compound (C)",
    description: "Compound maintenance/replacement",
    color: "bg-indigo-100",
    textColor: "text-indigo-800",
    borderColor: "border-indigo-400",
    excelFill: "D9D2E9",
    excelFont: "20124D",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "W.R",
    label: "Wire Rope (W.R)",
    description: "Wire rope maintenance/replacement",
    color: "bg-slate-200",
    textColor: "text-slate-800",
    borderColor: "border-slate-500",
    excelFill: "D9D9D9",
    excelFont: "000000",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "T",
    label: "Tong (T)",
    description: "Tong maintenance/replacement",
    color: "bg-teal-100",
    textColor: "text-teal-800",
    borderColor: "border-teal-400",
    excelFill: "D9EAD3",
    excelFont: "0C343D",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "W",
    label: "Wheel (W)",
    description: "Wheel maintenance/replacement",
    color: "bg-cyan-100",
    textColor: "text-cyan-800",
    borderColor: "border-cyan-400",
    excelFill: "CFE2F3",
    excelFont: "0D3349",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "O",
    label: "Oil (O)",
    description: "Oil change/top-up performed",
    color: "bg-amber-100",
    textColor: "text-amber-800",
    borderColor: "border-amber-400",
    excelFill: "FFF2CC",
    excelFont: "7D4E00",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "F",
    label: "Floating Shaft (F)",
    description: "Floating shaft maintenance/replacement",
    color: "bg-purple-100",
    textColor: "text-purple-800",
    borderColor: "border-purple-400",
    excelFill: "EAD1DC",
    excelFont: "4A235A",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "M",
    label: "Motor (M)",
    description: "Motor maintenance/replacement",
    color: "bg-orange-100",
    textColor: "text-orange-800",
    borderColor: "border-orange-400",
    excelFill: "FCE5CD",
    excelFont: "7F4800",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "L",
    label: "Liner (L)",
    description: "Liner maintenance/replacement",
    color: "bg-lime-100",
    textColor: "text-lime-800",
    borderColor: "border-lime-400",
    excelFill: "D9EAD3",
    excelFont: "274E13",
    isCompletion: true,
    group: "⚙️ Components",
  },
  {
    value: "L.N",
    label: "Lock Nut (L.N)",
    description: "Lock nut maintenance/replacement",
    color: "bg-rose-100",
    textColor: "text-rose-800",
    borderColor: "border-rose-400",
    excelFill: "F4CCCC",
    excelFont: "660000",
    isCompletion: true,
    group: "⚙️ Components",
  },
];

// Lookup map for fast access
export const ACT_CODE_MAP: Record<string, ActCode> = Object.fromEntries(
  ACT_CODES.map((c) => [c.value, c])
);

// Helper to get style for any act value (fallback for unknown codes)
export function getActCodeStyle(actValue: string): ActCode {
  const trimmed = actValue?.trim() ?? "";
  if (ACT_CODE_MAP[trimmed]) return ACT_CODE_MAP[trimmed];
  // Partial match for "√/2" style values
  if (trimmed.startsWith("√")) return ACT_CODE_MAP["√"];
  // Unknown code - show as orange warning
  return {
    value: trimmed,
    label: trimmed,
    description: "Custom code",
    color: "bg-orange-100",
    textColor: "text-orange-800",
    borderColor: "border-orange-400",
    excelFill: "FCE5CD",
    excelFont: "7F4800",
    isCompletion: false,
    group: "Other",
  };
}

export interface UpdatePMPayload {
  pm_id: string;
  status: string;
  completed_on: string;
  comment: string;
  completed_by?: string;
  act_value?: string;       // The selected ACT code to write to Excel
  // Calendar-specific
  equipment_name?: string;
  crane_no?: string;
  location?: string;
  sl_no?: string;
  day?: number;
  month?: number;
  year?: number;
}

export interface FilterState {
  equipmentName: string;
  dueDate: string;
  pmId: string;
}

export type StatusType = "Pending" | "Completed" | "Overdue" | "All";

export interface HistoryRecord {
  id: string;
  PM_ID: string;
  Equipment_Name: string;
  SL_NO?: string;
  Crane_No?: string;
  Location?: string;
  PM_Task: string;
  Due_Date: string;
  Completed_On: string;
  Completed_By: string;
  Comment: string;
  Status: "Completed" | "Overdue" | "Pending";
  action: string;
  timestamp: string;
  Act_Value?: string;
  Sheet_Name?: string;
  Day?: number;
  Month?: number;
  Year?: number;
}

export interface Notification {
  id: string;
  type: "overdue" | "pending" | "completed" | "info";
  title: string;
  message: string;
  PM_ID?: string;
  Equipment_Name?: string;
  timestamp: string;
  read: boolean;
}

// ── Calendar Types ─────────────────────────────────────────────────────────────
export interface CalendarDayCell {
  day: number;
  plan: string;
  act: string;
  is_planned: boolean;
  status: "Pending" | "Completed" | "Overdue" | "N/A";
}

export interface CalendarEquipmentRow {
  equipment: string;   // combined key e.g. "BC-1 Crane | BC-1"
  sl_no: string;       // SL.NO column value
  crane_no: string;    // CRANE NO column value
  location: string;    // LOCATION column value
  days: CalendarDayCell[];
}

export interface CalendarData {
  calendar_matrix: CalendarEquipmentRow[];
  equipment_list: string[];
  day_columns: number[];
  month: number;
  year: number;
  today_day: number;
  has_data: boolean;
}

// ── Source Config ──────────────────────────────────────────────────────────────
export type SourceType =
  | "local"
  | "google_sheets"
  | "google_sheets_live"
  | "google_drive"
  | "online";
export type ExcelFormat = "calendar" | "standard" | "unknown";

// ── Google Sheets Online Types ─────────────────────────────────────────────────
export interface GoogleWorksheet {
  title: string;
  index: number;
  row_count: number;
  col_count: number;
}

export interface OnlineStatus {
  gspread_available: boolean;
  has_credentials: boolean;
  service_account_email: string | null;
  connected: boolean;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  spreadsheet_title: string | null;
  active_worksheet: string | null;
  worksheets: GoogleWorksheet[];
  connected_at: string | null;
}

export interface CredentialsStatus {
  has_credentials: boolean;
  service_account_email: string | null;
  project_id?: string | null;
  error?: string;
}

export interface ConnectResult {
  message: string;
  spreadsheet_id: string;
  spreadsheet_title: string;
  worksheets: GoogleWorksheet[];
  active_worksheet: string;
  service_account_email: string | null;
}

export interface OnlineUpdatePMPayload {
  equipment_name: string;
  crane_no?: string;
  location?: string;
  day: number;
  act_value: string;
  completed_by: string;
  comment: string;
}

export interface SourceConfig {
  source_type: SourceType;
  url: string | null;
  sheet_name: string | null;
  label: string;
  set_at: string | null;
  local_file_exists?: boolean;
  excel_format?: ExcelFormat;
}

// ── Sheet Types ────────────────────────────────────────────────────────────────
export interface SheetInfo {
  name: string;
  format: ExcelFormat;
  is_active: boolean;
}

export interface SheetListResponse {
  sheets: SheetInfo[];
  total: number;
  active_sheet: string | null;
}

export interface SelectSheetResult {
  message: string;
  sheet_name: string;
  excel_format: ExcelFormat;
  today_tasks: number;
  overdue_tasks: number;
  total_tasks: number;
  has_data: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  total_rows: number;
  today_tasks: number;
  excel_format?: ExcelFormat;
  columns_found: string[];
  missing_columns: string[];
  columns_valid: boolean;
  preview?: Record<string, string>[];
}

export interface SetSourcePayload {
  source_type: SourceType;
  url?: string;
  sheet_name?: string;
  label?: string;
}

// ── Scheduler Types ────────────────────────────────────────────────────────────
export interface CranePreview {
  crane: string;
  type: "CRITICAL" | "NORMAL";
  frequency: number;
  scheduled_days: number[];
  sl_no: string;
  crane_no: string;
  location: string;
}

export interface DaySummary {
  day: number;
  cranes: string[];
  count: number;
  is_critical_day: boolean;
}

export interface ScheduleValidation {
  valid: boolean;
  issues: string[];
  total_pm_events: number;
  max_cranes_per_day: number;
  day_load: Record<number, number>;
  day_critical_load?: Record<number, number>;
  days_covered?: number;
  days_with_critical?: number;
  total_days?: number;
  coverage_pct?: number;
  critical_coverage_pct?: number;
}

export interface GenerateSchedulePayload {
  sheet_name?: string;
  critical_count?: number;
  critical_freq?: number;
  normal_freq?: number;
  max_cranes_per_day?: number;
  apply?: boolean;
  custom_critical?: string[];
}

export interface GenerateScheduleResult {
  message: string;
  sheet_name: string;
  month: number;
  year: number;
  month_name: string;
  month_days: number;
  total_cranes: number;
  critical_cranes: string[];
  normal_cranes: string[];
  critical_count: number;
  critical_freq: number;
  normal_freq: number;
  max_cranes_per_day: number;
  schedule: Record<string, number[]>;
  crane_preview: CranePreview[];
  day_summary: DaySummary[];
  validation: ScheduleValidation;
  applied: boolean;
  cells_written: number;
  total_pm_events: number;
  days_covered?: number;
  days_with_critical?: number;
  coverage_pct?: number;
  critical_coverage_pct?: number;
  source?: string;
  online?: boolean;
  write_enabled?: boolean;
  download_ready?: boolean;
  apps_script_used?: boolean;
  all_sheets?: string[];
}
