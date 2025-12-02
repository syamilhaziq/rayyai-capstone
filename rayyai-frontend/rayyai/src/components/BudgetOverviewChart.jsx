import { useEffect, useRef, useState, useMemo } from "react";
import { Plus, AlertTriangle, TrendingUp, TrendingDown, Lightbulb, CheckCircle2 } from "lucide-react";

export default function BudgetOverviewChart({ totalBudget, totalSpent, totalRemaining, formatCurrency, onAddClick }) {
    const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const actualSpentPercentage = totalSpent > totalBudget ? 100 : spentPercentage;
    const svgRef = useRef(null);
    const [waveOffset, setWaveOffset] = useState(0);
    const prevBudgetRef = useRef(totalBudget);
    const prevSpentRef = useRef(totalSpent);

    // Calculate trends based on previous values
    const allotmentTrend = useMemo(() => {
        const prev = prevBudgetRef.current;
        prevBudgetRef.current = totalBudget;
        if (prev === 0 || prev === totalBudget) return 'neutral';
        return totalBudget > prev ? 'up' : 'down';
    }, [totalBudget]);

    const usageTrend = useMemo(() => {
        const prev = prevSpentRef.current;
        prevSpentRef.current = totalSpent;
        if (prev === 0 && totalSpent === 0) return 'neutral';
        if (prev === totalSpent) return 'neutral';
        return totalSpent > prev ? 'up' : 'down';
    }, [totalSpent]);

    // Animate wave
    useEffect(() => {
        const interval = setInterval(() => {
            setWaveOffset(prev => (prev + 2) % 100);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const radius = 180;
    // Use actual spent percentage based on total budget
    // The liquid fill represents how much has been spent
    // User wants: if spent is 37%, the liquid should visually be 37% full (quarter to a bit more)
    // So we use the actual spent percentage directly for visual fill
    const spentFill = Math.min(actualSpentPercentage, 100); // Cap at 100%
    const baseFill = 15; // Minimum starting point at 15%
    // Ensure visual fill is at least 15% but matches the actual spent percentage
    const fillPercentage = Math.max(baseFill, spentFill); // At least 15%, use actual percentage for visual
    const fillHeight = (fillPercentage / 100) * (radius * 2);
    // Calculate display percentage: show the actual spent percentage (0-100%)
    const displayPercentage = Math.round(actualSpentPercentage);
    // Calculate the Y position of the liquid surface (from bottom)
    // In SVG: y=0 is top, y=360 is bottom
    // Liquid fills from bottom up, so liquidTopY is measured from top
    const liquidTopY = radius * 2 - fillHeight;

    // Generate bubbles within the liquid area
    // Adjusted for the new center position (187, 187 instead of 180, 180)
    const bubbles = useMemo(() => {
        const bubbleArray = [];
        const bubbleCount = 15;
        const centerX = 187; // New center X coordinate
        const centerY = 187; // New center Y coordinate
        const adjustedLiquidTopY = centerY - radius + (radius * 2 - fillHeight);
        
        for (let i = 0; i < bubbleCount; i++) {
            // Random position within the filled area
            const angle = Math.random() * Math.PI * 2;
            const maxDistance = Math.min(fillHeight * 0.4, radius * 0.8);
            const distance = Math.random() * maxDistance;
            const x = centerX + Math.cos(angle) * distance;
            // Y position should be in the liquid area (from adjustedLiquidTopY to bottom)
            const y = adjustedLiquidTopY + Math.random() * fillHeight;
            const size = 2 + Math.random() * 3;
            bubbleArray.push({ x, y, size });
        }
        return bubbleArray;
    }, [fillHeight, liquidTopY, fillPercentage]);

    // Create wavy path for liquid surface
    // Adjusted for the new center position (187, 187 instead of 180, 180)
    const createWavePath = () => {
        const centerX = 187; // New center X coordinate
        const centerY = 187; // New center Y coordinate
        const width = radius * 2;
        const segments = 30;
        const amplitude = 6;
        // Adjust liquidTopY for new center position
        const adjustedLiquidTopY = centerY - radius + (radius * 2 - fillHeight);
        let path = `M ${centerX - radius} ${centerY + radius}`; // Start from bottom left
        
        // Draw bottom edge
        path += ` L ${centerX + radius} ${centerY + radius}`;
        
        // Draw wavy top edge from right to left
        for (let i = segments; i >= 0; i--) {
            const x = centerX - radius + (i / segments) * width;
            const y = adjustedLiquidTopY + Math.sin((i / segments) * Math.PI * 4 + (waveOffset / 100) * Math.PI * 2) * amplitude;
            path += ` L ${x} ${y}`;
        }
        
        path += ` Z`; // Close the path
        return path;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
            {/* Budget Overview Section - Left Side */}
            <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                {/* Green gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-4 md:gap-6 lg:gap-8">
                    {/* Left side - Text and Button */}
                    <div className="flex-1 flex flex-col justify-center w-full lg:w-auto">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#04362c] mb-4 md:mb-6 leading-tight text-center lg:text-left">
                            <span className="block">Add Budget</span>
                            <span className="block">Category</span>
                        </h2>
                        {onAddClick && (
                            <button
                                onClick={onAddClick}
                                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 bg-[#04362c] text-white text-base sm:text-lg rounded-lg hover:bg-[#04362c]/90 transition-colors shadow-lg hover:shadow-xl font-medium w-full sm:w-fit mb-4 md:mb-6"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                Add New Categories
                            </button>
                        )}
                        
                        {/* Three Column Stats */}
                        <div className="flex items-start gap-2 sm:gap-4 mt-8 md:mt-12 lg:mt-16 w-full">
                            {/* Allotted */}
                            <div className="flex-1">
                                <div className="text-sm sm:text-base md:text-lg text-[#04362c] mb-1 sm:mb-2">Allotted</div>
                                <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#04362c] break-words">
                                    {formatCurrency(totalBudget)}
                                </div>
                            </div>
                            
                            {/* Divider */}
                            <div className="w-px h-12 sm:h-16 md:h-20 bg-[#04362c]"></div>
                            
                            {/* Used */}
                            <div className="flex-1">
                                <div className="text-sm sm:text-base md:text-lg text-[#04362c] mb-1 sm:mb-2">Used</div>
                                <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#04362c] break-words">
                                    {formatCurrency(totalSpent)}
                                </div>
                            </div>
                            
                            {/* Divider */}
                            <div className="w-px h-12 sm:h-16 md:h-20 bg-[#04362c]"></div>
                            
                            {/* Remaining */}
                            <div className="flex-1">
                                <div className="text-sm sm:text-base md:text-lg text-[#04362c] mb-1 sm:mb-2">Remaining</div>
                                <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#04362c] break-words">
                                    {formatCurrency(Math.max(0, totalRemaining))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side - Liquid Progress Indicator */}
                    <div className="flex-shrink-0 flex items-center justify-center w-full lg:w-auto mt-4 lg:mt-0">
                        <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] aspect-square" style={{ marginTop: "20px" }} >
                            <svg
                                ref={svgRef}
                                width="100%"
                                height="100%"
                                viewBox="0 0 374 374"
                                preserveAspectRatio="xMidYMid meet"
                            >
                                {/* Background circle */}
                                <circle
                                    cx="187"
                                    cy="187"
                                    r="180"
                                    fill="#86efac"
                                />
                                
                                {/* Liquid fill with wave */}
                                <defs>
                                    <clipPath id="liquidClip">
                                        <circle cx="187" cy="187" r="178" />
                                    </clipPath>
                                </defs>
                                
                                <g clipPath="url(#liquidClip)">
                                    <path
                                        d={createWavePath()}
                                        fill="#04362c"
                                        opacity="0.9"
                                    />
                                    
                                    {/* Bubbles */}
                                    {bubbles.map((bubble, index) => (
                                        <circle
                                            key={index}
                                            cx={bubble.x}
                                            cy={bubble.y}
                                            r={bubble.size}
                                            fill="white"
                                            opacity="0.3"
                                        />
                                    ))}
                                </g>
                                
                                {/* Outer frame - same color as liquid */}
                                <circle
                                    cx="187"
                                    cy="187"
                                    r="180"
                                    fill="none"
                                    stroke="#04362c"
                                    strokeWidth="7"
                                />
                            </svg>
                            
                            {/* Center content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center px-2">
                                    {displayPercentage}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insights Section - Right Side */}
            <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                {/* Green gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50"></div>
                
                <div className="relative z-10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#04362c] mb-4 md:mb-6">AI Insights</h2>
                    <div className="space-y-3 sm:space-y-4">
                        {(() => {
                            const insights = [];
                            
                            // Warning if nearing over budget (>80% spent)
                            if (spentPercentage >= 80 && spentPercentage < 100) {
                                insights.push({
                                    type: 'warning',
                                    icon: AlertTriangle,
                                    title: 'Approaching Budget Limit',
                                    message: `You've used ${Math.round(spentPercentage)}% of your budget. Consider reducing spending in the remaining ${formatCurrency(Math.max(0, totalRemaining))} to stay within budget.`,
                                    suggestion: 'Review your recent expenses and identify areas where you can cut back.'
                                });
                            }
                            
                            // Critical warning if over budget
                            if (spentPercentage >= 100) {
                                insights.push({
                                    type: 'critical',
                                    icon: AlertTriangle,
                                    title: 'Budget Exceeded',
                                    message: `You've exceeded your budget by ${formatCurrency(Math.abs(totalRemaining))}. Immediate action is needed to get back on track.`,
                                    suggestion: 'Consider adjusting your budget limits or reducing expenses in high-spending categories.'
                                });
                            }
                            
                            // Future insights based on spending patterns
                            if (spentPercentage < 80 && totalBudget > 0) {
                                const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                                const currentDay = new Date().getDate();
                                const projectedSpending = (totalSpent / currentDay) * daysInMonth;
                                
                                if (projectedSpending > totalBudget * 1.1) {
                                    insights.push({
                                        type: 'future',
                                        icon: TrendingDown,
                                        title: 'Spending Projection',
                                        message: `Based on current spending patterns, you're projected to exceed your budget by ${formatCurrency(projectedSpending - totalBudget)} this month.`,
                                        suggestion: 'Reduce daily spending by approximately ' + formatCurrency((projectedSpending - totalBudget) / (daysInMonth - currentDay)) + ' per day to stay within budget.'
                                    });
                                } else if (projectedSpending > totalBudget) {
                                    insights.push({
                                        type: 'future',
                                        icon: TrendingDown,
                                        title: 'Spending Projection',
                                        message: `At your current rate, you're on track to slightly exceed your budget by ${formatCurrency(projectedSpending - totalBudget)}.`,
                                        suggestion: 'Make small adjustments to your spending to stay within budget.'
                                    });
                                } else {
                                    insights.push({
                                        type: 'positive',
                                        icon: CheckCircle2,
                                        showIconOnly: true,
                                        title: 'On Track',
                                        message: `Great job! You're currently at ${Math.round(spentPercentage)}% of your budget and projected to stay within limits.`,
                                        suggestion: 'Continue monitoring your spending to maintain this healthy budget balance.'
                                    });
                                }
                            }
                            
                            // If no budget set - ALWAYS show this if no insights
                            if (insights.length === 0 || totalBudget === 0) {
                                insights.push({
                                    type: 'info',
                                    icon: Lightbulb,
                                    title: 'Get Started',
                                    message: 'Create your first budget category to start tracking your spending and receive personalized insights.',
                                    suggestion: 'Click "Add New Categories" to set up your budget.'
                                });
                            }
                            
                            return insights.length > 0 ? (
                                insights.map((insight, index) => {
                                    const IconComponent = insight.icon;
                                    return (
                                        <div key={index} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-[#04362c]/10">
                                            {insight.showIconOnly ? (
                                                <div className="mb-2">
                                                    <h3 className="font-bold text-[#04362c] mb-2 text-base sm:text-lg flex items-center gap-2">
                                                        <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-[#04362c]" />
                                                        {insight.title}
                                                    </h3>
                                                    <p className="text-sm sm:text-base text-gray-700 mb-2">{insight.message}</p>
                                                    <p className="text-xs sm:text-sm text-gray-600 italic">{insight.suggestion}</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-3 mb-2">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                                                            <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-[#04362c]" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-[#04362c] mb-2 text-base sm:text-lg">{insight.title}</h3>
                                                        <p className="text-sm sm:text-base text-gray-700 mb-2">{insight.message}</p>
                                                        <p className="text-xs sm:text-sm text-gray-600 italic">{insight.suggestion}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-[#04362c]/10">
                                    <div className="mb-2">
                                        <h3 className="font-bold text-[#04362c] mb-2 text-base sm:text-lg flex items-center gap-2">
                                            <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-[#04362c]" />
                                            Get Started
                                        </h3>
                                        <p className="text-sm sm:text-base text-gray-700 mb-2">Create your first budget category to start tracking your spending and receive personalized insights.</p>
                                        <p className="text-xs sm:text-sm text-gray-600 italic">Click "Add New Categories" to set up your budget.</p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                    
                    {/* Usage Rate and Allotment Rate */}
                    {totalBudget > 0 && (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                            {/* Usage Rate */}
                            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-black">{Math.round(spentPercentage)}%</div>
                                    {(() => {
                                        const usageRate = Math.round(spentPercentage);
                                        // Show green up arrow when at 0% or when increasing
                                        if (usageRate === 0 || usageTrend === 'up') {
                                            return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600" />;
                                        } else if (usageTrend === 'down') {
                                            return <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-red-600" />;
                                        } else {
                                            return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-gray-400 opacity-50" />;
                                        }
                                    })()}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500">Usage Rate</div>
                            </div>
                            
                            {/* Allotment Rate */}
                            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-black">100%</div>
                                    {(() => {
                                        // Show green up arrow when at 100% or when increasing
                                        if (allotmentTrend === 'up') {
                                            return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600" />;
                                        } else if (allotmentTrend === 'down') {
                                            return <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-red-600" />;
                                        } else {
                                            // Default to green up when at 100% (fully allotted is good)
                                            return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600" />;
                                        }
                                    })()}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500">Allotment Rate</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

