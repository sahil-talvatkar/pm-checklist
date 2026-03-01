/**
 * DEMO MODE DATA
 * ─────────────────────────────────────────────────────────────────────────────
 * 20 crane PM records in the EXACT same calendar-grid format as the real Excel.
 * Structure mirrors: SL.NO | CRANE NO | LOCATION | DAY | Sun Mon Tue ... (1-28)
 *
 * All data is maintained in the frontend — no backend required for Demo Mode.
 * The export function generates a real .xlsx file identical to the server format.
 */

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { CalendarData, CalendarEquipmentRow, CalendarDayCell, HistoryRecord, PMTask, Notification } from "../types/pm";
import { format, subHours } from "date-fns";

// ── Current month/year ────────────────────────────────────────────────────────
const NOW       = new Date();
const THIS_YEAR = NOW.getFullYear();
const THIS_MON  = NOW.getMonth() + 1;          // 1-based
const TODAY_DAY = NOW.getDate();

// Days in current month
function daysInMonth(m: number, y: number) {
  return new Date(y, m, 0).getDate();
}
const TOTAL_DAYS = daysInMonth(THIS_MON, THIS_YEAR);

// Day-of-week name for day d
function dowName(day: number): string {
  const d = new Date(THIS_YEAR, THIS_MON - 1, day);
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
}

// ── Raw equipment definitions ─────────────────────────────────────────────────
// Each entry: sl, craneNo, location, planDays (which days of month have √ in PLAN)
// actOverrides: { [day]: actCode } — pre-filled history for past days

interface RawEquip {
  sl: string;
  craneNo: string;
  location: string;
  planDays: number[];          // days that have PLAN = √
  actOverrides: Record<number, string>;  // past completed days
  shutdownDays?: number[];     // days with SHUTDOWN plan
}

const RAW_EQUIP: RawEquip[] = [
  {
    sl: "1",
    craneNo: "BC-1",
    location: "Bay A",
    planDays: [3, 10, 17, 24],
    shutdownDays: [],
    actOverrides: { 3: "√", 10: "√" },
  },
  {
    sl: "2",
    craneNo: "BC-2",
    location: "Bay A",
    planDays: [6, 13, 20, 27],
    shutdownDays: [],
    actOverrides: { 6: "√", 13: "√/5" },
  },
  {
    sl: "3",
    craneNo: "BC-3",
    location: "Bay B",
    planDays: [2, 9, 16, 23],
    shutdownDays: [16],
    actOverrides: { 2: "√", 9: "B.C" },
  },
  {
    sl: "4",
    craneNo: "BC-4",
    location: "Bay B",
    planDays: [5, 12, 19, 26],
    shutdownDays: [],
    actOverrides: { 5: "√", 12: "W.R" },
  },
  {
    sl: "5",
    craneNo: "CC-1",
    location: "Bay C",
    planDays: [1, 8, 15, 22],
    shutdownDays: [],
    actOverrides: { 1: "√", 8: "√" },
  },
  {
    sl: "6",
    craneNo: "CC-2",
    location: "Bay C",
    planDays: [4, 11, 18, 25],
    shutdownDays: [25],
    actOverrides: { 4: "O", 11: "√" },
  },
  {
    sl: "7",
    craneNo: "CC-3",
    location: "Bay D",
    planDays: [7, 14, 21, 28],
    shutdownDays: [],
    actOverrides: { 7: "M", 14: "√" },
  },
  {
    sl: "8",
    craneNo: "DC-1",
    location: "Dock 1",
    planDays: [3, 10, 17, 24],
    shutdownDays: [],
    actOverrides: { 3: "L.N", 10: "√" },
  },
  {
    sl: "9",
    craneNo: "DC-2",
    location: "Dock 1",
    planDays: [6, 13, 20],
    shutdownDays: [],
    actOverrides: { 6: "√", 13: "BD" },
  },
  {
    sl: "10",
    craneNo: "DC-3",
    location: "Dock 2",
    planDays: [2, 9, 16, 23],
    shutdownDays: [],
    actOverrides: { 2: "W", 9: "L" },
  },
  {
    sl: "11",
    craneNo: "EC-1",
    location: "East Wing",
    planDays: [5, 12, 19, 26],
    shutdownDays: [12],
    actOverrides: { 5: "√", 12: "√+S" },
  },
  {
    sl: "12",
    craneNo: "EC-2",
    location: "East Wing",
    planDays: [1, 8, 15, 22],
    shutdownDays: [],
    actOverrides: { 1: "√", 8: "T" },
  },
  {
    sl: "13",
    craneNo: "EC-3",
    location: "East Wing",
    planDays: [4, 11, 18, 25],
    shutdownDays: [],
    actOverrides: { 4: "F", 11: "√" },
  },
  {
    sl: "14",
    craneNo: "WC-1",
    location: "West Wing",
    planDays: [7, 14, 21, 28],
    shutdownDays: [],
    actOverrides: { 7: "C", 14: "√+BD" },
  },
  {
    sl: "15",
    craneNo: "WC-2",
    location: "West Wing",
    planDays: [3, 10, 17, 24],
    shutdownDays: [3],
    actOverrides: { 3: "SHUTDOWN", 10: "√" },
  },
  {
    sl: "16",
    craneNo: "WC-3",
    location: "West Wing",
    planDays: [6, 13, 20, 27],
    shutdownDays: [],
    actOverrides: { 6: "√", 13: "W.R" },
  },
  {
    sl: "17",
    craneNo: "NC-1",
    location: "North Yard",
    planDays: [2, 9, 16, 23],
    shutdownDays: [],
    actOverrides: { 2: "√", 9: "O" },
  },
  {
    sl: "18",
    craneNo: "NC-2",
    location: "North Yard",
    planDays: [5, 12, 19, 26],
    shutdownDays: [],
    actOverrides: { 5: "B.C", 12: "√" },
  },
  {
    sl: "19",
    craneNo: "SC-1",
    location: "South Yard",
    planDays: [1, 8, 15, 22],
    shutdownDays: [22],
    actOverrides: { 1: "√", 8: "M", 15: "√" },
  },
  {
    sl: "20",
    craneNo: "SC-2",
    location: "South Yard",
    planDays: [4, 11, 18, 25],
    shutdownDays: [],
    actOverrides: { 4: "√", 11: "L" },
  },
];

