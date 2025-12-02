import { RefreshCcw, Sparkles, AlertTriangle, BarChart3, Target, Lightbulb, AlertCircle, CloudSun, Building2 } from "lucide-react";

const sectionPalette = {
  analysis: {
    title: "AI Analysis",
    accent: "#0DAD8D",
    icon: BarChart3,
    bgColor: "bg-[#d9f4ed]",
  },
  recommendations: {
    title: "Recommended Moves",
    accent: "#0A8B78",
    icon: Target,
    bgColor: "bg-[#def8f2]",
  },
  opportunities: {
    title: "Savings Opportunities",
    accent: "#0F7A6B",
    icon: Lightbulb,
    bgColor: "bg-[#e0efe9]",
  },
  risks: {
    title: "Risk Alerts",
    accent: "#B45309",
    icon: AlertCircle,
    bgColor: "bg-[#fef3c7]",
  },
  seasonal: {
    title: "Seasonal Signals",
    accent: "#047857",
    icon: CloudSun,
    bgColor: "bg-[#dcf5ef]",
  },
  culture: {
    title: "Cultural Notes",
    accent: "#2563EB",
    icon: Building2,
    bgColor: "bg-[#dbeafe]",
  },
};

const SectionList = ({ variant, items }) => {
  if (!items || items.length === 0) {
    return null;
  }

  const palette = sectionPalette[variant];
  const IconComponent = palette.icon;

  return (
    <div className="rounded-2xl border border-black/5 bg-white/90 backdrop-blur-sm p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-[#04362c] ${palette.bgColor} shadow-sm`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <h4 className="text-base font-semibold" style={{ color: palette.accent }}>
          {palette.title}
        </h4>
      </div>
      <ul className="space-y-2 text-sm sm:text-base text-[#04362c]">
        {items.map((item, idx) => (
          <li key={`${variant}-${idx}`} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette.accent }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function SmartAnalysisPanel({ data, loading, error, onRefresh, periodLabel }) {
  const summaryTitle = data?.summary_title || "AI Smart Analysis";
  const periodLabelToShow = data?.period_label || periodLabel || "the selected period";
  const generatedAt = data?.generated_at ? new Date(data.generated_at) : null;
  const lastUpdatedCopy = generatedAt
    ? `Updated ${generatedAt.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  return (
    <section className="rounded-[32px] border border-black/5 bg-white/95 p-6 lg:p-8 shadow-lg space-y-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0DAD8D]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#0DAD8D]">
              <Sparkles className="h-4 w-4" />
              <span>RayyAI Smart Analysis</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: "#04362c" }}>
              {summaryTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#0DAD8D] bg-white px-5 py-2.5 text-sm font-semibold text-[#0DAD8D] shadow-sm transition-all hover:bg-[#0DAD8D] hover:text-white hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#0DAD8D] shrink-0"
          >
            <RefreshCcw className={`h-4 w-4 transition-transform ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
        <p className="text-base sm:text-lg text-black/70 leading-relaxed">
          Our AI reviews <strong>{periodLabelToShow}</strong> and blends it with Malaysian financial culture to surface personalised next steps.
        </p>
        {lastUpdatedCopy && (
          <p className="text-xs uppercase tracking-[0.35em] text-black/40">{lastUpdatedCopy}</p>
        )}
      </div>

      <div>
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-32 rounded-2xl bg-[#f3f7f5] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : data ? (
          <div className="grid gap-4">
            <SectionList variant="analysis" items={data.analysis_points} />
            <SectionList variant="recommendations" items={data.recommendations} />
            <SectionList variant="opportunities" items={data.savings_opportunities} />
            <SectionList variant="risks" items={data.risk_alerts} />
            <SectionList variant="seasonal" items={data.seasonal_signals} />
            <SectionList variant="culture" items={data.cultural_notes} />
          </div>
        ) : (
          <div className="rounded-2xl border border-black/5 bg-white/90 p-6 text-center space-y-3">
            <p className="text-sm text-black/60">
              {data === null 
                ? "Click 'Refresh Insight' to generate your personalized AI analysis based on your financial data."
                : "We could not find enough data to generate smart analysis just yet. Track a few transactions and budgets then refresh."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

