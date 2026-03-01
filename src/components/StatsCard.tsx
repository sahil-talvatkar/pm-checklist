import React from "react";
import { cn } from "../utils/cn";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "orange";
  subtitle?: string;
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    value: "text-blue-700",
    title: "text-blue-600",
  },
  green: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    value: "text-emerald-700",
    title: "text-emerald-600",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-100",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    value: "text-red-700",
    title: "text-red-600",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-100",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    value: "text-orange-700",
    title: "text-orange-600",
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
}) => {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        "rounded-xl border p-5 flex items-center gap-4 shadow-sm transition-all hover:shadow-md",
        colors.bg,
        colors.border
      )}
    >
      <div className={cn("p-3 rounded-xl", colors.iconBg)}>
        <div className={cn("w-6 h-6", colors.iconColor)}>{icon}</div>
      </div>
      <div>
        <p className={cn("text-xs font-semibold uppercase tracking-wide", colors.title)}>
          {title}
        </p>
        <p className={cn("text-3xl font-bold", colors.value)}>{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