// ── Build CalendarDayCell[] for one equipment row ─────────────────────────────
function buildDays(equip: RawEquip): CalendarDayCell[] {
  const days: CalendarDayCell[] = [];

  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const isPast    = d < TODAY_DAY;
    const isToday   = d === TODAY_DAY;
    const planVal   = equip.planDays.includes(d)
      ? (equip.shutdownDays?.includes(d) ? "SHUTDOWN" : "√")
      : "";
    const actVal    = equip.actOverrides[d] ?? "";
    const isPlanned = planVal !== "";

    let status: CalendarDayCell["status"] = "N/A";
    if (isPlanned) {
      if (actVal) {
        // Any act value = completed
        status = "Completed";
      } else if (isPast) {
        status = "Overdue";
      } else if (isToday) {
        status = "Pending";
      } else {
        status = "Pending"; // future planned
      }
    }

    days.push({ day: d, plan: planVal, act: actVal, is_planned: isPlanned, status });
  }

  return days;
}

// ── Build CalendarEquipmentRow[] ──────────────────────────────────────────────
export const demoCalendarMatrix: CalendarEquipmentRow[] = RAW_EQUIP.map((e) => ({
  equipment : `${e.craneNo} | ${e.location}`,
  sl_no     : e.sl,
  crane_no  : e.craneNo,
  location  : e.location,
  days      : buildDays(e),
}));

// ── Build CalendarData ────────────────────────────────────────────────────────
export const demoCalendarData: CalendarData = {
  calendar_matrix : demoCalendarMatrix,
  equipment_list  : demoCalendarMatrix.map((r) => r.equipment),
  day_columns     : Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1),
  month           : THIS_MON,
  year            : THIS_YEAR,
  today_day       : TODAY_DAY,
  has_data        : true,
};

// ── Build today's PMTask list from demo data ──────────────────────────────────
export const demoTodayTasks: PMTask[] = [];

RAW_EQUIP.forEach((e) => {
  const todayPlan = e.planDays.includes(TODAY_DAY)
    ? (e.shutdownDays?.includes(TODAY_DAY) ? "SHUTDOWN" : "√")
    : null;
  if (!todayPlan) return;

  const alreadyDone = !!e.actOverrides[TODAY_DAY];
  const pmId = `DEMO-${e.craneNo}-D${TODAY_DAY}`;

  demoTodayTasks.push({
    PM_ID          : pmId,
    Equipment_Name : `${e.craneNo} Crane`,
    PM_Task        : `Preventive Maintenance Inspection — ${e.craneNo} at ${e.location}`,
    Due_Date       : format(NOW, "yyyy-MM-dd"),
    Status         : alreadyDone ? "Completed" : "Pending",
    Completed_By   : alreadyDone ? "Demo Technician" : "",
    Completed_On   : alreadyDone ? format(NOW, "yyyy-MM-dd") : "",
    Comment        : alreadyDone ? `Demo: ${e.actOverrides[TODAY_DAY]} applied` : "",
    SL_NO          : e.sl,
    Crane_No       : e.craneNo,
    Location       : e.location,
    Plan_Value     : todayPlan,
    Act_Value      : e.actOverrides[TODAY_DAY] ?? "",
    Day            : TODAY_DAY,
    Month          : THIS_MON,
    Year           : THIS_YEAR,
  });
});

