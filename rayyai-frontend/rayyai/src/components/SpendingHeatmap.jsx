import React, { useMemo, useState } from "react";
import { Calendar, TrendingUp, TrendingDown, X } from "lucide-react";

/**
 * SpendingHeatmap Component
 * Displays a calendar-style heatmap showing daily spending intensity
 * Similar to GitHub's contribution graph but for financial data
 *
 * If startDate/endDate are provided, the heatmap respects that period.
 * Otherwise, it falls back to the last 90 days.
 */
export default function SpendingHeatmap({
  transactions = [],
  isLoading = false,
  startDate,
  endDate,
  periodLabel = "selected period",
}) {
  const [selectedDate, setSelectedDate] = useState(null);
  // Normalised period range used throughout the component
  const period = useMemo(() => {
    const today = endDate ? new Date(endDate) : new Date();
    const end = new Date(today.toDateString()); // strip time

    let start;
    if (startDate) {
      start = new Date(new Date(startDate).toDateString());
    } else {
      // Default to the last 90 days if no explicit period is given
      start = new Date(end);
      start.setDate(start.getDate() - 89);
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const days =
      Math.max(
        1,
        Math.round((+end - +start) / msPerDay) + 1
      );

    return { start, end, days };
  }, [startDate, endDate]);

  // Generate daily spending data for the selected period
  const heatmapData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // Initialize all days with zero spending
    const dailySpending = {};
    for (let i = 0; i < period.days; i++) {
      const date = new Date(period.start);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];
      dailySpending[dateKey] = {
        date: dateKey,
        amount: 0,
        count: 0,
        dayOfWeek: date.getDay(),
      };
    }

    // Aggregate spending by date
    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") return;

      const transactionDate = new Date(transaction.date || transaction.transaction_date);
      if (transactionDate < period.start || transactionDate > period.end) return;

      const dateKey = transactionDate.toISOString().split("T")[0];
      if (dailySpending[dateKey]) {
        dailySpending[dateKey].amount += Math.abs(transaction.amount || 0);
        dailySpending[dateKey].count += 1;
      }
    });

    // Convert to array and calculate intensity levels
    const dataArray = Object.values(dailySpending);
    const amounts = dataArray.map((d) => d.amount).filter((a) => a > 0);
    const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

    // Calculate intensity (0-4 scale)
    return dataArray.map((day) => {
      let intensity = 0;
      if (day.amount > 0) {
        if (maxAmount > 0) {
          const ratio = day.amount / maxAmount;
          if (ratio >= 0.8) intensity = 4;
          else if (ratio >= 0.6) intensity = 3;
          else if (ratio >= 0.4) intensity = 2;
          else if (ratio >= 0.2) intensity = 1;
          else intensity = 1;
        }
      }
      return {
        ...day,
        intensity,
      };
    });
  }, [transactions, period]);

  // Group data by weeks for display (properly aligned by day of week)
  const weeksData = useMemo(() => {
    if (heatmapData.length === 0) return [];

    // Group by week, ensuring proper day-of-week alignment
    const weeks = [];
    let currentWeek = [];
    
    heatmapData.forEach((day, index) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      // If this is the first day and it's not Sunday, pad with empty days
      if (index === 0 && dayOfWeek !== 0) {
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push(null); // Empty day placeholder
        }
      }
      
      currentWeek.push(day);
      
      // If we've completed a week (7 days) or this is the last day
      if (currentWeek.length === 7 || index === heatmapData.length - 1) {
        // Pad the last week if needed
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return weeks;
  }, [heatmapData]);

  // Calculate insights
  const insights = useMemo(() => {
    const daysWithSpending = heatmapData.filter((d) => d.amount > 0).length;
    const totalSpending = heatmapData.reduce((sum, d) => sum + d.amount, 0);
    const avgDailySpending = daysWithSpending > 0 ? totalSpending / daysWithSpending : 0;
    const maxDay = heatmapData.reduce(
      (max, d) => (d.amount > max.amount ? d : max),
      { amount: 0, date: "" }
    );

    // Find most active day of week
    const dayOfWeekSpending = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    heatmapData.forEach((day) => {
      if (day.amount > 0) {
        dayOfWeekSpending[day.dayOfWeek] += day.amount;
      }
    });
    const mostActiveDayIndex = dayOfWeekSpending.indexOf(Math.max(...dayOfWeekSpending));
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return {
      daysWithSpending,
      totalSpending,
      avgDailySpending,
      maxDay,
      mostActiveDay: dayNames[mostActiveDayIndex],
    };
  }, [heatmapData]);

  // Get color based on intensity
  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 0:
        return "bg-black/5"; // No spending
      case 1:
        return "bg-[#d9f4ed]"; // Light spending
      case 2:
        return "bg-[#a8e6d5]"; // Moderate spending
      case 3:
        return "bg-[#6f948d]"; // High spending
      case 4:
        return "bg-[#04362c]"; // Very high spending
      default:
        return "bg-black/5";
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    const numeric = Number(amount);
    if (Number.isNaN(numeric)) return "RM 0";
    try {
      return new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency: "MYR",
        maximumFractionDigits: 0,
      })
        .format(numeric)
        .replace("RM", "RM ");
    } catch {
      return `RM ${numeric.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  // Format full date
  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Get transactions for selected date
  const selectedDateTransactions = useMemo(() => {
    if (!selectedDate) return [];
    
    return transactions.filter((transaction) => {
      if (transaction.type !== "expense") return false;
      
      const transactionDate = new Date(transaction.date || transaction.transaction_date);
      const selected = new Date(selectedDate);
      
      // Compare dates (ignore time)
      return (
        transactionDate.getFullYear() === selected.getFullYear() &&
        transactionDate.getMonth() === selected.getMonth() &&
        transactionDate.getDate() === selected.getDate()
      );
    });
  }, [selectedDate, transactions]);

  // Get day labels for the first week
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0DAD8D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black/70 text-lg">Loading spending patterns...</p>
        </div>
      </div>
    );
  }

  if (heatmapData.length === 0 || insights.daysWithSpending === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-black/40" />
        <p className="text-black/70 text-lg">No spending data available</p>
        <p className="text-black/50 text-sm mt-2">Add transactions to see your spending patterns</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insights Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/50 rounded-xl p-4 border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#0DAD8D]" />
            <span className="text-xs font-medium text-black/60 uppercase tracking-wide">Active Days</span>
          </div>
          <p className="text-2xl font-semibold text-[#04362c]">{insights.daysWithSpending}</p>
          <p className="text-xs text-black/50 mt-1">
            of {period.days} day{period.days !== 1 ? "s" : ""} with spending
          </p>
        </div>

        <div className="bg-white/50 rounded-xl p-4 border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#0DAD8D]" />
            <span className="text-xs font-medium text-black/60 uppercase tracking-wide">Total Spending</span>
          </div>
          <p className="text-2xl font-semibold text-[#04362c]">{formatCurrency(insights.totalSpending)}</p>
          <p className="text-xs text-black/50 mt-1">
            {periodLabel === "selected period" ? "Selected period" : periodLabel}
          </p>
        </div>

        <div className="bg-white/50 rounded-xl p-4 border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-[#0DAD8D]" />
            <span className="text-xs font-medium text-black/60 uppercase tracking-wide">Avg Daily</span>
          </div>
          <p className="text-2xl font-semibold text-[#04362c]">{formatCurrency(insights.avgDailySpending)}</p>
          <p className="text-xs text-black/50 mt-1">On active days</p>
        </div>

        <div className="bg-white/50 rounded-xl p-4 border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#0DAD8D]" />
            <span className="text-xs font-medium text-black/60 uppercase tracking-wide">Peak Day</span>
          </div>
          <p className="text-2xl font-semibold text-[#04362c]">{formatCurrency(insights.maxDay.amount)}</p>
          <p className="text-xs text-black/50 mt-1">{formatDate(insights.maxDay.date)}</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="bg-white rounded-xl p-6 border border-black/5 shadow-sm w-full min-h-[260px]">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-[#04362c] mb-1">Spending Intensity</h4>
          <p className="text-sm text-black/60">
            Daily spending across all accounts for{" "}
            {periodLabel === "selected period" ? "the selected period" : periodLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 pb-4 w-full max-w-full items-start">
          {/* Day labels */}
          <div className="flex flex-col gap-1 pt-7 w-6 sm:w-7 lg:w-8">
            {dayLabels.map((label, idx) => (
              <div
                key={idx}
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 flex items-center justify-center text-[10px] text-black/40 font-medium"
              >
                {idx % 2 === 0 ? label : ""}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeksData.map((week, weekIdx) => {
            // Find first non-null day for week label
            const firstDay = week.find(d => d !== null);
            
            return (
              <div key={weekIdx} className="flex flex-col gap-1">
                {/* Week label (show for first week and every 4th week) */}
                {weekIdx === 0 || weekIdx % 4 === 0 ? (
                  <div className="h-6 text-[10px] text-black/40 font-medium mb-1">
                    {firstDay ? formatDate(firstDay.date) : ""}
                  </div>
                ) : (
                  <div className="h-6"></div>
                )}

                {/* Days in week */}
                {week.map((day, dayIdx) => {
                  if (day === null) {
                    // Empty day placeholder
                    return (
                      <div
                        key={`${weekIdx}-${dayIdx}-empty`}
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 rounded-sm bg-transparent"
                      />
                    );
                  }

                  const date = new Date(day.date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const tooltipText = day.amount > 0
                    ? `${formatDate(day.date)}: ${formatCurrency(day.amount)} (${day.count} transaction${day.count !== 1 ? 's' : ''})`
                    : `${formatDate(day.date)}: No spending`;

                  const isSelected = selectedDate === day.date;
                  
                  return (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      onClick={() => {
                        if (day.amount > 0) {
                          setSelectedDate(isSelected ? null : day.date);
                        }
                      }}
                      className={`group relative w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 rounded-sm ${getIntensityColor(day.intensity)} ${
                        isToday ? "ring-2 ring-[#0DAD8D] ring-offset-1" : ""
                      } ${isSelected ? "ring-2 ring-[#0DAD8D] ring-offset-1" : ""} ${
                        day.amount > 0 ? "cursor-pointer" : "cursor-default"
                      } transition-all hover:scale-110 hover:z-10`}
                      title={tooltipText}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#04362c] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20 transition-opacity">
                        {tooltipText}
                        {day.amount > 0 && <span className="block text-[10px] mt-1 text-white/80">Click to view transactions</span>}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#04362c]"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5">
          <div className="flex items-center gap-2 text-xs text-black/60">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-black/5"></div>
              <div className="w-3 h-3 rounded-sm bg-[#d9f4ed]"></div>
              <div className="w-3 h-3 rounded-sm bg-[#a8e6d5]"></div>
              <div className="w-3 h-3 rounded-sm bg-[#6f948d]"></div>
              <div className="w-3 h-3 rounded-sm bg-[#04362c]"></div>
            </div>
            <span>More</span>
          </div>
          <div className="text-xs text-black/50">
            {insights.mostActiveDay} is your most active spending day
          </div>
        </div>
      </div>

      {/* Transaction Details for Selected Date */}
      {selectedDate && selectedDateTransactions.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-black/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-[#04362c]">
                Transactions on {formatFullDate(selectedDate)}
              </h4>
              <p className="text-sm text-black/60 mt-1">
                {selectedDateTransactions.length} transaction{selectedDateTransactions.length !== 1 ? 's' : ''} • {formatCurrency(
                  selectedDateTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
                )}
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              aria-label="Close transaction details"
            >
              <X className="w-5 h-5 text-black/60" />
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDateTransactions
              .sort((a, b) => {
                // Sort by amount (descending) then by description
                const amountA = Math.abs(a.amount || 0);
                const amountB = Math.abs(b.amount || 0);
                if (amountB !== amountA) return amountB - amountA;
                return (a.description || '').localeCompare(b.description || '');
              })
              .map((transaction, idx) => {
                const amount = Math.abs(transaction.amount || 0);
                const category = transaction.category || 'Uncategorized';
                const description = transaction.description || transaction.seller || 'No description';
                const account = transaction.account_name || transaction.account || 'Unknown account';

                return (
                  <div
                    key={transaction.expense_id || transaction.transaction_id || idx}
                    className="flex items-center justify-between p-4 bg-black/2 rounded-lg border border-black/5 hover:bg-black/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-[#04362c] truncate">{description}</p>
                        {category && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-[#eef6f4] text-[#04362c] rounded-full whitespace-nowrap">
                            {category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-black/60">{account}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-lg font-semibold text-[#04362c]">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {selectedDate && selectedDateTransactions.length === 0 && (
        <div className="bg-white rounded-xl p-6 border border-black/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-[#04362c]">
                Transactions on {formatFullDate(selectedDate)}
              </h4>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              aria-label="Close transaction details"
            >
              <X className="w-5 h-5 text-black/60" />
            </button>
          </div>
          <p className="text-black/60 text-center py-4">No transactions found for this date.</p>
        </div>
      )}
    </div>
  );
}

