import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Info } from "lucide-react";

export default function MetricCard({ title, value, icon, iconColor, subtitle, badge, trendLabel, helpText }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-[#04362c] ${iconColor} shadow-sm`}>{icon}</div>
          <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-[0.25em] text-black/60">{title}</span>
            {helpText && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center text-black/40 hover:text-[#0DAD8D] transition-colors cursor-help"
                    aria-label={`Help for ${title}`}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  className="max-w-xs bg-[#04362c] text-white p-3 text-sm leading-relaxed z-50"
                  side="top"
                  sideOffset={8}
                >
                  <p className="font-semibold mb-1">{title}</p>
                  <p>{helpText}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {badge && (
          <span className="rounded-full bg-[#f0faf7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0DAD8D]">
            {badge}
          </span>
        )}
      </div>
      <div className="text-3xl sm:text-4xl font-semibold text-[#04362c] leading-tight">{value}</div>
      <div className="flex flex-col gap-1 text-sm sm:text-base text-black/60">
        {subtitle && <span>{subtitle}</span>}
        {trendLabel && <span className="text-[#0DAD8D] font-medium">{trendLabel}</span>}
      </div>
    </div>
  );
}
