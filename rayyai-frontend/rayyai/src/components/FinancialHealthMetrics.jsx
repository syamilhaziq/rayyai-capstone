import { useMemo } from "react";
import Progress from "./Progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Info } from "lucide-react";

// Clamp helper keeps scores bounded to 0-100 for consistent progress bars
const clampScore = (value) => {
    if (Number.isNaN(value) || value === null || value === undefined) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
};

// Basic formatter used for insight copy when we surface currency values
const formatCurrency = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "RM 0";
    try {
        const formatted = new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            maximumFractionDigits: 0,
        }).format(numeric);
        return formatted.replace("RM", "RM ").replace(/\s+/, " ");
    } catch {
        return `RM ${numeric.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
    }
};

export default function FinancialHealthMetrics({
    metrics,
    budget,
    loading,
    viewMode,
}) {
    // Pull the subset of metrics that this widget cares about. Everything else is ignored
    // so that the component remains resilient to shape changes upstream.
    const {
        totalIncome = 0,
        totalSpending = 0,
        netCashFlow = 0,
        needsPercent = 0,
        wantsPercent = 0,
        runwayDays = null,
        averageDailySpending = 0,
        burnRateDelta = 0,
    } = metrics || {};

    const budgetAmount = budget?.amount ?? null;
    const budgetSpent = budget?.active?.spent ?? null;
    const budgetPercentage = budget?.active?.percentage ?? null;

    // Compose the five pillar scores used to render the stacked list of progress bars.
    // Each score is derived from real metrics and run through `clampScore` so we keep
    // the visualisation stable even when data is missing or skewed.
    const metricSeries = useMemo(() => {
        if (loading) {
            return [
                { name: "Spending Control", value: 0, color: "bg-[#63b0a0]" },
                { name: "Savings Rate", value: 0, color: "bg-[#6f948d]" },
                { name: "Needs vs Wants", value: 0, color: "bg-[#0DAD8D]" },
                { name: "Budget Adherence", value: 0, color: "bg-[#55cdb5]" },
                { name: "Runway", value: 0, color: "bg-[#4f9b8b]" },
            ];
        }

        // Spending Control: Based on wants% but heavily penalized if cash flow is negative
        // If net cash flow is negative, spending control cannot be high regardless of wants%
        let spendingControlScore = 0; // Default: no data
        let hasSpendingControlData = false;
        
        // Check if there's any data at all
        const hasNoData = totalIncome === 0 && totalSpending === 0;
        
        if (hasNoData) {
            // No data at all - spending control should be 0
            spendingControlScore = 0;
            hasSpendingControlData = false;
        } else if (netCashFlow < 0) {
            hasSpendingControlData = true;
            // Negative cash flow = poor spending control, regardless of wants percentage
            // The more negative, the worse the score
            const deficitPercent = totalIncome > 0 ? Math.abs(netCashFlow / totalIncome) * 100 : 100;
            if (deficitPercent > 30) {
                // Critical: Spending exceeds income by more than 30%
                spendingControlScore = clampScore(Math.max(0, 20 - (deficitPercent - 30) * 0.5));
            } else if (deficitPercent > 15) {
                // Poor: Spending exceeds income by 15-30%
                spendingControlScore = clampScore(20 + (30 - deficitPercent) * 0.67);
            } else {
                // Warning: Spending exceeds income by up to 15%
                spendingControlScore = clampScore(30 + (15 - deficitPercent) * 1.33);
            }
            // Further penalize if wants% is also high
            if (wantsPercent > 40) {
                spendingControlScore = clampScore(spendingControlScore - 10);
            }
        } else if (wantsPercent !== undefined && wantsPercent !== null) {
            // Positive or neutral cash flow - use wants% as primary indicator
            // Lower wants% = better control
            hasSpendingControlData = true;
            const baseScore = 100 - wantsPercent;
            if (wantsPercent <= 25) {
                // Excellent: Very low discretionary spending
                spendingControlScore = clampScore(85 + (25 - wantsPercent) * 0.6);
            } else if (wantsPercent <= 35) {
                // Good: Low discretionary spending
                spendingControlScore = clampScore(70 + (35 - wantsPercent) * 1.5);
            } else if (wantsPercent <= 45) {
                // Acceptable: Moderate discretionary spending
                spendingControlScore = clampScore(50 + (45 - wantsPercent) * 2);
            } else if (wantsPercent <= 55) {
                // Concerning: High discretionary spending
                spendingControlScore = clampScore(30 + (55 - wantsPercent) * 2);
            } else {
                // Poor: Very high discretionary spending
                spendingControlScore = clampScore(Math.max(0, 30 - (wantsPercent - 55) * 1.5));
            }
        }

        // Savings Rate: More critical scoring - negative cash flow heavily penalized
        let savingsRateScore = 0; // Default: no data
        let hasSavingsRateData = false;
        if (totalIncome > 0) {
            hasSavingsRateData = true;
            const savingsRatePercent = (netCashFlow / totalIncome) * 100;
            if (savingsRatePercent >= 30) {
                // Excellent: 30%+ savings rate
                savingsRateScore = clampScore(90 + (savingsRatePercent - 30) * 0.33);
            } else if (savingsRatePercent >= 20) {
                // Very Good: 20-30% savings rate
                savingsRateScore = clampScore(80 + (savingsRatePercent - 20) * 1);
            } else if (savingsRatePercent >= 10) {
                // Good: 10-20% savings rate
                savingsRateScore = clampScore(65 + (savingsRatePercent - 10) * 1.5);
            } else if (savingsRatePercent >= 5) {
                // Acceptable: 5-10% savings rate
                savingsRateScore = clampScore(50 + (savingsRatePercent - 5) * 3);
            } else if (savingsRatePercent >= 0) {
                // Warning: 0-5% savings rate (barely breaking even)
                savingsRateScore = clampScore(30 + savingsRatePercent * 4);
            } else if (savingsRatePercent >= -10) {
                // Poor: -10% to 0% (spending exceeds income by up to 10%)
                savingsRateScore = clampScore(30 + savingsRatePercent * 2);
            } else if (savingsRatePercent >= -25) {
                // Critical: -25% to -10% (spending exceeds income by 10-25%)
                savingsRateScore = clampScore(10 + (savingsRatePercent + 10) * 1.33);
            } else {
                // Severe: Spending exceeds income by more than 25%
                savingsRateScore = clampScore(Math.max(0, 10 + (savingsRatePercent + 25) * 0.4));
            }
        } else if (totalIncome === 0 && totalSpending > 0) {
            // No income but spending exists = critical situation
            savingsRateScore = 0;
        } else if (totalIncome === 0 && totalSpending === 0) {
            // No data
            savingsRateScore = 0;
        }

        // Needs vs Wants: More critical scoring - ideal range is 60-70%
        let needsVsWantsScore = 0; // Default: no data
        let hasNeedsVsWantsData = false;
        // Only calculate if we have spending data and needsPercent is meaningful
        // If totalSpending is 0, we don't have enough data to calculate this metric
        if (needsPercent !== undefined && needsPercent !== null && totalSpending > 0) {
            if (needsPercent >= 75) {
                // Too high: Might indicate financial stress or lack of flexibility
                needsVsWantsScore = clampScore(60 + (needsPercent - 75) * 0.4);
            } else if (needsPercent >= 70) {
                // Upper ideal: 70-75%
                needsVsWantsScore = clampScore(75 + (needsPercent - 70) * 1);
            } else if (needsPercent >= 60) {
                // Ideal range: 60-70%
                needsVsWantsScore = clampScore(85 + (needsPercent - 60) * 1.5);
            } else if (needsPercent >= 50) {
                // Acceptable: 50-60%
                needsVsWantsScore = clampScore(60 + (needsPercent - 50) * 2.5);
            } else if (needsPercent >= 40) {
                // Concerning: 40-50% (too much discretionary spending)
                needsVsWantsScore = clampScore(30 + (needsPercent - 40) * 3);
            } else {
                // Critical: Less than 40% on needs (excessive discretionary spending)
                needsVsWantsScore = clampScore(Math.max(0, needsPercent * 0.75));
            }
            // Only mark as having data if the calculated score is greater than 0
            // For consistency, if the result is 0%, show "not enough data"
            if (needsVsWantsScore > 0) {
                hasNeedsVsWantsData = true;
            }
        }
        // If we didn't enter the if block above or score is 0%, hasNeedsVsWantsData remains false (no data)

        // Budget adherence: More critical scoring - stricter penalties for overages
        let budgetAdherenceScore = 0; // Default: no data when no budget set
        let hasBudgetAdherenceData = false;
        if (budgetAmount !== null && budgetAmount > 0) {
            hasBudgetAdherenceData = true;
            // Use category-specific spending from backend if available, otherwise fall back to total spending
            const spendingForBudget = budgetSpent !== null ? budgetSpent : totalSpending;
            const utilization = spendingForBudget / budgetAmount;
            if (utilization <= 0.7) {
                // Excellent: Under 70% of budget
                budgetAdherenceScore = clampScore(90 + (0.7 - utilization) * 14.3);
            } else if (utilization <= 0.85) {
                // Very Good: 70-85% of budget
                budgetAdherenceScore = clampScore(80 + (0.85 - utilization) * 66.7);
            } else if (utilization <= 1.0) {
                // Good: 85-100% of budget
                budgetAdherenceScore = clampScore(70 + (1.0 - utilization) * 66.7);
            } else if (utilization <= 1.1) {
                // Warning: 100-110% of budget (slight overage)
                budgetAdherenceScore = clampScore(60 - (utilization - 1.0) * 100);
            } else if (utilization <= 1.25) {
                // Poor: 110-125% of budget
                budgetAdherenceScore = clampScore(50 - (utilization - 1.1) * 133.3);
            } else if (utilization <= 1.5) {
                // Critical: 125-150% of budget
                budgetAdherenceScore = clampScore(30 - (utilization - 1.25) * 80);
            } else {
                // Severe: Over 150% of budget
                budgetAdherenceScore = clampScore(Math.max(0, 10 - (utilization - 1.5) * 20));
            }
        }

        // Runway: More critical scoring, especially for negative scenarios
        let runwayScore = 0; // Default: no data
        let hasRunwayData = false;
        if (budgetAmount !== null && budgetAmount > 0) {
            if (runwayDays === null) {
                // Can't calculate runway - use spending pattern as proxy
                if (averageDailySpending > 0) {
                    hasRunwayData = true;
                    const daysToBudget = budgetAmount / averageDailySpending;
                    if (daysToBudget > 30) {
                        runwayScore = 80;
                    } else if (daysToBudget > 15) {
                        runwayScore = 60;
                    } else if (daysToBudget > 0) {
                        runwayScore = clampScore(daysToBudget * 2);
                    } else {
                        runwayScore = 0; // Already exceeded budget
                        hasRunwayData = true; // Still has data, just calculated as 0
                    }
                } else {
                    runwayScore = 0; // No spending data - not enough data
                    hasRunwayData = false;
                }
            } else {
                // Runway calculated
                hasRunwayData = true;
                if (runwayDays < 0) {
                    // Already exceeded budget - critical
                    runwayScore = 0;
                } else if (runwayDays === 0) {
                    // Exactly at budget limit
                    runwayScore = 10;
                } else if (runwayDays <= 7) {
                    // Critical: Less than a week
                    runwayScore = clampScore(runwayDays * 2);
                } else if (runwayDays <= 15) {
                    // Warning: 1-2 weeks
                    runwayScore = clampScore(20 + (runwayDays - 7) * 3);
                } else if (runwayDays <= 30) {
                    // Good: 2-4 weeks
                    runwayScore = clampScore(50 + (runwayDays - 15) * 2);
                } else {
                    // Excellent: More than a month
                    runwayScore = clampScore(80 + Math.min(20, (runwayDays - 30) * 0.67));
                }
            }
        } else {
            // No budget set - use spending pattern
            if (averageDailySpending > 0 && totalIncome > 0) {
                hasRunwayData = true;
                const monthlyIncome = viewMode === 'yearly' ? totalIncome / 12 : totalIncome;
                const daysToIncome = monthlyIncome / averageDailySpending;
                if (daysToIncome > 30) {
                    runwayScore = 70;
                } else if (daysToIncome > 15) {
                    runwayScore = 50;
                } else if (daysToIncome > 0) {
                    runwayScore = clampScore(daysToIncome * 2);
                } else {
                    runwayScore = 0; // Spending exceeds income
                }
            } else {
                runwayScore = 0; // No data
                hasRunwayData = false;
            }
        }

        // Metric definitions for tooltips (layman-friendly)
        const metricDefinitions = {
            "Spending Control": "How well you control your non-essential spending. If you're spending more than you earn, this score will be low even if you're cutting back on wants.",
            "Savings Rate": "How much money you're saving compared to what you earn. If this is negative, you're spending more than your income. Aim for saving at least 20% of your income.",
            "Needs vs Wants": "The balance between must-have expenses (like rent and groceries) and nice-to-have expenses (like entertainment). Ideally, 60-70% should go to needs, 30-40% to wants.",
            "Budget Adherence": "How well you're sticking to your budget. If you're spending more than your budget, this score goes down. Staying under 85% of your budget is excellent.",
            "Runway Readiness": "How many days you have before you run out of money based on your current spending. Less than 7 days is critical - you need to reduce spending immediately.",
        };

        return [
            { name: "Spending Control", value: spendingControlScore, color: "bg-[#63b0a0]", definition: metricDefinitions["Spending Control"], hasData: hasSpendingControlData },
            { name: "Savings Rate", value: savingsRateScore, color: "bg-[#6f948d]", definition: metricDefinitions["Savings Rate"], hasData: hasSavingsRateData },
            { name: "Needs vs Wants", value: needsVsWantsScore, color: "bg-[#0DAD8D]", definition: metricDefinitions["Needs vs Wants"], hasData: hasNeedsVsWantsData },
            { name: "Budget Adherence", value: budgetAdherenceScore, color: "bg-[#55cdb5]", definition: metricDefinitions["Budget Adherence"], hasData: hasBudgetAdherenceData },
            { name: "Runway Readiness", value: runwayScore, color: "bg-[#4f9b8b]", definition: metricDefinitions["Runway Readiness"], hasData: hasRunwayData },
        ];
    }, [
        loading,
        wantsPercent,
        totalIncome,
        netCashFlow,
        needsPercent,
        budgetAmount,
        totalSpending,
        runwayDays,
        averageDailySpending,
        viewMode,
    ]);

    // Aggregate the five pillars into a single index number surfaced at the bottom.
    const overallScore = useMemo(() => {
        if (metricSeries.length === 0) return 0;
        const sum = metricSeries.reduce((acc, item) => acc + item.value, 0);
        return Math.round(sum / metricSeries.length);
    }, [metricSeries]);

    // Generate accompanying narrative that references whichever datapoints are most
    // noteworthy for the selected window. Each branch adds optional context so the
    // copy reads like a cohesive paragraph.
    const aiInsight = useMemo(() => {
        if (loading) {
            return {
                title: "Analyzing your fundamentals...",
                body: "Crunching the latest transactions and budgets to surface targeted guidance.",
            };
        }

        // Check if there's no data at all
        const hasNoData = totalIncome === 0 && totalSpending === 0;
        if (hasNoData) {
            return {
                tone: "balanced",
                preface: null,
                body: "No insights available. Add transactions or upload statements to see your financial health metrics.",
            };
        }

        const insights = [];

        // Only show positive discipline messages if cash flow is not negative
        // Negative cash flow overrides positive spending patterns
        if (netCashFlow < 0) {
            // When cash flow is negative, focus on the deficit first
            // Don't praise discipline when spending exceeds income
        } else {
            // Only show positive messages when cash flow is neutral or positive
        if (wantsPercent >= 50) {
            insights.push(
                `Discretionary spending sits at ${wantsPercent}% of total outflows. Bringing it closer to 40% would unlock extra savings.`
            );
        } else if (wantsPercent <= 30 && needsPercent >= 65 && overallScore >= 75) {
            // More strict criteria for "strong discipline": 
            // - Wants <= 30% (very low discretionary spending)
            // - Needs >= 65% (high essential spending ratio)
            // - Overall score >= 75 (strong performance across all metrics)
            insights.push(
                `Strong discipline: essentials account for ${needsPercent}% of spend with only ${wantsPercent}% on wants, leaving room to allocate more to savings goals.`
            );
            }
        }

        // Prioritize negative cash flow warnings - this is the most critical metric
        if (netCashFlow < 0) {
            const deficit = Math.abs(netCashFlow);
            const deficitPercent = totalIncome > 0 ? (deficit / totalIncome) * 100 : 0;
            
            // When cash flow is negative, spending discipline is secondary to the deficit
            if (wantsPercent >= 50) {
                insights.push(
                    `Critical: Negative cash flow of ${formatCurrency(netCashFlow)} combined with high discretionary spending (${wantsPercent}% wants). Immediate reduction in non-essential expenses required.`
                );
            } else if (deficitPercent > 30) {
                insights.push(
                    `Critical: Net cash flow is negative at ${formatCurrency(netCashFlow)} (spending exceeds income by ${deficitPercent.toFixed(0)}%). Immediate action required to reduce expenses or increase income.`
                );
            } else if (deficitPercent > 15) {
                insights.push(
                    `Warning: Net cash flow is negative at ${formatCurrency(netCashFlow)} (${deficitPercent.toFixed(0)}% deficit). Focus on reducing discretionary spending and finding additional income sources.`
                );
            } else {
            insights.push(
                `Net cash flow is negative at ${formatCurrency(netCashFlow)} this ${viewMode === 'yearly' ? 'year' : 'month'}. Consider trimming variable costs or accelerating income.`
            );
            }
        } else if (netCashFlow > 0) {
            const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
            // Only use "excellent" if overall score is 85+ AND savings rate is exceptional
            if (savingsRate >= 30 && overallScore >= 85) {
                insights.push(
                    `Excellent: Positive net cash flow of ${formatCurrency(netCashFlow)} (${savingsRate.toFixed(0)}% savings rate). Strong financial position—consider investing surplus or building emergency reserves.`
                );
            } else if (savingsRate >= 20) {
                insights.push(
                    `Strong: Positive net cash flow of ${formatCurrency(netCashFlow)} (${savingsRate.toFixed(0)}% savings rate). Deploy surplus toward goals or emergency reserves.`
                );
            } else if (savingsRate >= 10) {
                insights.push(
                    `Good: Positive net cash flow of ${formatCurrency(netCashFlow)} (${savingsRate.toFixed(0)}% savings rate). Deploy surplus toward goals or emergency reserves.`
                );
            } else {
                insights.push(
                    `Positive net cash flow of ${formatCurrency(netCashFlow)}. Deploy surplus toward goals or emergency reserves.`
                );
            }
        } else {
            // netCashFlow === 0
            insights.push(
                `Net cash flow is balanced (income equals spending). Consider building a buffer by reducing expenses or increasing income.`
            );
        }

        if (budgetAmount !== null) {
            const utilization = totalSpending / budgetAmount;
            if (runwayDays !== null) {
                if (runwayDays < 0) {
                    insights.push(
                        `Budget exceeded by ${formatCurrency(totalSpending - budgetAmount)}. Immediate spending freeze recommended.`
                    );
                } else if (runwayDays === 0) {
                    insights.push(
                        `At budget limit of ${formatCurrency(budgetAmount)}. Any further spending will exceed the target.`
                    );
                } else if (runwayDays < 7) {
                    insights.push(
                        `Critical: Budget runway is only ${runwayDays} day${runwayDays === 1 ? '' : 's'} before exceeding the ${formatCurrency(budgetAmount)} target. Reduce spending immediately.`
                    );
                } else if (runwayDays < 15) {
                    insights.push(
                        `Warning: Budget runway is thin at ${runwayDays} day${runwayDays === 1 ? '' : 's'} before crossing the ${formatCurrency(budgetAmount)} target.`
                    );
                } else {
                    insights.push(
                        `Projected runway of ${runwayDays} day${runwayDays === 1 ? '' : 's'} before hitting the ${formatCurrency(budgetAmount)} ceiling.`
                    );
                }
            } else if (utilization >= 1.5) {
                insights.push(
                    `Critical: Spending has exceeded budget by ${((utilization - 1) * 100).toFixed(0)}% (${formatCurrency(totalSpending - budgetAmount)} over). Immediate action required.`
                );
            } else if (utilization >= 1.2) {
                insights.push(
                    `Warning: Spending has exceeded budget by ${((utilization - 1) * 100).toFixed(0)}% (${formatCurrency(totalSpending - budgetAmount)} over). Focus on essentials only.`
                );
            } else if (utilization >= 1.0) {
                insights.push(
                    `Spending has reached the ${formatCurrency(budgetAmount)} budget. Focus the remainder of the period on essentials.`
                );
            } else if (utilization >= 0.8) {
                insights.push(
                    `You're pacing at ${(utilization * 100).toFixed(0)}% of the ${formatCurrency(budgetAmount)} budget. Maintain current cadence to finish strong.`
                );
            } else if (utilization < 0.6) {
                // Only use "excellent" if overall score is 85+ AND budget adherence is exceptional
                if (overallScore >= 85) {
                    insights.push(
                        `Excellent: You're pacing well under budget at ${(utilization * 100).toFixed(0)}% of the ${formatCurrency(budgetAmount)} target.`
                    );
                } else {
                    insights.push(
                        `Strong: You're pacing well under budget at ${(utilization * 100).toFixed(0)}% of the ${formatCurrency(budgetAmount)} target.`
                    );
                }
            } else {
                insights.push(
                    `Good: You're pacing well under budget at ${(utilization * 100).toFixed(0)}% of the ${formatCurrency(budgetAmount)} target.`
                );
            }
        } else {
            insights.push(
                "Set a monthly budget target to unlock runway tracking and adherence scoring."
            );
        }

        if (burnRateDelta !== null && burnRateDelta !== undefined && Math.abs(burnRateDelta) >= 8) {
            insights.push(
                `Daily burn shifted ${burnRateDelta > 0 ? 'up' : 'down'} ${Math.abs(Math.round(burnRateDelta))}% compared to the previous period.`
            );
        }

        // More critical thresholds for tone classification
        let tone = "balanced";
        if (overallScore >= 85) {
            // Only truly excellent scores get celebratory tone
            tone = "celebratory";
        } else if (overallScore >= 70) {
            // Balanced requires at least 70 (was 60)
            tone = "balanced";
        } else if (overallScore >= 50) {
            // Cautious starts at 50 (was 40)
            tone = "cautious";
        } else {
            // Critical for scores below 50 (was 40)
            tone = "critical";
        }

        const toneMessages = {
            celebratory: "Strong financial footing—keep compounding the wins.",
            balanced: "Solid standing—fine-tune these levers to stay ahead.",
            cautious: "Momentum is stalling—tighten the high-impact areas.",
            critical: "Financial stress is mounting—act decisively to steady the ship.",
        };

        return {
            tone,
            preface: toneMessages[tone],
            body: insights.join(" "),
        };
    }, [
        loading,
        wantsPercent,
        needsPercent,
        netCashFlow,
        viewMode,
        budgetAmount,
        runwayDays,
        totalSpending,
        totalIncome,
        burnRateDelta,
        overallScore,
    ]);

    return (
        <div className="h-full">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-[#04362c]/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:bg-white h-full flex flex-col text-[#04362c]">
                <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold">Financial Health Metrics</h3>
                </div>
                <div className="space-y-6 flex-1">
                    {/* Render each pillar with its own progress bar and headline score */}
                    {metricSeries.map((metric) => (
                        <div key={metric.name}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex items-center gap-1 text-base sm:text-lg font-medium hover:text-[#0DAD8D] transition-colors cursor-help"
                                            >
                                                {metric.name}
                                                <Info className="h-4 w-4 text-[#04362c]/60" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            className="max-w-xs bg-[#04362c] text-white p-3 text-sm leading-relaxed z-50"
                                            side="right"
                                            sideOffset={8}
                                        >
                                            <p className="font-semibold mb-1">{metric.name}</p>
                                            <p>{metric.definition}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="flex flex-col items-end">
                                    {!metric.hasData ? (
                                        <span className="text-sm text-[#04362c]/60 italic">Not enough data</span>
                                    ) : (
                                <span className="text-lg sm:text-xl font-bold">{metric.value}%</span>
                                    )}
                                </div>
                            </div>
                            <Progress value={metric.value} colorClass={metric.color} />
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t border-[#04362c]/20">
                    <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-xl font-medium">Overall Score</span>
                        <span className="text-2xl sm:text-3xl font-bold">{overallScore}</span>
                    </div>
                </div>
                <div className="mt-8">
                    <h4 className="text-lg sm:text-xl font-semibold">AI Insight</h4>
                    {aiInsight.preface && (
                        <p className="text-sm sm:text-base text-[#04362c]/70 mt-2 leading-relaxed italic">
                            {aiInsight.preface}
                        </p>
                    )}
                    <p className="text-base sm:text-lg mt-2 leading-relaxed">
                        {aiInsight.body}
                    </p>
                </div>
            </div>
        </div>
    );
}
