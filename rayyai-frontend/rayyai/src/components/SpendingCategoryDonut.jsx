import { useEffect, useMemo, useState } from "react";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from "recharts";
import { API_BASE_URL } from "../services/api";

const COLOR_PALETTE = [
    "#0DAD8D",
    "#6f948d",
    "#55cdb5",
    "#4f9b8b",
    "#586c75",
    "#04362c",
    "#9eb8b9",
];

const defaultFormatter = (value) => {
    try {
        return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(value);
    } catch {
        const numeric = Number(value) || 0;
        return `RM ${numeric.toLocaleString()}`;
    }
};

export default function SpendingCategoryDonut({ selectedDate = new Date(), viewMode = 'monthly', formatCurrency = defaultFormatter }) {
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setSegments([]);
                    return;
                }

                let startDate;
                let endDate;

                if (viewMode === 'yearly') {
                    startDate = new Date(selectedDate.getFullYear(), 0, 1);
                    const isCurrentYear = selectedDate.getFullYear() === new Date().getFullYear();
                    endDate = isCurrentYear ? new Date() : new Date(selectedDate.getFullYear(), 11, 31);
                } else {
                    startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                    const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth()
                        && selectedDate.getFullYear() === new Date().getFullYear();
                    const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                    endDate = isCurrentMonth ? new Date() : lastDayOfMonth;
                }

                const [startStr, endStr] = [startDate, endDate].map((d) => d.toISOString().split('T')[0]);

                const res = await fetch(
                    `${API_BASE_URL}/transactions/expense?start_date=${startStr}&end_date=${endStr}&limit=1000`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    },
                );

                if (!res.ok) {
                    setSegments([]);
                    return;
                }

                const expenses = await res.json();

                const byCategory = expenses.reduce((acc, expense) => {
                    const category = expense.category || 'Uncategorized';
                    acc[category] = (acc[category] || 0) + (Number(expense.amount) || 0);
                    return acc;
                }, {});

                const sorted = Object.entries(byCategory)
                    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
                    .sort((a, b) => b.value - a.value);

                const top = sorted.slice(0, 5);
                const remainder = sorted.slice(5);
                if (remainder.length > 0) {
                    const otherTotal = remainder.reduce((sum, item) => sum + item.value, 0);
                    top.push({ name: 'Other', value: Math.round(otherTotal * 100) / 100 });
                }

                setSegments(top);
            } catch (error) {
                console.error('Failed to fetch category breakdown', error);
                setSegments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [selectedDate, viewMode]);

    const total = useMemo(() => segments.reduce((sum, item) => sum + item.value, 0), [segments]);

    const valueFormatter = (value) => (formatCurrency ? formatCurrency(value) : defaultFormatter(value));

    return (
        <div className="rounded-3xl bg-white/90 border border-[#04362c]/10 shadow-2xl p-6 lg:p-8 text-[#04362c]">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                    <h3 className="text-2xl font-semibold">Category Allocation</h3>
                    <p className="text-[#04362c]/70 text-sm">
                        Top spending categories for this {viewMode === 'yearly' ? 'year' : 'month'}
                    </p>
                </div>
                {!loading && (
                    <div className="rounded-full bg-[#f5faf8] border border-[#04362c]/10 px-4 py-2 text-sm">
                        Total tracked: {valueFormatter(total)}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                <div className="lg:col-span-3 h-[22rem]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-[#04362c]/80 text-base">Crunching categories...</p>
                        </div>
                    ) : segments.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-[#04362c]/60 text-base">No expenses during this period.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={segments}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius="55%"
                                    outerRadius="85%"
                                    paddingAngle={4}
                                >
                                    {segments.map((entry, index) => (
                                        <Cell
                                            key={entry.name}
                                            fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                                            stroke="transparent"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [valueFormatter(value), name]}
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(4,54,44,0.08)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="rounded-2xl bg-[#f5faf8] border border-[#04362c]/10 p-4">
                            <p className="text-[#04362c]/70 text-sm">Preparing breakdown...</p>
                        </div>
                    ) : (
                        segments.map((segment, index) => {
                            const percentage = total > 0 ? Math.round((segment.value / total) * 100) : 0;
                            return (
                                <div
                                    key={segment.name}
                                    className="rounded-2xl border border-[#04362c]/10 p-4 bg-white"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="inline-block w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                                            />
                                            <div>
                                                <p className="text-sm font-semibold">{segment.name}</p>
                                                <p className="text-xs text-[#04362c]/60">{percentage}% of tracked spend</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-semibold">{valueFormatter(segment.value)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

