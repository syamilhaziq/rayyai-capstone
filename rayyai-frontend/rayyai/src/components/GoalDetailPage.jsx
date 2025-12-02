import { useEffect, useState, useMemo } from "react";
import { X, Plus, Edit, Trash2, Target, Plane, Car, Home, GraduationCap, PiggyBank, TrendingUp, Circle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { API_BASE_URL } from "../services/api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
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

const getMonthAbbreviation = (monthIndex) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[monthIndex];
};

// Icon mapping for goal categories
const getGoalIcon = (category) => {
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
    return iconMap[category] || Circle;
};

export default function GoalDetailPage({ goal, onClose }) {
    const [contributions, setContributions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("Month"); // "Month" or "Year"
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    });
    const [isAddContributionDialogOpen, setIsAddContributionDialogOpen] = useState(false);
    const [editingContribution, setEditingContribution] = useState(null);
    const [hoveredContributionId, setHoveredContributionId] = useState(null);
    const [contributionToDelete, setContributionToDelete] = useState(null);

    useEffect(() => {
        const fetchContributions = async () => {
            if (!goal) return;
            
            setLoading(true);
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                
                // Fetch contributions for this goal
                // Note: This assumes there's an endpoint to fetch contributions
                // If not available, we'll need to create a different approach
                const response = await fetch(
                    `${API_BASE_URL}/goals/${goal.id}/contributions`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setContributions(data || []);
                } else {
                    // If endpoint doesn't exist, create mock contributions from goal data
                    // This is a fallback - in production, you'd want a proper API endpoint
                    console.warn('Contributions endpoint not available, using fallback data');
                    setContributions([]);
                }
            } catch (error) {
                console.error('Error fetching contributions:', error);
                setContributions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchContributions();
    }, [goal]);

    // Group contributions by month or year for the bar chart
    const chartData = useMemo(() => {
        if (viewMode === "Year") {
            // Group by year
            const yearMap = {};
            
            contributions.forEach(contribution => {
                const date = new Date(contribution.date || contribution.created_at || new Date());
                const year = date.getFullYear();
                const yearKey = year.toString();
            
                if (!yearMap[yearKey]) {
                    yearMap[yearKey] = {
                        period: yearKey,
                        amount: 0,
                        date: date
                    };
                }
                yearMap[yearKey].amount += contribution.amount || 0;
            });

            // Sort by date and get all years
            const sorted = Object.values(yearMap)
                .sort((a, b) => a.date - b.date);

            return sorted;
        } else {
            // Group by month
            const monthMap = {};
            
            contributions.forEach(contribution => {
                const date = new Date(contribution.date || contribution.created_at || new Date());
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthLabel = getMonthAbbreviation(date.getMonth());
                
                if (!monthMap[monthKey]) {
                    monthMap[monthKey] = {
                        period: monthLabel,
                        amount: 0,
                        date: date
                    };
                }
                monthMap[monthKey].amount += contribution.amount || 0;
            });

            // Sort by date and show all months
            const sorted = Object.values(monthMap)
                .sort((a, b) => a.date - b.date);

            return sorted;
        }
    }, [contributions, viewMode]);

    // Filter contributions for selected date
    const selectedDateContributions = useMemo(() => {
        if (!selectedDate) return [];
        
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);
        
        return contributions.filter(contribution => {
            const contributionDate = new Date(contribution.date || contribution.created_at || new Date());
            contributionDate.setHours(0, 0, 0, 0);
            return contributionDate.getTime() === selected.getTime();
        }).sort((a, b) => new Date(b.date || b.created_at || new Date()) - new Date(a.date || a.created_at || new Date()));
    }, [contributions, selectedDate]);

    const totalSaved = useMemo(() => {
        return selectedDateContributions.reduce((sum, contribution) => sum + (contribution.amount || 0), 0);
    }, [selectedDateContributions]);

    const handleAddContribution = async (contributionData) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            // Add contribution to goal
            const response = await fetch(`${API_BASE_URL}/goals/${goal.id}/contribute`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: parseFloat(contributionData.amount) || 0,
                    description: contributionData.description || "",
                    date: contributionData.date || new Date().toISOString().split('T')[0]
                })
            });

            if (response.ok) {
                setIsAddContributionDialogOpen(false);
                // Refresh contributions
                const fetchContributions = async () => {
                    const contribResponse = await fetch(
                        `${API_BASE_URL}/goals/${goal.id}/contributions`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    if (contribResponse.ok) {
                        const data = await contribResponse.json();
                        setContributions(data || []);
                    }
                };
                await fetchContributions();
            } else {
                const error = await response.json().catch(() => ({ detail: 'Failed to add contribution' }));
                alert(error.detail || 'Failed to add contribution');
            }
        } catch (error) {
            console.error('Error adding contribution:', error);
            alert('Failed to add contribution. Please try again.');
        }
    };

    const handleEditContribution = async (updatedContribution) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            // Update contribution
            const response = await fetch(`${API_BASE_URL}/goals/${goal.id}/contributions/${updatedContribution.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: parseFloat(updatedContribution.amount) || 0,
                    description: updatedContribution.description || "",
                    date: updatedContribution.date
                })
            });

            if (response.ok) {
                // Refresh contributions
                const fetchContributions = async () => {
                    const contribResponse = await fetch(
                        `${API_BASE_URL}/goals/${goal.id}/contributions`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    if (contribResponse.ok) {
                        const data = await contribResponse.json();
                        setContributions(data || []);
                    }
                };
                await fetchContributions();
                setEditingContribution(null);
            } else {
                const error = await response.json().catch(() => ({ detail: 'Failed to update contribution' }));
                alert(error.detail || 'Failed to update contribution');
            }
        } catch (error) {
            console.error('Error updating contribution:', error);
            alert('Failed to update contribution. Please try again.');
        }
    };

    const handleDeleteContribution = async () => {
        const contribution = contributionToDelete;
        if (!contribution) return;
        
        setContributionToDelete(null);
        
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            const response = await fetch(`${API_BASE_URL}/goals/${goal.id}/contributions/${contribution.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Refresh contributions
                const fetchContributions = async () => {
                    const contribResponse = await fetch(
                        `${API_BASE_URL}/goals/${goal.id}/contributions`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    if (contribResponse.ok) {
                        const data = await contribResponse.json();
                        setContributions(data || []);
                    }
                };
                fetchContributions();
            } else {
                const error = await response.json().catch(() => ({ detail: 'Failed to delete contribution' }));
                alert(error.detail || 'Failed to delete contribution');
            }
        } catch (error) {
            console.error('Error deleting contribution:', error);
            alert('Failed to delete contribution. Please try again.');
        }
    };

    const GoalIcon = getGoalIcon(goal?.category);

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
                            className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-md flex-shrink-0 focus:outline-none focus:ring-0"
                        >
                            <X className="h-5 w-5 sm:h-6 sm:w-6 text-[#04362c]" />
                        </button>
                    </div>

                    {/* Analysis Section - Expanded */}
                    <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-10 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                            <h3 className="text-3xl font-bold text-[#04362c]">{goal?.category || goal?.title} Analysis</h3>
                            <div className="w-full sm:w-auto">
                                <Select
                                    value={viewMode}
                                    onValueChange={(value) => setViewMode(value)}
                                >
                                    <SelectTrigger className="bg-white w-full sm:w-auto text-base">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem 
                                            value="Month" 
                                            className="text-base text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            Month
                                        </SelectItem>
                                        <SelectItem 
                                            value="Year" 
                                            className="text-base text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            Year
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {/* Bar Chart */}
                        <div className="h-80 sm:h-96 md:h-[500px] lg:h-[600px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis 
                                        dataKey="period" 
                                        tick={{ fill: '#04362c', fontSize: 12, fontWeight: 500 }}
                                        axisLine={{ stroke: '#e5e7eb' }}
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
                                        formatter={(value) => formatCurrency(value)}
                                        labelStyle={{ color: '#04362c', fontWeight: 600 }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar 
                                        dataKey="amount" 
                                        fill="#04362c" 
                                        radius={[8, 8, 0, 0]}
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={(e) => {
                                            if (e.target) {
                                                e.target.style.transform = 'translateY(-4px)';
                                                e.target.style.transition = 'transform 0.2s ease-out';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (e.target) {
                                                e.target.style.transform = 'translateY(0)';
                                            }
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Add Goal Category Button - Outside the card */}
                    <div className="mb-4 sm:mb-6">
                        <Button
                            onClick={() => setIsAddContributionDialogOpen(true)}
                            className="bg-[#04362c] hover:bg-[#04362c]/90 text-white inline-flex items-center gap-2 text-lg px-6 py-3"
                        >
                            <Plus className="h-5 w-5" />
                            Add Goal Category
                        </Button>
                    </div>

                    {/* Total Saved Section */}
                    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                            <h3 className="text-3xl font-bold text-[#04362c]">Total Saved</h3>
                            <Input
                                type="date"
                                value={selectedDate.toISOString().split('T')[0]}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const newDate = new Date(e.target.value);
                                        newDate.setHours(0, 0, 0, 0);
                                        setSelectedDate(newDate);
                                    }
                                }}
                                className="bg-white w-auto text-base"
                            />
                        </div>

                        {/* Contribution List */}
                        <div className="space-y-3 sm:space-y-4">
                            {loading ? (
                                <div className="text-center py-8 text-gray-500 text-sm sm:text-base">Loading contributions...</div>
                            ) : selectedDateContributions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm sm:text-base">No contributions found for this date</div>
                            ) : (
                                selectedDateContributions.map((contribution, index) => {
                                    const contributionId = contribution.id || contribution.contribution_id || index;
                                    return (
                                        <div 
                                            key={contributionId}
                                            className="flex items-start gap-3 sm:gap-4 pt-3 sm:pt-4 pb-3 sm:pb-4 border-b border-gray-200 last:border-b-0 group hover:bg-gray-50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-lg p-2 -m-2 relative"
                                            onMouseEnter={() => setHoveredContributionId(contributionId)}
                                            onMouseLeave={() => setHoveredContributionId(null)}
                                        >
                                            {/* Icon */}
                                            <div className="flex-shrink-0">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <GoalIcon className="h-7 w-7 sm:h-8 sm:w-8 text-[#04362c]" />
                                                </div>
                                            </div>

                                            {/* Contribution Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-[#04362c] mb-1 text-xl break-words">
                                                    {contribution.description || 'Contribution'}
                                                </div>
                                                <div className="text-base text-gray-600 break-words">
                                                    {contribution.note || 'No description'}
                                                </div>
                                            </div>

                                            {/* Amount, Date, and Edit Button */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {/* Edit Button - Shows on Hover */}
                                                {hoveredContributionId === contributionId && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingContribution(contribution);
                                                        }}
                                                        className="p-2 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-100 transition-all"
                                                    >
                                                        <Edit className="h-4 w-4 text-[#04362c]" />
                                                    </button>
                                                )}
                                                
                                                <div className="flex flex-col items-end">
                                                    <div className="font-bold text-[#04362c] mb-1 text-xl whitespace-nowrap">
                                                        {formatCurrency(contribution.amount || 0)}
                                                    </div>
                                                    <div className="text-base text-gray-500 whitespace-nowrap">
                                                        {formatDate(contribution.date || contribution.created_at || new Date())}
                                                    </div>
                                                </div>
                                                
                                                {/* Delete Button - Shows on Hover */}
                                                {hoveredContributionId === contributionId && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setContributionToDelete(contribution);
                                                        }}
                                                        className="p-2 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-100 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-[#04362c]" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Add Contribution Dialog */}
                {isAddContributionDialogOpen && (
                    <Dialog
                        open={isAddContributionDialogOpen}
                        onOpenChange={setIsAddContributionDialogOpen}
                    >
                        <ContributionDialog
                            goal={goal}
                            onSave={handleAddContribution}
                            onCancel={() => setIsAddContributionDialogOpen(false)}
                        />
                    </Dialog>
                )}

                {/* Edit Contribution Dialog */}
                {editingContribution && (
                    <Dialog
                        open={!!editingContribution}
                        onOpenChange={() => setEditingContribution(null)}
                    >
                        <ContributionDialog
                            contribution={editingContribution}
                            goal={goal}
                            onSave={handleEditContribution}
                            onCancel={() => setEditingContribution(null)}
                        />
                    </Dialog>
                )}

                {/* Delete Contribution Confirmation Dialog */}
                <AlertDialog open={!!contributionToDelete} onOpenChange={(open) => !open && setContributionToDelete(null)}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Contribution</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{contributionToDelete?.description || 'this contribution'}"? 
                                This action cannot be undone and will remove all associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="px-6 py-3 rounded-xl border border-[#04362c]/20 bg-white text-base font-semibold text-[#04362c] hover:bg-[#04362c]/5 transition-all">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteContribution}
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

