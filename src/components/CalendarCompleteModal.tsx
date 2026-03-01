import React, { useState, useMemo } from "react";
import { CalendarDayCell, CalendarEquipmentRow, ACT_CODES, ACT_CODE_MAP, ActCode } from "../types/pm";
import { cn } from "../utils/cn";
import {
  X,
  CheckCircle2,
  Calendar,
  User,
  MessageSquare,
  RefreshCw,
  Wrench,
  MapPin,
  Hash,
  ChevronDown,
  Info,
  Zap,
} from "lucide-react";

interface CalendarCompleteModalProps {
  equipRow: CalendarEquipmentRow;
  day: number;
  month: number;
  year: number;
  cell: CalendarDayCell;
  onConfirm: (completedBy: string, comment: string, actCode: string) => Promise<void>;
  onClose: () => void;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Group ACT codes for dropdown sections
const CODE_GROUPS = [
  "✅ Completion",
  "🔧 Shutdown / PM",
  "🔴 Breakdown",
  "⚙️ Components",
];

export const CalendarCompleteModal: React.FC<CalendarCompleteModalProps> = ({
  equipRow,
  day,
  month,
  year,
  cell,
  onConfirm,
  onClose,
}) => {
  const [completedBy, setCompletedBy]   = useState("");
  const [comment, setComment]           = useState("");
  const [selectedCode, setSelectedCode] = useState<ActCode>(ACT_CODES[0]); // default √
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const dateStr          = `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  const alreadyCompleted = cell.status === "Completed";
  const isOverdue        = cell.status === "Overdue";

  // Group codes for display
  const groupedCodes = useMemo(() => {
    return CODE_GROUPS.map((group) => ({
      group,
      codes: ACT_CODES.filter((c) => c.group === group),
    }));
  }, []);

  const handleConfirm = async () => {
    if (!completedBy.trim()) {
      setError("Please enter the technician / completed by name.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(completedBy.trim(), comment.trim(), selectedCode.value);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setIsSaving(false);
    }
  };

  const headerGradient = alreadyCompleted
    ? "from-emerald-600 to-emerald-700"
    : isOverdue
    ? "from-orange-600 to-red-600"
    : "from-blue-600 to-blue-700";

  // Current act cell (if already has value)
  const existingCode = cell.act ? ACT_CODE_MAP[cell.act.trim()] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={cn("px-6 py-4 text-white bg-gradient-to-r flex-shrink-0", headerGradient)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {alreadyCompleted ? "PM Task — Already Completed" : "Update PM Task"}
                </h3>
                <p className="text-xs text-white/75 mt-0.5">
                  Select action code → writes to Excel ACT row with color
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ──────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Equipment Info Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Hash className="w-3 h-3 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase">SL.NO</span>
              </div>
              <p className="text-lg font-black text-slate-700">{equipRow.sl_no || "—"}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-bold text-blue-400 uppercase">Location</span>
              </div>
              <p className="text-sm font-bold text-blue-700 truncate">{equipRow.location || "—"}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-purple-400" />
                <span className="text-[9px] font-bold text-purple-400 uppercase">Date</span>
              </div>
              <p className="text-xs font-bold text-purple-700">{dateStr}</p>
            </div>
          </div>

          {/* Crane Name + Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Wrench className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Crane / Equipment</p>
              <p className="text-sm font-bold text-gray-800 truncate">
                {equipRow.crane_no || equipRow.equipment}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 text-center">
                <p className="text-[9px] text-purple-400 font-bold uppercase">Plan</p>
                <p className="text-sm font-black text-purple-700">{cell.plan || "√"}</p>
              </div>
              <div className={cn(
                "border rounded-lg px-2.5 py-1.5 text-center",
                alreadyCompleted ? "bg-emerald-50 border-emerald-200" :
                isOverdue        ? "bg-orange-50 border-orange-200"   :
                                   "bg-red-50 border-red-200"
              )}>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Status</p>
                <p className={cn(
                  "text-xs font-black",
                  alreadyCompleted ? "text-emerald-700" :
                  isOverdue        ? "text-orange-700"  : "text-red-700"
                )}>
                  {cell.status}
                </p>
              </div>
            </div>
          </div>

          {/* Already completed notice */}
          {alreadyCompleted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">This task is already completed ✅</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Current ACT value in Excel:{" "}
                    <strong className="font-mono">
                      {cell.act || "√"}
                    </strong>
                  </p>
                </div>
              </div>
              {/* Show the code badge */}
              {existingCode && (
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-bold",
                  existingCode.color, existingCode.textColor, existingCode.borderColor
                )}>
                  <span className="text-lg font-black">{existingCode.value}</span>
                  <div>
                    <p className="text-xs font-bold">{existingCode.label}</p>
                    <p className="text-[10px] font-normal opacity-75">{existingCode.description}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ── ACT Code Dropdown ──────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  <Zap className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                  Select Action / PM Code
                  <span className="text-red-500 ml-1">*</span>
                  <span className="text-gray-400 font-normal ml-2">— This code will be written to Excel with the matching color</span>
                </label>

                {/* Selected code preview */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((p) => !p)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left",
                      selectedCode.color,
                      selectedCode.borderColor,
                      dropdownOpen ? "ring-2 ring-blue-400 ring-offset-1" : ""
                    )}
                  >
                    {/* Color swatch */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 flex items-center justify-center text-base font-black flex-shrink-0",
                        selectedCode.color, selectedCode.borderColor, selectedCode.textColor
                      )}
                    >
                      {selectedCode.value}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-bold", selectedCode.textColor)}>
                        {selectedCode.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedCode.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase bg-white/70 px-1.5 py-0.5 rounded">
                          {selectedCode.group}
                        </span>
                        {selectedCode.isCompletion && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            ✓ Counts as Completion
                          </span>
                        )}
                        {!selectedCode.isCompletion && (
                          <span className="text-[9px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                            ⚠ Not a completion
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-gray-500 flex-shrink-0 transition-transform",
                      dropdownOpen && "rotate-180"
                    )} />
                  </button>

                  {/* Dropdown panel */}
                  {dropdownOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                      {groupedCodes.map(({ group, codes }) => (
                        <div key={group}>
                          {/* Group header */}
                          <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{group}</p>
                          </div>
                          {/* Code items */}
                          {codes.map((code) => (
                            <button
                              key={code.value}
                              type="button"
                              onClick={() => {
                                setSelectedCode(code);
                                setDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-all text-left border-b border-gray-50",
                                selectedCode.value === code.value && "bg-blue-50 border-l-4 border-l-blue-500"
                              )}
                            >
                              {/* Swatch */}
                              <div
                                className={cn(
                                  "w-9 h-9 rounded-lg border-2 flex items-center justify-center text-xs font-black flex-shrink-0",
                                  code.color, code.borderColor, code.textColor
                                )}
                              >
                                {code.value.length > 4 ? code.value.slice(0, 3) : code.value}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-gray-800">{code.label}</p>
                                  {code.isCompletion && (
                                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
                                      ✓ Done
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{code.description}</p>
                              </div>
                              {/* Excel color preview */}
                              <div className="flex-shrink-0 text-right">
                                <div
                                  className="w-5 h-5 rounded border border-gray-300 ml-auto"
                                  style={{ backgroundColor: `#${code.excelFill}` }}
                                  title={`Excel fill: #${code.excelFill}`}
                                />
                                <p className="text-[8px] text-gray-400 mt-0.5">Excel</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick code palette */}
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400 font-semibold mb-1.5">Quick Select:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ACT_CODES.map((code) => (
                      <button
                        key={code.value}
                        type="button"
                        onClick={() => { setSelectedCode(code); setDropdownOpen(false); }}
                        title={`${code.label} — ${code.description}`}
                        className={cn(
                          "px-2 py-1 rounded-lg border-2 text-xs font-bold transition-all",
                          code.color, code.borderColor, code.textColor,
                          selectedCode.value === code.value
                            ? "ring-2 ring-blue-500 ring-offset-1 scale-105"
                            : "hover:scale-105 hover:shadow-sm"
                        )}
                      >
                        {code.value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Completed By */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  <User className="w-3.5 h-3.5 inline mr-1 text-gray-500" />
                  Completed By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter technician / engineer name..."
                  value={completedBy}
                  onChange={(e) => { setCompletedBy(e.target.value); setError(null); }}
                  className={cn(
                    "w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-all",
                    error && !completedBy.trim() ? "border-red-400 bg-red-50" : "border-gray-200"
                  )}
                  autoFocus
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1 text-gray-500" />
                  Comment / Remarks
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  placeholder="Add observations, issues found, parts replaced, or general remarks..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                />
              </div>

              {/* What will happen */}
              <div className={cn(
                "border rounded-xl px-4 py-3 space-y-1.5",
                selectedCode.color.replace("bg-", "bg-").replace("100", "50"),
                "border-gray-200"
              )}>
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  What will be written to Excel:
                </p>
                <div className="flex items-start gap-3">
                  {/* Color preview */}
                  <div
                    className="w-14 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-sm font-black flex-shrink-0 shadow-sm"
                    style={{
                      backgroundColor: `#${selectedCode.excelFill}`,
                      color: `#${selectedCode.excelFont}`,
                      borderColor: `#${selectedCode.excelFill}`,
                    }}
                  >
                    {selectedCode.value}
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <p>
                      • ACT row → Day <strong>{day}</strong> cell:&nbsp;
                      <strong className="font-mono">{selectedCode.value}</strong>
                      &nbsp;with&nbsp;
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          backgroundColor: `#${selectedCode.excelFill}`,
                          color: `#${selectedCode.excelFont}`,
                        }}
                      >
                        this color
                      </span>
                    </p>
                    <p>• Cell note: Completed by <strong>{completedBy || "[name]"}</strong> on {new Date().toLocaleDateString()}</p>
                    {comment && <p>• Comment: "{comment}"</p>}
                    <p className="text-[10px] text-gray-400">
                      Crane: <strong>{equipRow.crane_no || equipRow.equipment}</strong> | SL: <strong>{equipRow.sl_no}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-700 font-semibold">⚠️ {error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
          >
            {alreadyCompleted ? "Close" : "Cancel"}
          </button>
          {!alreadyCompleted && (
            <button
              onClick={handleConfirm}
              disabled={isSaving || !completedBy.trim()}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm",
                completedBy.trim() && !isSaving
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Saving to Excel…</>
              ) : (
                <>
                  <div
                    className="w-5 h-5 rounded border border-white/30 flex items-center justify-center text-[10px] font-black"
                    style={{ backgroundColor: `#${selectedCode.excelFill}`, color: `#${selectedCode.excelFont}` }}
                  >
                    {selectedCode.value.slice(0, 2)}
                  </div>
                  Save "{selectedCode.value}" → Excel
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
