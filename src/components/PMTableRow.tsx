import React, { useState } from "react";
import { PMTask } from "../types/pm";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../utils/cn";
import { Save, CheckSquare, Square, User, CalendarCheck } from "lucide-react";
import { format } from "date-fns";

interface PMTableRowProps {
  task: PMTask;
  onSave: (pmId: string, comment: string) => Promise<void>;
  index: number;
}

export const PMTableRow: React.FC<PMTableRowProps> = ({
  task,
  onSave,
  index,
}) => {
  const [isChecked, setIsChecked] = useState(task.Status === "Completed");
  const [comment, setComment] = useState(task.Comment || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(task.Status === "Completed");

  const isCompleted = isSaved || task.Status === "Completed";
  const isOverdue = task.Status === "Overdue" && !isCompleted;

  const handleCheckbox = () => {
    if (isCompleted) return;
    setIsChecked(!isChecked);
  };

  const handleSave = async () => {
    if (!isChecked || isSaving || isSaved) return;
    setIsSaving(true);
    try {
      await onSave(task.PM_ID, comment);
      setIsSaved(true);
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const displayStatus = isCompleted
    ? "Completed"
    : isOverdue
    ? "Overdue"
    : "Pending";

  return (
    <tr
      className={cn(
        "border-b transition-all group",
        isCompleted
          ? "bg-emerald-50/50 border-emerald-100"
          : isOverdue
          ? "bg-orange-50/60 border-orange-100"
          : index % 2 === 0
          ? "bg-white border-gray-100 hover:bg-blue-50/30"
          : "bg-gray-50/50 border-gray-100 hover:bg-blue-50/30"
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={handleCheckbox}
          disabled={isCompleted}
          className={cn(
            "transition-all",
            isCompleted
              ? "text-emerald-500 cursor-default"
              : "text-gray-400 hover:text-blue-600 cursor-pointer"
          )}
          title={isCompleted ? "Task completed" : "Mark as complete"}
        >
          {isChecked ? (
            <CheckSquare className="w-5 h-5" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>
      </td>

      {/* PM ID */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md font-mono">
          {task.PM_ID}
        </span>
      </td>

      {/* Equipment Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              isCompleted
                ? "bg-emerald-400"
                : isOverdue
                ? "bg-orange-400"
                : "bg-red-400"
            )}
          />
          <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
            {task.Equipment_Name}
          </span>
        </div>
        {isCompleted && task.Completed_By && (
          <div className="flex items-center gap-1 mt-1 ml-4">
            <User className="w-3 h-3 text-emerald-600" />
            <span className="text-xs text-emerald-600">{task.Completed_By}</span>
          </div>
        )}
      </td>

      {/* Task Description */}
      <td className="px-4 py-3">
        <p
          className={cn(
            "text-sm max-w-xs",
            isCompleted ? "text-gray-400 line-through" : "text-gray-700"
          )}
        >
          {task.PM_Task}
        </p>
      </td>

      {/* Due Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <CalendarCheck
            className={cn(
              "w-4 h-4",
              isCompleted
                ? "text-emerald-500"
                : isOverdue
                ? "text-orange-500"
                : "text-gray-400"
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              isCompleted
                ? "text-emerald-700"
                : isOverdue
                ? "text-orange-700 font-semibold"
                : "text-gray-600"
            )}
          >
            {task.Due_Date
              ? format(new Date(task.Due_Date + "T00:00:00"), "MMM dd, yyyy")
              : "—"}
          </span>
        </div>
        {isCompleted && task.Completed_On && (
          <p className="text-xs text-gray-400 mt-0.5 pl-5">
            Done:{" "}
            {format(new Date(task.Completed_On + "T00:00:00"), "MMM dd, yyyy")}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={displayStatus} />
      </td>

      {/* Comment */}
      <td className="px-4 py-3 min-w-[180px]">
        {isCompleted ? (
          <div className="text-sm text-gray-500 italic bg-gray-100 rounded-lg px-3 py-2 max-w-[200px] truncate">
            {comment || task.Comment || "No comment"}
          </div>
        ) : (
          <input
            type="text"
            placeholder="Add comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!isChecked}
            className={cn(
              "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
              isChecked
                ? "border-blue-300 bg-white placeholder-gray-400"
                : "border-gray-200 bg-gray-100 placeholder-gray-300 cursor-not-allowed"
            )}
          />
        )}
      </td>

      {/* Save Button */}
      <td className="px-4 py-3">
        <button
          onClick={handleSave}
          disabled={!isChecked || isSaving || isSaved}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shadow-sm",
            isSaved
              ? "bg-emerald-100 text-emerald-700 cursor-default border border-emerald-200"
              : isChecked && !isSaving
              ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
          )}
        >
          {isSaving ? (
            <>
              <svg
                className="animate-spin w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </>
          ) : isSaved ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save
            </>
          )}
        </button>
      </td>
    </tr>
  );
};
