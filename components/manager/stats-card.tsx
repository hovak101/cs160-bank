import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-lg hover:shadow-[0_0_40px_-8px_#22d3ee_/_0.2)] transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-500">vs last month</span>
            </div>
          )}
        </div>
        <Icon className="h-5 w-5 text-teal-400" />
      </div>
    </div>
  );
}
