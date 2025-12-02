import { useEffect, useMemo, useState, useCallback, useRef } from "react";
// High-level dashboard composed from modular widgets and shared utility hooks
import MetricCard from "../components/MetricCard.jsx";
import CashFlowTrendChart from "../components/CashFlowTrendChart.jsx";
import SpendingHeatmap from "../components/SpendingHeatmap.jsx";
// Iconography for KPI cards and controls
import {
  DollarSign,
  Heart,
  Activity,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  TrendingUp,
  Wallet,
} from "lucide-react";
import DailySpendingChart from "../components/DailySpendingChart.jsx";
import { API_BASE_URL } from "../services/api";
import NeedsVsWantsAnalysis from "@/components/NeedsVsWantsAnalysis.jsx";
import FinancialHealthMetrics from "@/components/FinancialHealthMetrics.jsx";
import SmartAnalysisPanel from "@/components/SmartAnalysisPanel.jsx";
import SuspiciousTransactions from "@/components/SuspiciousTransactions.jsx";


const getAuthToken = () =>
  (typeof window !== "undefined" && (localStorage.getItem("token") || sessionStorage.getItem("token"))) || null;

// Brand token cache used for consistent inline styling
const brand = {
  ink: "#04362c",
  mint: "#0DAD8D",
  surface: "#eef2f0",
  ring:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0DAD8D]",
};

// Default metric state so we can render skeletons before async fetch resolves
const initialMetrics = {
        totalSpending: 0,
        needsTotal: 0,
        wantsTotal: 0,
        needsPercent: 0,
        wantsPercent: 0,
        trend: 0,
        averageDailySpending: 0,
        previousAverageDailySpending: null,
        dailyVolatility: 0,
        daysTracked: 0,
        remainingBudget: null,
        runwayDays: null,
        totalIncome: 0,
        netCashFlow: 0,
        burnRateDelta: null,
};

