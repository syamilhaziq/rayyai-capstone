import { useEffect, useState, useMemo } from "react";
import { X, Calendar as CalendarIcon, Edit, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { API_BASE_URL } from "../services/api";
import { getCategoryIcon } from "../pages/BudgetTrackerPage";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
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
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";

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

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
};


export default function CategoryDetailPage({ category, selectedMonth, onClose }) {
    const [expenses, setExpenses] = useState([]);
    const [budget, setBudget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [budgetLoading, setBudgetLoading] = useState(true);
    const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [hoveredExpenseId, setHoveredExpenseId] = useState(null);
    const [expenseToDelete, setExpenseToDelete] = useState(null);

    // Get month range from selectedMonth prop or budget period
    const getMonthRange = () => {
        if (budget && budget.period_start && budget.period_end) {
            // Use budget period if available
            return {
                start: budget.period_start,
                end: budget.period_end
            };
        } else if (selectedMonth) {
            // Use selectedMonth from parent
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            return {
                start: firstDay.toISOString().split('T')[0],
                end: lastDay.toISOString().split('T')[0]
            };
        } else {
            // Fallback to current month
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            return {
                start: firstDay.toISOString().split('T')[0],
                end: lastDay.toISOString().split('T')[0]
            };
        }
    };

    // Fetch budget for this category
    useEffect(() => {
        const fetchBudget = async () => {
            if (!category) return;

            setBudgetLoading(true);
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');

                // Fetch budgets filtered by category
                const response = await fetch(
                    `${API_BASE_URL}/budgets?category=${encodeURIComponent(category)}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Get the first (most recent) budget for this category
                    const budgetData = data.budgets && data.budgets.length > 0 ? data.budgets[0] : null;
                    setBudget(budgetData);
                } else {
                    console.error('Failed to fetch budget');
                    setBudget(null);
                }
            } catch (error) {
                console.error('Error fetching budget:', error);
                setBudget(null);
            } finally {
                setBudgetLoading(false);
            }
        };

        fetchBudget();
    }, [category]);

    // Fetch expenses for this category filtered by month
    useEffect(() => {
        const fetchExpenses = async () => {
            if (!category) return;

            setLoading(true);
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const monthRange = getMonthRange();

                // Fetch expenses for this category within the date range
                const url = `${API_BASE_URL}/transactions/expense?category=${encodeURIComponent(category)}&start_date=${monthRange.start}&end_date=${monthRange.end}&limit=500`;

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setExpenses(data || []);
                } else {
                    console.error('Failed to fetch expenses');
                    setExpenses([]);
                }
            } catch (error) {
                console.error('Error fetching expenses:', error);
                setExpenses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchExpenses();
    }, [category, budget, selectedMonth]);

    // Group expenses by day for cumulative chart (Month view only)
    const chartData = useMemo(() => {
        // Cumulative expenses by day for the selected month
        const monthRange = getMonthRange();
        const startDate = new Date(monthRange.start);
        const endDate = new Date(monthRange.end);

        // Create a map for each day in the month
        const dayMap = {};
        const currentDate = new Date(startDate);

        // Get budget ceiling value (if available)
        const budgetCeiling = budget?.limit_amount || 0;

        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            const dayLabel = currentDate.getDate().toString();

            dayMap[dateKey] = {
                period: dayLabel,
                amount: 0,
                date: new Date(currentDate),
                cumulative: 0,
                budgetCeiling: budgetCeiling // Add budget ceiling to each data point
            };

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add expenses to their respective days
        expenses.forEach(expense => {
            const dateKey = new Date(expense.date_spent).toISOString().split('T')[0];
            if (dayMap[dateKey]) {
                dayMap[dateKey].amount += expense.amount;
            }
        });

        // Sort by date and calculate cumulative
        const sorted = Object.values(dayMap)
            .sort((a, b) => a.date - b.date);

        let cumulative = 0;
        sorted.forEach(item => {
            cumulative += item.amount;
            item.cumulative = cumulative;
        });

        return sorted;
    }, [expenses, budget, selectedMonth]);

    // Show all expenses for the selected month (sorted by date, newest first)
    const selectedDateExpenses = useMemo(() => {
        return expenses.sort((a, b) => new Date(b.date_spent) - new Date(a.date_spent));
    }, [expenses]);

    const totalSpent = useMemo(() => {
        return selectedDateExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    }, [selectedDateExpenses]);

    const handleAddBudget = async (budgetData) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            const backendData = {
                name: budgetData.title,
                category: category,
                limit_amount: parseFloat(budgetData.amount) || 0,
                period_start: budgetData.date || new Date().toISOString().split('T')[0],
                period_end: new Date(new Date(budgetData.date || new Date()).setMonth(new Date(budgetData.date || new Date()).getMonth() + 1)).toISOString().split('T')[0],
                alert_threshold: 80,
                description: budgetData.description || ""
            };

            const response = await fetch(`${API_BASE_URL}/budgets/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(backendData)
            });

            if (response.ok) {
                setIsAddBudgetDialogOpen(false);
                // Optionally refresh expenses or show success message
            } else {
                const error = await response.json().catch(() => ({ detail: 'Failed to create budget' }));
                alert(error.detail || 'Failed to create budget');
            }
        } catch (error) {
            console.error('Error creating budget:', error);
            alert('Failed to create budget. Please try again.');
        }
    };

    const handleEditExpense = async (updatedExpense) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            const response = await fetch(`${API_BASE_URL}/transactions/${updatedExpense.expense_id || updatedExpense.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: updatedExpense.description,
                    amount: parseFloat(updatedExpense.amount) || 0,
                    date_spent: updatedExpense.date_spent,
                    seller: updatedExpense.seller || ""
                })
            });

            if (response.ok) {
                // Refresh expenses
                const fetchExpenses = async () => {
                    const expenseResponse = await fetch(
                        `${API_BASE_URL}/transactions/expense?category=${encodeURIComponent(category)}&limit=500`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    if (expenseResponse.ok) {
                        const data = await expenseResponse.json();
                        setExpenses(data || []);
                    }
                };
                await fetchExpenses();
                setEditingExpense(null);
            } else {
                const error = await response.json().catch(() => ({ detail: 'Failed to update expense' }));
                alert(error.detail || 'Failed to update expense');
            }
        } catch (error) {
            console.error('Error updating expense:', error);
            alert('Failed to update expense. Please try again.');
        }
    };

    const handleDeleteExpense = async () => {
        const expense = expenseToDelete;
        if (!expense) return;
        
        setExpenseToDelete(null);
        
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const expenseId = expense.expense_id || expense.id;
            
            const response = await fetch(`${API_BASE_URL}/transactions/expense/${expenseId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Refresh expenses
                const fetchExpenses = async () => {
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    const response = await fetch(
                        `${API_BASE_URL}/transactions/expense?category=${encodeURIComponent(category)}&limit=500`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        setExpenses(data || []);
                    }
                };
                fetchExpenses();
            } else {
                const error = await response.json().catch(() => ({ detail: 'Failed to delete expense' }));
                alert(error.detail || 'Failed to delete expense');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Failed to delete expense. Please try again.');
        }
    };

    const CategoryIcon = getCategoryIcon(category);

    return (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
            {/* Backdrop */}
            <div 
                className="flex-1 bg-black/50 transition-opacity"
                onClick={onClose}
            />
            
            {/* Slide-in panel - Full screen */}
            <div 
                className="w-full h-full bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ml-auto"
                style={{
                    animation: 'slideInFromRight 0.3s ease-out',
                    maxWidth: '100%'
                }}
            >
                <div className="p-4 sm:p-6 md:p-8" style={{ background: '#e7e7e7', minHeight: '100%' }}>
                    {/* Close button - positioned at top right */}
                    <div className="flex justify-end mb-4 sm:mb-6">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-md flex-shrink-0"
                        >
                            <X className="h-5 w-5 sm:h-6 sm:w-6 text-[#04362c]" />
                        </button>
                    </div>

                    {/* Budget Summary Section */}
                    {budgetLoading ? (
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-4 sm:mb-6">
                            <div className="text-center text-gray-500">Loading budget details...</div>
                        </div>
                    ) : budget ? (
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-4 sm:mb-6">
                            <h3 className="text-2xl font-bold text-[#04362c] mb-4">Budget Details</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Budget Limit</p>
                                    <p className="text-xl font-bold text-[#04362c]">{formatCurrency(budget.limit_amount)}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Spent</p>
                                    <p className="text-xl font-bold text-[#04362c]">{formatCurrency(budget.spent_amount || 0)}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Remaining</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(budget.remaining_amount || 0)}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Usage</p>
                                    <p className="text-xl font-bold text-[#04362c]">{budget.percentage_used?.toFixed(1) || 0}%</p>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-col sm:flex-row gap-2 text-sm text-gray-600">
                                <span>Period: {budget.period_start} to {budget.period_end}</span>
                                {budget.days_remaining > 0 && (
                                    <span className="sm:ml-4">• {budget.days_remaining} days remaining</span>
                                )}
                                {budget.status && (
                                    <span className={`sm:ml-4 font-semibold ${
                                        budget.status === 'over_budget' ? 'text-red-600' :
                                        budget.status === 'at_risk' ? 'text-yellow-600' :
                                        'text-green-600'
                                    }`}>
                                        • {budget.status === 'over_budget' ? 'Over Budget' :
                                           budget.status === 'at_risk' ? 'At Risk' :
                                           'On Track'}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-4 sm:mb-6">
                            <div className="text-center">
                                <p className="text-gray-600">No budget set for this category</p>
                            </div>
                        </div>
                    )}

                    {/* Analysis Section - Expanded */}
                    <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-10 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                            <h3 className="text-3xl font-bold text-[#04362c]">{category} Analysis</h3>
                        </div>

                        {/* Cumulative Expenses Chart */}
                        <div className="h-80 sm:h-96 md:h-[500px] lg:h-[600px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="period"
                                        tick={{ fill: '#04362c', fontSize: 12, fontWeight: 500 }}
                                        axisLine={{ stroke: '#e5e7eb' }}
                                        interval={Math.floor(chartData.length / 10)}
                                    />
                                    <YAxis
                                        tick={{ fill: '#04362c', fontSize: 12, fontWeight: 500 }}
                                        axisLine={{ stroke: '#e5e7eb' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value, name) => {
                                            if (name === 'cumulative') return [formatCurrency(value), 'Cumulative Expenses'];
                                            if (name === 'budgetCeiling') return [formatCurrency(value), 'Budget Limit'];
                                            return [formatCurrency(value), name];
                                        }}
                                        labelStyle={{ color: '#04362c', fontWeight: 600 }}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: '20px' }}
                                        formatter={(value) => {
                                            if (value === 'cumulative') return 'Cumulative Expenses';
                                            if (value === 'budgetCeiling') return 'Budget Limit';
                                            return value;
                                        }}
                                    />
                                    {/* Budget ceiling line */}
                                    {budget && budget.limit_amount > 0 && (
                                        <Line
                                            type="monotone"
                                            dataKey="budgetCeiling"
                                            stroke="#ef4444"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            dot={false}
                                        />
                                    )}
                                    {/* Cumulative expenses line */}
                                    <Line
                                        type="monotone"
                                        dataKey="cumulative"
                                        stroke="#04362c"
                                        strokeWidth={3}
                                        dot={{ fill: '#04362c', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Expenses Section */}
                    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                            <div>
                                <h3 className="text-3xl font-bold text-[#04362c]">{category} Expenses</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {selectedMonth ? selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Current Month'} • Total: {formatCurrency(totalSpent)}
                                </p>
                            </div>
                        </div>

                        {/* Expense List */}
                        <div className="space-y-3 sm:space-y-4">
                            {loading ? (
                                <div className="text-center py-8 text-gray-500 text-sm sm:text-base">Loading expenses...</div>
                            ) : selectedDateExpenses.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                                    No {category} expenses found for {selectedMonth ? selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'this month'}
                                </div>
                            ) : (
                                selectedDateExpenses.map((expense, index) => {
                                    const expenseId = expense.expense_id || expense.id || index;
                                    return (
                                        <div 
                                            key={expenseId}
                                            className="flex items-start gap-3 sm:gap-4 pt-3 sm:pt-4 pb-3 sm:pb-4 border-b border-gray-200 last:border-b-0 group hover:bg-gray-50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-lg p-2 -m-2 relative"
                                            onMouseEnter={() => setHoveredExpenseId(expenseId)}
                                            onMouseLeave={() => setHoveredExpenseId(null)}
                                        >
                                            {/* Icon */}
                                            <div className="flex-shrink-0">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <CategoryIcon className="h-7 w-7 sm:h-8 sm:w-8 text-[#04362c]" />
                                                </div>
                                            </div>

                                            {/* Expense Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-[#04362c] mb-1 text-xl break-words">
                                                    {expense.description || 'Untitled Expense'}
                                                </div>
                                                <div className="text-base text-gray-600 break-words">
                                                    {expense.seller || 'No description'}
                                                </div>
                                            </div>

                                            {/* Amount, Date, and Edit Button */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <div className="flex flex-col items-end">
                                                    <div className="font-bold text-[#04362c] mb-1 text-xl whitespace-nowrap">
                                                        -{formatCurrency(expense.amount)}
                                                    </div>
                                                    <div className="text-base text-gray-500 whitespace-nowrap">
                                                        {formatDate(expense.date_spent)}
                                                    </div>
                                                </div>
                                                
                                                {/* Edit and Delete Buttons - Shows on Hover */}
                                                {hoveredExpenseId === expenseId && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingExpense(expense);
                                                            }}
                                                            className="p-2 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit className="h-4 w-4 text-[#04362c]" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpenseToDelete(expense);
                                                            }}
                                                            className="p-2 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-[#04362c]" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Add Budget Dialog */}
                {isAddBudgetDialogOpen && (
                    <Dialog
                        open={isAddBudgetDialogOpen}
                        onOpenChange={setIsAddBudgetDialogOpen}
                    >
                        <BudgetDialog
                            category={category}
                            onSave={handleAddBudget}
                            onCancel={() => setIsAddBudgetDialogOpen(false)}
                        />
                    </Dialog>
                )}

                {/* Edit Expense Dialog */}
                {editingExpense && (
                    <Dialog
                        open={!!editingExpense}
                        onOpenChange={() => setEditingExpense(null)}
                    >
                        <ExpenseDialog
                            expense={editingExpense}
                            onSave={handleEditExpense}
                            onCancel={() => setEditingExpense(null)}
                        />
                    </Dialog>
                )}

                {/* Delete Expense Confirmation Dialog */}
                <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{expenseToDelete?.description || 'this expense'}"? 
                                This action cannot be undone and will remove all associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="px-6 py-3 rounded-xl border border-[#04362c]/20 bg-white text-base font-semibold text-[#04362c] hover:bg-[#04362c]/5 transition-all">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteExpense}
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

function BudgetDialog({ category, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: "",
        amount: 0,
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            alert("Budget title is required");
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            alert("Budget amount must be greater than 0");
            return;
        }

        if (!formData.date) {
            alert("Date is required");
            return;
        }

        onSave(formData);
    };

    return (
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">Add Budget Category</DialogTitle>
                <DialogDescription className="text-sm text-[#04362c]/70">
                    Create a new budget for {category}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="title" className="block text-sm font-medium text-[#04362c]/90 mb-1">Budget Title</Label>
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                title: e.target.value,
                            }))
                        }
                        placeholder="e.g., Monthly Food Budget"
                        className="bg-white"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="description" className="block text-sm font-medium text-[#04362c]/90 mb-1">Description</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                            }))
                        }
                        placeholder="Brief description of your budget"
                        className="bg-white"
                        rows={2}
                    />
                </div>

                <div>
                    <Label htmlFor="date" className="block text-sm font-medium text-[#04362c]/90 mb-1">Date</Label>
                    <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                date: e.target.value,
                            }))
                        }
                        className="bg-white"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="amount" className="block text-sm font-medium text-[#04362c]/90 mb-1">Amount</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">RM</span>
                        <Input
                            id="amount"
                            type="text"
                            value={formData.amount}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and one decimal point
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    setFormData((prev) => ({
                                        ...prev,
                                        amount: value,
                                    }));
                                }
                            }}
                            placeholder="0.00"
                            className="bg-white pl-10"
                            required
                        />
                    </div>
                </div>

                <DialogFooter className="w-full">
                    <div className="flex gap-3 w-full">
                        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-transparent hover:shadow-md transition-shadow">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1 px-4 py-2 bg-[#04362c] hover:bg-[#04362c]/90 text-white rounded-lg font-medium">
                            Add Budget Category
                        </Button>
                    </div>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

