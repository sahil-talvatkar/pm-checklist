import React from "react";
import { Search, Filter, Calendar, RefreshCw } from "lucide-react";
import { FilterState } from "../types/pm";
import { cn } from "../utils/cn";

interface FilterBarProps {
  filters: FilterState;
  equipmentNames: string[];
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalCount: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  equipmentNames,
  onFilterChange,
  onReset,
  onRefresh,
  isLoading,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* PM ID Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by PM ID..."
            value={filters.pmId}
            onChange={(e) => onFilterChange("pmId", e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-400 transition-all"
          />
        </div>

        {/* Equipment Name Filter */}
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filters.equipmentName}
            onChange={(e) => onFilterChange("equipmentName", e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-700 appearance-none transition-all cursor-pointer"
          >
            <option value="">All Equipment</option>
            {equipmentNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Due Date Filter */}
        <div className="relative flex-1 min-w-[180px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={filters.dueDate}
            onChange={(e) => onFilterChange("dueDate", e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-700 transition-all"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onReset}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
          >
            Reset
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm",
              isLoading && "opacity-75 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Showing{" "}
          <span className="font-semibold text-gray-700">{filteredCount}</span>{" "}
          of <span className="font-semibold text-gray-700">{totalCount}</span>{" "}
          tasks
        </p>
        {(filters.pmId || filters.equipmentName || filters.dueDate) && (
          <button
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
};