// ── Build demo history records ────────────────────────────────────────────────
export const demoHistoryRecords: HistoryRecord[] = [];

let hIdx = 0;
RAW_EQUIP.forEach((e) => {
  Object.entries(e.actOverrides).forEach(([dayStr, actVal]) => {
    const day = parseInt(dayStr, 10);
    if (day >= TODAY_DAY) return; // only past
    const date = format(new Date(THIS_YEAR, THIS_MON - 1, day), "yyyy-MM-dd");
    const technicians = ["Rajesh Kumar","Suresh Nair","Anand Pillai","Vikram Singh","Priya Menon","Arun Das"];
    const tech = technicians[hIdx % technicians.length];
    const comments: Record<string,string> = {
      "√"       : "PM completed as scheduled. All checks passed.",
      "√/5"     : "PM done on day 5, slightly delayed but within window.",
      "B.C"     : "Barrel coupling replaced and greased.",
      "W.R"     : "Wire rope inspected — replaced outer strand.",
      "O"       : "Oil changed. Reservoir cleaned.",
      "M"       : "Motor brushes replaced. Bearing lubricated.",
      "L.N"     : "Lock nut re-torqued to spec.",
      "BD"      : "Breakdown occurred — crane taken offline for repair.",
      "√+BD"    : "PM done; breakdown also addressed same day.",
      "√+S"     : "PM combined with scheduled major shutdown.",
      "SHUTDOWN": "Major shutdown performed successfully.",
      "T"       : "Tong assembly serviced and re-pinned.",
      "C"       : "Compound applied to gearbox internals.",
      "F"       : "Floating shaft coupling replaced.",
      "W"       : "Wheel flanges measured — within tolerance.",
      "L"       : "Liner replaced in the hoist drum.",
    };

    demoHistoryRecords.push({
      id            : `DH-${String(++hIdx).padStart(3,"0")}`,
      PM_ID         : `DEMO-${e.craneNo}-D${day}`,
      Equipment_Name: `${e.craneNo} Crane`,
      Crane_No      : e.craneNo,
      PM_Task       : `PM Inspection — ${e.craneNo} at ${e.location}`,
      Due_Date      : date,
      Completed_On  : date,
      Completed_By  : tech,
      Comment       : comments[actVal] ?? `Code ${actVal} applied.`,
      Status        : actVal === "BD" ? "Overdue" : "Completed",
      action        : actVal === "BD" ? "Breakdown Logged" : "Task Completed",
      timestamp     : format(subHours(new Date(THIS_YEAR, THIS_MON - 1, day, 9, 0), 0), "yyyy-MM-dd'T'HH:mm:ss"),
      Act_Value     : actVal,
    });
  });
});

// Sort history newest first
demoHistoryRecords.sort((a, b) =>
  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
);