function ExpenseDialog({ expense, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        description: expense?.description || "",
        amount: expense?.amount || 0,
        date_spent: expense?.date_spent ? new Date(expense.date_spent).toISOString().split('T')[0] : "",
        seller: expense?.seller || "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.description.trim()) {
            alert("Description is required");
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            alert("Amount must be greater than 0");
            return;
        }

        if (!formData.date_spent) {
            alert("Date is required");
            return;
        }

        onSave({ ...expense, ...formData });
    };

    return (
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">Edit Budget</DialogTitle>
                <DialogDescription className="text-sm text-[#04362c]/70">
                    Update budget details
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="expense-description" className="block text-sm font-medium text-[#04362c]/90 mb-1">Budget Title</Label>
                    <Input
                        id="expense-description"
                        value={formData.description}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                            }))
                        }
                        placeholder="e.g., Grocery Shopping"
                        className="bg-white"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="expense-seller" className="block text-sm font-medium text-[#04362c]/90 mb-1">Budget Description</Label>
                    <Input
                        id="expense-seller"
                        value={formData.seller}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                seller: e.target.value,
                            }))
                        }
                        placeholder="e.g., Tesco"
                        className="bg-white"
                    />
                </div>

                <div>
                    <Label htmlFor="expense-amount" className="block text-sm font-medium text-[#04362c]/90 mb-1">Amount</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">RM</span>
                        <Input
                            id="expense-amount"
                            type="text"
                            value={formData.amount}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and one decimal point
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    setFormData((prev) => ({
                                        ...prev,
                                        amount: value,
                                    }));
                                }
                            }}
                            placeholder="0.00"
                            className="bg-white pl-10"
                            required
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="expense-date" className="block text-sm font-medium text-[#04362c]/90 mb-1">Date</Label>
                    <Input
                        id="expense-date"
                        type="date"
                        value={formData.date_spent}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                date_spent: e.target.value,
                            }))
                        }
                        className="bg-white"
                        required
                    />
                </div>

                <DialogFooter className="w-full">
                    <div className="flex gap-3 w-full">
                        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-transparent hover:shadow-md transition-shadow">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1 px-4 py-2 bg-[#04362c] hover:bg-[#04362c]/90 text-white rounded-lg font-medium">
                            Update Expense
                        </Button>
                    </div>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

