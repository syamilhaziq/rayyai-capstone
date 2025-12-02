import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import GlobalLoader from "../components/GlobalLoader";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
    Target,
    Plus,
    Edit,
    Trash2,
    Calendar,
    DollarSign,
    TrendingUp,
    PiggyBank,
    AlertTriangle,
    Home,
    Car,
    GraduationCap,
    MoreHorizontal,
    Plane,
    Circle,
} from "lucide-react";
import { API_BASE_URL } from "../services/api";
import FinancialGoalsOverviewChart from "../components/FinancialGoalsOverviewChart";
// import GoalDetailPage from "../components/GoalDetailPage"; // Removed - using edit dialog on click instead
// API Configuration

const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
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
        return `RM ${numeric.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
    }
};

const goalsAPI = {
    getGoals: async (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/goals/?${queryParams}` : '/goals/';
        const data = await apiRequest(endpoint);
        return { data: data.goals || [] };
    },

    getGoal: async (goalId) => {
        return await apiRequest(`/goals/${goalId}`);
    },

    createGoal: async (goalData) => {
        const backendData = {
            goal_name: goalData.goalName || goalData.category,
            description: goalData.description || '',
            category: goalData.category,
            priority: goalData.priority,
            target_amount: goalData.targetAmount,
            current_amount: goalData.currentAmount || 0,
            target_date: goalData.targetDate || null
        };
        const data = await apiRequest('/goals/', {
            method: 'POST',
            body: JSON.stringify(backendData),
        });
        return { data };
    },

    updateGoal: async (goalId, goalData) => {
        const backendData = {
            goal_name: goalData.goalName || goalData.category,
            description: goalData.description || '',
            category: goalData.category,
            priority: goalData.priority,
            target_amount: goalData.targetAmount,
            current_amount: goalData.currentAmount,
            target_date: goalData.targetDate || null
        };
        const data = await apiRequest(`/goals/${goalId}`, {
            method: 'PUT',
            body: JSON.stringify(backendData),
        });
        return { data };
    },

    deleteGoal: async (goalId) => {
        await apiRequest(`/goals/${goalId}`, {
            method: 'DELETE',
        });
        return { success: true };
    },

    contributeToGoal: async (goalId, amount) => {
        const data = await apiRequest(`/goals/${goalId}/contribute`, {
            method: 'POST',
            body: JSON.stringify({ amount }),
        });
        return { data };
    },

    getSummary: async () => {
        return await apiRequest('/goals/stats/summary');
    }
};

const categories = [
    "Emergency Fund",
    "Vacation",
    "Car Purchase",
    "Home Down Payment",
    "Education",
    "Retirement",
    "Investment",
    "Other",
];
const categoryEmojis = {
    "Emergency Fund": "🚨",
    Vacation: "✈️",
    "Car Purchase": "🚗",
    "Home Down Payment": "🏠",
    Education: "📚",
    Retirement: "👴",
    Investment: "📈",
    Other: "🎯",
};

const priorityEmojis = {
    low: "🟢",
    medium: "🟡",
    high: "🔴",
};
const priorityColors = {
    low: "bg-[#b6c6c9] text-black",
    medium: "bg-[#b6c6c9] text-black",
    high: "bg-[#b6c6c9] text-black",
};