export default function Dashboard() {
  // --- Core State Buckets --------------------------------------------------
  // 1. Period controls (`selectedDate`, `viewMode`) drive all downstream fetches
  // 2. `metrics`, `budget`, `creditSummary` hydrate the visual components
  // 3. `userProfile` unlocks localisation + cultural context for insights
  const [selectedDate, setSelectedDate] = useState(() => {
    // Load from localStorage on initial render
    const saved = localStorage.getItem('dashboardSelectedDate');
    return saved ? new Date(saved) : new Date();
  });
  const [viewMode, setViewMode] = useState(() => {
    // Load from localStorage on initial render
    return localStorage.getItem('dashboardViewMode') || "yearly";
  });
  const [metrics, setMetrics] = useState(initialMetrics);
  const [metricsLoading, setMetricsLoading] = useState(true); // Key metrics loading state
  const [trendsLoading, setTrendsLoading] = useState(true); // Trends/comparison loading state
  const [budgetLoading, setBudgetLoading] = useState(true); // Budget loading state
  const [creditSummaryLoading, setCreditSummaryLoading] = useState(true); // Credit summary loading state
  const [smartAnalysisLoading, setSmartAnalysisLoading] = useState(false); // Smart analysis loading state
  const [budget, setBudget] = useState({ amount: null, entries: [], active: null });
  const [userProfile, setUserProfile] = useState(null);
  const [creditSummary, setCreditSummary] = useState({
    cards: [],
    totalLimit: 0,
    totalBalance: 0,
    utilization: 0,
    upcoming: null,
  });
  const [smartAnalysis, setSmartAnalysis] = useState({ loading: false, error: null, data: null });
  const [suspiciousTransactions, setSuspiciousTransactions] = useState({ loading: true, data: [] });
  const [spendingTransactions, setSpendingTransactions] = useState([]);
  const [allCoreDataLoaded, setAllCoreDataLoaded] = useState(false); // Tracks when all core data is ready for needs-vs-wants

  // Derived period for components that need explicit date ranges
  const { heatmapStartDate, heatmapEndDate, heatmapLabel } = useMemo(() => {
    const base = new Date(selectedDate);

    if (viewMode === "yearly") {
      const start = new Date(base.getFullYear(), 0, 1);
      const end = new Date(base.getFullYear(), 11, 31);
      return {
        heatmapStartDate: start,
        heatmapEndDate: end,
        heatmapLabel: base.getFullYear().toString(),
      };
    }

    // Monthly view
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const label = base.toLocaleDateString("en-MY", {
      month: "long",
      year: "numeric",
    });

    return {
      heatmapStartDate: start,
      heatmapEndDate: end,
      heatmapLabel: label,
    };
  }, [selectedDate, viewMode]);

  // --- Data Fetching: Profile Context -------------------------------------
  // Grabs light-touch demographic fields (country, religion) so that the
  // currency formatter + seasonal copy feel personalised. We intentionally
  // keep the payload lean to avoid pulling PII into the browser layer.
    useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/users`, {
                        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          try {
            const profile = await response.json();
            setUserProfile(profile);
          } catch (err) {
            console.warn("Unable to parse user profile", err);
          }
                } else {
          console.warn("Profile request failed", response.status);
        }
      } catch (error) {
        console.warn("Unable to fetch user profile", error);
      }
    };

    fetchProfile();
  }, []);

  // --- UX Polish: ensure the user lands at the hero each time -------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // --- Smart Analysis Loader ----------------------------------------------
  // Fetches AI-generated smart analysis insights for the selected period
  const fetchSmartAnalysis = useCallback(
    async ({ silent = false } = {}) => {
      const token = getAuthToken();
      if (!token) {
        setSmartAnalysisLoading(false);
        setSmartAnalysis({ error: "Missing auth token", data: null });
        return;
      }

      if (!silent) {
        setSmartAnalysisLoading(true);
      }
      setSmartAnalysis((prev) => ({
        ...prev,
        error: null,
      }));

      try {
        // Format date in local time to avoid timezone issues
        // For yearly view, always use January 1st of the selected year
        // For monthly view, use the 1st of the selected month
        const year = selectedDate.getFullYear();
        const month = viewMode === "yearly" ? 1 : (selectedDate.getMonth() + 1); // getMonth() is 0-indexed
        const day = 1; // Always use the 1st day for consistency
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const response = await fetch(`${API_BASE_URL}/insights/smart-analysis`, {
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

          // Don't throw for 404 - just log and set error state
          if (response.status === 404) {
            console.warn("Smart analysis endpoint not found (404). The endpoint may not be deployed yet.");
            setSmartAnalysis({ loading: false, error: "Smart analysis feature is not available yet", data: null });
            return;
          }

          throw new Error(message);
        }

        const payload = await response.json();
        setSmartAnalysisLoading(false);
        setSmartAnalysis({ error: null, data: payload });
      } catch (err) {
        setSmartAnalysisLoading(false);
        setSmartAnalysis((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Unable to fetch smart analysis",
        }));
      }
    },
    [selectedDate, viewMode]
  );

  // --- Primary Metrics Loader ---------------------------------------------
  // Orchestrates the loading sequence for dashboard data:
  // 1. Key Metrics data (expenses, income, budgets) loads in parallel
  //    - 8 key metrics display together using this base data
  // 2. Process all metrics, trends, and budget calculations
  // 3. Load detailed credit cards overview immediately after budget (Priority 4)
  // 4. Fetch smart analysis insights (Priority 5)
  // 5. Finally, needs-vs-wants insights load (Priority 6)
  const fetchMetrics = useCallback(async () => {
    // Set all loading states to true at start
    setMetricsLoading(true);
    setTrendsLoading(true);
    setCreditSummaryLoading(true);
    setBudgetLoading(true);
    setAllCoreDataLoaded(false); // Reset when starting new fetch

    try {
      const token = getAuthToken();
      if (!token) {
        setMetrics(initialMetrics);
        setMetricsLoading(false);
        setTrendsLoading(false);
        setBudgetLoading(false);
        setBudget({ amount: null, entries: [], active: null });
        setCreditSummaryLoading(false);
        setCreditSummary({
          cards: [],
          totalLimit: 0,
          totalBalance: 0,
          utilization: 0,
          upcoming: null,
        });
        return;
      }

      let startDate;
      let endDate;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (viewMode === "yearly") {
        const selectedYear = selectedDate.getFullYear();
        const currentYear = now.getFullYear();
        startDate = new Date(selectedYear, 0, 1);
        
        // If selected year is current or future, cap end date to today
        if (selectedYear >= currentYear) {
          endDate = today;
      } else {
          endDate = new Date(selectedYear, 11, 31);
        }
      } else {
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        startDate = new Date(selectedYear, selectedMonth, 1);
        const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        
        // If selected month is current or future, cap end date to today
        if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth)) {
          endDate = today;
        } else {
          endDate = lastDayOfMonth;
        }
      }
      
      // Final safety check: ensure startDate <= endDate
      if (startDate > endDate) {
        // If start date is after end date, adjust to a valid range
        endDate = today;
        if (viewMode === "yearly") {
          startDate = new Date(endDate.getFullYear(), 0, 1);
        } else {
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        }
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Kick off critical network requests in parallel (expenses, income, budgets)
      // All data needed for Key Metrics section loads together
      const [expensesResponse, incomeResponse, budgetsResponse] = await Promise.all([
        fetch(
          `${API_BASE_URL}/transactions/expense?start_date=${startDate
            .toISOString()
            .split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}&limit=1000`,
          { headers }
        ),
        fetch(
          `${API_BASE_URL}/transactions/income?start_date=${startDate
            .toISOString()
            .split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}&limit=1000`,
          { headers }
        ),
        fetch(`${API_BASE_URL}/budgets?limit=500`, { headers }).catch(err => {
          console.warn("Failed to fetch budgets:", err);
          return { ok: false, status: 500, json: async () => ({ detail: "Failed to fetch budgets" }) };
        }),
      ]);

      // --- Budgets ---------------------------------------------------------
      // These entries feed the runway/budget components. We need both the
      // flattened list for summarising and the active month limit for hero stats.
      let rawBudgetEntries = [];
      let monthlyBudgetAmount = null;
                if (budgetsResponse.ok) {
                    try {
          const payload = await budgetsResponse.json();
          const entries = Array.isArray(payload?.budgets)
            ? payload.budgets
            : Array.isArray(payload)
            ? payload
            : [];
          rawBudgetEntries = entries;
          if (entries.length > 0) {
            const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
            const matched = entries.find((entry) => {
              if (!entry?.period_start) return false;
              const start = new Date(entry.period_start);
              const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
              return key === monthKey;
            });
            const limitAmount = Number(matched?.limit_amount ?? matched?.amount);
            if (!Number.isNaN(limitAmount)) {
              monthlyBudgetAmount = limitAmount;
            }
          }
        } catch (err) {
          console.warn("Unable to parse budgets response", err);
          rawBudgetEntries = [];
        }
      }

      // --- Income ----------------------------------------------------------
      // The expenses endpoint is considered authoritative. If it fails we still
      // hydrate totals with income + budgets so the UI can render in a fallback state.
      let totalIncome = 0;
                if (incomeResponse.ok) {
                    try {
          const incomes = await incomeResponse.json();
                        if (Array.isArray(incomes)) {
            totalIncome = incomes.reduce((sum, income) => sum + (Number(income.amount) || 0), 0);
          }
        } catch {
          /* ignore */
        }
      }

      if (!expensesResponse.ok) {
        const budgetSummaries = rawBudgetEntries.map((entry) => ({
          id: entry.budget_id,
          name: entry.name,
          category: entry.category,
          limit: Number(entry?.limit_amount ?? entry?.amount ?? 0),
          spent: 0,
          remaining: Number(entry?.limit_amount ?? entry?.amount ?? 0),
          percentage: 0,
          periodStart: entry?.period_start ? new Date(entry.period_start) : null,
          periodEnd: entry?.period_end ? new Date(entry.period_end) : null,
        }));
        setMetrics((prev) => ({ ...initialMetrics, totalIncome }));
        setBudgetLoading(false);
        setBudget({ amount: monthlyBudgetAmount, entries: budgetSummaries, active: budgetSummaries[0] || null });
        return;
      }

      const expenses = await expensesResponse.json();

      // Normalise expenses into unified transaction objects for the spending heatmap
      const expenseTransactions = Array.isArray(expenses)
        ? expenses.map((expense) => ({
            ...expense,
            type: "expense",
            // Prefer explicit date_spent, fallback to created_at
            date: expense.date_spent || expense.created_at,
          }))
        : [];
      setSpendingTransactions(expenseTransactions);

      // Fetch transfers for suspicious transaction analysis
      let transfers = [];
      try {
        const transfersResponse = await fetch(
          `${API_BASE_URL}/transactions/transfer?start_date=${startDate
            .toISOString()
            .split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}&limit=1000`,
          { headers }
        );
        if (transfersResponse.ok) {
          transfers = await transfersResponse.json();
          if (!Array.isArray(transfers)) transfers = [];
        }
      } catch (err) {
        console.warn("Failed to fetch transfers for suspicious analysis:", err);
      }

      // Combine all transactions for suspicious transaction analysis
      const allTransactions = [
        ...(Array.isArray(expenses) ? expenses.map(e => ({ ...e, type: 'expense' })) : []),
        ...(Array.isArray(transfers) ? transfers.map(t => ({ ...t, type: 'transfer' })) : []),
      ];
      setSuspiciousTransactions({ loading: false, data: allTransactions });

      // Slice expenses into needs vs wants to fuel the KPI tiles & trends
      const needsExpenses = expenses.filter((e) => e.expense_type === "needs");
      const wantsExpenses = expenses.filter((e) => e.expense_type === "wants");

      const needsTotal = needsExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const wantsTotal = wantsExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalSpending = needsTotal + wantsTotal;

      const needsPercent = totalSpending > 0 ? Math.round((needsTotal / totalSpending) * 100) : 0;
      const wantsPercent = totalSpending > 0 ? Math.round((wantsTotal / totalSpending) * 100) : 0;

      // Compute period coverage so we can normalise to daily figures regardless of timeframe
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysTracked =
        Math.max(
          1,
          Math.round(
            (+new Date(endDate.toDateString()) - +new Date(startDate.toDateString())) /
              msPerDay
          ) + 1
        );
      const averageDailySpending = daysTracked > 0 ? totalSpending / daysTracked : 0;

                    const dailyTotalsMap = expenses.reduce((acc, expense) => {
        const spentOn = expense.date_spent || expense.created_at;
        if (!spentOn) return acc;
        const dateObj = new Date(spentOn);
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(
          dateObj.getDate()
        ).padStart(2, "0")}`;
        acc[key] = (acc[key] || 0) + (Number(expense.amount) || 0);
        return acc;
      }, {});

      const dailyTotals = Object.values(dailyTotalsMap);
      const dailyVolatility =
        dailyTotals.length > 1
          ? Math.sqrt(
              dailyTotals.reduce((acc, value) => acc + Math.pow(value - averageDailySpending, 2), 0) /
                dailyTotals.length
            )
          : 0;

      // ✅ Update key metrics immediately - show them before waiting for trends
      const netCashFlow = totalIncome - totalSpending;
      setMetrics((prev) => ({
        ...prev,
        totalSpending,
        needsTotal,
        wantsTotal,
        needsPercent,
        wantsPercent,
        averageDailySpending,
        dailyVolatility,
        daysTracked,
        totalIncome,
        netCashFlow,
      }));
      setMetricsLoading(false); // ✅ Key metrics + Net Cash Flow are ready - show them now! (Priority 1)

      // Build the comparison window so trend deltas line up with whichever period the user selected
      let prevStartDate;
      let prevEndDate;
      if (viewMode === "yearly") {
        prevStartDate = new Date(selectedDate.getFullYear() - 1, 0, 1);
        prevEndDate = new Date(selectedDate.getFullYear() - 1, 11, 31);
                    } else {
        prevStartDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
        prevEndDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
      }

      let trend = 0;
      let previousAverageDailySpending = null;
      let hasPreviousPeriodData = false;
      const prevResp = await fetch(
        `${API_BASE_URL}/transactions/expense?start_date=${prevStartDate
          .toISOString()
          .split("T")[0]}&end_date=${prevEndDate.toISOString().split("T")[0]}&limit=1000`,
        { headers }
      );
      if (prevResp.ok) {
        try {
        const prevExpenses = await prevResp.json();
          // Check if we have a valid array with actual expense data
          if (Array.isArray(prevExpenses) && prevExpenses.length > 0) {
            const prevTotal = prevExpenses.reduce((sum, expense) => sum + Math.abs(Number(expense.amount) || 0), 0);
        const prevDays = Math.max(1, Math.round((+prevEndDate - +prevStartDate) / msPerDay) + 1);
            
            // Only calculate if there's meaningful spending data (at least RM 1 total)
            // This prevents calculation when there are only zero-amount transactions or rounding errors
            if (prevTotal >= 1 && prevDays > 0) {
              hasPreviousPeriodData = true;
        previousAverageDailySpending = prevTotal / prevDays;
          trend = Number((((totalSpending - prevTotal) / prevTotal) * 100).toFixed(1));
            }
          }
        } catch (err) {
          console.warn("Failed to parse previous period expenses:", err);
          // Keep hasPreviousPeriodData as false
        }
      }

      // Only calculate burn rate delta if we have previous period data
      const burnRateDelta =
        hasPreviousPeriodData && previousAverageDailySpending !== null && previousAverageDailySpending > 0
          ? ((averageDailySpending - previousAverageDailySpending) / previousAverageDailySpending) * 100
          : null;
      // Helper: calculate period type and ensure correct start/end dates
      const calculatePeriodInfo = (start, end) => {
        if (!start || !end) return { type: "monthly", start, end };
        
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        let periodType = "monthly";
        let calculatedStart = new Date(startDate);
        let calculatedEnd = new Date(endDate);
        
        if (diffDays <= 7) {
          periodType = "weekly";
          // For weekly, ensure it's a full week (Monday to Sunday or start date to +6 days)
          calculatedStart = new Date(startDate);
          calculatedStart.setHours(0, 0, 0, 0);
          calculatedEnd = new Date(calculatedStart);
          calculatedEnd.setDate(calculatedStart.getDate() + 6);
          calculatedEnd.setHours(23, 59, 59, 999);
        } else if (diffDays <= 31) {
          periodType = "monthly";
          // For monthly, ensure it's the full month
          calculatedStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          calculatedStart.setHours(0, 0, 0, 0);
          const lastDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          calculatedEnd = new Date(startDate.getFullYear(), startDate.getMonth(), lastDay.getDate());
          calculatedEnd.setHours(23, 59, 59, 999);
        } else {
          periodType = "yearly";
          // For yearly, ensure it's the full year
          calculatedStart = new Date(startDate.getFullYear(), 0, 1);
          calculatedStart.setHours(0, 0, 0, 0);
          calculatedEnd = new Date(startDate.getFullYear(), 11, 31);
          calculatedEnd.setHours(23, 59, 59, 999);
        }
        
        return { type: periodType, start: calculatedStart, end: calculatedEnd };
      };

      // Helper: annotate each budget with the spending that actually occurred within its window
      // Uses backend-calculated spending if available, otherwise calculates locally
      const buildBudgetSummaries = (entries, expenseArr) =>
        entries.map((entry) => {
          const start = entry?.period_start ? new Date(entry.period_start) : null;
          const end = entry?.period_end ? new Date(entry.period_end) : null;
          const periodInfo = calculatePeriodInfo(start, end);
          const limit = Number(entry?.limit_amount ?? entry?.amount ?? 0);
          
          // Use backend-calculated spending if available, otherwise calculate locally
          let spent = 0;
          if (entry?.spent_amount !== undefined && entry?.spent_amount !== null) {
            // Use backend-calculated spending
            spent = Number(entry.spent_amount) || 0;
          } else {
            // Fallback to local calculation for backward compatibility
            spent = expenseArr.reduce((sum, expense) => {
            if (!expense?.category || expense.category !== entry.category) return sum;
            const spentDate = expense.date_spent || expense.created_at;
            if (!spentDate) return sum;
            const spentObj = new Date(spentDate);
            if (
              Number.isNaN(spentObj.getTime()) ||
                (periodInfo.start && spentObj < periodInfo.start) ||
                (periodInfo.end && spentObj > periodInfo.end)
            ) {
              return sum;
            }
            return sum + (Number(expense.amount) || 0);
          }, 0);
          }
          
          // Use backend-calculated remaining if available, otherwise calculate
          const remaining = entry?.remaining_amount !== undefined && entry?.remaining_amount !== null
            ? Number(entry.remaining_amount) || 0
            : limit - spent;
          
          // Use backend-calculated percentage if available, otherwise calculate
          const percentage = entry?.percentage_used !== undefined && entry?.percentage_used !== null
            ? Number(entry.percentage_used) || 0
            : (limit > 0 ? (spent / limit) * 100 : 0);
          
          return {
            id: entry.budget_id,
            name: entry.name,
            category: entry.category,
            limit,
            spent,
            remaining,
            percentage,
            periodStart: periodInfo.start,
            periodEnd: periodInfo.end,
            periodType: periodInfo.type,
          };
        });

      // Helper: pick the budget whose period matches the selected timeframe so hero/runway stay accurate
      const findActiveBudget = (summaries) => {
        if (summaries.length === 0) return null;
        
        // Check if selected date falls within any budget's period
        const selectedDateObj = new Date(startDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        
        // First, try to find a budget that contains the selected date
        const budgetInRange = summaries.find((summary) => {
          if (!summary.periodStart || !summary.periodEnd) return false;
          const periodStart = new Date(summary.periodStart);
          const periodEnd = new Date(summary.periodEnd);
          periodStart.setHours(0, 0, 0, 0);
          periodEnd.setHours(23, 59, 59, 999);
          return selectedDateObj >= periodStart && selectedDateObj <= periodEnd;
        });
        
        if (budgetInRange) return budgetInRange;
        
        // Fallback: match by month if no budget contains the date
        const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
        return (
          summaries.find((summary) => {
            if (!summary.periodStart) return false;
            const start = new Date(summary.periodStart);
            const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
            return key === monthKey;
          }) || summaries[0] || null
        );
      };

      const budgetSummaries = buildBudgetSummaries(rawBudgetEntries, expenses);
      const activeBudgetSummary = findActiveBudget(budgetSummaries);

      // Use the active budget's limit if available, otherwise fall back to monthlyBudgetAmount
      const effectiveBudgetAmount = activeBudgetSummary?.limit ?? monthlyBudgetAmount;

      const remainingBudget =
        activeBudgetSummary && Number.isFinite(activeBudgetSummary.remaining)
          ? Math.max(activeBudgetSummary.remaining, 0)
          : effectiveBudgetAmount !== null
          ? Math.max(effectiveBudgetAmount - totalSpending, 0)
          : null;
      const runwayDays =
        remainingBudget !== null && averageDailySpending > 0
                        ? Math.floor(remainingBudget / averageDailySpending)
          : null;

      // Note: netCashFlow is already calculated at line 464 as part of Priority 1 metrics

      // ✅ Budget data is processed and ready - show it now (Priority 3)
      setBudget({ amount: effectiveBudgetAmount, entries: budgetSummaries, active: activeBudgetSummary });
      setBudgetLoading(false);

                    setMetrics({
                        totalSpending,
                        needsTotal,
                        wantsTotal,
                        needsPercent,
                        wantsPercent,
                        trend,
                        averageDailySpending,
                        previousAverageDailySpending,
                        dailyVolatility,
                        daysTracked,
                        remainingBudget,
                        runwayDays,
                        totalIncome,
                        netCashFlow,
                        burnRateDelta,
      });
      setTrendsLoading(false); // ✅ Trends/comparison data is now ready (Priority 3)

      // --- Credit Cards (Detailed Info) -------------------------------------
      // Load credit cards overview immediately after budget (Priority 4)
      // This loads faster by fetching right after budget is ready instead of waiting for smart analysis
      let cardList = [];
      let totalLimit = 0;
      let totalBalance = 0;
      let utilization = 0;
      let upcomingPayment = null;

      try {
        const cardsResponse = await fetch(`${API_BASE_URL}/cards/overview`, { headers });

        if (cardsResponse.ok) {
          try {
            const overview = await cardsResponse.json();
            // Use aggregated summary from backend
            const summary = overview?.summary || {};
            totalLimit = summary.total_limit || 0;
            totalBalance = summary.total_balance || 0;
            utilization = summary.utilization_pct || 0;

            // Extract card list from overview cards
            const overviewCards = Array.isArray(overview?.cards) ? overview.cards : [];
            cardList = overviewCards.map(card => ({
              card_id: card.card_id,
              card_name: card.card_name,
              bank_name: card.bank_name,
              credit_limit: card.credit_limit,
              current_balance: card.current_balance,
              next_payment_date: card.next_payment_date,
              next_payment_amount: card.next_payment_amount,
            }));

            // Find upcoming payment from overview data
            const upcomingPayments = Array.isArray(overview?.upcoming_payments) ? overview.upcoming_payments : [];
            if (upcomingPayments.length > 0) {
              const nextPayment = upcomingPayments[0];
              upcomingPayment = {
                cardName: nextPayment.card_name,
                bankName: nextPayment.bank_name,
                amount: nextPayment.amount,
                date: nextPayment.due_date,
              };
            }
          } catch (err) {
            console.warn("Unable to parse credit card overview response", err);
            cardList = [];
          }
        }
      } catch (err) {
        console.warn("Failed to fetch cards overview:", err);
      }

      setCreditSummary({
        cards: cardList,
        totalLimit,
        totalBalance,
        utilization,
        upcoming: upcomingPayment,
      });
      setCreditSummaryLoading(false); // ✅ Detailed credit cards loaded (Priority 4)

      // --- Smart Analysis ---------------------------------------------------
      // Load smart analysis after credit cards (Priority 5)
      // This is lower priority as it's not part of the key metrics display
      await fetchSmartAnalysis({ silent: true });

      // Small delay to ensure state updates are flushed before enabling needs-vs-wants
      await new Promise(resolve => setTimeout(resolve, 100));
      setAllCoreDataLoaded(true); // ✅ Signal that all core data is ready for needs-vs-wants (Priority 6)
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setMetrics(initialMetrics);
      setMetricsLoading(false);
      setTrendsLoading(false);
      setBudgetLoading(false);
      setCreditSummaryLoading(false);
      setAllCoreDataLoaded(true); // Even on error, allow needs-vs-wants to proceed
      setBudget({ amount: null, entries: [], active: null });
      setCreditSummary({
        cards: [],
        totalLimit: 0,
        totalBalance: 0,
        utilization: 0,
        upcoming: null,
      });
            }
  }, [selectedDate, viewMode, fetchSmartAnalysis]);

  // Kick off the initial load and any subsequent refresh when filters change
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Save dashboard preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('dashboardSelectedDate', selectedDate.toISOString());
  }, [selectedDate]);

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  // Manual refresh handler for smart analysis panel refresh button
  const handleRefreshSmartAnalysis = useCallback(() => {
    fetchSmartAnalysis({ silent: false });
  }, [fetchSmartAnalysis]);

  // --- Derived Helpers -----------------------------------------------------
  // Normalise currency/locale metadata so charts + insights respect Malaysian context.
  const currencyMeta = useMemo(() => {
    // Default to MYR for Malaysia - only use USD if explicitly set to a non-Malaysian country
    if (!userProfile || !userProfile.country) {
      return { locale: "en-MY", currency: "MYR", country: "malaysia", religion: "" };
    }

    const country = userProfile.country?.toLowerCase?.() ?? "";
    const religion = userProfile.religion?.toLowerCase?.() ?? "";

    // Default to MYR unless country is explicitly set to something other than Malaysia
    if (country === "malaysia" || country === "my" || country === "" || !country) {
      return { locale: "en-MY", currency: "MYR", religion, country: country || "malaysia" };
    }

    // Only use USD if country is explicitly set to a non-Malaysian country
    return { locale: undefined, currency: "USD", religion, country };
  }, [userProfile]);

  // Generic currency formatter (defaults to MYR for Malaysia)
    const formatCurrency = (amount) => {
    const numericAmount = Number(amount);
        if (amount === null || amount === undefined || Number.isNaN(numericAmount)) {
      return "--";
    }

    try {
      return new Intl.NumberFormat(currencyMeta.locale ?? "en-MY", {
        style: "currency",
        currency: currencyMeta.currency,
        maximumFractionDigits: 0,
      }).format(numericAmount);
    } catch (error) {
      // Fallback to MYR format if Intl.NumberFormat fails
      if (currencyMeta.currency === "MYR") {
        return `RM ${numericAmount.toLocaleString("en-MY", {
          maximumFractionDigits: 0,
        })}`;
      }
      return `${currencyMeta.currency === "USD" ? "$" : "RM "}${numericAmount.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`;
    }
  };

    const formatPercent = (value, fractionDigits = 1) => {
    const numericValue = Number(value);
        if (value === null || value === undefined || Number.isNaN(numericValue)) {
      return "--";
    }
    return `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(
      fractionDigits
    )}%`;
  };

  const formatPercentAbsolute = (value, fractionDigits = 1) => {
    const numericValue = Number(value);
    if (value === null || value === undefined || Number.isNaN(numericValue)) {
      return "--";
    }
    return `${numericValue.toFixed(fractionDigits)}%`;
  };

  const formatDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // --- Period Navigation ---------------------------------------------------
  // These helpers keep the header controls decluttered and encapsulate
  // the calendaring logic for month vs year views.
    const goToPrevious = () => {
    if (viewMode === "yearly") {
      setSelectedDate(new Date(selectedDate.getFullYear() - 1, 0, 1));
        } else {
      setSelectedDate(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
      );
        }
  };

    const goToNext = () => {
    if (viewMode === "yearly") {
      setSelectedDate(new Date(selectedDate.getFullYear() + 1, 0, 1));
        } else {
      setSelectedDate(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
      );
        }
  };

    const isCurrent = () => {
    const now = new Date();
    return viewMode === "yearly"
      ? selectedDate.getFullYear() === now.getFullYear()
      : selectedDate.getMonth() === now.getMonth() &&
          selectedDate.getFullYear() === now.getFullYear();
  };

  const getPeriodDisplay = () =>
    viewMode === "yearly"
      ? selectedDate.getFullYear().toString()
      : selectedDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

    const hasNoTransactions = !metricsLoading && metrics.totalSpending === 0 && metrics.totalIncome === 0;
    const trendSubtitle = trendsLoading
        ? "Loading..."
        : hasNoTransactions
        ? "No data to compare yet"
    : viewMode === "yearly"
        ? `${formatPercent(metrics.trend)} vs last year`
    : `${formatPercent(metrics.trend)} vs last month`;

  const runwayValueDisplay =
    metricsLoading || budgetLoading
        ? "..."
        : budget.amount === null
        ? "No target"
        : metrics.runwayDays !== null
      ? `${Math.max(metrics.runwayDays, 0)} ${
          Math.max(metrics.runwayDays, 0) === 1 ? "day" : "days"
        }`
      : "On track";

  const runwaySubtitle =
    metricsLoading || budgetLoading
        ? ""
        : budget.amount === null
        ? "Set a monthly budget to forecast runway"
      : `${formatCurrency(metrics.remainingBudget)} remaining`;
  const netCashFlowValue = metricsLoading ? "..." : formatCurrency(metrics.netCashFlow);
    const netCashFlowSubtitle = metricsLoading
        ? ""
        : hasNoTransactions
        ? "Add transactions to see cash flow"
    : `${formatCurrency(metrics.totalIncome)} in vs ${formatCurrency(
        metrics.totalSpending
      )} out`;

    const avgDailySubtitle = metricsLoading
        ? "Loading..."
        : hasNoTransactions
        ? "No spending data yet"
        : metrics.previousAverageDailySpending !== null
        ? `Prev: ${formatCurrency(metrics.previousAverageDailySpending)} / day`
        : "No previous period data";
  const volatilityDisplay = metricsLoading
    ? "..."
    : formatCurrency(metrics.dailyVolatility);
  const burnRateDeltaDisplay = metricsLoading
    ? "..."
    : metrics.burnRateDelta !== null
    ? formatPercent(metrics.burnRateDelta)
    : "No data";
  const periodLabel = viewMode === "yearly" ? "year" : "month";

  // --- Insight Synthesis ---------------------------------------------------
  // Blends raw metrics with cultural context (Ramadan, Raya, etc.) to produce
  // human-readable bullets. This powers both the sidebar narrative and the
  // merged recommendations list.
  const aiInsight = useMemo(() => {
    const seasonalNotes = [];
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();

    if (currencyMeta.country === "malaysia" || currencyMeta.country === "my") {
      if (month === 11) {
        seasonalNotes.push("Year-end sales and school reopening typically drive spending in December/January—plan for uniforms, books, and travel early.");
      }
      if (month === 0) {
        seasonalNotes.push("Kick off the year by locking in Tabung Haji or ASB contributions and scheduling any annual insurance renewals.");
      }
    }

    if (currencyMeta.religion === "islam" || currencyMeta.religion === "muslim") {
      try {
        const islamicParts = new Intl.DateTimeFormat("en-u-ca-islamic", {
          month: "numeric",
          day: "numeric",
        }).formatToParts(today);
        const islamicMonth = parseInt(
          islamicParts.find((p) => p.type === "month")?.value ?? "0",
          10
        );
        const islamicDay = parseInt(
          islamicParts.find((p) => p.type === "day")?.value ?? "0",
          10
        );

        if (islamicMonth === 8 && islamicDay >= 20) {
          seasonalNotes.push("Sha'ban is here—start earmarking funds for Ramadan groceries, contributions, and Raya preparations.");
        }
        if (islamicMonth === 9) {
          seasonalNotes.push("Ramadan spending often shifts toward groceries, buka puasa, and charity. Track nightly bazaars and set aside zakat fitrah early.");
        }
        if (islamicMonth === 10 && islamicDay <= 10) {
          seasonalNotes.push("Selamat Hari Raya! Budget for duit raya, open house catering, and balik kampung travel while keeping an eye on post-festive recovery.");
        }
        if (islamicMonth === 12 && islamicDay >= 1 && islamicDay <= 15) {
          seasonalNotes.push("Zulhijjah reminds us to plan for zakat harta, korban, and Tabung Haji savings milestones.");
        }
      } catch (err) {
        console.warn("Unable to derive Islamic calendar context", err);
      }
    }

    if (metricsLoading) {
      return {
        headline: "Synthesizing insights...",
        narrative: "Give us a moment while we align the latest transactions, budgets, and trends.",
        bullets: [],
      };
    }

    const netCashFlow = metrics.netCashFlow || 0;
    const trendValue = Number(metrics.trend) || 0;
    const wantsShare = metrics.wantsPercent || 0;
    const needsShare = metrics.needsPercent || 0;
    const burnRateDelta = metrics.burnRateDelta !== null && metrics.burnRateDelta !== undefined ? metrics.burnRateDelta : null;
    const volatility = metrics.dailyVolatility || 0;
    const runwayDays = metrics.runwayDays;
    const bullets = [];

    // Check if there are no transactions yet
    const hasNoTransactions = (metrics.totalSpending === 0 && metrics.totalIncome === 0);

    let headline;
    let narrative;

    if (hasNoTransactions) {
      headline = "Welcome to your financial dashboard";
      narrative = `Get started by adding your first transaction. Once you begin tracking income and expenses, you'll see personalized insights and recommendations here.`;
    } else if (netCashFlow >= 0) {
      headline = "Cash flow is holding steady";
      narrative = `You are net positive by ${formatCurrency(
        netCashFlow
      )} this ${periodLabel}, with ${formatCurrency(
        metrics.totalIncome
      )} coming in against ${formatCurrency(metrics.totalSpending)} in spending.`;
    } else {
      headline = "Cash flow needs attention";
      narrative = `Spending exceeds income by ${formatCurrency(
        Math.abs(netCashFlow)
      )} this ${periodLabel}. Consider trimming discretionary outflows or boosting inflows to rebalance.`;
    }

    if (!hasNoTransactions && !Number.isNaN(trendValue) && trendValue !== 0) {
      bullets.push(
        `Spending is ${trendValue > 0 ? "up" : "down"} ${formatPercent(
          trendValue,
          1
        )} versus the prior ${periodLabel === "year" ? "year" : "month"}.`
      );
    }

    if (budget.amount !== null) {
      if (runwayDays !== null) {
        bullets.push(
          runwayDays <= 7
            ? `Runway is thin at about ${runwayDays} day${
                runwayDays === 1 ? "" : "s"
              } before hitting the ${formatCurrency(budget.amount)} target.`
            : `Runway projects ${runwayDays} day${
                runwayDays === 1 ? "" : "s"
              } before reaching the ${formatCurrency(budget.amount)} budget ceiling.`
        );
      } else {
        bullets.push(
          `Current spend is tracking inside the ${formatCurrency(
            budget.amount
          )} budget window.`
        );
      }
    } else {
      bullets.push("Set a monthly budget to unlock runway monitoring.");
    }

    if (currencyMeta.religion === "islam" || currencyMeta.religion === "muslim") {
      bullets.push(
        "Remember to set aside funds for zakat, sadaqah, or upcoming religious commitments before allocating surplus to discretionary goals."
      );
    }

    seasonalNotes.forEach((note) => bullets.push(note));

    if (!hasNoTransactions) {
    if (wantsShare > 45) {
      bullets.push(
        `Discretionary spend is elevated at ${wantsShare}% wants vs ${needsShare}% needs.`
      );
    } else if (wantsShare < 30 && needsShare > 60) {
      bullets.push(
        `Essential spend dominates at ${needsShare}% needs, leaving room to redirect surplus into goals.`
      );
    }

    if (burnRateDelta !== null && Math.abs(burnRateDelta) >= 5) {
      bullets.push(
        `Daily burn is ${formatPercent(burnRateDelta, 1)} compared with the prior period.`
      );
    }

    if (
      metrics.averageDailySpending > 0 &&
      volatility >= metrics.averageDailySpending * 0.5
    ) {
      bullets.push(
        `Daily spending volatility is high at ${formatCurrency(
          volatility
        )}—consider smoothing large purchases.`
      );
      }
    }

    if (bullets.length === 0) {
      if (hasNoTransactions) {
        bullets.push("Add transactions to start receiving personalized financial insights and recommendations.");
      } else {
      bullets.push("No critical anomalies detected; continue monitoring.");
      }
    }

    return { headline, narrative, bullets };
  }, [metricsLoading, metrics, budget.amount, periodLabel, currencyMeta]);

  // Broadcast event to open the AI copilot panel with contextual prompt
  const handleOpenAssistant = useCallback(() => {
    if (typeof window !== "undefined") {
      // Build comprehensive financial pulse context
      if (metricsLoading) {
      const event = new CustomEvent("openRayyAI", {
          detail: {
            message: `Analyze my financial pulse. Data is still loading.`,
            context: 'financial_pulse_analysis'
          },
      });
      window.dispatchEvent(event);
        return;
      }

      const contextParts = [];
      
      // Period and overview
      contextParts.push(`For ${periodLabel}:`);
      
      // Income and spending
      if (metrics.totalIncome > 0 || metrics.totalSpending > 0) {
        contextParts.push(`- Income: ${formatCurrency(metrics.totalIncome)}`);
        contextParts.push(`- Spending: ${formatCurrency(metrics.totalSpending)}`);
        contextParts.push(`- Net Cash Flow: ${formatCurrency(metrics.netCashFlow)}`);
      }
      
      // Needs vs Wants breakdown
      if (metrics.needsTotal > 0 || metrics.wantsTotal > 0) {
        contextParts.push(`- Needs: ${formatCurrency(metrics.needsTotal)} (${metrics.needsPercent}%)`);
        contextParts.push(`- Wants: ${formatCurrency(metrics.wantsTotal)} (${metrics.wantsPercent}%)`);
      }
      
      // Budget and runway
      if (budget.active) {
        contextParts.push(`- Budget: ${formatCurrency(budget.active.limit)} with ${formatCurrency(Math.max(budget.active.remaining, 0))} remaining`);
        if (metrics.runwayDays !== null) {
          contextParts.push(`- Runway: ${Math.max(metrics.runwayDays, 0)} days`);
        }
      }
      
      // Credit utilization
      if (creditSummary.cards.length > 0) {
        contextParts.push(`- Credit Cards: ${creditSummary.cards.length} active cards`);
        contextParts.push(`- Credit Utilization: ${formatPercentAbsolute(creditSummary.utilization)}`);
        contextParts.push(`- Total Credit Limit: ${formatCurrency(creditSummary.totalLimit)}`);
      }
      
      // Spending patterns
      if (metrics.averageDailySpending > 0) {
        contextParts.push(`- Average Daily Spending: ${formatCurrency(metrics.averageDailySpending)}`);
      }
      if (metrics.dailyVolatility > 0) {
        contextParts.push(`- Spending Volatility: ${formatCurrency(metrics.dailyVolatility)}`);
      }
      if (metrics.trend !== 0) {
        contextParts.push(`- Spending Trend: ${metrics.trend > 0 ? '+' : ''}${metrics.trend}% vs previous period`);
      }
      
      const financialPulseContext = `Analyze my financial pulse and provide deeper insights:\n\n${contextParts.join('\n')}\n\nWhat are the key insights and recommendations based on this financial data?`;

      const event = new CustomEvent("openRayyAI", {
        detail: { 
          message: financialPulseContext,
          context: 'financial_pulse_analysis'
        },
      });
      window.dispatchEvent(event);
    }
  }, [metricsLoading, metrics, budget.active, creditSummary, periodLabel, formatCurrency, formatPercentAbsolute]);

  // Concise 1-liner insights displayed in the "Strategic Insights" widget
  const insightLines = [];
    if (!metricsLoading) {
        const hasNoTransactions = metrics.totalSpending === 0 && metrics.totalIncome === 0;
        
        if (hasNoTransactions) {
          insightLines.push("Start by adding your first transaction to unlock insights.");
        } else {
        if (budget.amount !== null) {
            insightLines.push(
                metrics.runwayDays !== null && metrics.runwayDays >= 0
          ? `You have about ${metrics.runwayDays} day${
              metrics.runwayDays === 1 ? "" : "s"
            } of runway before hitting the ${formatCurrency(
              budget.amount
            )} monthly target.`
          : `Current spend is within the ${formatCurrency(
              budget.amount
            )} budget.`
      );
        }
        if (metrics.burnRateDelta !== null && metrics.burnRateDelta !== 0) {
      insightLines.push(
        `Daily spending is ${formatPercent(metrics.burnRateDelta)} ${
          metrics.burnRateDelta > 0 ? "higher" : "lower"
        } than the prior period.`
      );
        }
        if (metrics.netCashFlow !== 0 || metrics.totalIncome !== 0) {
      insightLines.push(
        `Net cash flow for the period is ${formatCurrency(
          metrics.netCashFlow
        )} (income ${formatCurrency(metrics.totalIncome)} vs spend ${formatCurrency(
          metrics.totalSpending
        )}).`
      );
      }
    }
  }

  const firstName = useMemo(() => {
    const candidate =
      userProfile?.first_name ||
      userProfile?.firstName ||
      (typeof userProfile?.name === "string" ? userProfile.name : null) ||
      userProfile?.full_name ||
      userProfile?.fullName ||
      (Array.isArray(userProfile?.names) ? userProfile.names[0] : null);

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().split(" ")[0];
    }

    return "there";
  }, [userProfile]);

  const greetingTimeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const heroSummary = useMemo(() => {
    if (metricsLoading) return "We're crunching the latest numbers.";

    // Check if there are no transactions yet
    const hasNoTransactions = metrics.totalSpending === 0 && metrics.totalIncome === 0;
    if (hasNoTransactions) {
      return "Start tracking your finances by adding transactions to see insights and trends.";
    }
    
    if (metrics.netCashFlow >= 0) {
      return `You're up ${formatCurrency(metrics.netCashFlow)} this ${periodLabel}, keep momentum going.`;
      return `You're up ${formatCurrency(metrics.netCashFlow)} this ${periodLabel}, keep momentum going.`;
    }
    if (budget.active && budget.active.remaining < 0) {
      return `You've exceeded ${budget.active.name} by ${formatCurrency(Math.abs(budget.active.remaining))}. Let's tighten wants spending.`;
      return `You've exceeded ${budget.active.name} by ${formatCurrency(Math.abs(budget.active.remaining))}. Let's tighten wants spending.`;
    }
    return `Watch discretionary spend — wants are at ${metrics.wantsPercent}% of total outflows.`;
  }, [metricsLoading, metrics.netCashFlow, metrics.totalSpending, metrics.totalIncome, periodLabel, budget.active, metrics.wantsPercent]);

  // Pull supporting copy for credit card panels. We keep this non-memoised to
  // avoid React warnings about calling hooks conditionally, but the logic still
  // short-circuits once we have the derived array.
  const creditCardTips = (() => {
    if (creditSummaryLoading) {
      return ["Syncing credit card balances..."];
    }
    if (creditSummary.cards.length === 0) {
      return ["Add a credit card to start tracking utilization and billing reminders on this dashboard."];
    }
    const tips = [];
    if (creditSummary.utilization >= 50) {
      tips.push(
        `Utilization is ${formatPercentAbsolute(creditSummary.utilization)}—consider paying down balances to stay below 30%.`
      );
    } else if (creditSummary.utilization > 0 && creditSummary.utilization < 30) {
      tips.push(
        `Utilization sits at ${formatPercentAbsolute(creditSummary.utilization)}, comfortably under the 30% guideline.`
      );
    }
    if (creditSummary.upcoming) {
      tips.push(
        `Next payment of ${formatCurrency(creditSummary.upcoming.amount)} due on ${formatDate(
          creditSummary.upcoming.date
        )} for ${creditSummary.upcoming.cardName}.`
      );
    }
    const highestBalanceCard = [...creditSummary.cards].sort(
      (a, b) => (Number(b.current_balance) || 0) - (Number(a.current_balance) || 0)
    )[0];
    if (highestBalanceCard && (Number(highestBalanceCard.current_balance) || 0) > 0) {
      tips.push(
        `${highestBalanceCard.card_name} carries the largest balance at ${formatCurrency(
          Number(highestBalanceCard.current_balance) || 0
        )}.`
      );
    }
    if (tips.length === 0) {
      tips.push("Credit card spend is under control—keep paying on time to avoid interest.");
    }
    return tips;
  })();

  // Curate the top-level recommendations carousel (used within merged insights)
  // so that we present a concise list of next steps without repeating bullets.
  const recommendationItems = useMemo(() => {
    const items = [];
    if (!metricsLoading && aiInsight.headline) {
      items.push(aiInsight.headline);
    }
    if (!metricsLoading) {
      if (budget.active) {
        const remaining = formatCurrency(Math.max(budget.active.remaining, 0));
        items.push(`Channel ${remaining} into ${budget.active.name} to stay ahead of plan.`);
      } else if (budget.entries.length === 0) {
        items.push("Create your first budget to unlock runway forecasting and alerts.");
      }
    }
    if (creditCardTips.length > 0) {
      items.push(creditCardTips[0]);
    }
    if (insightLines.length > 0) {
      items.push(insightLines[0]);
    }
    return items.slice(0, 4);
  }, [aiInsight.headline, budget.active, budget.entries.length, creditCardTips, insightLines, metricsLoading]);

  // Merge AI bullets, recommendations, and credit callouts into a deduplicated list
  // to avoid repeating the same sentence across widgets.
  const mergedInsights = useMemo(() => {
    const combined = [...(aiInsight?.bullets || []), ...recommendationItems, ...creditCardTips.slice(1)];
    const unique = [];
    const seen = new Set();
    combined.forEach((item) => {
      if (!item) return;
      const key = item.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    return unique.slice(0, 6);
  }, [aiInsight?.bullets, recommendationItems, creditCardTips]);

  // --- KPI Tile Definitions ------------------------------------------------
  // Consolidated array of data points rendered by the `MetricCard` grid. We
  // keep this memoised so the expensive formatting helpers are not re-run
  // unless the underlying data actually changes.
  const keyMetricsData = useMemo(
    () => [
      {
        title: "Total Income",
        value: metricsLoading ? "..." : formatCurrency(metrics.totalIncome),
        subtitle: metricsLoading ? "Loading..." : "Cash received this period",
        icon: <Wallet className="w-5 h-5" />,
        color: "bg-[#d9f4ed] text-[#04362c]",
        helpText: "Total amount of money received during the selected period. This includes salary, freelance income, investment returns, and any other sources of cash inflow.",
      },
      {
        title: "Total Expenses",
        value: metricsLoading ? "..." : formatCurrency(metrics.totalSpending),
        subtitle: trendSubtitle,
        icon: <DollarSign className="w-5 h-5" />,
        color: "bg-[#def8f2] text-[#04362c]",
        helpText: "Total amount spent during the selected period across all categories. This includes both needs (essential expenses) and wants (discretionary spending). The trend shows how this compares to the previous period.",
      },
      {
        title: "Needs Share",
        value: metricsLoading ? "..." : `${metrics.needsPercent}%`,
        subtitle: metricsLoading ? "Calculating..." : `${metrics.wantsPercent}% wants`,
        icon: <Heart className="w-5 h-5" />,
        color: "bg-[#e0efe9] text-[#04362c]",
        helpText: "The percentage of your spending allocated to essential needs (housing, groceries, utilities, healthcare, etc.) versus wants (entertainment, dining out, shopping). Ideally, 60-70% should go to needs, leaving 30-40% for wants and savings.",
      },
      {
        title: "Budget Remaining",
        value:
          metricsLoading || budgetLoading
            ? "..."
            : budget.active
            ? formatCurrency(Math.max(budget.active.remaining, 0))
            : budget.amount === null
            ? "--"
            : formatCurrency(metrics.remainingBudget ?? 0),
        subtitle:
          metricsLoading || budgetLoading
            ? ""
            : budget.active
            ? `${formatCurrency(budget.active.limit)} target • ${formatDate(budget.active.periodEnd)}`
            : "No active budget for this period",
        icon: <Calendar className="w-5 h-5" />,
        color: "bg-[#eef6f4] text-[#04362c]",
        helpText: "The amount of money remaining in your active budget for the current period. This helps you track how much you can still spend before reaching your budget limit. A negative value means you've exceeded your budget.",
      },
      {
        title: "Spend Volatility",
        value: metricsLoading ? "..." : formatCurrency(metrics.dailyVolatility),
        subtitle: metricsLoading ? "" : "Std dev of daily spend",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "bg-[#dcf5ef] text-[#04362c]",
        helpText: "Measures how consistent your daily spending is. A lower volatility means more predictable spending patterns, while higher volatility indicates irregular spending. This helps identify if your spending is stable or varies significantly day-to-day.",
      },
      {
        title: "Burn Rate Delta",
        value: trendsLoading ? "..." : metrics.burnRateDelta !== null ? formatPercent(metrics.burnRateDelta) : "No data",
        subtitle: trendsLoading ? "" : metrics.burnRateDelta !== null ? "Change vs prior period" : "No previous period data",
        icon: <Activity className="w-5 h-5" />,
        color: "bg-[#dff6f0] text-[#04362c]",
        helpText: "The percentage change in your average daily spending compared to the previous period. A positive value means you're spending more per day than before, while negative means you're spending less. Only calculated when previous period data is available.",
      },
      {
        title: "Days Tracked",
        value: metricsLoading ? "..." : `${metrics.daysTracked}d`,
        subtitle: metricsLoading ? "" : `Within selected ${periodLabel}`,
        icon: <Clock className="w-5 h-5" />,
        color: "bg-[#e8f0ee] text-[#04362c]",
        helpText: "The number of days included in the selected time period. This helps you understand the timeframe for all calculations and metrics shown on the dashboard.",
      },
      {
        title: "Credit Cards",
        value: creditSummaryLoading ? "..." : `${creditSummary.cards.length} active`,
        subtitle: creditSummaryLoading
          ? "Syncing..."
          : creditSummary.cards.length === 0
          ? "Connect cards to monitor health"
          : `Utilisation ${formatCurrency(creditSummary.utilization)} • ${formatPercentAbsolute(creditSummary.utilization)}`,
        icon: <Wallet className="w-5 h-5" />,
        color: "bg-[#e7f5f0] text-[#04362c]",
        helpText: "Summary of your credit card accounts including the number of active cards, total credit limits across all cards, and overall credit utilization percentage. Keeping utilization below 30% is ideal for maintaining good credit health.",
      },
    ],
    [
      metricsLoading,
      metrics.totalIncome,
      metrics.totalSpending,
      metrics.needsPercent,
      metrics.wantsPercent,
      metrics.dailyVolatility,
      metrics.burnRateDelta,
      metrics.daysTracked,
      budgetLoading,
      budget.active,
      budget.amount,
      creditSummaryLoading,
      creditSummary.cards.length,
      creditSummary.totalLimit,
      creditSummary.utilization,
      periodLabel,
      trendSubtitle,
    ]
  );

    return (
    <div className="min-h-screen" style={{ background: brand.surface }}>
      <div className="w-full px-6 sm:px-8 lg:px-14 pt-14 pb-10 sm:pt-16 sm:pb-12 lg:pt-20 lg:pb-14">
        {/* ------------------------------------------------------------------ */}
        {/* Header: title, period navigation, monthly/yearly toggle             */}
        {/* ------------------------------------------------------------------ */}
        <header className="mb-6 lg:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
                style={{ color: brand.ink }}
              >
                            Intelligent Dashboard
                        </h1>
              <p className="mt-2 text-xl sm:text-2xl md:text-[26px] text-black/70">
                        Advanced financial analytics and predictive insights
                    </p>
            </div>

            {/* Mobile navigation controls */}
            <div className="flex items-center justify-between gap-3 sm:hidden">
                            <button
                onClick={goToPrevious}
                className={`h-10 w-10 grid place-items-center rounded-full hover:bg-black/5 transition ${brand.ring}`}
                aria-label={viewMode === "yearly" ? "Previous year" : "Previous month"}
              >
                <ChevronLeft className="h-5 w-5" style={{ color: brand.ink }} />
              </button>
              <span
                className="text-center text-lg font-semibold"
                style={{ color: brand.ink }}
              >
                {getPeriodDisplay()}
              </span>
              <button
                onClick={goToNext}
                disabled={isCurrent()}
                className={`h-10 w-10 grid place-items-center rounded-full hover:bg-black/5 transition disabled:opacity-40 disabled:cursor-not-allowed ${brand.ring}`}
                aria-label={viewMode === "yearly" ? "Next year" : "Next month"}
              >
                <ChevronRight className="h-5 w-5" style={{ color: brand.ink }} />
              </button>
            </div>

            {/* Desktop toggle for monthly/yearly views */}
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-white p-1 shadow">
                            <button
                onClick={() => setViewMode("monthly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${brand.ring} ${
                  viewMode === "monthly"
                    ? "bg-gray-200 text-black shadow"
                    : "text-black/60 hover:bg-black/5"
                }`}
                            >
                                Monthly
                            </button>
                            <button
                onClick={() => setViewMode("yearly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${brand.ring} ${
                  viewMode === "yearly"
                    ? "bg-gray-200 text-black shadow"
                    : "text-black/60 hover:bg-black/5"
                }`}
                            >
                                Yearly
                            </button>
            </div>
                        </div>

          {/* Desktop navigation arrows */}
          <div className="mt-6 hidden sm:flex items-center gap-3 justify-end">
                            <button
                                onClick={goToPrevious}
              className={`h-10 w-10 grid place-items-center rounded-full hover:bg-black/5 transition ${brand.ring}`}
              aria-label={viewMode === "yearly" ? "Previous year" : "Previous month"}
                            >
              <ChevronLeft className="h-5 w-5" style={{ color: brand.ink }} />
                            </button>
            <span
              className="min-w-[220px] text-center text-lg font-semibold"
              style={{ color: brand.ink }}
            >
                                {getPeriodDisplay()}
                            </span>
                            <button
                                onClick={goToNext}
                                disabled={isCurrent()}
              className={`h-10 w-10 grid place-items-center rounded-full hover:bg-black/5 transition disabled:opacity-40 disabled:cursor-not-allowed ${brand.ring}`}
              aria-label={viewMode === "yearly" ? "Next year" : "Next month"}
                            >
              <ChevronRight className="h-5 w-5" style={{ color: brand.ink }} />
                            </button>
                        </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Key Metrics: surface the most requested KPIs up front                */}
        {/* ------------------------------------------------------------------ */}
        <section className="mb-8 rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold" style={{ color: brand.ink }}>
                Key Metrics
              </h3>
              <p className="text-sm text-black/60">
                Snapshot for this {periodLabel === "year" ? "year" : "month"}
              </p>
                    </div>
            <div className="rounded-full border border-[#0DAD8D]/30 bg-[#f0faf7] px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#0DAD8D]">
              {getPeriodDisplay()}
                </div>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {keyMetricsData.map((item) => (
                        <MetricCard
                key={item.title}
                title={item.title}
                value={item.value}
                subtitle={item.subtitle}
                icon={item.icon}
                iconColor={item.color}
                helpText={item.helpText}
              />
            ))}
          </div>
        </section>
 
        {/* ------------------------------------------------------------------ */}
        {/* Main content grid: hero pulse, AI sidebar, KPIs, charts, analysis   */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid gap-8 xl:gap-10">
          <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6 xl:gap-8 items-start">
            <div className="2xl:col-span-2 space-y-6">
                {/* Hero: narrative pulse + quick stats tiles */}
                <section
                  className="relative overflow-hidden rounded-3xl shadow-xl text-white"
                  style={{ background: brand.ink }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0DAD8D] via-[#04362c] to-[#02241d] opacity-90" />
                  <div className="relative z-10 p-6 sm:p-8 lg:p-10 space-y-8">
                    <div className="space-y-3 max-w-3xl">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">{greetingTimeOfDay}, {firstName}</p>
                      <h2 className="text-3xl sm:text-4xl font-semibold">Your Financial Pulse</h2>
                      <p className="text-lg sm:text-xl text-white/85 leading-relaxed">
                        {heroSummary}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAssistant}
                        className={`inline-flex items-center justify-center rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 ${brand.ring}`}
                      >
                        Ask RayyAI for deeper analysis
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-[color:var(--ink,#04362c)]">
                      {[
                        // Net cash flow tile gives the at-a-glance surplus/deficit view
                        {
                          label: "Net Cash Flow",
                          value: metricsLoading ? "..." : formatCurrency(metrics.netCashFlow),
                          caption: metricsLoading
                            ? "Calculating..."
                            : (hasNoTransactions
                              ? "Add transactions to see cash flow"
                              : `${formatCurrency(metrics.totalIncome)} in vs ${formatCurrency(metrics.totalSpending)} out`),
                        },
                        // Runway tile reflects how many days remain before breaching the active budget
                        {
                          label: "Runway",
                          value:
                            metricsLoading || budgetLoading
                              ? "..."
                              : metrics.runwayDays !== null
                              ? `${Math.max(metrics.runwayDays, 0)} ${Math.max(metrics.runwayDays, 0) === 1 ? "day" : "days"}`
                              : "Set a budget",
                          caption:
                            metricsLoading || budgetLoading
                              ? ""
                              : budget.active
                              ? `${formatCurrency(Math.max(budget.active.remaining, 0))} remaining in ${budget.active.name}`
                              : "Add a monthly budget to track runway",
                        },
                        // Credit utilisation is the leading indicator for card health and appears in multiple insights
                        {
                          label: "Credit Utilization",
                          value:
                            creditSummaryLoading
                              ? "..."
                              : formatPercentAbsolute(creditSummary.utilization),
                          caption:
                            creditSummaryLoading
                              ? "Syncing cards..."
                              : creditSummary.cards.length === 0
                              ? "Connect a card to monitor usage"
                              : creditSummary.utilization >= 50
                              ? "Consider paying down to stay under 30%"
                              : "Healthy credit usage",
                        },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl bg-white/95 p-5 shadow text-[#04362c]">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-[#0DAD8D]">{item.label}</p>
                          <p className="mt-2 text-2xl font-semibold text-[#04362c]">{item.value}</p>
                          <p className="mt-2 text-sm text-black/70 leading-relaxed">{item.caption}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

              {/* Cash flow trend: stacked area chart with income vs spending */}
              <section className="rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
                <h3 className="text-2xl font-semibold mb-5" style={{ color: brand.ink }}>
                  Cash Flow Trend
                </h3>
                <div className="h-[420px] sm:h-[460px] lg:h-[520px]">
                  <CashFlowTrendChart selectedDate={selectedDate} viewMode={viewMode} showHeader={false} formatCurrency={formatCurrency} currencyMeta={currencyMeta} />
                </div>
              </section>

              {/* Spending heatmap: cross-source daily spending intensity */}
              <section className="rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
                <h3 className="text-2xl font-semibold mb-3" style={{ color: brand.ink }}>
                  Spending Heatmap
                </h3>
                <p className="text-sm text-black/60 mb-6">
                  Daily spending intensity across all accounts and cards for the selected period.
                </p>
                <SpendingHeatmap
                  transactions={spendingTransactions}
                  isLoading={metricsLoading}
                  startDate={heatmapStartDate}
                  endDate={heatmapEndDate}
                  periodLabel={heatmapLabel}
                />
              </section>
              {/* Financial wellbeing composite scoring */}
              <section className="rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
                <FinancialHealthMetrics metrics={metrics} budget={budget} loading={metricsLoading} viewMode={viewMode} />
              </section>
              {/* Needs vs wants analysis: gradient area + categorical guidance */}
              <section className="rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
                <NeedsVsWantsAnalysis
                  selectedDate={selectedDate}
                  viewMode={viewMode}
                  formatCurrency={formatCurrency}
                  currencyMeta={currencyMeta}
                  enableInsightsFetch={allCoreDataLoaded}
                />
              </section>
 
                    </div>

            {/* Right rail: AI narrative, budget snapshot, credit health */}
            <aside className="space-y-6">
              <div className="rounded-3xl bg-white shadow border border-black/5 p-6 space-y-6">
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center gap-2 bg-[#0DAD8D]/10 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.3em] text-[#0DAD8D]">
                    <span>RayyAI Insight</span>
                  </div>
                  <h2 className="text-3xl font-semibold" style={{ color: brand.ink }}>
                    {aiInsight.headline}
                  </h2>
                  <p className="text-lg text-black/70 leading-relaxed">
                    {aiInsight.narrative}
                  </p>
                </div>

                {aiInsight.bullets.length > 0 && (
                  <div className="rounded-2xl border border-[#04362c]/10 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-black/60">Smart Actions</p>
                    <ul className="mt-3 space-y-2 text-sm sm:text-base text-black/75 leading-relaxed">
                      {aiInsight.bullets.slice(0, 4).map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0DAD8D]" />
                          <span>{bullet}</span>
                        </li>
                                ))}
                            </ul>
                        </div>
                    )}

                </div>

              <SmartAnalysisPanel
                data={smartAnalysis.data}
                loading={smartAnalysisLoading}
                error={smartAnalysis.error}
                onRefresh={handleRefreshSmartAnalysis}
                periodLabel={heatmapLabel}
              />


              <div className="rounded-3xl bg-white shadow border border-black/5 p-6 space-y-4">
                <div className="inline-flex items-center gap-2 bg-[#0DAD8D]/10 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.3em] text-[#0DAD8D]">
                  <span>Budget Snapshot</span>
                    </div>
                <div>
                  <h3 className="text-2xl font-semibold" style={{ color: brand.ink }}>
                    {budget.active ? budget.active.name : "No active budget"}
                  </h3>
                  <p className="mt-2 text-sm text-black/60 leading-relaxed">
                    {budgetLoading
                      ? "Syncing budget performance..."
                      : budget.active
                      ? `${formatCurrency(budget.active.spent)} spent • ${formatCurrency(Math.max(budget.active.remaining, 0))} remaining`
                      : budget.entries.length === 0
                      ? "Create a budget to unlock tailored savings guidance."
                      : "Tracking current period budgets."}
                  </p>
                </div>
                {budget.active && (
                  <div className="grid grid-cols-2 gap-3 text-sm text-black/70">
                    <div className="rounded-2xl border border-[#04362c]/10 bg-[#f5faf8] p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-black/50">Utilisation</p>
                      <p className="mt-1 text-lg font-semibold text-[#04362c]">
                        {formatPercentAbsolute(Math.min(budget.active.percentage, 999))}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#04362c]/10 bg-[#f0faf7] p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-black/50">
                        {budget.active.periodType ? budget.active.periodType.charAt(0).toUpperCase() + budget.active.periodType.slice(1) : "Period"} Type
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[#04362c]">
                        {budget.active.periodType || "Monthly"}
                      </p>
                    </div>
                  </div>
                )}
                {budget.active && budget.active.periodStart && budget.active.periodEnd && (
                  <div className="rounded-2xl border border-[#04362c]/10 bg-[#eef6f4] p-3">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-black/50">Period Range</p>
                    <p className="mt-1 text-sm font-medium text-[#04362c]">
                      {formatDate(budget.active.periodStart)} - {formatDate(budget.active.periodEnd)}
                    </p>
                  </div>
                )}
            </div>

              <div className="rounded-3xl bg-white shadow border border-black/5 p-6 space-y-4">
                <div className="inline-flex items-center gap-2 bg-[#0DAD8D]/10 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.3em] text-[#0DAD8D]">
                  <span>Credit Health</span>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold" style={{ color: brand.ink }}>
                    {creditSummaryLoading
                      ? "Syncing..."
                      : creditSummary.cards.length === 0
                      ? "No cards connected"
                      : `${formatPercentAbsolute(creditSummary.utilization)} utilisation`}
                  </h3>
                  <p className="mt-2 text-sm text-black/60 leading-relaxed">
                    {creditSummaryLoading
                      ? "Updating balances and payments."
                      : creditSummary.cards.length === 0
                      ? "Connect a credit card to monitor utilisation and upcoming dues."
                      : creditCardTips[0]}
                  </p>
                </div>
                {!creditSummaryLoading && creditSummary.cards.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 text-sm text-black/70">
                    <div className="rounded-2xl border border-[#04362c]/10 bg-[#f5faf8] p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-black/50">Outstanding</p>
                      <p className="mt-1 text-lg font-semibold text-[#04362c]">
                        {formatCurrency(creditSummary.totalBalance)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#04362c]/10 bg-[#f0faf7] p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-black/50">Available</p>
                      <p className="mt-1 text-lg font-semibold text-[#04362c]">
                        {formatCurrency(Math.max(creditSummary.totalLimit - creditSummary.totalBalance, 0))}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#04362c]/10 bg-[#eef6f4] p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-black/50">Total Limit</p>
                      <p className="mt-1 text-lg font-semibold text-[#04362c]">
                        {formatCurrency(creditSummary.totalLimit)}
                      </p>
                    </div>
                    {creditSummary.upcoming && (
                      <div className="rounded-2xl border border-[#0DAD8D]/30 bg-[#f0faf7] p-3">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-[#0DAD8D]">Upcoming Payment</p>
                        <p className="mt-1 font-semibold">
                          {formatCurrency(creditSummary.upcoming.amount)} on {formatDate(creditSummary.upcoming.date)}
                        </p>
                        <p className="text-xs text-black/60">
                          {creditSummary.upcoming.cardName} • {creditSummary.upcoming.bankName}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Suspicious Transactions Review */}
              <SuspiciousTransactions
                transactions={suspiciousTransactions.data}
                loading={suspiciousTransactions.loading}
                formatCurrency={formatCurrency}
              />

              {/* Secondary insight card: deep AI narrative reserved for longer reads */}

            </aside>
                </div>
            </div>
            </div>
        </div>
    );
}
