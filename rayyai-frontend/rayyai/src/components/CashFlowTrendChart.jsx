import { useEffect, useMemo, useState } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
} from "recharts";
import { API_BASE_URL } from "../services/api";

// Custom tooltip to deduplicate entries
const CustomTooltip = ({ active, payload, formatter }) => {
    if (!active || !payload || !payload.length) {
        return null;
    }

    // Deduplicate by dataKey - keep only the first occurrence
    const seen = new Set();
    const uniquePayload = payload.filter((entry) => {
        if (seen.has(entry.dataKey)) {
            return false;
        }
        seen.add(entry.dataKey);
        return true;
    });

    const labelMap = {
        'income': 'Income',
        'expense': 'Expense',
        'net': 'Net Cash Flow'
    };

    return (
        <div className="rounded-2xl bg-white/95 backdrop-blur-sm border border-black/10 p-4 shadow-lg">
            {uniquePayload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 mb-2 last:mb-0">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-medium text-[#04362c]/80">
                        {labelMap[entry.dataKey] || entry.dataKey}:
                    </span>
                    <span className="text-sm font-semibold text-[#04362c]">
                        {formatter ? formatter(entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

const MONTH_LABEL_OPTIONS = { month: 'short' };
const FULL_LABEL_OPTIONS = { month: 'short', year: 'numeric' };

const clampToToday = (date) => {
    const today = new Date();
    return date > today ? today : date;
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const buildMonthRange = (endDate, monthsBack) => {
    const range = [];
    for (let i = monthsBack - 1; i >= 0; i -= 1) {
        const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        range.push(new Date(d));
    }
    return range;
};

const defaultCurrencyFormatter = (value) => {
    try {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            maximumFractionDigits: 0,
        }).format(value);
    } catch (err) {
        return `RM ${Number(value || 0).toLocaleString()}`;
    }
};

export default function CashFlowTrendChart({ selectedDate = new Date(), viewMode = 'monthly', showHeader = true, formatCurrency, currencyMeta }) {
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);

    const displayCurrency = useMemo(() => {
        if (typeof formatCurrency === 'function') {
            return (value) => formatCurrency(value ?? 0);
        }
        if (currencyMeta?.currency) {
            return (value) => {
                try {
                    return new Intl.NumberFormat(currencyMeta.locale ?? undefined, {
                        style: 'currency',
                        currency: currencyMeta.currency,
                        maximumFractionDigits: 0,
                    }).format(value);
                } catch (err) {
                    return defaultCurrencyFormatter(value);
                }
            };
        }
        return defaultCurrencyFormatter;
    }, [formatCurrency, currencyMeta]);

    useEffect(() => {
        const fetchSeries = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setSeries([]);
                    return;
                }

                // Calculate date range to match Dashboard's filter logic
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                let rangeStart, rangeEnd;

                if (viewMode === 'yearly') {
                    // For yearly view: show all 12 months of the selected year
                    const selectedYear = selectedDate.getFullYear();
                    const currentYear = now.getFullYear();
                    rangeStart = new Date(selectedYear, 0, 1);
                    
                    // If selected year is current or future, cap end date to today
                    if (selectedYear >= currentYear) {
                        rangeEnd = today;
                    } else {
                        rangeEnd = new Date(selectedYear, 11, 31);
                    }
                } else {
                    // For monthly view: show the selected month broken down by days
                    const selectedYear = selectedDate.getFullYear();
                    const selectedMonth = selectedDate.getMonth();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth();
                    
                    rangeStart = new Date(selectedYear, selectedMonth, 1);
                    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
                    
                    // If selected month is current or future, cap end date to today
                    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth)) {
                        rangeEnd = today;
                    } else {
                        rangeEnd = lastDayOfMonth;
                    }
                }

                const startStr = rangeStart.toISOString().split('T')[0];
                const endStr = rangeEnd.toISOString().split('T')[0];

                const [expenseRes, incomeRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/transactions/expense?start_date=${startStr}&end_date=${endStr}&limit=1000`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                    fetch(`${API_BASE_URL}/transactions/income?start_date=${startStr}&end_date=${endStr}&limit=1000`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                ]);

                let expenses = [];
                let incomes = [];

                if (expenseRes.ok) {
                    expenses = await expenseRes.json();
                }
                if (incomeRes.ok) {
                    incomes = await incomeRes.json();
                }

                if (viewMode === 'yearly') {
                    // For yearly view: aggregate by month
                    const expensesByMonth = expenses.reduce((acc, expense) => {
                        const when = expense.date_spent || expense.created_at;
                        if (!when) return acc;
                        const expenseDate = new Date(when);
                        // Only include expenses within the selected year
                        if (expenseDate >= rangeStart && expenseDate <= rangeEnd) {
                            const key = getMonthKey(expenseDate);
                            acc[key] = (acc[key] || 0) + (Number(expense.amount) || 0);
                        }
                        return acc;
                    }, {});

                    const incomesByMonth = incomes.reduce((acc, income) => {
                        const when = income.date_received || income.created_at;
                        if (!when) return acc;
                        const incomeDate = new Date(when);
                        // Only include incomes within the selected year
                        if (incomeDate >= rangeStart && incomeDate <= rangeEnd) {
                            const key = getMonthKey(incomeDate);
                            acc[key] = (acc[key] || 0) + (Number(income.amount) || 0);
                        }
                        return acc;
                    }, {});

                    // Build month range for the selected year
                    const selectedYear = selectedDate.getFullYear();
                    const monthRange = [];
                    for (let month = 0; month < 12; month++) {
                        const monthDate = new Date(selectedYear, month, 1);
                        // Skip future months if viewing current year
                        if (monthDate <= rangeEnd) {
                            monthRange.push(monthDate);
                        }
                    }

                    const composed = monthRange.map((monthDate, idx) => {
                        const key = getMonthKey(monthDate);
                        const income = Math.round((incomesByMonth[key] || 0) * 100) / 100;
                        const expense = Math.round((expensesByMonth[key] || 0) * 100) / 100;
                        const net = Math.round((income - expense) * 100) / 100;

                        const baseLabel = monthDate.toLocaleDateString('en-US', MONTH_LABEL_OPTIONS);
                        const showYear = idx === 0 || monthDate.getMonth() === 0;
                        const label = showYear
                            ? monthDate.toLocaleDateString('en-US', FULL_LABEL_OPTIONS)
                            : baseLabel;

                        return {
                            key,
                            label,
                            income,
                            expense,
                            net,
                        };
                    });

                    setSeries(composed);
                } else {
                    // For monthly view: aggregate by day
                    const expensesByDay = expenses.reduce((acc, expense) => {
                        const when = expense.date_spent || expense.created_at;
                        if (!when) return acc;
                        const expenseDate = new Date(when);
                        // Only include expenses within the selected month
                        if (expenseDate >= rangeStart && expenseDate <= rangeEnd) {
                            const dayKey = expenseDate.toISOString().split('T')[0];
                            acc[dayKey] = (acc[dayKey] || 0) + (Number(expense.amount) || 0);
                        }
                        return acc;
                    }, {});

                    const incomesByDay = incomes.reduce((acc, income) => {
                        const when = income.date_received || income.created_at;
                        if (!when) return acc;
                        const incomeDate = new Date(when);
                        // Only include incomes within the selected month
                        if (incomeDate >= rangeStart && incomeDate <= rangeEnd) {
                            const dayKey = incomeDate.toISOString().split('T')[0];
                            acc[dayKey] = (acc[dayKey] || 0) + (Number(income.amount) || 0);
                        }
                        return acc;
                    }, {});

                    // Build day range for the selected month
                    const dayRange = [];
                    const current = new Date(rangeStart);
                    while (current <= rangeEnd) {
                        dayRange.push(new Date(current));
                        current.setDate(current.getDate() + 1);
                    }

                    // Group by week for better visualization (7 days per data point)
                    const weekGroups = [];
                    for (let i = 0; i < dayRange.length; i += 7) {
                        const weekDays = dayRange.slice(i, i + 7);
                        const weekStart = weekDays[0];
                        const weekEnd = weekDays[weekDays.length - 1];
                        
                        const weekIncome = weekDays.reduce((sum, day) => {
                            const dayKey = day.toISOString().split('T')[0];
                            return sum + (incomesByDay[dayKey] || 0);
                        }, 0);
                        
                        const weekExpense = weekDays.reduce((sum, day) => {
                            const dayKey = day.toISOString().split('T')[0];
                            return sum + (expensesByDay[dayKey] || 0);
                        }, 0);
                        
                        const weekNet = weekIncome - weekExpense;
                        
                        const label = weekDays.length === 7
                            ? `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('en-US', { month: 'short' })}`
                            : `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('en-US', { month: 'short' })}`;
                        
                        weekGroups.push({
                            key: `${weekStart.toISOString().split('T')[0]}-${weekEnd.toISOString().split('T')[0]}`,
                            label,
                            income: Math.round(weekIncome * 100) / 100,
                            expense: Math.round(weekExpense * 100) / 100,
                            net: Math.round(weekNet * 100) / 100,
                        });
                    }

                    setSeries(weekGroups);
                }
            } catch (error) {
                console.error('Failed to fetch cash flow series', error);
                setSeries([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSeries();
    }, [selectedDate, viewMode]);

    const chartData = useMemo(() => (series.length > 0 ? series : []), [series]);

    return (
        <div className="rounded-3xl bg-white/90 border border-[#04362c]/10 shadow-2xl p-6 lg:p-8 text-[#04362c]">
            {showHeader && (
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div>
                        <h3 className="text-2xl font-semibold">Cash Flow Trend</h3>
                        <p className="text-[#04362c]/70 text-sm">
                            {viewMode === 'yearly' 
                                ? `Income vs expenses for ${selectedDate.getFullYear()}`
                                : `Income vs expenses for ${selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                        </p>
                    </div>
                </div>
            )}

            <div className="h-[22rem] w-full">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-[#04362c]/80 text-base">Loading trend...</p>
                    </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <defs>
                            <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0DAD8D" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#0DAD8D" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f47275" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#f47275" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(4,54,44,0.08)" strokeDasharray="4 4" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(4,54,44,0.65)', fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(4,54,44,0.65)', fontSize: 12 }}
                            tickFormatter={(value) => displayCurrency(value)}
                        />
                        <Tooltip
                            content={<CustomTooltip formatter={displayCurrency} />}
                        />
                        <Area
                            type="monotone"
                            dataKey="income"
                            fill="url(#incomeArea)"
                            stroke="#0DAD8D"
                            strokeWidth={2}
                            activeDot={{ r: 5 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="expense"
                            fill="url(#expenseArea)"
                            stroke="#f47275"
                            strokeWidth={2}
                            activeDot={{ r: 5 }}
                        />
                        <Bar dataKey="expense" barSize={16} fill="rgba(244,114,117,0.35)" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="income" barSize={16} fill="rgba(13,173,141,0.35)" radius={[8, 8, 0, 0]} />
                        <Line type="monotone" dataKey="net" stroke="#04362c" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
                )}
            </div>

            {!loading && chartData.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm">
                    <div className="rounded-2xl bg-[#f5faf8] border border-[#04362c]/10 p-4">
                        <p className="text-[#04362c]/60 uppercase tracking-[0.2em] text-xs mb-1">Latest Income</p>
                        <p className="text-xl font-semibold">
                            {displayCurrency(chartData[chartData.length - 1].income || 0)}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-[#fef6f6] border border-[#04362c]/10 p-4">
                        <p className="text-[#04362c]/60 uppercase tracking-[0.2em] text-xs mb-1">Latest Expenses</p>
                        <p className="text-xl font-semibold">
                            {displayCurrency(chartData[chartData.length - 1].expense || 0)}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white border border-[#04362c]/10 p-4">
                        <p className="text-[#04362c]/60 uppercase tracking-[0.2em] text-xs mb-1">Latest Net</p>
                        <p className="text-xl font-semibold">
                            {displayCurrency(chartData[chartData.length - 1].net || 0)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

