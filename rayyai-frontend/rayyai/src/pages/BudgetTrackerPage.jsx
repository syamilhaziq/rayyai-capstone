import { useCallback, useEffect, useMemo, useState } from "react";
import GlobalLoader from "../components/GlobalLoader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import {
    AlertTriangle,
    Plus,
    Trash2,
    TrendingDown,
    TrendingUp,
    DollarSign,
    Home,
    UtensilsCrossed,
    Car,
    Film,
    Zap,
    ShoppingBag,
    Heart,
    Plane,
    GraduationCap,
    MoreHorizontal,
    Shield,
    Sparkles,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { API_BASE_URL } from "../services/api";
import BudgetOverviewChart from "../components/BudgetOverviewChart";
import CategoryDetailPage from "../components/CategoryDetailPage";

// API Configuration

const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const formatCurrency = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
        return "RM 0";
    }
    try {
        const formatted = new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            maximumFractionDigits: 0,
        }).format(numeric);
        return formatted.replace("RM", "RM ").replace(/\s+/, " ");
    } catch {
        return `RM ${numeric.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
};

const apiRequest = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

const budgetAPI = {
    getBudgets: async () => {
        const response = await fetch(`${API_BASE_URL}/budgets`, {
            headers: {
                'Content-Type': 'application/json',
                ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` })
            }
        });

        if (!response.ok) {
            const fallback = await fetch(`${API_BASE_URL}/budgets/`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` })
                }
            });

            if (!fallback.ok) {
                throw new Error(`HTTP error! status: ${fallback.status}`);
            }

            let fallbackPayload;
            try {
                fallbackPayload = await fallback.json();
            } catch (err) {
                console.error('Failed to parse fallback budgets response:', err);
                fallbackPayload = { budgets: [] };
            }

            // Backend returns BudgetList with budgets array
            return { data: Array.isArray(fallbackPayload?.budgets) ? fallbackPayload.budgets : (Array.isArray(fallbackPayload) ? fallbackPayload : []) };
        }

        let payload;
        try {
            payload = await response.json();
        } catch (err) {
            console.error('Failed to parse budgets response:', err);
            payload = { budgets: [] };
        }

        // Backend returns BudgetList with budgets array
        return { data: Array.isArray(payload?.budgets) ? payload.budgets : (Array.isArray(payload) ? payload : []) };
    },

    getBudgetDetails: async (budgetId) => {
        return await apiRequest(`/budgets/${budgetId}/details`);
    },

    createBudget: async (budgetData, selectedDate = new Date()) => {
        // Use the selected month/year for budget period
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const backendData = {
            name: budgetData.category,
            category: budgetData.category,
            limit_amount: budgetData.budgetAmount,
            period_start: firstDay.toISOString().split('T')[0],
            period_end: lastDay.toISOString().split('T')[0],
            alert_threshold: budgetData.alertThreshold || 80
        };
        const data = await apiRequest('/budgets/', {
            method: 'POST',
            body: JSON.stringify(backendData),
        });
        return { data };
    },

    updateBudget: async (budgetId, budgetData) => {
        const backendData = {
            name: budgetData.category,
            category: budgetData.category,
            limit_amount: budgetData.budgetAmount,
            alert_threshold: budgetData.alertThreshold
        };
        const data = await apiRequest(`/budgets/${budgetId}`, {
            method: 'PUT',
            body: JSON.stringify(backendData),
        });
        return { data };
    },

    deleteBudget: async (budgetId) => {
        await apiRequest(`/budgets/${budgetId}`, {
            method: 'DELETE',
        });
        return { success: true };
    }
};

//mock data
const initialBudgets = [
    {
        id: "1",
        category: "Housing",
        budgetAmount: 2000,
        spentAmount: 1800,
        period: "monthly",
        alertThreshold: 90,
    },
    {
        id: "2",
        category: "Food",
        budgetAmount: 800,
        spentAmount: 600,
        period: "monthly",
        alertThreshold: 80,
    },
    {
        id: "3",
        category: "Transportation",
        budgetAmount: 300,
        spentAmount: 400,
        period: "monthly",
        alertThreshold: 85,
    },
    {
        id: "4",
        category: "Entertainment",
        budgetAmount: 400,
        spentAmount: 300,
        period: "monthly",
        alertThreshold: 75,
    },
    {
        id: "5",
        category: "Utilities",
        budgetAmount: 250,
        spentAmount: 200,
        period: "monthly",
        alertThreshold: 80,
    },
    {
        id: "6",
        category: "Shopping",
        budgetAmount: 300,
        spentAmount: 180,
        period: "monthly",
        alertThreshold: 85,
    },
];

// Budget categories matching backend BUDGET_CATEGORIES and frontend expense categories
const categories = [
    "Groceries",
    "Transportation",
    "Entertainment",
    "Utilities",
    "Shopping",
    "Food & Dining",
    "Health & Fitness",
    "Travel",
    "Education",
    "Housing",
    "Insurance",
    "Personal Care",
    "Others",
];

// Category icon mapping
export const getCategoryIcon = (categoryName) => {
    const iconMap = {
        "Groceries": UtensilsCrossed,
        "Transportation": Car,
        "Entertainment": Film,
        "Utilities": Zap,
        "Shopping": ShoppingBag,
        "Food & Dining": UtensilsCrossed,
        "Health & Fitness": Heart,
        "Travel": Plane,
        "Education": GraduationCap,
        "Housing": Home,
        "Insurance": Shield,
        "Personal Care": Sparkles,
        "Others": MoreHorizontal,
    };
    return iconMap[categoryName] || MoreHorizontal;
};

export function BudgetTracker() {
    const [budgets, setBudgets] = useState([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [selectedDate, setSelectedDate] = useState(() => new Date());

    // Get first and last day of selected month
    const getMonthRange = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return {
            start: firstDay.toISOString().split('T')[0],
            end: lastDay.toISOString().split('T')[0]
        };
    };

    // Navigate months
    const goToPreviousMonth = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const goToNextMonth = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    const goToCurrentMonth = () => {
        setSelectedDate(new Date());
    };

    const isCurrentMonth = () => {
        const now = new Date();
        return selectedDate.getMonth() === now.getMonth() &&
               selectedDate.getFullYear() === now.getFullYear();
    };

    const fetchBudgets = useCallback(async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await budgetAPI.getBudgets();

                if (response.data && response.data.length > 0) {
                    const monthRange = getMonthRange(selectedDate);

                    // Filter budgets that overlap with the selected month
                    const filteredBudgets = response.data.filter(budget => {
                        const budgetStart = new Date(budget.period_start);
                        const budgetEnd = new Date(budget.period_end);
                        const monthStart = new Date(monthRange.start);
                        const monthEnd = new Date(monthRange.end);

                        // Check if budget period overlaps with selected month
                        return budgetStart <= monthEnd && budgetEnd >= monthStart;
                    });

                    const formattedBudgets = filteredBudgets.map((budget) => ({
                        id: budget.budget_id,
                        category: budget.category,
                        budgetAmount: budget.limit_amount,
                        spentAmount: budget.spent_amount || 0,
                        remainingAmount: budget.remaining_amount || 0,
                        percentageUsed: budget.percentage_used || 0,
                        status: budget.status || "on_track",
                        daysRemaining: budget.days_remaining || 0,
                        dailyAllowance: budget.daily_allowance || 0,
                        alertType: budget.alert_type || "info",
                        period: "monthly",
                        alertThreshold: budget.alert_threshold || 80,
                        periodStart: budget.period_start,
                        periodEnd: budget.period_end,
                    }));

                    setBudgets(formattedBudgets);
                } else {
                    console.warn("No budgets found in API response");
                    setBudgets([]);
                }
        } catch (error) {
            console.error("Failed to fetch budgets:", error.message);
            setError("Failed to fetch budgets from server.");
            setBudgets([]);
            } finally {
                setLoading(false);
            }
    }, [selectedDate]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
    const totalRemaining = totalBudget - totalSpent;

    const getPercentage = (spent, budget) => (spent / budget) * 100;

    const getStatus = (percentage, threshold) => {
        if (percentage >= 100) return "over";
        if (percentage >= threshold) return "warning";
        return "good";
    };

    const handleAddBudget = async (newBudget) => {
        try {
            setLoading(true);
            // Pass the selected date to create budget for that specific month
            const response = await budgetAPI.createBudget(newBudget, selectedDate);
            // Transform backend response to frontend format with calculated spending
            const transformedBudget = {
                id: response.data.budget_id.toString(),
                category: response.data.category || response.data.name,
                budgetAmount: response.data.limit_amount,
                spentAmount: response.data.spent_amount || 0,
                remainingAmount: response.data.remaining_amount || 0,
                percentageUsed: response.data.percentage_used || 0,
                status: response.data.status || "on_track",
                daysRemaining: response.data.days_remaining || 0,
                dailyAllowance: response.data.daily_allowance || 0,
                alertType: response.data.alert_type || "info",
                period: 'monthly',
                alertThreshold: response.data.alert_threshold || 80,
                periodStart: response.data.period_start,
                periodEnd: response.data.period_end,
            };
            setBudgets((prev) => [...prev, transformedBudget]);
            setIsAddDialogOpen(false);
        } catch (err) {
            console.error('Error creating budget:', err);
            setError('Failed to create budget. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditBudget = async (updatedBudget) => {
        try {
            setLoading(true);
            const response = await budgetAPI.updateBudget(updatedBudget.id, updatedBudget);
            // Transform backend response to frontend format with calculated spending
            const transformedBudget = {
                id: response.data.budget_id.toString(),
                category: response.data.category || response.data.name,
                budgetAmount: response.data.limit_amount,
                spentAmount: response.data.spent_amount || 0,
                remainingAmount: response.data.remaining_amount || 0,
                percentageUsed: response.data.percentage_used || 0,
                status: response.data.status || "on_track",
                daysRemaining: response.data.days_remaining || 0,
                dailyAllowance: response.data.daily_allowance || 0,
                alertType: response.data.alert_type || "info",
                period: 'monthly',
                alertThreshold: response.data.alert_threshold || 80,
                periodStart: response.data.period_start,
                periodEnd: response.data.period_end,
            };
            setBudgets((prev) =>
                prev.map((b) => (b.id === updatedBudget.id ? transformedBudget : b))
            );
            setEditingBudget(null);
        } catch (err) {
            console.error('Error updating budget:', err);
            setError('Failed to update budget. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBudget = async (categoryData) => {
        try {
            setLoading(true);
            // Delete all budgets for this category
            for (const id of categoryData.budgetIds) {
                await budgetAPI.deleteBudget(id);
            }
            setBudgets((prev) => prev.filter((b) => !categoryData.budgetIds.includes(b.id)));
            setCategoryToDelete(null);
        } catch (err) {
            console.error('Error deleting budget:', err);
            setError('Failed to delete budget. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && budgets.length === 0) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: '#e7e7e7' }}
            >
                <div className="text-center">
                    <GlobalLoader size="medium" className="mx-auto mb-4" />
                    <p className="text-[#04362c]">Loading budgets...</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            id="budget-tracker-page"
            className="min-h-screen text-lg md:text-xl lg:text-2xl text-black"
            style={{
                background: '#e7e7e7',
                margin: '0',
                border: '0',
                padding: '80px'
            }}
        >
            <style>{`
              #budget-tracker-page button.add-budget-btn,
              #budget-tracker-page button.add-budget-btn * { color: white !important; }
            `}</style>
            <div className="w-full">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-red-800">{error}</p>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.location.reload()}
                            className="mt-2"
                        >
                            Retry
                        </Button>
                    </div>
                )}
                
                {/* Header section */}
                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-4">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-left" style={{ color: '#04362c' }}>
                            Budget Tracker
                        </h1>
                    </div>
                    <p className="font-medium text-3xl leading-relaxed mb-8 text-left" style={{ color: 'rgba(4, 54, 44, 0.9)' }}>
                        Set up budgets for different categories and track your spending
                    </p>

                    {/* Month Navigation */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <button
                            onClick={goToPreviousMonth}
                            className="text-[#04362c] hover:text-[#0DAD8D] transition-colors p-1"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>

                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-[#04362c]">
                                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h3>
                            {!isCurrentMonth() && (
                                <Button
                                    onClick={goToCurrentMonth}
                                    variant="link"
                                    className="text-sm text-[#0DAD8D] hover:text-[#0DAD8D]/80"
                                >
                                    Go to Current Month
                                </Button>
                            )}
                        </div>

                        <button
                            onClick={goToNextMonth}
                            className="text-[#04362c] hover:text-[#0DAD8D] transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[#04362c]"
                            disabled={isCurrentMonth()}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Budget Overview Chart */}
                <BudgetOverviewChart
                    totalBudget={totalBudget}
                    totalSpent={totalSpent}
                    totalRemaining={totalRemaining}
                    formatCurrency={formatCurrency}
                    onAddClick={() => setIsAddDialogOpen(true)}
                />

                {/* Budget Categories */}
                <div className="mt-8">
                    <h2 className="text-3xl font-normal text-[#04362c] mb-4">Budget Category</h2>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        {(() => {
                            // Group budgets by category to avoid duplicates
                            const categoryMap = new Map();
                            budgets.forEach((budget) => {
                                const category = budget.category;
                                if (categoryMap.has(category)) {
                                    const existing = categoryMap.get(category);
                                    existing.spentAmount += budget.spentAmount;
                                    existing.budgetAmount += budget.budgetAmount;
                                    existing.budgetIds.push(budget.id);
                                } else {
                                    categoryMap.set(category, {
                                        category,
                                        spentAmount: budget.spentAmount,
                                        budgetAmount: budget.budgetAmount,
                                        budgetIds: [budget.id],
                                    });
                                }
                            });

                            const categoryList = Array.from(categoryMap.values());
                            return categoryList.map((categoryData, index) => {
                                const percentage = getPercentage(
                                    categoryData.spentAmount,
                                    categoryData.budgetAmount
                                );
                                const remaining = categoryData.budgetAmount - categoryData.spentAmount;
                                const isExceeded = remaining < 0;

                                // Get category icon
                                const CategoryIcon = getCategoryIcon(categoryData.category);

                                // Get the first budget for this category for edit/delete actions
                                const firstBudget = budgets.find(b => b.category === categoryData.category);

                                const isLast = index === categoryList.length - 1;
                                
                                return (
                                    <div
                                        key={categoryData.category}
                                        className={`p-4 ${!isLast ? 'border-b border-gray-200' : ''} cursor-pointer hover:bg-gray-50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
                                        onClick={() => setSelectedCategory(categoryData.category)}
                                    >
                                        <div className="flex items-start gap-4 mb-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0">
                                                <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                                                    <CategoryIcon className="h-6 w-6 text-[#04362c]" />
                                                </div>
                                            </div>

                                            {/* Category Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-[#04362c] text-xl mb-1">
                                                    {categoryData.category}
                                                </div>
                                                <div className="text-[#04362c] text-base mb-3">
                                                    {formatCurrency(categoryData.spentAmount)} / {formatCurrency(categoryData.budgetAmount)}
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="mb-2">
                                                    <Progress
                                                        value={Math.min(percentage, 100)}
                                                        className="h-3 bg-gray-200"
                                                        styleColor={isExceeded ? "#ef4444" : "#22c55e"}
                                                    />
                                                </div>
                                            </div>

                                            {/* Right Side - Actions and Remaining/Exceeded */}
                                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCategoryToDelete(categoryData);
                                                    }}
                                                    className="border-gray-300 hover:bg-gray-300 hover:border-gray-400 bg-gray-200 transition-all duration-200 hover:scale-110 group"
                                                >
                                                    <Trash2 className="h-4 w-4 text-[#04362c] group-hover:text-gray-700 transition-colors duration-200" />
                                                </Button>
                                                
                                                {isExceeded ? (
                                                    <span className="text-base text-red-600 font-bold whitespace-nowrap">
                                                        Limit is exceeded: -{formatCurrency(Math.abs(remaining))}
                                                    </span>
                                                ) : (
                                                    <span className="text-base text-[#04362c] font-bold whitespace-nowrap">
                                                        Left: {formatCurrency(remaining)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Add Budget Dialog */}
                {isAddDialogOpen && (
                    <Dialog
                        open={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                    >
                        <BudgetDialog
                            onSave={handleAddBudget}
                            onCancel={() => setIsAddDialogOpen(false)}
                        />
                    </Dialog>
                )}

                {/* Edit Budget Dialog */}
                {editingBudget && (
                    <Dialog
                        open={!!editingBudget}
                        onOpenChange={() => setEditingBudget(null)}
                    >
                        <BudgetDialog
                            budget={editingBudget}
                            onSave={handleEditBudget}
                            onCancel={() => setEditingBudget(null)}
                        />
                    </Dialog>
                )}

                {/* Category Detail Page */}
                {selectedCategory && (
                    <CategoryDetailPage
                        category={selectedCategory}
                        selectedMonth={selectedDate}
                        onClose={() => setSelectedCategory(null)}
                    />
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Budget Category</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the budget category "{categoryToDelete?.category}"? 
                                This action cannot be undone and will remove all associated budget data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="px-6 py-3 rounded-xl border border-[#04362c]/20 bg-white text-base font-semibold text-[#04362c] hover:bg-[#04362c]/5 transition-all">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => categoryToDelete && handleDeleteBudget(categoryToDelete)}
                                className="px-6 py-3 rounded-xl bg-[#0DAD8D] text-white text-base font-semibold shadow-lg hover:bg-[#0DAD8D]/90 transition-all inline-flex items-center gap-2 justify-center"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

function BudgetDialog({ budget, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        category: budget?.category || categories[0],
        budgetAmount: budget?.budgetAmount || 0,
        spentAmount: budget?.spentAmount || 0,
        period: budget?.period || "monthly",
        alertThreshold: budget?.alertThreshold || 80,
    });
    const [errorMessage, setErrorMessage] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate Budget Amount
        const budgetAmt = parseFloat(formData.budgetAmount) || 0;
        const spentAmt = parseFloat(formData.spentAmount) || 0;

        if (budgetAmt === 0 || budgetAmt <= 0) {
            setErrorMessage("Budget Amount must be greater than 0");
            return;
        }

        if (budgetAmt <= spentAmt) {
            setErrorMessage("Budget Amount must be greater than Current Spent amount");
            return;
        }

        if (budget) {
            onSave({ ...budget, ...formData });
        } else {
            onSave(formData);
        }
    };

    return (
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">
                    {budget ? "Edit Budget" : "Add Budget Category"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#04362c]/70">
                    {budget
                        ? "Update budget details"
                        : "Create a new budget category"}
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="category" className="py-2">Category</Label>
                    <Select
                        value={formData.category}
                        onValueChange={(value) =>
                            setFormData((prev) => ({
                                ...prev,
                                category: value,
                            }))
                        }
                    >
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category} value={category} className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30">
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="budgetAmount" className="py-2">Budget Amount</Label>
                        <Input
                            id="budgetAmount"
                            type="text"
                            value={formData.budgetAmount}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and one decimal point
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    setFormData((prev) => ({
                                        ...prev,
                                        budgetAmount: value,
                                    }));
                                }
                            }}
                            placeholder="0.00"
                            className="bg-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="period" className="py-2">Period</Label>
                        <Select
                            value={formData.period}
                            onValueChange={(value) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    period: value,
                                }))
                            }
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weekly" className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30">Weekly</SelectItem>
                                <SelectItem value="monthly" className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30">Monthly</SelectItem>
                                <SelectItem value="yearly" className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="spentAmount" className="py-2">Current Spent</Label>
                        <Input
                            id="spentAmount"
                            type="text"
                            value={formData.spentAmount}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and one decimal point
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    setFormData((prev) => ({
                                        ...prev,
                                        spentAmount: value,
                                    }));
                                }
                            }}
                            placeholder="0.00"
                            className="bg-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="alertThreshold" className="py-2">
                            Alert Threshold (%)
                        </Label>
                        <Input
                            id="alertThreshold"
                            type="number"
                            min="1"
                            max="100"
                            value={formData.alertThreshold}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    alertThreshold:
                                        e.target.value === "" ? "" : parseInt(e.target.value),
                                }))
                            }
                            placeholder="80"
                            className="bg-white"
                        />
                    </div>
                </div>

                <DialogFooter className="w-full">
                    <div className="flex gap-3 w-full">
                        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-transparent hover:shadow-md transition-shadow">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1 px-4 py-2 bg-[#04362c] hover:bg-[#04362c]/90 text-white rounded-lg font-medium">
                            {budget ? "Update" : "Add"} Budget
                        </Button>
                    </div>
                </DialogFooter>
            </form>

            {/* Error Alert Dialog */}
            <AlertDialog open={!!errorMessage} onOpenChange={(open) => !open && setErrorMessage(null)}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-[#04362c]">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Validation Error
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-700">
                            {errorMessage}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => setErrorMessage(null)}
                            className="px-6 py-3 rounded-xl bg-[#0DAD8D] text-white text-base font-semibold shadow-lg hover:bg-[#0DAD8D]/90 transition-all inline-flex items-center gap-2 justify-center w-full sm:w-auto"
                        >
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DialogContent>
    );
}