function ContributionDialog({ contribution, goal, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        description: contribution?.description || "",
        amount: contribution?.amount || 0,
        date: contribution?.date ? new Date(contribution.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        note: contribution?.note || "",
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

        if (!formData.date) {
            alert("Date is required");
            return;
        }

        onSave({ ...contribution, ...formData });
    };

    return (
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">
                    {contribution ? "Edit Contribution" : "Add Goal Category"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#04362c]/70">
                    {contribution
                        ? "Update contribution details"
                        : `Add a new contribution to ${goal?.category || goal?.title}`}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="contribution-description" className="block text-sm font-medium text-[#04362c]/90 mb-1">Goal Title</Label>
                    <Input
                        id="contribution-description"
                        value={formData.description}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                            }))
                        }
                        placeholder="e.g., Monthly Savings"
                        className="bg-white"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="contribution-note" className="block text-sm font-medium text-[#04362c]/90 mb-1">Goal Description</Label>
                    <Input
                        id="contribution-note"
                        value={formData.note}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                note: e.target.value,
                            }))
                        }
                        placeholder="e.g., November savings"
                        className="bg-white"
                    />
                </div>

                <div>
                    <Label htmlFor="contribution-amount" className="block text-sm font-medium text-[#04362c]/90 mb-1">Amount</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">RM</span>
                        <Input
                            id="contribution-amount"
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
                    <Label htmlFor="contribution-date" className="block text-sm font-medium text-[#04362c]/90 mb-1">Date</Label>
                    <Input
                        id="contribution-date"
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

                <DialogFooter className="w-full">
                    <div className="flex gap-3 w-full">
                        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-transparent hover:shadow-md transition-shadow">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1 px-4 py-2 bg-[#04362c] hover:bg-[#04362c]/90 text-white rounded-lg font-medium">
                            {contribution ? "Update" : "Add"} Goal Category
                        </Button>
                    </div>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

