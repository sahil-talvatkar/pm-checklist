import React from "react";
import { cn } from "../utils/cn";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
}) => {
  const getConfig = () => {
    switch (status) {
      case "Completed":
        return {
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: <CheckCircle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
          label: "Completed",
        };
      case "Overdue":
        return {
          bg: "bg-orange-100 text-orange-800 border-orange-200",
          icon: <AlertTriangle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
          label: "Overdue",
        };
      default:
        return {
          bg: "bg-red-100 text-red-800 border-red-200",
          icon: <Clock className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
          label: "Pending",
        };
    }
  };

  const config = getConfig();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold border rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        config.bg
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
};
