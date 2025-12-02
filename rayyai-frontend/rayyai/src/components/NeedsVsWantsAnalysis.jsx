import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { API_BASE_URL } from "../services/api";

const defaultFormat = (n) =>
  `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: 1 })}`;

const RANGE_PRESETS_YEARLY = [
  { label: "3M", value: 3, type: "months" },
  { label: "6M", value: 6, type: "months" },
  { label: "1Y", value: 12, type: "months" },
];

const RANGE_PRESETS_MONTHLY = [
  { label: "7D", value: 7, type: "days" },
  { label: "14D", value: 14, type: "days" },
  { label: "30D", value: 30, type: "days" },
];

const SUBSCRIPTION_KEYWORDS = [
  "netflix",
  "spotify",
  "iflix",
  "viu",
  "disney",
  "youtube",
  "prime",
  "subscription",
  "subs",
  "subscription",
  "membership",
];

const TELCO_KEYWORDS = [
  "maxis",
  "celcom",
  "digi",
  "umobile",
  "yes",
  "unifi",
  "time dotcom",
  "astro",
];

export default function NeedsVsWantsAnalysis({
  selectedDate = new Date(),
  viewMode = "monthly",
  formatCurrency = defaultFormat,
  currencyMeta,
  enableInsightsFetch = true, // Controls when to fetch AI insights
}) {
  const [rawExpenses, setRawExpenses] = useState([]);
  const [periodBounds, setPeriodBounds] = useState({ start: null, end: null });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(viewMode === "yearly" ? "1Y" : "30D");

  const rangePresets = useMemo(
    () => (viewMode === "yearly" ? RANGE_PRESETS_YEARLY : RANGE_PRESETS_MONTHLY),
    [viewMode]
  );

  useEffect(() => {
    setRange(viewMode === "yearly" ? "1Y" : "30D");
  }, [viewMode]);

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setRawExpenses([]);
          setLoading(false);
          return;
        }

        let startDate;
        let endDate;

        if (viewMode === "yearly") {
          startDate = new Date(selectedDate.getFullYear(), 0, 1);
          const isCurrentYear = selectedDate.getFullYear() === new Date().getFullYear();
          endDate = isCurrentYear ? new Date() : new Date(selectedDate.getFullYear(), 11, 31);
        } else {
          startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
          const isCurrentMonth =
            selectedDate.getMonth() === new Date().getMonth() &&
            selectedDate.getFullYear() === new Date().getFullYear();
          endDate = isCurrentMonth ? new Date() : lastDayOfMonth;
        }

        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = endDate.toISOString().split("T")[0];

        const response = await fetch(
          `${API_BASE_URL}/transactions/expense?start_date=${startDateStr}&end_date=${endDateStr}&limit=1000`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          setRawExpenses([]);
          setPeriodBounds({ start: startDate, end: endDate });
          return;
        }

        const expenses = await response.json();
        setRawExpenses(Array.isArray(expenses) ? expenses : []);
        setPeriodBounds({ start: startDate, end: endDate });
      } catch (error) {
        console.error("Error fetching expenses:", error);
        setRawExpenses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [selectedDate, viewMode]);

  const preset = useMemo(
    () => rangePresets.find((r) => r.label === range) || rangePresets[rangePresets.length - 1],
    [range, rangePresets]
  );

  const filterWindow = useMemo(() => {
    if (!periodBounds.end) {
      return { start: null, filtered: rawExpenses };
    }

    const end = new Date(periodBounds.end);
    if (Number.isNaN(end.getTime())) {
      return { start: null, filtered: rawExpenses };
    }

    let start = new Date(periodBounds.start || periodBounds.end);

    if (viewMode === "yearly") {
      const monthsBack = preset?.value ?? 12;
      start = new Date(end.getFullYear(), end.getMonth() - (monthsBack - 1), 1);
    } else {
      const daysBack = preset?.value ?? 30;
      start = new Date(end);
      start.setDate(start.getDate() - (daysBack - 1));
    }

    const filtered = rawExpenses.filter((expense) => {
      const when = expense.date_spent || expense.created_at;
      if (!when) return false;
      const dt = new Date(when);
      if (Number.isNaN(dt.getTime())) return false;
      return dt >= start && dt <= end;
    });

    return { start, filtered };
  }, [rawExpenses, periodBounds, preset, viewMode]);

  const comparisonExpenses = useMemo(() => {
    if (!filterWindow.start || !periodBounds.start) return [];

    return rawExpenses.filter((expense) => {
      const when = expense.date_spent || expense.created_at;
      if (!when) return false;
      const dt = new Date(when);
      if (Number.isNaN(dt.getTime())) return false;
      return dt >= periodBounds.start && dt < filterWindow.start;
    });
  }, [rawExpenses, periodBounds, filterWindow]);

  const filteredSeries = useMemo(() => {
    if (!filterWindow.filtered.length) return [];

    const bucket = filterWindow.filtered.reduce((acc, expense) => {
      const when = expense.date_spent || expense.created_at;
      if (!when) return acc;
      const date = new Date(when);
      if (Number.isNaN(date.getTime())) return acc;

      const sortValue =
        viewMode === "yearly"
          ? new Date(date.getFullYear(), date.getMonth(), 1).getTime()
          : new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

      const key =
        viewMode === "yearly"
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
              date.getDate()
            ).padStart(2, "0")}`;

      if (!acc[key]) {
        acc[key] = { key, sortValue, needs: 0, wants: 0 };
      }

      const amount = Number(expense.amount) || 0;
      if (expense.expense_type === "wants") {
        acc[key].wants += amount;
      } else {
        acc[key].needs += amount;
      }

      return acc;
    }, {});

    return Object.values(bucket)
      .sort((a, b) => a.sortValue - b.sortValue)
      .map((entry) => ({
        ...entry,
        label: new Date(entry.sortValue).toLocaleDateString(
          undefined,
          viewMode === "yearly"
            ? { month: "short", year: "numeric" }
            : { day: "numeric", month: "short" }
        ),
      }));
  }, [filterWindow.filtered, viewMode]);

  const buildCategorySummary = (expenses) => {
    const needsMap = {};
    const wantsMap = {};
    let needsTotal = 0;
    let wantsTotal = 0;

    expenses.forEach((expense) => {
      const amount = Number(expense.amount) || 0;
      const category = expense.category || "Other";

      if (expense.expense_type === "wants") {
        wantsTotal += amount;
        wantsMap[category] = wantsMap[category] || { name: category, amount: 0 };
        wantsMap[category].amount += amount;
      } else {
        needsTotal += amount;
        needsMap[category] = needsMap[category] || { name: category, amount: 0 };
        needsMap[category].amount += amount;
      }
    });

    return {
      needsTotal,
      wantsTotal,
      needsList: Object.values(needsMap),
      wantsList: Object.values(wantsMap),
    };
  };

  const currentSummary = useMemo(
    () => buildCategorySummary(filterWindow.filtered),
    [filterWindow.filtered]
  );

  const baselineSummary = useMemo(
    () => buildCategorySummary(comparisonExpenses),
    [comparisonExpenses]
  );

  const overall = currentSummary.needsTotal + currentSummary.wantsTotal;
  const needsPct = overall > 0 ? Math.round((currentSummary.needsTotal / overall) * 1000) / 10 : 0;
  const wantsPct = overall > 0 ? Math.round((currentSummary.wantsTotal / overall) * 1000) / 10 : 0;

  const needsFormatter = (value) =>
    formatCurrency ? formatCurrency(value) : defaultFormat(value);

  const sortedNeeds = useMemo(
    () =>
      [...currentSummary.needsList]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [currentSummary.needsList]
  );

  const sortedWants = useMemo(
    () =>
      [...currentSummary.wantsList]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [currentSummary.wantsList]
  );

  const categoryDeltas = useMemo(() => {
    const deltas = [];
    const baselineMap = {};

    baselineSummary.wantsList.concat(baselineSummary.needsList).forEach((item) => {
      baselineMap[item.name.toLowerCase()] = item.amount;
    });

    currentSummary.wantsList.concat(currentSummary.needsList).forEach((item) => {
      const key = item.name.toLowerCase();
      const previous = baselineMap[key] || 0;
      const change = item.amount - previous;
      const pct = previous > 0 ? (change / previous) * 100 : null;
      deltas.push({
        name: item.name,
        current: item.amount,
        previous,
        change,
        pctChange: pct,
      });
    });

    return deltas.sort((a, b) => (b.change || 0) - (a.change || 0));
  }, [currentSummary, baselineSummary]);

  const recurringSubscriptions = useMemo(() => {
    const frequencyMap = {};

    filterWindow.filtered.forEach((expense) => {
      const merchant = (expense.seller || expense.description || "").toLowerCase();
      const category = (expense.category || "").toLowerCase();
      const amount = Number(expense.amount) || 0;

      if (
        SUBSCRIPTION_KEYWORDS.some((keyword) => merchant.includes(keyword) || category.includes(keyword))
      ) {
        const key = merchant || category;
        frequencyMap[key] = frequencyMap[key] || { count: 0, total: 0, label: expense.seller || expense.category };
        frequencyMap[key].count += 1;
        frequencyMap[key].total += amount;
      }
    });

    return Object.values(frequencyMap)
      .filter((entry) => entry.count >= 2)
      .sort((a, b) => b.total - a.total);
  }, [filterWindow.filtered]);

  const telcoCharges = useMemo(() => {
    return filterWindow.filtered.filter((expense) => {
      const merchant = (expense.seller || expense.description || "").toLowerCase();
      const category = (expense.category || "").toLowerCase();
      return TELCO_KEYWORDS.some((keyword) => merchant.includes(keyword) || category.includes(keyword));
    });
  }, [filterWindow.filtered]);

  const [aiInsights, setAiInsights] = useState({
    loading: false,
    error: null,
    data: null,
  });

  // Fetch AI-generated insights
  useEffect(() => {
    const fetchInsights = async () => {
      // Don't fetch if insights fetching is disabled or if still loading base data
      if (!enableInsightsFetch || loading || overall === 0) {
        setAiInsights({ loading: false, error: null, data: null });
        return;
      }

      setAiInsights((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setAiInsights({ loading: false, error: "Missing auth token", data: null });
          return;
        }

        // Format date in local time to avoid timezone issues
        const year = selectedDate.getFullYear();
        const month = viewMode === "yearly" ? 1 : (selectedDate.getMonth() + 1);
        const day = 1;
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const response = await fetch(`${API_BASE_URL}/insights/needs-vs-wants-insights`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            view_mode: viewMode,
            selected_date: dateString,
          }),
        });

        if (!response.ok) {
          let message = `Request failed (${response.status})`;
          try {
            const errorText = await response.text();
            if (errorText) {
              try {
                const errorJson = JSON.parse(errorText);
                message = errorJson.detail || errorJson.message || errorText;
              } catch {
                message = errorText;
              }
            }
          } catch (e) {
            // Use default message if parsing fails
          }
          throw new Error(message);
        }

        const payload = await response.json();
        setAiInsights({ loading: false, error: null, data: payload });
      } catch (err) {
        setAiInsights({
          loading: false,
          error: err instanceof Error ? err.message : "Unable to fetch insights",
          data: null,
        });
      }
    };

    fetchInsights();
  }, [selectedDate, viewMode, loading, overall, enableInsightsFetch]);

  const localizedTips = useMemo(() => {
    if (aiInsights.data?.localized_guidance) {
      return aiInsights.data.localized_guidance;
    }
    return [];
  }, [aiInsights.data]);

  const spendOptimizationInsights = useMemo(() => {
    if (aiInsights.data?.spend_optimization) {
      return aiInsights.data.spend_optimization;
    }
    return [];
  }, [aiInsights.data]);

  const renderBreakdownRow = (item, index, accent) => {
    const valuePct = overall > 0 ? Math.round((item.amount / overall) * 1000) / 10 : 0;
    return (
      <div key={item.name + index} className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm sm:text-base text-[#04362c]">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
            <span>{item.name}</span>
          </div>
          <div className="text-sm sm:text-base font-semibold">
            {formatCurrency ? formatCurrency(item.amount) : defaultFormat(item.amount)}
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-[#04362c]/10 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(valuePct, 100)}%`, background: accent }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f0faf7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#0DAD8D]">
            <span>Spending Breakdown</span>
          </div>
          <h3 className="text-3xl sm:text-4xl font-semibold" style={{ color: "#04362c" }}>
            Needs vs Wants Snapshot
          </h3>
          <p className="max-w-2xl text-base sm:text-lg text-black/60 leading-relaxed">
            Understand where every ringgit is flowing and spot discretionary drift before it impacts goals.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-black/5 bg-white/90 backdrop-blur px-1 py-1 shadow-sm">
          {rangePresets.map((presetOption) => (
            <button
              key={presetOption.label}
              type="button"
              onClick={() => setRange(presetOption.label)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                range === presetOption.label
                  ? "bg-[#0DAD8D] text-white shadow"
                  : "text-[#04362c]/60 hover:bg-[#04362c]/5"
              }`}
            >
              {presetOption.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-lg text-[#04362c]/70">Loading analysis...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="rounded-[32px] bg-white/95 backdrop-blur-sm shadow-xl ring-1 ring-black/5 p-6 lg:p-8">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredSeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="needsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6f948d" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6f948d" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="wantsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0DAD8D" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0DAD8D" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(4,54,44,0.08)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(4,54,44,0.6)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    interval={viewMode === "monthly" ? "preserveStartEnd" : undefined}
                  />
                  <YAxis
                    tick={{ fill: "rgba(4,54,44,0.6)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(Number(value) || 0)}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                    labelFormatter={(label) => label}
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "none",
                      boxShadow: "0 10px 30px rgba(4,54,44,0.08)",
                    }}
                  />
                  <Area type="monotone" dataKey="needs" stroke="#6f948d" strokeWidth={2} fill="url(#needsArea)" />
                  <Area type="monotone" dataKey="wants" stroke="#0DAD8D" strokeWidth={2} fill="url(#wantsArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#f5faf8] p-4 shadow-inner ring-1 ring-[#0DAD8D]/20">
                <p className="text-xs uppercase tracking-[0.2em] text-[#04362c]/60">Needs</p>
                <p className="mt-1 text-xl font-semibold text-[#04362c]">
                  {needsFormatter(currentSummary.needsTotal)}
                </p>
                <p className="text-xs text-[#04362c]/60">{needsPct}% of tracked spend</p>
              </div>
              <div className="rounded-2xl bg-[#e9f8f4] p-4 shadow-inner ring-1 ring-[#0DAD8D]/20">
                <p className="text-xs uppercase tracking-[0.2em] text-[#04362c]/60">Wants</p>
                <p className="mt-1 text-xl font-semibold text-[#04362c]">
                  {needsFormatter(currentSummary.wantsTotal)}
                </p>
                <p className="text-xs text-[#04362c]/60">{wantsPct}% of tracked spend</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[28px] bg-white/95 backdrop-blur-sm shadow-xl ring-1 ring-black/5 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-[#04362c]">Top Needs Categories</h4>
                <span className="rounded-full border border-[#0DAD8D]/20 bg-[#f5faf8] px-3 py-1 text-xs text-[#04362c]/70">
                  {sortedNeeds.length} tracked
                </span>
              </div>
              {sortedNeeds.length === 0 ? (
                <p className="text-sm text-[#04362c]/60">No essential expenses recorded in this period.</p>
              ) : (
                <div className="space-y-3">
                  {sortedNeeds.map((item, index) => renderBreakdownRow(item, index, "#6f948d"))}
                </div>
              )}
            </div>

            <div className="rounded-[28px] bg-white/95 backdrop-blur-sm shadow-xl ring-1 ring-black/5 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-[#04362c]">Top Wants Categories</h4>
                <span className="rounded-full border border-[#0DAD8D]/20 bg-[#e9f8f4] px-3 py-1 text-xs text-[#04362c]/70">
                  {sortedWants.length} tracked
                </span>
              </div>
              {sortedWants.length === 0 ? (
                <p className="text-sm text-[#04362c]/60">No discretionary spend tracked for this period.</p>
              ) : (
                <div className="space-y-3">
                  {sortedWants.map((item, index) => renderBreakdownRow(item, index, "#0DAD8D"))}
                </div>
              )}
            </div>
          </div>

          {(aiInsights.loading || aiInsights.data || aiInsights.error) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {aiInsights.loading ? (
                <div className="col-span-2 rounded-[28px] bg-white/90 backdrop-blur-sm shadow ring-1 ring-black/5 p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 border-2 border-[#0DAD8D] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[#04362c]/70">Generating AI insights...</p>
                  </div>
                </div>
              ) : aiInsights.error ? (
                <div className="col-span-2 rounded-[28px] bg-red-50/90 backdrop-blur-sm shadow ring-1 ring-red-200 p-6">
                  <p className="text-sm text-red-700">Unable to load insights: {aiInsights.error}</p>
                </div>
              ) : aiInsights.data ? (
                <>
                  {/* Summary on the left */}
                  {aiInsights.data.summary && (
                    <div className="rounded-[28px] bg-white/95 backdrop-blur-sm shadow-xl ring-1 ring-black/5 p-6">
                      <h4 className="text-lg font-semibold text-[#04362c] mb-3">Summary</h4>
                      <p className="text-sm sm:text-base text-[#04362c]/80 leading-relaxed mb-4">
                        {aiInsights.data.summary}
                      </p>
                      
                      {/* Pie Chart */}
                      {overall > 0 && (
                        <div className="mt-6">
                          <h5 className="text-sm font-semibold text-[#04362c] mb-3">Spending Breakdown</h5>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: "Needs", value: currentSummary.needsTotal, color: "#6f948d" },
                                    { name: "Wants", value: currentSummary.wantsTotal, color: "#0DAD8D" },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  <Cell fill="#6f948d" />
                                  <Cell fill="#0DAD8D" />
                                </Pie>
                                <Tooltip
                                  formatter={(value) => (formatCurrency ? formatCurrency(Number(value) || 0) : defaultFormat(Number(value) || 0))}
                                  contentStyle={{
                                    borderRadius: "0.75rem",
                                    border: "none",
                                    boxShadow: "0 10px 30px rgba(4,54,44,0.08)",
                                  }}
                                />
                                <Legend
                                  verticalAlign="bottom"
                                  height={36}
                                  formatter={(value) => {
                                    const data = value === "Needs" 
                                      ? { amount: currentSummary.needsTotal, pct: needsPct }
                                      : { amount: currentSummary.wantsTotal, pct: wantsPct };
                                    return `${value} (${data.pct}%)`;
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-4 space-y-2 text-xs text-[#04362c]/70">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#6f948d]" />
                                <span>Needs: {needsFormatter(currentSummary.needsTotal)}</span>
                              </span>
                              <span className="font-medium">{needsPct}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#0DAD8D]" />
                                <span>Wants: {needsFormatter(currentSummary.wantsTotal)}</span>
                              </span>
                              <span className="font-medium">{wantsPct}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Right column: Localized Guidance and Spend Optimization */}
                  <div className="space-y-6">
                    {localizedTips.length > 0 && (
                      <div className="rounded-[28px] bg-white/95 backdrop-blur-sm shadow-xl ring-1 ring-black/5 p-6">
                        <h4 className="text-base font-semibold" style={{ color: "#04362c" }}>
                          Localized Guidance
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm sm:text-base text-[#04362c]/80">
                          {localizedTips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0DAD8D]" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {spendOptimizationInsights.length > 0 && (
                      <div className="rounded-[28px] bg-white/95 backdrop-blur-sm shadow-xl ring-1 ring-black/5 p-6 flex flex-col gap-4">
                        <h4 className="text-lg font-semibold text-[#04362c]">Spend Optimization</h4>
                        <ul className="space-y-3 text-sm sm:text-base text-[#04362c]/80">
                          {spendOptimizationInsights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0DAD8D]" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
