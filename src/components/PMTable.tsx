import React from "react";
import { PMTask } from "../types/pm";
import { PMTableRow } from "./PMTableRow";
import { ClipboardList } from "lucide-react";

interface PMTableProps {
  tasks: PMTask[];
  onSave: (pmId: string, comment: string) => Promise<void>;
  isLoading: boolean;
}

export const PMTable: React.FC<PMTableProps> = ({
  tasks,
  onSave,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-blue-100 rounded-full" />
            <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-gray-600 font-medium">Loading PM Tasks...</p>
            <p className="text-gray-400 text-sm mt-1">
              Fetching data from Excel database
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="p-5 bg-gray-100 rounded-full">
            <ClipboardList className="w-10 h-10 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-600 font-semibold text-lg">
              No PM Tasks Found
            </p>
            <p className="text-gray-400 text-sm mt-1">
              No tasks match your current filters
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider w-12">
                ✓
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                PM ID
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                Equipment Name
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                Task Description
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                Due Date
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                Comment
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <PMTableRow
                key={task.PM_ID}
                task={task}
                onSave={onSave}
                index={index}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Total: <span className="font-semibold text-gray-700">{tasks.length}</span> task{tasks.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            Overdue
          </span>
        </div>
      </div>
    </div>
  );
};