// ── Build demo notifications ───────────────────────────────────────────────────
export const demoNotifications: Notification[] = [
  {
    id        : "demo-notif-1",
    type      : "info",
    title     : "🎮 Demo Mode Active",
    message   : "You are viewing simulated data. No backend required. All 20 crane records are loaded.",
    timestamp : format(NOW, "yyyy-MM-dd'T'HH:mm:ss"),
    read      : false,
  },
  {
    id        : "demo-notif-2",
    type      : "overdue",
    title     : "⚠️ Overdue Tasks Detected",
    message   : "Some demo cranes have unactioned PLAN tasks from past days (simulated).",
    timestamp : format(subHours(NOW, 1), "yyyy-MM-dd'T'HH:mm:ss"),
    read      : false,
  },
  {
    id        : "demo-notif-3",
    type      : "pending",
    title     : "📋 Today's Tasks Ready",
    message   : `${demoTodayTasks.filter(t => t.Status === "Pending").length} crane PM tasks are due today in demo.`,
    timestamp : format(subHours(NOW, 2), "yyyy-MM-dd'T'HH:mm:ss"),
    read      : false,
  },
  {
    id        : "demo-notif-4",
    type      : "completed",
    title     : "✅ History Loaded",
    message   : `${demoHistoryRecords.length} past PM records loaded from demo dataset.`,
    timestamp : format(subHours(NOW, 3), "yyyy-MM-dd'T'HH:mm:ss"),
    read      : true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT — generates a real .xlsx file identical to real server format
// ─────────────────────────────────────────────────────────────────────────────

// Color map → ARGB hex for Excel fills
const CODE_FILL: Record<string, string> = {
  "√"       : "FFC6EFCE",
  "√/5"     : "FFC6EFCE",
  "SHUTDOWN": "FFFFFF00",
  "√+S"     : "FFFFD700",
  "BD"      : "FFFF0000",
  "√+BD"    : "FFFF6666",
  "B.C"     : "FFBDD7EE",
  "C"       : "FFD9D2E9",
  "W.R"     : "FFD9D9D9",
  "T"       : "FFD9EAD3",
  "W"       : "FFCFE2F3",
  "O"       : "FFFFF2CC",
  "F"       : "FFEAD1DC",
  "M"       : "FFFCE5CD",
  "L"       : "FFD9EAD3",
  "L.N"     : "FFF4CCCC",
};

const CODE_FONT: Record<string, string> = {
  "√"       : "FF276221",
  "SHUTDOWN": "FF7D6608",
  "√+S"     : "FF7D6608",
  "BD"      : "FFFFFFFF",
  "√+BD"    : "FF7B0000",
  "B.C"     : "FF1F4E79",
  "C"       : "FF20124D",
  "W.R"     : "FF000000",
  "T"       : "FF0C343D",
  "W"       : "FF0D3349",
  "O"       : "FF7D4E00",
  "F"       : "FF4A235A",
  "M"       : "FF7F4800",
  "L"       : "FF274E13",
  "L.N"     : "FF660000",
};

function applyFill(ws: XLSX.WorkSheet, cellAddr: string, code: string) {
  const fillColor = CODE_FILL[code] ?? CODE_FILL["√"];
  const fontColor = CODE_FONT[code] ?? "FF000000";
  if (!ws[cellAddr]) return;
  ws[cellAddr].s = {
    fill : { patternType: "solid", fgColor: { rgb: fillColor.replace("FF","") } },
    font : { bold: true, color: { rgb: fontColor.replace("FF","") } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top   : { style: "thin", color: { rgb: "FFD0D0D0" } },
      bottom: { style: "thin", color: { rgb: "FFD0D0D0" } },
      left  : { style: "thin", color: { rgb: "FFD0D0D0" } },
      right : { style: "thin", color: { rgb: "FFD0D0D0" } },
    },
  };
}

export function exportDemoExcel() {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: PM_DATA (calendar format) ─────────────────────────────────────
  const sheetRows: (string | number)[][] = [];

  // Row 1: Header labels (SL.NO, CRANE NO, LOCATION, DAY, Sun Mon Tue ...)
  const headerRow: (string | number)[] = ["SL.NO", "CRANE NO", "LOCATION", "DAY"];
  for (let d = 1; d <= TOTAL_DAYS; d++) headerRow.push(dowName(d));
  sheetRows.push(headerRow);

  // Row 2: DATE row
  sheetRows.push(["", "", "", "DATE", ...Array.from({length: TOTAL_DAYS}, (_x,i) => i+1)]);

  // Equipment rows: for each crane → PLAN row then ACT row
  RAW_EQUIP.forEach((e) => {
    const planRow: (string | number)[] = [e.sl, e.craneNo, e.location, "PLAN"];
    const actRow : (string | number)[] = ["",   "",        "",          "ACT" ];

    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const planVal = e.planDays.includes(d)
        ? (e.shutdownDays?.includes(d) ? "SHUTDOWN" : "√")
        : "";
      const actVal  = e.actOverrides[d] ?? "";
      planRow.push(planVal);
      actRow.push(actVal);
    }

    sheetRows.push(planRow);
    sheetRows.push(actRow);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);

  // Set column widths
  ws["!cols"] = [
    { wch: 7  },  // SL.NO
    { wch: 10 },  // CRANE NO
    { wch: 12 },  // LOCATION
    { wch: 8  },  // DAY
    ...Array.from({ length: TOTAL_DAYS }, (): { wch: number } => ({ wch: 5 })),
  ];

  // Set row heights
  ws["!rows"] = sheetRows.map((_r) => ({ hpt: 18 }));

  // Apply colors to header row
  const colLetters = (n: number) => {
    let s = "";
    n++;
    while (n > 0) {
      n--;
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26);
    }
    return s;
  };

  // Style header row (row 1) — dark blue
  for (let c = 0; c < 4 + TOTAL_DAYS; c++) {
    const addr = `${colLetters(c)}1`;
    if (!ws[addr]) ws[addr] = { t: "s", v: headerRow[c] ?? "" };
    ws[addr].s = {
      fill : { patternType: "solid", fgColor: { rgb: "1F3864" } },
      font : { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // Style DATE row (row 2) — medium blue
  for (let c = 0; c < 4 + TOTAL_DAYS; c++) {
    const addr = `${colLetters(c)}2`;
    if (!ws[addr]) continue;
    ws[addr].s = {
      fill : { patternType: "solid", fgColor: { rgb: "2F5496" } },
      font : { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // Style each equipment PLAN / ACT row
  let rowIdx = 3;
  RAW_EQUIP.forEach((_eq) => {
    // PLAN row
    for (let c = 0; c < 4 + TOTAL_DAYS; c++) {
      const addr = `${colLetters(c)}${rowIdx}`;
      if (!ws[addr]) continue;
      ws[addr].s = {
        fill : { patternType: "solid", fgColor: { rgb: c < 4 ? "D6DCE4" : "EBF0F8" } },
        font : { bold: c < 4, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
      // PLAN √ in green-ish
      if (c >= 4 && ws[addr].v === "√") {
        ws[addr].s.font = { color: { rgb: "375623" }, bold: true };
      }
    }
    rowIdx++;

    // ACT row — apply code colors
    for (let c = 0; c < 4 + TOTAL_DAYS; c++) {
      const addr = `${colLetters(c)}${rowIdx}`;
      if (!ws[addr]) continue;
      const val = ws[addr].v as string;
      if (c < 4) {
        ws[addr].s = {
          fill : { patternType: "solid", fgColor: { rgb: "F2F2F2" } },
          font : { bold: true, color: { rgb: "666666" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      } else if (val) {
        applyFill(ws, addr, val);
      } else {
        ws[addr].s = {
          fill : { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    }
    rowIdx++;
  });

  XLSX.utils.book_append_sheet(wb, ws, "PM_DATA");

  // ── Sheet 2: LEGEND ─────────────────────────────────────────────────────────
  const legendRows = [
    ["CODE", "MEANING", "EXCEL COLOR"],
    ["√",       "PM Completed (Normal)",           "Green"],
    ["SHUTDOWN","Major Shutdown",                   "Yellow"],
    ["√+S",     "Shutdown & PM",                   "Dark Yellow"],
    ["BD",      "Breakdown",                        "Red"],
    ["√+BD",    "Breakdown & PM",                  "Light Red"],
    ["B.C",     "Barrel Coupling",                  "Light Blue"],
    ["C",       "Compound",                         "Lavender"],
    ["W.R",     "Wire Rope",                        "Gray"],
    ["T",       "Tong",                             "Light Green"],
    ["W",       "Wheel",                            "Cyan"],
    ["O",       "Oil",                              "Light Yellow"],
    ["F",       "Floating Shaft",                   "Pink"],
    ["M",       "Motor",                            "Peach"],
    ["L",       "Liner",                            "Pale Green"],
    ["L.N",     "Lock Nut",                         "Rose"],
  ];
  const wsLegend = XLSX.utils.aoa_to_sheet(legendRows);
  wsLegend["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsLegend, "LEGEND");

  // ── Sheet 3: HISTORY ────────────────────────────────────────────────────────
  const histHeaders = ["PM_ID","Crane No","Location","Due Date","Completed On","Completed By","ACT Code","Comment","Status"];
  const histRows = demoHistoryRecords.map(r => [
    r.PM_ID,
    r.Crane_No ?? "",
    "",
    r.Due_Date,
    r.Completed_On,
    r.Completed_By,
    r.Act_Value ?? "√",
    r.Comment,
    r.Status,
  ]);
  const wsHist = XLSX.utils.aoa_to_sheet([histHeaders, ...histRows]);
  wsHist["!cols"] = [
    {wch:20},{wch:10},{wch:12},{wch:12},{wch:14},{wch:16},{wch:10},{wch:40},{wch:12}
  ];
  XLSX.utils.book_append_sheet(wb, wsHist, "HISTORY");

  // ── Write and download ───────────────────────────────────────────────────────
  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob  = new Blob([wbOut], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const monthName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][THIS_MON - 1];
  saveAs(blob, `PM_Demo_Data_${monthName}_${THIS_YEAR}.xlsx`);
}