export function FinancialGoals() {
    const [goals, setGoals] = useState([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [goalToDelete, setGoalToDelete] = useState(null);
    // const [selectedGoal, setSelectedGoal] = useState(null); // Removed - using edit dialog on click instead

    // Fetch goals from API
    useEffect(() => {
        const fetchGoals = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await goalsAPI.getGoals();
                // Transform backend data to frontend format
                const transformedGoals = (response.data || []).map(goal => ({
                    id: goal.goal_id.toString(),
                    title: goal.goal_name || goal.category, // Use goal_name or fallback to category
                    description: goal.description || '', // Description is optional
                    targetAmount: goal.target_amount,
                    currentAmount: goal.current_amount,
                    targetDate: goal.target_date,
                    category: goal.category,
                    priority: goal.priority,
                    isCompleted: goal.is_completed || false
                }));
                setGoals(transformedGoals);
            } catch (err) {
                console.error('Error fetching goals:', err);
                setError('Failed to fetch goals. Using demo data.');
                // Fallback to demo data if API fails
                const demoGoals = [
                    {
                        id: "1",
                        title: "Emergency Fund",
                        description: "6 months of expenses saved",
                        targetAmount: 30000,
                        currentAmount: 18500,
                        targetDate: "2024-12-31",
                        category: "Emergency Fund",
                        priority: "high",
                        isCompleted: false,
                    },
                    {
                        id: "2",
                        title: "Vacation to Europe",
                        description: "Dream vacation fund",
                        targetAmount: 8000,
                        currentAmount: 3200,
                        targetDate: "2024-08-15",
                        category: "Vacation",
                        priority: "medium",
                        isCompleted: false,
                    }
                ];
                setGoals(demoGoals);
            } finally {
                setLoading(false);
            }
        };

        fetchGoals();
    }, []);

    const activeGoals = goals.filter((goal) => !goal.isCompleted);
    const completedGoals = goals.filter((goal) => goal.isCompleted);
    const totalTargetAmount = activeGoals.reduce(
        (sum, goal) => sum + goal.targetAmount,
        0
    );
    const totalCurrentAmount = activeGoals.reduce(
        (sum, goal) => sum + goal.currentAmount,
        0
    );

    const handleAddGoal = async (goalData) => {
        try {
            setLoading(true);
            const response = await goalsAPI.createGoal(goalData);
            // Transform backend response to frontend format
            const transformedGoal = {
                id: response.data.goal_id.toString(),
                title: response.data.goal_name || response.data.category, // Use goal_name or fallback to category
                description: response.data.description || '', // Description is optional
                targetAmount: response.data.target_amount,
                currentAmount: response.data.current_amount,
                targetDate: response.data.target_date,
                category: response.data.category,
                priority: response.data.priority,
                isCompleted: response.data.is_completed || false
            };
            setGoals((prev) => [...prev, transformedGoal]);
            setIsAddDialogOpen(false);
        } catch (err) {
            console.error('Error creating goal:', err);
            setError('Failed to create goal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditGoal = async (updatedGoal) => {
        try {
            setLoading(true);

            // Auto-complete goal if current amount reaches or exceeds target
            const goalToUpdate = {
                ...updatedGoal,
                isCompleted: updatedGoal.currentAmount >= updatedGoal.targetAmount
            };

            const response = await goalsAPI.updateGoal(goalToUpdate.id, goalToUpdate);
            // Transform backend response to frontend format
            const transformedGoal = {
                id: response.data.goal_id.toString(),
                title: response.data.goal_name || response.data.category, // Use goal_name or fallback to category
                description: response.data.description || '', // Description is optional
                targetAmount: response.data.target_amount,
                currentAmount: response.data.current_amount,
                targetDate: response.data.target_date,
                category: response.data.category,
                priority: response.data.priority,
                isCompleted: response.data.is_completed || false
            };
            setGoals((prev) =>
                prev.map((goal) =>
                    goal.id === updatedGoal.id ? transformedGoal : goal
                )
            );
            setEditingGoal(null);
        } catch (err) {
            console.error('Error updating goal:', err);
            setError('Failed to update goal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGoal = async (goal) => {
        try {
            setLoading(true);
            await goalsAPI.deleteGoal(goal.id);
            setGoals((prev) => prev.filter((g) => g.id !== goal.id));
            setGoalToDelete(null);
        } catch (err) {
            console.error('Error deleting goal:', err);
            setError('Failed to delete goal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToGoal = async (goalId, amount) => {
        try {
            const goal = goals.find(g => g.id === goalId);
            if (!goal) return;
            
            const updatedGoal = {
                ...goal,
                currentAmount: goal.currentAmount + amount,
                isCompleted: goal.currentAmount + amount >= goal.targetAmount,
            };
            
            const response = await goalsAPI.updateGoal(goalId, updatedGoal);
            // Transform backend response to frontend format
            const transformedGoal = {
                id: response.data.goal_id.toString(),
                title: response.data.goal_name,
                description: response.data.description,
                targetAmount: response.data.target_amount,
                currentAmount: response.data.current_amount,
                targetDate: response.data.target_date,
                category: response.data.category,
                priority: response.data.priority,
                isCompleted: response.data.is_completed || false
            };
            setGoals((prev) =>
                prev.map((g) =>
                    g.id === goalId ? transformedGoal : g
                )
            );
        } catch (err) {
            console.error('Error updating goal amount:', err);
            setError('Failed to update goal amount. Please try again.');
        }
    };

    if (loading && goals.length === 0) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: '#e7e7e7' }}
            >
                <div className="text-center">
                    <GlobalLoader size="medium" className="mx-auto mb-4" />
                    <p className="text-[#04362c]">Loading goals...</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            id="financial-goals-page"
            className="min-h-screen text-lg md:text-xl lg:text-2xl text-black"
            style={{
                background: '#e7e7e7',
                margin: '0',
                border: '0',
                padding: '80px'
            }}
        >
            <style>{`
              #financial-goals-page button.add-goal-btn,
              #financial-goals-page button.add-goal-btn * { color: white !important; }
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
                            Financial Goals
                        </h1>
                    </div>
                    <p className="font-medium text-3xl leading-relaxed mb-8 text-left" style={{ color: 'rgba(4, 54, 44, 0.9)' }}>
                        Set and track your financial goals like emergency funds and savings targets
                    </p>
                </div>

                {/* Financial Goals Overview Chart */}
                <FinancialGoalsOverviewChart
                    activeGoals={activeGoals.length}
                    totalTarget={totalTargetAmount}
                    totalSaved={totalCurrentAmount}
                    formatCurrency={formatCurrency}
                    onAddClick={() => setIsAddDialogOpen(true)}
                />

                {/* Financial Goals List */}
                <div className="mt-8">
                    <h2 className="text-3xl font-normal text-[#04362c] mb-4">Financial Goals</h2>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        {goals.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <p className="text-lg mb-4">No financial goals yet</p>
                                <Button
                                    onClick={() => setIsAddDialogOpen(true)}
                                    className="bg-[#0DAD8D] hover:bg-[#0DAD8D]/90 text-white"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Your First Goal
                                </Button>
                            </div>
                        ) : (
                            goals.map((goal, index) => {
                                const percentage = (goal.currentAmount / goal.targetAmount) * 100;
                                const remaining = goal.targetAmount - goal.currentAmount;
                                const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
                                const today = new Date();
                                const daysRemaining = targetDate
                                    ? Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                                    : 0;
                                const monthlyRequired =
                                    daysRemaining > 0 ? remaining / Math.ceil(daysRemaining / 30) : 0;

                                const getIconComponent = (category) => {
                                    const iconMap = {
                                        "Emergency Fund": Target,
                                        "Vacation": Plane,
                                        "Car Purchase": Car,
                                        "Home Down Payment": Home,
                                        "Education": GraduationCap,
                                        "Retirement": PiggyBank,
                                        "Investment": TrendingUp,
                                        "Other": Circle,
                                    };
                                    return iconMap[category] || PiggyBank;
                                };

                                const IconComponent = getIconComponent(goal.category);
                                const isLast = index === goals.length - 1;

                                return (
                                    <div
                                        key={goal.id}
                                        className={`p-4 ${!isLast ? 'border-b border-gray-200' : ''} hover:bg-gray-50 transition-all duration-200`}
                                    >
                                        <div className="flex items-start gap-4 mb-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0">
                                                <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                                                    <IconComponent className="h-6 w-6 text-[#04362c]" />
                                                </div>
                                            </div>

                                            {/* Goal Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-[#04362c] text-xl mb-1">
                                                    {goal.title || goal.category}
                                                </div>
                                                {goal.description && (
                                                    <div className="text-sm text-[#04362c]/70 mb-2">
                                                        {goal.description}
                                                    </div>
                                                )}
                                                <div className="text-[#04362c] text-base mb-3">
                                                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mb-2">
                                                    <Progress
                                                        value={Math.min(percentage, 100)}
                                                        className="h-3 bg-gray-200"
                                                        styleColor="#22c55e"
                                                    />
                                                </div>

                                                {/* Target Date and Monthly Savings Needed */}
                                                <div className="mt-2 space-y-1">
                                                    {goal.targetDate && (
                                                        <div className="text-sm text-[#04362c]/80">
                                                            Target Date: {new Date(goal.targetDate).toLocaleDateString('en-GB')}
                                                        </div>
                                                    )}
                                                    {daysRemaining > 0 && monthlyRequired > 0 && (
                                                        <div className="text-sm text-[#04362c]/80">
                                                            Monthly savings needed: {formatCurrency(monthlyRequired)}/month
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Side - Actions and Remaining */}
                                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingGoal(goal);
                                                        }}
                                                        className="border-gray-300 hover:bg-[#0DAD8D] hover:border-[#0DAD8D] bg-gray-200 transition-all duration-200 hover:scale-110 group"
                                                        title="Edit goal"
                                                    >
                                                        <Edit className="h-4 w-4 text-[#04362c] group-hover:text-white transition-colors duration-200" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setGoalToDelete(goal);
                                                        }}
                                                        className="border-gray-300 hover:bg-red-500 hover:border-red-500 bg-gray-200 transition-all duration-200 hover:scale-110 group"
                                                        title="Delete goal"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-[#04362c] group-hover:text-white transition-colors duration-200" />
                                                    </Button>
                                                </div>

                                                <span className="text-base text-[#04362c] font-bold whitespace-nowrap">
                                                    Left: {formatCurrency(remaining)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Add Goal Dialog */}
                {isAddDialogOpen && (
                    <Dialog
                        open={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                    >
                        <GoalDialog
                            onSave={handleAddGoal}
                            onCancel={() => setIsAddDialogOpen(false)}
                        />
                    </Dialog>
                )}

                {/* Edit Goal Dialog */}
                {editingGoal && (
                    <Dialog
                        open={!!editingGoal}
                        onOpenChange={() => setEditingGoal(null)}
                    >
                        <GoalDialog
                            goal={editingGoal}
                            onSave={handleEditGoal}
                            onCancel={() => setEditingGoal(null)}
                        />
                    </Dialog>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Financial Goal</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the financial goal "{goalToDelete?.category || goalToDelete?.title}"? 
                                This action cannot be undone and will remove all associated goal data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="px-6 py-3 rounded-xl border border-[#04362c]/20 bg-white text-base font-semibold text-[#04362c] hover:bg-[#04362c]/5 transition-all">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => goalToDelete && handleDeleteGoal(goalToDelete)}
                                className="px-6 py-3 rounded-xl bg-[#0DAD8D] text-white text-base font-semibold shadow-lg hover:bg-[#0DAD8D]/90 transition-all inline-flex items-center gap-2 justify-center"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Goal Detail Page - Removed, using edit dialog on click instead */}
            </div>
        </div>
    );
}

function GoalDialog({ goal, onSave, onCancel }) {
    // Calculate default target date (6 months from now)
    const getDefaultTargetDate = () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 6);
        return date.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        goalName: goal?.title || goal?.category || "6-Month Safety Net",
        description: goal?.description || "Build an emergency fund to cover 6 months of essential expenses",
        targetAmount: goal?.targetAmount || 20000,
        currentAmount: goal?.currentAmount || 0,
        targetDate: goal?.targetDate || getDefaultTargetDate(),
        category: goal?.category || "Emergency Fund",
        priority: goal?.priority || "high",
        isCompleted: goal?.isCompleted || false,
    });
    const [errorMessage, setErrorMessage] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate Target Amount > Current Amount
        const targetAmt = parseFloat(formData.targetAmount) || 0;
        const currentAmt = parseFloat(formData.currentAmount) || 0;

        if (targetAmt <= currentAmt) {
            setErrorMessage("Target Amount must be greater than Current Amount");
            return;
        }

        if (goal) {
            onSave({ ...goal, ...formData });
        } else {
            onSave(formData);
        }
    };

    return (
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">{goal ? "Edit Financial Goal" : "Add New Financial Goal"}</DialogTitle>
                <DialogDescription className="text-sm text-[#04362c]/70">
                    {goal
                        ? "Update your goal details and track your progress"
                        : "Set up a new savings goal to track your financial progress"}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="goalName" className="block text-sm font-medium text-[#04362c]/90 mb-1">Goal Name</Label>
                    <Input
                        id="goalName"
                        type="text"
                        value={formData.goalName}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                goalName: e.target.value,
                            }))
                        }
                        placeholder="e.g., Emergency Fund, Dream Vacation, New Car"
                        className="bg-white"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="description" className="block text-sm font-medium text-[#04362c]/90 mb-1">Description (Optional)</Label>
                    <Input
                        id="description"
                        type="text"
                        value={formData.description}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                            }))
                        }
                        placeholder="Brief description of your goal"
                        className="bg-white"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="category" className="block text-sm font-medium text-[#04362c]/90 mb-1">Category</Label>
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
                    <div>
                        <Label htmlFor="priority" className="block text-sm font-medium text-[#04362c]/90 mb-1">Priority</Label>
                        <Select
                            value={formData.priority}
                            onValueChange={(value) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    priority: value,
                                }))
                            }
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low" className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30">Low</SelectItem>
                                <SelectItem value="medium" className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30">Medium</SelectItem>
                                <SelectItem value="high" className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30">High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="targetAmount" className="block text-sm font-medium text-[#04362c]/90 mb-1">Target Amount</Label>
                        <Input
                            id="targetAmount"
                            type="text"
                            value={formData.targetAmount}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and one decimal point
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    setFormData((prev) => ({
                                        ...prev,
                                        targetAmount: value,
                                    }));
                                }
                            }}
                            placeholder="0.00"
                            className="bg-white"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="currentAmount" className="block text-sm font-medium text-[#04362c]/90 mb-1">Current Amount</Label>
                        <Input
                            id="currentAmount"
                            type="text"
                            value={formData.currentAmount}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and one decimal point
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    setFormData((prev) => ({
                                        ...prev,
                                        currentAmount: value,
                                    }));
                                }
                            }}
                            placeholder="0.00"
                            className="bg-white"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="targetDate" className="block text-sm font-medium text-[#04362c]/90 mb-1">Target Date</Label>
                    <Input
                        id="targetDate"
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                targetDate: e.target.value,
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
                            {goal ? "Update" : "Add"} Goal
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