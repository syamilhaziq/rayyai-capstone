import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus,
    ArrowUpDown,
    Search,
    Filter,
    X,
    PenTool,
    Upload,
    Eye,
    EyeClosed,
    Trash2,
    Info,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";
import GlobalLoader from "./GlobalLoader";

// Import API
import { transactionApi, accountApi, scannerApi } from "../services/api";

import { Input } from "./ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
} from "./ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from "./ui/pagination";

const formatCurrency = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
        return "RM 0";
    }
    try {
        const formatted = new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            maximumFractionDigits: 2,
        }).format(numeric);
        return formatted.replace("RM", "RM ").replace(/\s+/, " ");
    } catch {
        return `RM ${numeric.toLocaleString("en-MY", {
            maximumFractionDigits: 2,
        })}`;
    }
};

import {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardAction,
    CardDescription,
    CardContent,
} from "./ui/card";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "./ui/dialog";

import { Checkbox } from "./ui/checkbox";

// const mockTransaction = [
//     {
//         id: "1",
//         date: "2024-01-15",
//         description: "Salary Deposit",
//         amount: 5100,
//         category: "Income",
//         type: "income",
//         account: "Savings/Current Account",
//         supplier: "ABC Corp",
//         department: "Engineering",
//         project: "Q1 Development",
//         location: "New York Office",
//         reference: "PAY-2024-001",
//     },
//     {
//         id: "2",
//         date: "2024-01-13",
//         description: "Office Supplies Purchase",
//         amount: -150,
//         category: "Groceries",
//         type: "expense",
//         account: "Credit Card",
//         supplier: "Office Depot",
//         department: "Administration",
//         project: "General Operations",
//         location: "Downtown Branch",
//         reference: "EXP-2024-002",
//     },
//     {
//         id: "3",
//         date: "2024-01-12",
//         description: "Consulting Fees",
//         amount: 3200,
//         category: "Income",
//         type: "income",
//         account: "Debit Card",
//         supplier: "Tech Solutions Inc",
//         department: "Consulting",
//         project: "Digital Transformation",
//         location: "Remote",
//         reference: "INV-2024-003",
//     },
//     {
//         id: "4",
//         date: "2024-01-10",
//         description: "Monthly Utility Bill",
//         amount: -89,
//         category: "Utilities",
//         type: "expense",
//         account: "E-Wallet",
//         supplier: "ConEd Electric",
//         department: "Facilities",
//         project: "Building Maintenance",
//         location: "Main Office",
//         reference: "UTIL-2024-004",
//     },
//     {
//         id: "5",
//         date: "2024-01-08",
//         description: "Freelance Web Design",
//         amount: 750,
//         category: "Income",
//         type: "income",
//         account: "Cash",
//         supplier: "Local Business Co",
//         department: "Design",
//         project: "Website Redesign",
//         location: "Brooklyn Office",
//         reference: "FRE-2024-005",
//     },
//     {
//         id: "6",
//         date: "2024-01-07",
//         description: "Transportation Expense",
//         amount: -45,
//         category: "Transportation",
//         type: "expense",
//         account: "Credit Card",
//         supplier: "Uber",
//         department: "Sales",
//         project: "Client Meeting",
//         location: "Manhattan",
//         reference: "EXP-2024-006",
//     },
//     {
//         id: "7",
//         date: "2024-01-06",
//         description: "Software Subscription",
//         amount: -99,
//         category: "Utilities",
//         type: "expense",
//         account: "Debit Card",
//         supplier: "Adobe Inc",
//         department: "Design",
//         project: "Creative Suite",
//         location: "Online",
//         reference: "SUB-2024-007",
//     },
//     {
//         id: "8",
//         date: "2024-01-05",
//         description: "Client Payment",
//         amount: 2500,
//         category: "Income",
//         type: "income",
//         account: "Savings/Current Account",
//         supplier: "XYZ Corp",
//         department: "Sales",
//         project: "Product Delivery",
//         location: "Chicago Office",
//         reference: "INV-2024-008",
//     },
//     {
//         id: "9",
//         date: "2024-01-04",
//         description: "Team Lunch",
//         amount: -120,
//         category: "Food & Dining",
//         type: "expense",
//         account: "Cash",
//         supplier: "Italian Restaurant",
//         department: "Human Resources",
//         project: "Team Building",
//         location: "Downtown",
//         reference: "EXP-2024-009",
//     },
//     {
//         id: "10",
//         date: "2024-01-03",
//         description: "Office Rent",
//         amount: -2000,
//         category: "Utilities",
//         type: "expense",
//         account: "Savings/Current Account",
//         supplier: "Property Management LLC",
//         department: "Facilities",
//         project: "Office Space",
//         location: "New York Office",
//         reference: "RENT-2024-010",
//     },
//     {
//         id: "11",
//         date: "2024-01-02",
//         description: "Marketing Campaign Revenue",
//         amount: 4200,
//         category: "Income",
//         type: "income",
//         account: "Savings/Current Account",
//         supplier: "Marketing Partners",
//         department: "Marketing",
//         project: "Q1 Campaign",
//         location: "Remote",
//         reference: "REV-2024-011",
//     },
// ];

// fixed list for categories - easier for dropdown.
const expenseCategories = [
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
    "Other",
];

const incomeCategories = [
    "Salary",
    "Freelance",
    "Business",
    "Investments",
    "Gifts",
    "Refunds",
    "Transfer",
    "Other",
];

// Legacy categories for backward compatibility
// Remove duplicates (both expense and income have "Other")
const categories = [...new Set([...expenseCategories, ...incomeCategories])];

// const accountTypes = [
//     "Savings/Current Account",
//     "Credit Card",
//     "Debit Card",
//     "E-Wallet",
//     "Cash",
// ];

function Transactions() {
    //add transaction dialog state
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false); //pop-up dialog for add transaction fn
    const [entryMethod, setEntryMethod] = useState("selection");

    // Transaction data state - now from API instead of mock data
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Accounts state - needed for account selection in forms
    const [accounts, setAccounts] = useState([]);
    // const [accountsLoading, setAccountsLoading] = useState(true);

    //filter states
    const [searchTerm, setSearchTerm] = useState(""); //depend input search box
    const [categoryFilter, setCategoryFilter] = useState(() => {
        // Load from localStorage on initial render
        return localStorage.getItem("transactionCategoryFilter") || "";
    });
    const [typeFilter, setTypeFilter] = useState(() => {
        // Load from localStorage on initial render
        return localStorage.getItem("transactionTypeFilter") || "";
    });
    const [selectedMonth, setSelectedMonth] = useState(() => {
        // Load from localStorage on initial render
        return localStorage.getItem("transactionSelectedMonth") || "";
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        // Load from localStorage on initial render
        return localStorage.getItem("transactionSelectedYear") || "";
    });

    //advance filter states
    const [showMoreFilters, setShowMoreFilters] = useState(false); //toggle for More Filters button
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [accountFilter, setAccountFilter] = useState("");

    //sorting states
    const [sortField, setSortField] = useState("date"); // Which field to sort by (date, description, amount, etc.)
    const [sortDirection, setSortDirection] = useState("desc"); // Sort direction: "asc" (ascending) or "desc" (descending)

    //expanded row state
    const [expandedRow, setExpandedRow] = useState(null); // Track which row is expanded
    const [editedTransaction, setEditedTransaction] = useState(null); // Track original data before edits
    const [isSaving, setIsSaving] = useState(false); // Track save operation status

    // Suspicious transactions state - loaded from localStorage when navigating from dashboard
    const [suspiciousTransactionIds, setSuspiciousTransactionIds] = useState(
        new Set()
    );
    const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false);

    //delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

    //bulk delete state
    const [selectedTransactions, setSelectedTransactions] = useState(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    //pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        // Load from localStorage on initial render
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("transactionItemsPerPage");
            if (saved) {
                const parsed = parseInt(saved, 10);
                // Validate that it's one of the allowed values
                if ([10, 20, 50, 100].includes(parsed)) {
                    return parsed;
                }
            }
        }
        return 10;
    });

    // ===========================
    // API Functions
    // ===========================

    // Fetch all transactions from backend
    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Build filter params for backend
            const params = {};
            if (categoryFilter) params.category = categoryFilter;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (minAmount) params.min_amount = parseFloat(minAmount);
            if (maxAmount) params.max_amount = parseFloat(maxAmount);

            // Try to fetch from backend, fallback to mock data if connection fails
            try {
                const data = await transactionApi.getAll(params, true);
                setTransactions(data);
            } catch (apiError) {
                console.warn(
                    "Backend not available, using mock data:",
                    apiError.message
                );

                // Mock transaction data for development
                const mockTransactions = [
                    {
                        id: 1,
                        amount: -45.5,
                        description: "Grocery Store Purchase",
                        category: "Food & Dining",
                        date: "2024-01-15",
                        account_id: 1,
                        account: { name: "Checking Account", type: "checking" },
                        type: "expense",
                    },
                    {
                        id: 2,
                        amount: 2500.0,
                        description: "Salary Deposit",
                        category: "Income",
                        date: "2024-01-14",
                        account_id: 1,
                        account: { name: "Checking Account", type: "checking" },
                        type: "income",
                    },
                    {
                        id: 3,
                        amount: -120.0,
                        description: "Electric Bill",
                        category: "Utilities",
                        date: "2024-01-13",
                        account_id: 1,
                        account: { name: "Checking Account", type: "checking" },
                        type: "expense",
                    },
                    {
                        id: 4,
                        amount: -25.99,
                        description: "Netflix Subscription",
                        category: "Entertainment",
                        date: "2024-01-12",
                        account_id: 2,
                        account: { name: "Credit Card", type: "credit" },
                        type: "expense",
                    },
                    {
                        id: 5,
                        amount: -89.99,
                        description: "Gas Station",
                        category: "Transportation",
                        date: "2024-01-11",
                        account_id: 1,
                        account: { name: "Checking Account", type: "checking" },
                        type: "expense",
                    },
                    {
                        id: 6,
                        amount: 500.0,
                        description: "Freelance Payment",
                        category: "Income",
                        date: "2024-01-10",
                        account_id: 1,
                        account: { name: "Checking Account", type: "checking" },
                        type: "income",
                    },
                    {
                        id: 7,
                        amount: -15.5,
                        description: "Coffee Shop",
                        category: "Food & Dining",
                        date: "2024-01-09",
                        account_id: 2,
                        account: { name: "Credit Card", type: "credit" },
                        type: "expense",
                    },
                    {
                        id: 8,
                        amount: -200.0,
                        description: "Rent Payment",
                        category: "Housing",
                        date: "2024-01-08",
                        account_id: 1,
                        account: { name: "Checking Account", type: "checking" },
                        type: "expense",
                    },
                ];

                // Apply filters to mock data
                let filteredData = mockTransactions;

                if (categoryFilter) {
                    filteredData = filteredData.filter(
                        (t) => t.category === categoryFilter
                    );
                }
                if (startDate) {
                    filteredData = filteredData.filter(
                        (t) => t.date >= startDate
                    );
                }
                if (endDate) {
                    filteredData = filteredData.filter(
                        (t) => t.date <= endDate
                    );
                }
                if (minAmount) {
                    filteredData = filteredData.filter(
                        (t) => Math.abs(t.amount) >= parseFloat(minAmount)
                    );
                }
                if (maxAmount) {
                    filteredData = filteredData.filter(
                        (t) => Math.abs(t.amount) <= parseFloat(maxAmount)
                    );
                }

                setTransactions(filteredData);
            }
        } catch (err) {
            console.error("Failed to fetch transactions:", err);
            setError(err.message || "Failed to load transactions");
        } finally {
            setLoading(false);
        }
    }, [
        categoryFilter,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        selectedMonth,
        selectedYear,
    ]);

    // Fetch accounts for dropdown selections
    const fetchAccounts = useCallback(async () => {
        try {
            // setAccountsLoading(true);

            // Try to fetch from backend, fallback to mock data if connection fails
            try {
                const data = await accountApi.getAll();
                setAccounts(data);
            } catch (apiError) {
                console.warn(
                    "Backend not available, using mock accounts:",
                    apiError.message
                );

                // Mock account data for development
                const mockAccounts = [
                    {
                        id: 1,
                        name: "Checking Account",
                        type: "checking",
                        balance: 2500.0,
                        currency: "USD",
                    },
                    {
                        id: 2,
                        name: "Credit Card",
                        type: "credit",
                        balance: -500.0,
                        currency: "USD",
                    },
                    {
                        id: 3,
                        name: "Savings Account",
                        type: "savings",
                        balance: 10000.0,
                        currency: "USD",
                    },
                ];

                setAccounts(mockAccounts);
            }
        } catch (err) {
            console.error("Failed to fetch accounts:", err);
        } finally {
            // setAccountsLoading(false);
        }
    }, []);

    // Fetch transactions on component mount
    useEffect(() => {
        fetchTransactions();
        fetchAccounts();
    }, [fetchTransactions, fetchAccounts]);

    // Load preferences from localStorage on mount (in case component remounts)
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("transactionItemsPerPage");
            if (saved) {
                const parsed = parseInt(saved, 10);
                if ([10, 20, 50, 100].includes(parsed)) {
                    // Only update if different to avoid unnecessary re-renders
                    setItemsPerPage((prev) =>
                        prev !== parsed ? parsed : prev
                    );
                }
            }

            // Load suspicious transaction IDs from localStorage
            const suspiciousData = localStorage.getItem(
                "suspiciousTransactionIds"
            );
            if (suspiciousData) {
                try {
                    const parsed = JSON.parse(suspiciousData);
                    // Only use if data is less than 1 hour old
                    if (
                        parsed.timestamp &&
                        Date.now() - parsed.timestamp < 3600000
                    ) {
                        setSuspiciousTransactionIds(new Set(parsed.ids || []));
                        // Clear after loading to avoid stale data
                        setTimeout(() => {
                            localStorage.removeItem("suspiciousTransactionIds");
                        }, 100);
                    } else {
                        localStorage.removeItem("suspiciousTransactionIds");
                    }
                } catch (err) {
                    console.warn(
                        "Failed to parse suspicious transaction IDs:",
                        err
                    );
                    localStorage.removeItem("suspiciousTransactionIds");
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Save preferences to localStorage when they change
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(
                "transactionItemsPerPage",
                itemsPerPage.toString()
            );
        }
    }, [itemsPerPage]);

    useEffect(() => {
        if (categoryFilter) {
            localStorage.setItem("transactionCategoryFilter", categoryFilter);
        } else {
            localStorage.removeItem("transactionCategoryFilter");
        }
    }, [categoryFilter]);

    useEffect(() => {
        if (typeFilter) {
            localStorage.setItem("transactionTypeFilter", typeFilter);
        } else {
            localStorage.removeItem("transactionTypeFilter");
        }
    }, [typeFilter]);

    useEffect(() => {
        if (selectedMonth) {
            localStorage.setItem("transactionSelectedMonth", selectedMonth);
        } else {
            localStorage.removeItem("transactionSelectedMonth");
        }
    }, [selectedMonth]);

    useEffect(() => {
        if (selectedYear) {
            localStorage.setItem("transactionSelectedYear", selectedYear);
        } else {
            localStorage.removeItem("transactionSelectedYear");
        }
    }, [selectedYear]);

    // Note: fetchTransactions automatically re-runs when filters change
    // because it's memoized with those dependencies

    //filtering logic - this happens everytime the component renders
    //filter() => creates new array that fulfill the condition. (TRUE)
    const filteredTransactions = transactions
        .filter((transaction) => {
            //search input value will be checked to be matched with description and categories
            // .toLowerCase() converts to lowercase for case-insensitive comparison
            // .includes() checks if one string contains another
            const matchesSearch =
                transaction.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                transaction.category
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());

            // Check if category filter matches (empty string means no filter)
            // !categoryFilter means "if categoryFilter is empty/falsy"
            const matchesCategory =
                !categoryFilter || transaction.category === categoryFilter;

            const matchesType = !typeFilter || transaction.type === typeFilter;

            const matchesAccount =
                !accountFilter || transaction.account?.name === accountFilter;

            //check date range filter
            // new Date() converts string to Date object for comparison
            const transactionDate = new Date(transaction.date);
            const matchesStartDate =
                !startDate || transactionDate >= new Date(startDate);
            const matchesEndDate =
                !endDate || transactionDate <= new Date(endDate);

            // Check amount range filter
            // Math.abs() gets absolute value (converts negative expenses to positive for comparison)
            const absoluteAmount = Math.abs(transaction.amount);
            const matchesMinAmount =
                !minAmount || absoluteAmount >= parseFloat(minAmount);
            const matchesMaxAmount =
                !maxAmount || absoluteAmount <= parseFloat(maxAmount);

            // Check suspicious filter
            const txId =
                transaction.id ||
                transaction.transfer_id ||
                transaction.income_id ||
                transaction.expense_id;
            const isSuspicious =
                suspiciousTransactionIds.has(txId) ||
                suspiciousTransactionIds.has(String(txId)) ||
                suspiciousTransactionIds.has(`transfer-${txId}`) ||
                suspiciousTransactionIds.has(`income-${txId}`) ||
                suspiciousTransactionIds.has(`expense-${txId}`);
            const matchesSuspicious = !showSuspiciousOnly || isSuspicious;

            // Return true only if ALL conditions are met (AND logic)
            // This transaction will be included in filtered results
            return (
                matchesSearch &&
                matchesCategory &&
                matchesType &&
                matchesAccount &&
                matchesStartDate &&
                matchesEndDate &&
                matchesMinAmount &&
                matchesMaxAmount &&
                matchesSuspicious
            );
        })
        //sorting logic
        //sort() takes comparator function that compares two items(a and b)
        .sort((a, b) => {
            //get the  values to compare
            const aValue = a[sortField];
            const bValue = b[sortField];

            // Direction multiplier: 1 for ascending, -1 for descending
            // This flips the comparison result for descending order
            const direction = sortDirection === "asc" ? 1 : -1;

            // Special handling for date sorting
            if (sortField === "date") {
                const dateA = new Date(aValue);
                const dateB = new Date(bValue);
                return (dateA - dateB) * direction;
            }

            // Compare strings using localeCompare (handles special characters, accents, etc.)
            if (typeof aValue === "string" && typeof bValue === "string") {
                // localeCompare returns: -1 if a < b, 0 if equal, 1 if a > b
                // Multiply by direction to flip for descending order
                return aValue.localeCompare(bValue) * direction;
            }

            // Compare numbers: return -1 if a < b, 1 if a > b
            // The ternary operator chooses -1 or 1 based on comparison
            return (aValue < bValue ? -1 : 1) * direction;
        });

    // Calculate count of flagged transactions that are not deleted (exist in current transactions)
    const flaggedTransactionCount = useMemo(() => {
        if (suspiciousTransactionIds.size === 0) return 0;

        return transactions.filter((transaction) => {
            const txId =
                transaction.id ||
                transaction.transfer_id ||
                transaction.income_id ||
                transaction.expense_id;
            if (!txId) return false;

            const isSuspicious =
                suspiciousTransactionIds.has(txId) ||
                suspiciousTransactionIds.has(String(txId)) ||
                suspiciousTransactionIds.has(`transfer-${txId}`) ||
                suspiciousTransactionIds.has(`income-${txId}`) ||
                suspiciousTransactionIds.has(`expense-${txId}`);

            return isSuspicious;
        }).length;
    }, [transactions, suspiciousTransactionIds]);

    // Pagination logic
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(
        startIndex,
        endIndex
    );

    //function to handle column sorting
    const handleSort = (field) => {
        //check if clicking the same column that's already sorted
        if (sortField === field) {
            //if same column, toggle the direction (asc <=> desc)
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            //if clicking a new column, set that field and default to descending
            setSortField(field);
            setSortDirection("desc");
        }
    };

    //function to add new transaction
    const handleAddTransaction = async (newTransaction) => {
        try {
            // Get account ID - use the first account if not specified
            const accountId =
                newTransaction.accountId ||
                (accounts.length > 0 ? accounts[0].account_id : null);

            if (!accountId) {
                alert("Please select an account or create an account first.");
                return;
            }

            // Create transaction via API
            await transactionApi.create(newTransaction, accountId);

            // Close dialog
            setIsAddDialogOpen(false);
            setEntryMethod("selection");

            // Refresh transactions to show the new one
            setSelectedTransactions(new Set());
            await fetchTransactions();
        } catch (err) {
            console.error("Failed to add transaction:", err);

            // Better error message
            let errorMsg = "Unknown error";
            if (err.data && err.data.detail) {
                // Handle FastAPI validation errors (array of errors)
                if (Array.isArray(err.data.detail)) {
                    errorMsg = err.data.detail
                        .map((e) => `${e.loc?.join(".")}: ${e.msg}`)
                        .join("\n");
                } else if (typeof err.data.detail === "string") {
                    errorMsg = err.data.detail;
                } else {
                    errorMsg = JSON.stringify(err.data.detail);
                }
            } else if (err.message) {
                errorMsg = err.message;
            } else if (typeof err === "string") {
                errorMsg = err;
            }

            alert("Failed to add transaction: " + errorMsg);
        }
    };

    //function to delete transaction
    const handleDeleteTransaction = async () => {
        if (transactionToDelete) {
            try {
                // Delete transaction via API
                await transactionApi.delete(transactionToDelete);

                // Close dialog
                setDeleteDialogOpen(false);
                setTransactionToDelete(null);
                setExpandedRow(null); // Close expanded row if it was open

                // Refresh transactions to remove the deleted one
                setSelectedTransactions(new Set());
                await fetchTransactions();
            } catch (err) {
                console.error("Failed to delete transaction:", err);
                alert(
                    "Failed to delete transaction: " +
                        (err.message || "Unknown error")
                );
            }
        }
    };

    // Selection handlers
    const toggleTransactionSelection = (transactionId) => {
        setSelectedTransactions((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(transactionId)) {
                newSet.delete(transactionId);
            } else {
                newSet.add(transactionId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedTransactions.size === paginatedTransactions.length) {
            setSelectedTransactions(new Set());
        } else {
            setSelectedTransactions(
                new Set(paginatedTransactions.map((t) => t.id))
            );
        }
    };

    const handleBulkDelete = async () => {
        if (selectedTransactions.size === 0) return;

        try {
            setIsDeleting(true);
            const transactionIds = Array.from(selectedTransactions);
            await transactionApi.bulkDelete(transactionIds);

            setBulkDeleteDialogOpen(false);
            setSelectedTransactions(new Set());
            await fetchTransactions();
        } catch (err) {
            console.error("Failed to delete transactions:", err);
            alert(
                "Failed to delete transactions: " +
                    (err.message || "Unknown error")
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteAll = async () => {
        try {
            setIsDeleting(true);
            await transactionApi.deleteAll();

            setDeleteAllDialogOpen(false);
            setSelectedTransactions(new Set());
            await fetchTransactions();
        } catch (err) {
            console.error("Failed to delete all transactions:", err);
            alert(
                "Failed to delete all transactions: " +
                    (err.message || "Unknown error")
            );
        } finally {
            setIsDeleting(false);
        }
    };

    //function to update/save transaction changes
    const handleUpdateTransaction = async (transaction) => {
        try {
            setIsSaving(true);

            // Find the account ID from the account name
            const selectedAccount = accounts.find(
                (acc) =>
                    acc.account_name === transaction.account?.name ||
                    acc.account_name === transaction.account
            );
            const accountId =
                selectedAccount?.account_id ||
                transaction.accountId ||
                transaction.account?.id;

            if (!accountId) {
                alert("Please select a valid account.");
                setIsSaving(false);
                return;
            }

            // Check if transaction type has changed
            const originalTransaction = editedTransaction;
            const typeChanged =
                originalTransaction &&
                originalTransaction.type !== transaction.type;

            if (typeChanged) {
                // If type changed, delete old transaction and create new one
                // First delete the old transaction
                await transactionApi.delete(originalTransaction.id);

                // Then create new transaction with new type
                await transactionApi.create(transaction, accountId);
            } else {
                // Update transaction via API (same type)
                await transactionApi.update(
                    transaction.id,
                    transaction,
                    accountId
                );
            }

            // Close expanded row and clear edit state
            setExpandedRow(null);
            setEditedTransaction(null);

            // Refresh transactions to show the updated data
            await fetchTransactions();
        } catch (err) {
            console.error("Failed to update transaction:", err);

            // Better error message
            let errorMsg = "Unknown error";
            if (err.data && err.data.detail) {
                if (Array.isArray(err.data.detail)) {
                    errorMsg = err.data.detail
                        .map((e) => `${e.loc?.join(".")}: ${e.msg}`)
                        .join("\n");
                } else if (typeof err.data.detail === "string") {
                    errorMsg = err.data.detail;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }

            alert("Failed to update transaction: " + errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    //function to cancel editing and revert changes
    const handleCancelEdit = () => {
        if (editedTransaction) {
            // Revert to original transaction data
            setTransactions((prevTransactions) =>
                prevTransactions.map((t) =>
                    t.id === editedTransaction.id ? editedTransaction : t
                )
            );
            setEditedTransaction(null);
        }
        setExpandedRow(null);
    };

    // Effect to update startDate and endDate when month/year filter changes
    useEffect(() => {
        if (selectedMonth) {
            // Set startDate to first day of selected month
            const [year, month] = selectedMonth.split("-");
            const firstDay = `${year}-${month}-01`;
            setStartDate(firstDay);

            // Set endDate to last day of selected month
            const lastDay = new Date(parseInt(year), parseInt(month), 0);
            const lastDayStr = `${year}-${month}-${String(
                lastDay.getDate()
            ).padStart(2, "0")}`;
            setEndDate(lastDayStr);
        } else if (selectedYear) {
            // Set startDate to first day of selected year
            setStartDate(`${selectedYear}-01-01`);
            // Set endDate to last day of selected year
            setEndDate(`${selectedYear}-12-31`);
        }
        // Note: We don't auto-clear dates when month/year are cleared
        // to preserve manually set date ranges in advanced filters
    }, [selectedMonth, selectedYear]);

    //function to clear all filters
    // Function to clear suspicious flag for a transaction
    const clearSuspiciousFlag = (transaction) => {
        const txId =
            transaction.id ||
            transaction.transfer_id ||
            transaction.income_id ||
            transaction.expense_id;
        if (!txId) return;

        // Remove all possible ID formats from the set
        const newSuspiciousIds = new Set(suspiciousTransactionIds);
        newSuspiciousIds.delete(txId);
        newSuspiciousIds.delete(String(txId));
        newSuspiciousIds.delete(`transfer-${txId}`);
        newSuspiciousIds.delete(`income-${txId}`);
        newSuspiciousIds.delete(`expense-${txId}`);

        setSuspiciousTransactionIds(newSuspiciousIds);

        // Also update localStorage if it exists
        const suspiciousData = localStorage.getItem("suspiciousTransactionIds");
        if (suspiciousData) {
            try {
                const parsed = JSON.parse(suspiciousData);
                const updatedIds = (parsed.ids || []).filter((id) => {
                    const normalized = String(id).replace(
                        /^(transfer-|income-|expense-)/,
                        ""
                    );
                    return (
                        normalized !== String(txId) &&
                        id !== txId &&
                        id !== String(txId) &&
                        id !== `transfer-${txId}` &&
                        id !== `income-${txId}` &&
                        id !== `expense-${txId}`
                    );
                });
                localStorage.setItem(
                    "suspiciousTransactionIds",
                    JSON.stringify({
                        ids: updatedIds,
                        timestamp: parsed.timestamp || Date.now(),
                    })
                );
            } catch (err) {
                console.warn(
                    "Failed to update suspicious transaction IDs in localStorage:",
                    err
                );
            }
        }
    };

    const clearFilter = () => {
        setSearchTerm("");
        setCategoryFilter("");
        setTypeFilter("");
        setSelectedMonth("");
        setSelectedYear("");
        setStartDate("");
        setEndDate("");
        setAccountFilter("");
        setMinAmount("");
        setMaxAmount("");
        setShowMoreFilters(false);
        setShowSuspiciousOnly(false);
    };

    const activeFilterCount =
        (searchTerm ? 1 : 0) +
        (categoryFilter ? 1 : 0) +
        (typeFilter ? 1 : 0) +
        (selectedMonth ? 1 : 0) +
        (selectedYear ? 1 : 0) +
        (accountFilter ? 1 : 0) +
        (startDate && !selectedMonth && !selectedYear ? 1 : 0) +
        (endDate && !selectedMonth && !selectedYear ? 1 : 0) +
        (minAmount ? 1 : 0) +
        (maxAmount ? 1 : 0) +
        (showSuspiciousOnly ? 1 : 0);

    const hasActiveFilter = activeFilterCount > 0;

    // ===========================
    // Loading & Error States
    // ===========================

    // Brand token cache for consistent styling (matching Intelligence Dashboard)
    const brand = {
        ink: "#04362c",
        mint: "#0DAD8D",
        surface: "#eef2f0",
        ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0DAD8D]",
    };

    if (loading && transactions.length === 0) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: brand.surface }}
            >
                <div className="text-center">
                    <GlobalLoader size="medium" className="mx-auto mb-4" />
                    <p className="text-black/70 text-lg">
                        Loading transactions...
                    </p>
                </div>
            </div>
        );
    }

    if (error && transactions.length === 0) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: brand.surface }}
            >
                <div className="text-center max-w-md">
                    <div className="text-red-600 mb-4">
                        <X className="h-16 w-16 mx-auto" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#04362c] mb-2">
                        Error Loading Transactions
                    </h2>
                    <p className="text-[#04362c]/80 mb-6">{error}</p>
                    <button
                        onClick={fetchTransactions}
                        className="px-6 py-3 bg-[#04362c] text-white rounded-lg hover:bg-[#04362c]/90 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            id="transaction-history-page"
            className="min-h-screen text-lg md:text-xl lg:text-2xl flex flex-col text-black"
            style={{
                background: brand.surface,
                margin: "0",
                border: "0",
                padding: "80px",
            }}
        >
            <style>{`
              #transaction-history-page button.add-transaction-btn,
              #transaction-history-page button.add-transaction-btn * { color: white !important; }
            `}</style>
            <div className="w-full">
                {/* Error banner for errors after initial load */}
                {error && transactions.length > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <X className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-600 hover:text-red-800"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* header section */}
                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-4">
                        <h1
                            className="text-4xl sm:text-5xl md:text-6xl font-bold text-left"
                            style={{ color: "#04362c" }}
                        >
                            Transaction History
                        </h1>
                    </div>
                    <p
                        className="font-medium text-3xl leading-relaxed mb-8 text-left"
                        style={{ color: "rgba(4, 54, 44, 0.9)" }}
                    >
                        View and manage all your financial transactions
                    </p>
                </div>

                {/* filter and search section */}
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-[#04362c]/20 shadow-xl mb-8">
                    <div className="px-4">
                        <div className="flex gap-4 flex-wrap items-center">
                            {/* search input */}
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    {/* Absolutely positioned search icon inside the input */}
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#04362c] h-4 w-4"></Search>
                                    <Input
                                        type="text"
                                        placeholder="Search Transactions..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                        className="pl-10 py-2 text-lg text-[#04362c] placeholder:text-[#04362c]/60"
                                    />
                                </div>
                            </div>

                            {/* category filter dropdown */}
                            <div>
                                <Select
                                    value={categoryFilter || "all"}
                                    // Radix uses onValueChange instead of onChange
                                    onValueChange={(value) =>
                                        setCategoryFilter(
                                            value === "all" ? "" : value
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-[180px] text-[#04362c] hover:bg-transparent focus:bg-transparent focus:text-[#04362c]">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value="all"
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            All Categories
                                        </SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem
                                                key={category}
                                                value={category}
                                                className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                            >
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* type filter dropdown */}
                            <div>
                                <Select
                                    value={typeFilter || "all"}
                                    onValueChange={(value) =>
                                        setTypeFilter(
                                            value === "all" ? "" : value
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-[120px] text-[#04362c] hover:bg-transparent focus:bg-transparent focus:text-[#04362c]">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value="all"
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            All Types
                                        </SelectItem>
                                        <SelectItem
                                            value="income"
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            Income
                                        </SelectItem>
                                        <SelectItem
                                            value="expense"
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            Expense
                                        </SelectItem>
                                        <SelectItem
                                            value="transfer"
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            Transfer
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Month filter dropdown */}
                            <div>
                                <Select
                                    value={selectedMonth || "all"}
                                    onValueChange={(value) => {
                                        if (value === "all") {
                                            setSelectedMonth("");
                                            setSelectedYear(""); // Clear year when clearing month
                                        } else {
                                            setSelectedMonth(value);
                                            setSelectedYear(""); // Clear year when selecting month
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-[150px] text-[#04362c] hover:bg-transparent focus:bg-transparent focus:text-[#04362c]">
                                        <SelectValue placeholder="All Months" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value="all"
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            All Months
                                        </SelectItem>
                                        {(() => {
                                            const months = [];
                                            const now = new Date();
                                            // Generate last 12 months
                                            for (let i = 0; i < 12; i++) {
                                                const date = new Date(
                                                    now.getFullYear(),
                                                    now.getMonth() - i,
                                                    1
                                                );
                                                const year = date.getFullYear();
                                                const month = String(
                                                    date.getMonth() + 1
                                                ).padStart(2, "0");
                                                const monthName =
                                                    date.toLocaleString(
                                                        "default",
                                                        { month: "long" }
                                                    );
                                                const value = `${year}-${month}`;
                                                months.push(
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                        className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                                    >
                                                        {monthName} {year}
                                                    </SelectItem>
                                                );
                                            }
                                            return months;
                                        })()}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Year filter dropdown */}
                            <div>
                                <Select
                                    value={selectedYear || "all"}
                                    onValueChange={(value) => {
                                        if (value === "all") {
                                            setSelectedYear("");
                                            setSelectedMonth(""); // Clear month when clearing year
                                        } else {
                                            setSelectedYear(value);
                                            setSelectedMonth(""); // Clear month when selecting year
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-[120px] text-[#04362c] hover:bg-transparent focus:bg-transparent focus:text-[#04362c]">
                                        <SelectValue placeholder="All Years" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value="all"
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            All Years
                                        </SelectItem>
                                        {(() => {
                                            const years = [];
                                            const currentYear =
                                                new Date().getFullYear();
                                            // Generate last 10 years
                                            for (let i = 0; i < 10; i++) {
                                                const year = currentYear - i;
                                                years.push(
                                                    <SelectItem
                                                        key={year}
                                                        value={String(year)}
                                                        className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                                    >
                                                        {year}
                                                    </SelectItem>
                                                );
                                            }
                                            return years;
                                        })()}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Suspicious transactions filter toggle */}
                            {flaggedTransactionCount > 0 && (
                                <Button
                                    onClick={() =>
                                        setShowSuspiciousOnly(
                                            !showSuspiciousOnly
                                        )
                                    }
                                    variant={
                                        showSuspiciousOnly
                                            ? "default"
                                            : "outline"
                                    }
                                    className={`flex items-center gap-2 ${
                                        showSuspiciousOnly
                                            ? "bg-amber-500 text-white hover:bg-amber-600"
                                            : "border-amber-300 text-amber-700 hover:bg-amber-50"
                                    }`}
                                >
                                    <AlertTriangle
                                        className={`h-4 w-4 ${
                                            showSuspiciousOnly
                                                ? "text-white"
                                                : "text-amber-700"
                                        }`}
                                    />
                                    <span
                                        className={
                                            showSuspiciousOnly
                                                ? "text-white"
                                                : "text-amber-700"
                                        }
                                    >
                                        {showSuspiciousOnly
                                            ? "Show All"
                                            : "Show Flagged"}
                                    </span>
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ml-1 ${
                                            showSuspiciousOnly
                                                ? "bg-white/20 text-white"
                                                : "bg-amber-100 text-amber-700"
                                        }`}
                                    >
                                        {flaggedTransactionCount}
                                    </span>
                                </Button>
                            )}

                            {/* more filter dropdown */}
                            <div className="relative">
                                <Select
                                    onOpenChange={(open) =>
                                        setShowMoreFilters(open)
                                    }
                                    open={showMoreFilters}
                                >
                                    <SelectTrigger className="w-[180px] text-[#04362c]">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-5 w-5 text-[#04362c]" />
                                            <SelectValue
                                                placeholder="More Filters"
                                                className="text-[#04362c]"
                                            />
                                            {/* Show count of advanced filters if any are active */}
                                            {(accountFilter ||
                                                (startDate &&
                                                    !selectedMonth &&
                                                    !selectedYear) ||
                                                (endDate &&
                                                    !selectedMonth &&
                                                    !selectedYear) ||
                                                minAmount ||
                                                maxAmount) && (
                                                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                                    {(accountFilter ? 1 : 0) +
                                                        (startDate &&
                                                        !selectedMonth &&
                                                        !selectedYear
                                                            ? 1
                                                            : 0) +
                                                        (endDate &&
                                                        !selectedMonth &&
                                                        !selectedYear
                                                            ? 1
                                                            : 0) +
                                                        (minAmount ? 1 : 0) +
                                                        (maxAmount ? 1 : 0)}
                                                </span>
                                            )}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="w-80 p-0View and ">
                                        {/* More Filters Dropdown Panel */}
                                        <div className="p-4 space-y-4">
                                            <div className="flex items-center justify-between border-b pb-2">
                                                <h3 className="font-semibold text-[#04362c]">
                                                    Advance Filters
                                                </h3>
                                                <button
                                                    className="text-[#04362c]/60 hover:text-[#04362c]/80"
                                                    onClick={() =>
                                                        setShowMoreFilters(
                                                            false
                                                        )
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Account Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                                    Account
                                                </label>
                                                <Select
                                                    value={
                                                        accountFilter || "all"
                                                    }
                                                    onValueChange={(value) =>
                                                        setAccountFilter(
                                                            value === "all"
                                                                ? ""
                                                                : value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="text-[#04362c] hover:bg-transparent focus:bg-transparent focus:text-[#04362c]">
                                                        <SelectValue placeholder="All Accounts"></SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem
                                                            value="all"
                                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                                        >
                                                            All Accounts
                                                        </SelectItem>
                                                        {accounts.map(
                                                            (account) => (
                                                                <SelectItem
                                                                    key={
                                                                        account.account_id ||
                                                                        account.id
                                                                    }
                                                                    value={
                                                                        account.account_name ||
                                                                        account.name
                                                                    }
                                                                    className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                                                >
                                                                    {account.account_name ||
                                                                        account.name}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* date range filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                                    Date Range
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs text-[#04362c]/70 mb-1">
                                                            From
                                                        </label>
                                                        <Input
                                                            type="date"
                                                            value={startDate}
                                                            onChange={(e) =>
                                                                setStartDate(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-[#04362c]/70 mb-1">
                                                            To
                                                        </label>
                                                        <Input
                                                            type="date"
                                                            value={endDate}
                                                            onChange={(e) =>
                                                                setEndDate(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* amount range filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                                    Amount Range
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs text-[#04362c]/70">
                                                            Min (RM)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            step="0.01"
                                                            min="0"
                                                            value={minAmount}
                                                            onChange={(e) =>
                                                                setMinAmount(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-[#04362c]/70">
                                                            Max (RM)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            step="0.01"
                                                            min="0"
                                                            value={maxAmount}
                                                            onChange={(e) =>
                                                                setMaxAmount(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* clear button in dropdown */}
                                            <div className="flex gap-2 pt-2 border-t">
                                                <button
                                                    onClick={() => {
                                                        setAccountFilter("");
                                                        setStartDate("");
                                                        setEndDate("");
                                                        setMinAmount("");
                                                        setMaxAmount("");
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                >
                                                    Clear Advanced
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setShowMoreFilters(
                                                            false
                                                        )
                                                    }
                                                    className="flex-1 px-3 py-2 bg-[#04362c] text-white rounded-lg text-sm"
                                                >
                                                    Apply Filters
                                                </button>
                                            </div>
                                        </div>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* clear all filters button */}
                            {hasActiveFilter && (
                                <Button
                                    onClick={clearFilter}
                                    className="flex items-center gap-2 bg-primary text-[#04362c] transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                    Clear All
                                    {activeFilterCount > 1 && (
                                        <span className="bg-secondary/20 text-[#04362c] text-xs font-medium rounded-full">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </Button>
                            )}

                            {/* add transaction button */}
                            <Button
                                onClick={() => setIsAddDialogOpen(true)}
                                className="add-transaction-btn flex items-center gap-2 px-6 py-3 bg-[#04362c] text-white text-lg rounded-lg transition-colors shadow-lg hover:shadow-xl hover:bg-[#04362c]/90 ml-auto"
                            >
                                <Plus className="h-5 w-5" />
                                Add Transaction
                            </Button>
                        </div>

                        {/* active filters badges - show what filters currently applied */}
                        {hasActiveFilter && (
                            <div className="flex gap-2 mt-4 flex-wrap">
                                <span className="text-sm text-[#04362c]/80 font-medium py-1">
                                    Active filters:
                                </span>
                                {/* Search Term badge */}
                                {searchTerm && (
                                    <Badge className="gap-1 bg-[#04362c]/10 text-[#04362c] px-3 py-1 rounded-full text-sm border border-[#04362c]/20">
                                        <Search className="h-3 w-3" />
                                        <span>Search: "{searchTerm}"</span>
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="ml-1 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {/* Category badge */}
                                {categoryFilter && (
                                    <Badge className="gap-1 bg-[#04362c]/10 text-[#04362c] px-3 py-1 rounded-full text-sm border border-[#04362c]/20">
                                        <Filter className="h-3 w-3" />
                                        <span>
                                            Category: "{categoryFilter}"
                                        </span>
                                        <button
                                            onClick={() =>
                                                setCategoryFilter("")
                                            }
                                            className="ml-1 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {/* Type badge */}
                                {typeFilter && (
                                    <Badge className="gap-1 bg-[#04362c]/10 text-[#04362c] px-3 py-1 rounded-full text-sm border border-[#04362c]/20">
                                        <Filter className="h-3 w-3" />
                                        <span>Type: "{typeFilter}"</span>
                                        <button
                                            onClick={() => setTypeFilter("")}
                                            className="ml-1 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {/* Account filter badge */}
                                {accountFilter && (
                                    <Badge className="gap-1 bg-[#04362c]/10 text-[#04362c] px-3 py-1 rounded-full text-sm border border-[#04362c]/20">
                                        <Filter className="h-3 w-3" />
                                        <span>Account: {accountFilter}</span>
                                        <button
                                            onClick={() => setAccountFilter("")}
                                            className="ml-1 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {/* Date range badge */}
                                {(startDate || endDate) && (
                                    <Badge className="gap-1 bg-[#04362c]/10 text-[#04362c] px-3 py-1 rounded-full text-sm border border-[#04362c]/20">
                                        <Filter className="h-3 w-3" />
                                        <span>
                                            Date: {startDate || "..."} to{" "}
                                            {endDate || "..."}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setStartDate("");
                                                setEndDate("");
                                            }}
                                            className="ml-1 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {/* Amount range badge */}
                                {(minAmount || maxAmount) && (
                                    <Badge className="gap-1 bg-[#04362c]/10 text-[#04362c] px-3 py-1 rounded-full text-sm border border-[#04362c]/20">
                                        <Filter className="h-3 w-3" />
                                        <span>
                                            Amount:{" "}
                                            {formatCurrency(minAmount || 0)} -{" "}
                                            {maxAmount
                                                ? formatCurrency(maxAmount)
                                                : "RM ∞"}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setMinAmount("");
                                                setMaxAmount("");
                                            }}
                                            className="ml-1 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction Table Card */}
                <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#04362c]/20 shadow-xl">
                    {/* Card Header */}
                    <div className="px-6 py-4 border-b border-[#04362c]/20 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-[#04362c]">
                                Recent Transactions
                            </h2>
                            <p className="text-base text-[#04362c]/80">
                                {transactions.length} transactions found
                                {suspiciousTransactionIds.size > 0 && (
                                    <span className="ml-2 text-amber-600 font-semibold">
                                        • {suspiciousTransactionIds.size}{" "}
                                        flagged for review
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedTransactions.size > 0 && (
                                <>
                                    <Button
                                        onClick={() =>
                                            setBulkDeleteDialogOpen(true)
                                        }
                                        variant="destructive"
                                        className="flex items-center gap-2 px-4 py-2"
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Selected (
                                        {selectedTransactions.size})
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            setDeleteAllDialogOpen(true)
                                        }
                                        variant="destructive"
                                        className="flex items-center gap-2 px-4 py-2"
                                        disabled={
                                            isDeleting ||
                                            transactions.length === 0
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete All
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Card Content - Table */}
                    <div className="p-6 overflow-x-auto">
                        <Table>
                            {/* Table Header */}
                            <TableHeader>
                                <TableRow>
                                    {/* Checkbox Column Header */}
                                    <TableHead className="text-[#04362c] text-lg w-12 text-center">
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={
                                                    paginatedTransactions.length >
                                                        0 &&
                                                    selectedTransactions.size ===
                                                        paginatedTransactions.length
                                                }
                                                onCheckedChange={
                                                    toggleSelectAll
                                                }
                                            />
                                        </div>
                                    </TableHead>
                                    {/* Date Column Header - Sortable */}
                                    <TableHead className="text-[#04362c] text-lg text-left">
                                        <div
                                            className="flex items-center gap-1 cursor-pointer"
                                            onClick={() => handleSort("date")}
                                        >
                                            Date
                                            {/* Show different icon based on sort state */}
                                            {sortField === "date" ? (
                                                // Show direction indicator if this column is currently sorted
                                                <span className="text-[#04362c]">
                                                    {sortDirection === "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            ) : (
                                                // Show generic sort icon if column is not currently sorted
                                                <ArrowUpDown className="h-4 w-4 text-[#04362c]" />
                                            )}
                                        </div>
                                    </TableHead>
                                    {/* Description Column Header - Sortable */}
                                    <TableHead className="text-[#04362c] text-lg text-left">
                                        <div
                                            className="flex items-center gap-1 cursor-pointer"
                                            onClick={() =>
                                                handleSort("description")
                                            }
                                        >
                                            Description
                                            {/* Show different icon based on sort state */}
                                            {sortField === "description" ? (
                                                // Show direction indicator if this column is currently sorted
                                                <span className="text-[#04362c]">
                                                    {sortDirection === "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            ) : (
                                                // Show generic sort icon if column is not currently sorted
                                                <ArrowUpDown className="h-4 w-4 text-[#04362c]" />
                                            )}
                                        </div>
                                    </TableHead>
                                    {/* Category Column Header */}
                                    <TableHead className="text-[#04362c] text-lg text-left">
                                        Category
                                    </TableHead>
                                    {/* Account Column Header */}
                                    <TableHead className="text-[#04362c] text-lg text-left">
                                        Account
                                    </TableHead>
                                    {/* Amount Column Header */}
                                    <TableHead className="text-[#04362c] text-lg text-left">
                                        <div
                                            className="flex items-center gap-1 cursor-pointer"
                                            onClick={() => handleSort("amount")}
                                        >
                                            Amount
                                            {sortField === "amount" ? (
                                                <span className="text-[#04362c]">
                                                    {sortDirection === "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            ) : (
                                                <ArrowUpDown className="h-4 w-4 text-[#04362c]" />
                                            )}
                                        </div>
                                    </TableHead>
                                    {/* Actions Column Header */}
                                    <TableHead className="text-[#04362c] text-lg text-center">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            {/* Table Body   */}
                            <TableBody>
                                {/* create table row for each paginated transaction */}
                                {paginatedTransactions.map((transaction) => {
                                    const isExpanded =
                                        expandedRow === transaction.id;
                                    // Check if this transaction is flagged as suspicious
                                    const txId =
                                        transaction.id ||
                                        transaction.transfer_id ||
                                        transaction.income_id ||
                                        transaction.expense_id;
                                    const isSuspicious =
                                        suspiciousTransactionIds.has(txId) ||
                                        suspiciousTransactionIds.has(
                                            String(txId)
                                        ) ||
                                        suspiciousTransactionIds.has(
                                            `transfer-${txId}`
                                        ) ||
                                        suspiciousTransactionIds.has(
                                            `income-${txId}`
                                        ) ||
                                        suspiciousTransactionIds.has(
                                            `expense-${txId}`
                                        );
                                    return (
                                        <React.Fragment key={transaction.id}>
                                            <TableRow
                                                className={
                                                    isSuspicious
                                                        ? "bg-amber-50/50 border-l-4 border-l-amber-400"
                                                        : ""
                                                }
                                            >
                                                {/* Checkbox Column */}
                                                <TableCell className="text-[#04362c] text-lg text-center">
                                                    <div className="flex justify-center">
                                                        <Checkbox
                                                            checked={selectedTransactions.has(
                                                                transaction.id
                                                            )}
                                                            onCheckedChange={() =>
                                                                toggleTransactionSelection(
                                                                    transaction.id
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </TableCell>
                                                {/* Date Column */}
                                                <TableCell className="text-[#04362c] text-lg text-left">
                                                    {new Date(
                                                        transaction.date
                                                    ).toLocaleDateString(
                                                        "en-GB"
                                                    )}
                                                </TableCell>
                                                {/* Description Column - Clickable */}
                                                <TableCell className="text-[#04362c] text-lg">
                                                    <div
                                                        onClick={() => {
                                                            if (isExpanded) {
                                                                handleCancelEdit();
                                                            } else {
                                                                setExpandedRow(
                                                                    transaction.id
                                                                );
                                                                setEditedTransaction(
                                                                    {
                                                                        ...transaction,
                                                                        type:
                                                                            transaction.type ||
                                                                            (transaction.id?.startsWith(
                                                                                "transfer-"
                                                                            )
                                                                                ? "transfer"
                                                                                : transaction.id?.startsWith(
                                                                                      "income-"
                                                                                  )
                                                                                ? "income"
                                                                                : "expense"),
                                                                    }
                                                                );
                                                            }
                                                        }}
                                                        className="cursor-pointer transition-colors hover:text-[#04362c]/80"
                                                    >
                                                        {
                                                            transaction.description
                                                        }
                                                    </div>
                                                </TableCell>
                                                {/* Category Column */}
                                                <TableCell className="text-[#04362c] text-lg">
                                                    <span>
                                                        {transaction.category}
                                                    </span>
                                                </TableCell>
                                                {/* Account Column */}
                                                <TableCell className="text-[#04362c] text-lg">
                                                    {transaction.account
                                                        ?.name ||
                                                        "Unknown Account"}
                                                </TableCell>
                                                {/* Amount Column */}
                                                <TableCell>
                                                    <span
                                                        className={`font-medium text-[#04362c] text-base sm:text-lg ${
                                                            transaction.type ===
                                                            "income"
                                                                ? "text-green-600"
                                                                : transaction.type ===
                                                                  "transfer"
                                                                ? "text-blue-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        {formatCurrency(
                                                            Math.abs(
                                                                transaction.amount
                                                            )
                                                        )}
                                                    </span>
                                                </TableCell>
                                                {/* Actions Column */}
                                                <TableCell className="text-[#04362c] text-lg text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* Clear Flag button for suspicious transactions */}
                                                        {isSuspicious && (
                                                            <button
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    clearSuspiciousFlag(
                                                                        transaction
                                                                    );
                                                                }}
                                                                className="p-2 text-amber-600 rounded-lg transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                                                title="Clear suspicious flag"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                if (
                                                                    isExpanded
                                                                ) {
                                                                    handleCancelEdit();
                                                                } else {
                                                                    setExpandedRow(
                                                                        transaction.id
                                                                    );
                                                                    setEditedTransaction(
                                                                        {
                                                                            ...transaction,
                                                                            type:
                                                                                transaction.type ||
                                                                                (transaction.id?.startsWith(
                                                                                    "transfer-"
                                                                                )
                                                                                    ? "transfer"
                                                                                    : transaction.id?.startsWith(
                                                                                          "income-"
                                                                                      )
                                                                                    ? "income"
                                                                                    : "expense"),
                                                                        }
                                                                    );
                                                                }
                                                            }}
                                                            className="p-2 text-[#04362c] rounded-lg transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#04362c]/20"
                                                            title={
                                                                isExpanded
                                                                    ? "Close details"
                                                                    : "View details"
                                                            }
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                // Ensure we have a valid transaction ID
                                                                const txId =
                                                                    transaction.id ||
                                                                    (transaction.type ===
                                                                    "transfer"
                                                                        ? `transfer-${
                                                                              transaction.transfer_id ||
                                                                              transaction.rawId
                                                                          }`
                                                                        : transaction.type ===
                                                                          "income"
                                                                        ? `income-${
                                                                              transaction.income_id ||
                                                                              transaction.rawId
                                                                          }`
                                                                        : transaction.type ===
                                                                          "expense"
                                                                        ? `expense-${
                                                                              transaction.expense_id ||
                                                                              transaction.rawId
                                                                          }`
                                                                        : null);

                                                                if (!txId) {
                                                                    console.error(
                                                                        "Cannot delete transaction: missing ID",
                                                                        transaction
                                                                    );
                                                                    alert(
                                                                        "Cannot delete transaction: missing transaction ID"
                                                                    );
                                                                    return;
                                                                }

                                                                setTransactionToDelete(
                                                                    txId
                                                                );
                                                                setDeleteDialogOpen(
                                                                    true
                                                                );
                                                            }}
                                                            className="p-2 text-red-800 rounded-lg transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
                                                            title="Delete transaction"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded Row - Details */}
                                            {isExpanded && (
                                                <TableRow className="bg-gray-100">
                                                    <TableCell
                                                        colSpan={7}
                                                        className="p-6"
                                                    >
                                                        <div>
                                                            <h3 className="font-semibold text-[#04362c] mb-4 text-lg">
                                                                Transaction
                                                                Details
                                                                {transaction.type && (
                                                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                                                        (Type:{" "}
                                                                        {
                                                                            transaction.type
                                                                        }
                                                                        )
                                                                    </span>
                                                                )}
                                                            </h3>
                                                            {/* Unified form with responsive grid */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {/* Transaction Type - Allow changing type */}
                                                                <div>
                                                                    <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                        Transaction
                                                                        Type: *
                                                                    </label>
                                                                    <select
                                                                        value={
                                                                            transaction.type ||
                                                                            "expense"
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const newType =
                                                                                e
                                                                                    .target
                                                                                    .value;
                                                                            const updatedTransactions =
                                                                                transactions.map(
                                                                                    (
                                                                                        t
                                                                                    ) =>
                                                                                        t.id ===
                                                                                        transaction.id
                                                                                            ? {
                                                                                                  ...t,
                                                                                                  type: newType,
                                                                                                  // Reset type-specific fields when changing type
                                                                                                  category:
                                                                                                      newType ===
                                                                                                      "transfer"
                                                                                                          ? "Transfer"
                                                                                                          : newType ===
                                                                                                            "income"
                                                                                                          ? incomeCategories[0] ||
                                                                                                            "Salary"
                                                                                                          : expenseCategories[0] ||
                                                                                                            "Other",
                                                                                                  // Clear expense-specific fields when changing to non-expense
                                                                                                  expenseType:
                                                                                                      newType ===
                                                                                                      "expense"
                                                                                                          ? t.expenseType ||
                                                                                                            "needs"
                                                                                                          : null,
                                                                                                  location:
                                                                                                      newType ===
                                                                                                      "expense"
                                                                                                          ? t.location ||
                                                                                                            ""
                                                                                                          : "",
                                                                                                  // Clear income-specific fields when changing to non-income
                                                                                                  department:
                                                                                                      newType ===
                                                                                                      "income"
                                                                                                          ? t.department ||
                                                                                                            ""
                                                                                                          : "",
                                                                                                  project:
                                                                                                      newType ===
                                                                                                      "income"
                                                                                                          ? t.project ||
                                                                                                            ""
                                                                                                          : "",
                                                                                                  // Clear transfer-specific fields when changing to non-transfer
                                                                                                  transferType:
                                                                                                      newType ===
                                                                                                      "transfer"
                                                                                                          ? t.transferType ||
                                                                                                            "intra_person"
                                                                                                          : null,
                                                                                                  recipientAccountName:
                                                                                                      newType ===
                                                                                                      "transfer"
                                                                                                          ? t.recipientAccountName ||
                                                                                                            ""
                                                                                                          : "",
                                                                                                  recipientAccountNo:
                                                                                                      newType ===
                                                                                                      "transfer"
                                                                                                          ? t.recipientAccountNo ||
                                                                                                            ""
                                                                                                          : "",
                                                                                                  // Adjust amount sign based on type
                                                                                                  amount:
                                                                                                      newType ===
                                                                                                      "expense"
                                                                                                          ? -Math.abs(
                                                                                                                t.amount
                                                                                                            )
                                                                                                          : Math.abs(
                                                                                                                t.amount
                                                                                                            ),
                                                                                              }
                                                                                            : t
                                                                                );
                                                                            setTransactions(
                                                                                updatedTransactions
                                                                            );
                                                                        }}
                                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium"
                                                                    >
                                                                        <option value="income">
                                                                            Income
                                                                        </option>
                                                                        <option value="expense">
                                                                            Expense
                                                                        </option>
                                                                        <option value="transfer">
                                                                            Transfer
                                                                        </option>
                                                                    </select>
                                                                </div>
                                                                {/* Description */}
                                                                <div>
                                                                    <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                        Description:
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            transaction.description
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const updatedTransactions =
                                                                                transactions.map(
                                                                                    (
                                                                                        t
                                                                                    ) =>
                                                                                        t.id ===
                                                                                        transaction.id
                                                                                            ? {
                                                                                                  ...t,
                                                                                                  description:
                                                                                                      e
                                                                                                          .target
                                                                                                          .value,
                                                                                              }
                                                                                            : t
                                                                                );
                                                                            setTransactions(
                                                                                updatedTransactions
                                                                            );
                                                                        }}
                                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                        Amount:
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={Math.abs(
                                                                            transaction.amount
                                                                        )}
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const updatedTransactions =
                                                                                transactions.map(
                                                                                    (
                                                                                        t
                                                                                    ) =>
                                                                                        t.id ===
                                                                                        transaction.id
                                                                                            ? {
                                                                                                  ...t,
                                                                                                  amount:
                                                                                                      t.type ===
                                                                                                      "expense"
                                                                                                          ? -Math.abs(
                                                                                                                parseFloat(
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value
                                                                                                                )
                                                                                                            )
                                                                                                          : Math.abs(
                                                                                                                parseFloat(
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value
                                                                                                                )
                                                                                                            ),
                                                                                              }
                                                                                            : t
                                                                                );
                                                                            setTransactions(
                                                                                updatedTransactions
                                                                            );
                                                                        }}
                                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                        Category:
                                                                    </label>
                                                                    <select
                                                                        value={
                                                                            transaction.category ||
                                                                            (transaction.type ===
                                                                            "transfer"
                                                                                ? "Transfer"
                                                                                : transaction.type ===
                                                                                  "income"
                                                                                ? incomeCategories[0]
                                                                                : expenseCategories[0])
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const newCategory =
                                                                                e
                                                                                    .target
                                                                                    .value;
                                                                            const updatedTransactions =
                                                                                transactions.map(
                                                                                    (
                                                                                        t
                                                                                    ) =>
                                                                                        t.id ===
                                                                                        transaction.id
                                                                                            ? {
                                                                                                  ...t,
                                                                                                  category:
                                                                                                      newCategory,
                                                                                              }
                                                                                            : t
                                                                                );
                                                                            setTransactions(
                                                                                updatedTransactions
                                                                            );
                                                                        }}
                                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                    >
                                                                        {transaction.type ===
                                                                        "transfer" ? (
                                                                            <option value="Transfer">
                                                                                Transfer
                                                                            </option>
                                                                        ) : transaction.type ===
                                                                          "income" ? (
                                                                            incomeCategories.map(
                                                                                (
                                                                                    category
                                                                                ) => (
                                                                                    <option
                                                                                        key={
                                                                                            category
                                                                                        }
                                                                                        value={
                                                                                            category
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            category
                                                                                        }
                                                                                    </option>
                                                                                )
                                                                            )
                                                                        ) : (
                                                                            expenseCategories.map(
                                                                                (
                                                                                    category
                                                                                ) => (
                                                                                    <option
                                                                                        key={
                                                                                            category
                                                                                        }
                                                                                        value={
                                                                                            category
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            category
                                                                                        }
                                                                                    </option>
                                                                                )
                                                                            )
                                                                        )}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                        Account:
                                                                    </label>
                                                                    <select
                                                                        value={
                                                                            transaction
                                                                                .account
                                                                                ?.id ||
                                                                            transaction.accountId ||
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const selectedAccountId =
                                                                                parseInt(
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                );
                                                                            const selectedAccount =
                                                                                accounts.find(
                                                                                    (
                                                                                        acc
                                                                                    ) =>
                                                                                        (acc.account_id ||
                                                                                            acc.id) ===
                                                                                        selectedAccountId
                                                                                );

                                                                            const updatedTransactions =
                                                                                transactions.map(
                                                                                    (
                                                                                        t
                                                                                    ) =>
                                                                                        t.id ===
                                                                                        transaction.id
                                                                                            ? {
                                                                                                  ...t,
                                                                                                  account:
                                                                                                      {
                                                                                                          name:
                                                                                                              selectedAccount?.account_name ||
                                                                                                              selectedAccount?.name,
                                                                                                          type:
                                                                                                              selectedAccount?.account_type ||
                                                                                                              selectedAccount?.type,
                                                                                                          id: selectedAccountId,
                                                                                                      },
                                                                                                  accountId:
                                                                                                      selectedAccountId,
                                                                                              }
                                                                                            : t
                                                                                );
                                                                            setTransactions(
                                                                                updatedTransactions
                                                                            );
                                                                        }}
                                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                    >
                                                                        <option value="">
                                                                            Select
                                                                            Account
                                                                        </option>
                                                                        {accounts.map(
                                                                            (
                                                                                account
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        account.account_id ||
                                                                                        account.id
                                                                                    }
                                                                                    value={
                                                                                        account.account_id ||
                                                                                        account.id
                                                                                    }
                                                                                >
                                                                                    {account.account_name ||
                                                                                        account.name}
                                                                                </option>
                                                                            )
                                                                        )}
                                                                    </select>
                                                                </div>
                                                                {/* Tax Amount - Only for Expenses */}
                                                                {transaction.type ===
                                                                    "expense" && (
                                                                    <div>
                                                                        <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                            Tax
                                                                            Amount:
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            defaultValue="0.00"
                                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                        Date:
                                                                    </label>
                                                                    <input
                                                                        type="date"
                                                                        value={
                                                                            transaction.date
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const updatedTransactions =
                                                                                transactions.map(
                                                                                    (
                                                                                        t
                                                                                    ) =>
                                                                                        t.id ===
                                                                                        transaction.id
                                                                                            ? {
                                                                                                  ...t,
                                                                                                  date: e
                                                                                                      .target
                                                                                                      .value,
                                                                                              }
                                                                                            : t
                                                                                );
                                                                            setTransactions(
                                                                                updatedTransactions
                                                                            );
                                                                        }}
                                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                    />
                                                                </div>
                                                                {/* Need vs Want dropdown - only show for expenses */}
                                                                {transaction.type ===
                                                                    "expense" && (
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-600 mb-1">
                                                                            Need
                                                                            or
                                                                            Want
                                                                            *
                                                                        </label>
                                                                        <select
                                                                            value={
                                                                                (transaction.expenseType ||
                                                                                    "needs") ===
                                                                                "wants"
                                                                                    ? "want"
                                                                                    : "need"
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const updatedTransactions =
                                                                                    transactions.map(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            transaction.id
                                                                                                ? {
                                                                                                      ...t,
                                                                                                      expenseType:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value ===
                                                                                                          "want"
                                                                                                              ? "wants"
                                                                                                              : "needs",
                                                                                                  }
                                                                                                : t
                                                                                    );
                                                                                setTransactions(
                                                                                    updatedTransactions
                                                                                );
                                                                            }}
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                        >
                                                                            <option value="need">
                                                                                Need
                                                                            </option>
                                                                            <option value="want">
                                                                                Want
                                                                            </option>
                                                                        </select>
                                                                    </div>
                                                                )}

                                                                {/* Payer/Merchant - Available for income and expense, not transfers */}
                                                                {transaction.type !==
                                                                    "transfer" && (
                                                                    <div>
                                                                        <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                            {transaction.type ===
                                                                            "income"
                                                                                ? "Payer:"
                                                                                : "Merchant:"}
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                transaction.supplier ||
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const updatedTransactions =
                                                                                    transactions.map(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            transaction.id
                                                                                                ? {
                                                                                                      ...t,
                                                                                                      supplier:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value,
                                                                                                  }
                                                                                                : t
                                                                                    );
                                                                                setTransactions(
                                                                                    updatedTransactions
                                                                                );
                                                                            }}
                                                                            placeholder={
                                                                                transaction.type ===
                                                                                "income"
                                                                                    ? "Enter payer name"
                                                                                    : "Enter merchant name"
                                                                            }
                                                                            className="bg-white w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Department - Only for Income */}
                                                                {transaction.type ===
                                                                    "income" && (
                                                                    <div>
                                                                        <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                            Department:
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                transaction.department ||
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const updatedTransactions =
                                                                                    transactions.map(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            transaction.id
                                                                                                ? {
                                                                                                      ...t,
                                                                                                      department:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value,
                                                                                                  }
                                                                                                : t
                                                                                    );
                                                                                setTransactions(
                                                                                    updatedTransactions
                                                                                );
                                                                            }}
                                                                            placeholder="Enter department"
                                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Project - Only for Income */}
                                                                {transaction.type ===
                                                                    "income" && (
                                                                    <div>
                                                                        <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                            Project:
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                transaction.project ||
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const updatedTransactions =
                                                                                    transactions.map(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            transaction.id
                                                                                                ? {
                                                                                                      ...t,
                                                                                                      project:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value,
                                                                                                  }
                                                                                                : t
                                                                                    );
                                                                                setTransactions(
                                                                                    updatedTransactions
                                                                                );
                                                                            }}
                                                                            placeholder="Enter project name"
                                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Location - Only for Expenses */}
                                                                {transaction.type ===
                                                                    "expense" && (
                                                                    <div>
                                                                        <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                            Location:
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                transaction.location ||
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const updatedTransactions =
                                                                                    transactions.map(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            transaction.id
                                                                                                ? {
                                                                                                      ...t,
                                                                                                      location:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value,
                                                                                                  }
                                                                                                : t
                                                                                    );
                                                                                setTransactions(
                                                                                    updatedTransactions
                                                                                );
                                                                            }}
                                                                            placeholder="Enter location"
                                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Transfer Type - Only for Transfers */}
                                                                {transaction.type ===
                                                                    "transfer" && (
                                                                    <div>
                                                                        <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                            Transfer
                                                                            Type:
                                                                        </label>
                                                                        <select
                                                                            value={
                                                                                transaction.transferType ||
                                                                                "intra_person"
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const updatedTransactions =
                                                                                    transactions.map(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            transaction.id
                                                                                                ? {
                                                                                                      ...t,
                                                                                                      transferType:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value,
                                                                                                  }
                                                                                                : t
                                                                                    );
                                                                                setTransactions(
                                                                                    updatedTransactions
                                                                                );
                                                                            }}
                                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                        >
                                                                            <option value="intra_person">
                                                                                To
                                                                                Own
                                                                                Account/Savings
                                                                            </option>
                                                                            <option value="inter_person">
                                                                                To
                                                                                Another
                                                                                Person
                                                                            </option>
                                                                        </select>
                                                                    </div>
                                                                )}

                                                                {/* Recipient Account Name - Only for Transfers */}
                                                                {transaction.type ===
                                                                    "transfer" && (
                                                                    <div>
                                                                        <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                            Recipient
                                                                            Account
                                                                            Name:
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                transaction.recipientAccountName ||
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const updatedTransactions =
                                                                                    transactions.map(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            transaction.id
                                                                                                ? {
                                                                                                      ...t,
                                                                                                      recipientAccountName:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value,
                                                                                                  }
                                                                                                : t
                                                                                    );
                                                                                setTransactions(
                                                                                    updatedTransactions
                                                                                );
                                                                            }}
                                                                            placeholder="Enter recipient account name"
                                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Recipient Account Number - Only for Transfers */}
                                                                {transaction.type ===
                                                                    "transfer" && (
                                                                    <div>
                                                                        <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                            Recipient
                                                                            Account
                                                                            Number:
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                transaction.recipientAccountNo ||
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const updatedTransactions =
                                                                                    transactions.map(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            transaction.id
                                                                                                ? {
                                                                                                      ...t,
                                                                                                      recipientAccountNo:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value,
                                                                                                  }
                                                                                                : t
                                                                                    );
                                                                                setTransactions(
                                                                                    updatedTransactions
                                                                                );
                                                                            }}
                                                                            placeholder="Enter recipient account number"
                                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Reference - Available for all transaction types */}
                                                                <div>
                                                                    <label className="block text-sm text-[#04362c]/80 mb-1">
                                                                        Reference:
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            transaction.reference ||
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const updatedTransactions =
                                                                                transactions.map(
                                                                                    (
                                                                                        t
                                                                                    ) =>
                                                                                        t.id ===
                                                                                        transaction.id
                                                                                            ? {
                                                                                                  ...t,
                                                                                                  reference:
                                                                                                      e
                                                                                                          .target
                                                                                                          .value,
                                                                                              }
                                                                                            : t
                                                                                );
                                                                            setTransactions(
                                                                                updatedTransactions
                                                                            );
                                                                        }}
                                                                        placeholder="Enter reference number"
                                                                        className="bg-white w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Save and Cancel Buttons */}
                                                        <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-gray-200">
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    handleCancelEdit
                                                                }
                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                                                disabled={
                                                                    isSaving
                                                                }
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleUpdateTransaction(
                                                                        transaction
                                                                    )
                                                                }
                                                                className="w-full px-4 py-2 bg-[var(--card)] text-[var(--button-foreground)] rounded-lg hover:opacity-90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                disabled={
                                                                    isSaving
                                                                }
                                                            >
                                                                {isSaving
                                                                    ? "Saving..."
                                                                    : "Save Changes"}
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        {/* Show message when no transactions match filters */}
                        {filteredTransactions.length === 0 && (
                            <div className="text-center py-8 text-[#04362c]">
                                {/* Different messages based on whether filters are active */}
                                {searchTerm || categoryFilter || typeFilter
                                    ? "No transactions found matching your filters."
                                    : "No transactions found."}
                            </div>
                        )}

                        {/* Pagination */}
                        {filteredTransactions.length > 0 && (
                            <>
                                <div className="mt-4 flex items-center justify-between border-t pt-4">
                                    {/* Items per page selector */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-[#04362c]/80 whitespace-nowrap">
                                            Show:
                                        </span>
                                        <Select
                                            value={itemsPerPage.toString()}
                                            onValueChange={(value) => {
                                                const newValue = parseInt(
                                                    value,
                                                    10
                                                );
                                                setItemsPerPage(newValue);
                                                setCurrentPage(1); // Reset to first page when changing items per page
                                                // Immediately save to localStorage
                                                if (
                                                    typeof window !==
                                                    "undefined"
                                                ) {
                                                    localStorage.setItem(
                                                        "transactionItemsPerPage",
                                                        newValue.toString()
                                                    );
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-[80px] text-sm text-[#04362c]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem
                                                    value="10"
                                                    className="text-[#04362c]"
                                                >
                                                    10
                                                </SelectItem>
                                                <SelectItem
                                                    value="20"
                                                    className="text-[#04362c]"
                                                >
                                                    20
                                                </SelectItem>
                                                <SelectItem
                                                    value="50"
                                                    className="text-[#04362c]"
                                                >
                                                    50
                                                </SelectItem>
                                                <SelectItem
                                                    value="100"
                                                    className="text-[#04362c]"
                                                >
                                                    100
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <span className="text-sm text-[#04362c]/80 whitespace-nowrap">
                                            per page
                                        </span>
                                    </div>
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() =>
                                                        setCurrentPage((prev) =>
                                                            Math.max(
                                                                prev - 1,
                                                                1
                                                            )
                                                        )
                                                    }
                                                    className={`text-[#04362c] text-lg ${
                                                        currentPage === 1
                                                            ? "pointer-events-none opacity-50"
                                                            : "cursor-pointer"
                                                    }`}
                                                />
                                            </PaginationItem>

                                            {/* Smart Page Numbers: <Prev 1 ... 4 5 6 ... 10 Next> */}
                                            {(() => {
                                                const pages = [];

                                                if (totalPages <= 7) {
                                                    // Show all pages if 7 or less
                                                    for (
                                                        let i = 1;
                                                        i <= totalPages;
                                                        i++
                                                    ) {
                                                        pages.push(
                                                            <PaginationItem
                                                                key={i}
                                                            >
                                                                <PaginationLink
                                                                    onClick={() =>
                                                                        setCurrentPage(
                                                                            i
                                                                        )
                                                                    }
                                                                    isActive={
                                                                        currentPage ===
                                                                        i
                                                                    }
                                                                    className={`text-[#04362c] cursor-pointer text-lg ${
                                                                        currentPage ===
                                                                        i
                                                                            ? "border-2 border-secondary"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    {i}
                                                                </PaginationLink>
                                                            </PaginationItem>
                                                        );
                                                    }
                                                } else {
                                                    // Always show first page
                                                    pages.push(
                                                        <PaginationItem key={1}>
                                                            <PaginationLink
                                                                onClick={() =>
                                                                    setCurrentPage(
                                                                        1
                                                                    )
                                                                }
                                                                isActive={
                                                                    currentPage ===
                                                                    1
                                                                }
                                                                className={`text-[#04362c] cursor-pointer text-lg ${
                                                                    currentPage ===
                                                                    1
                                                                        ? "border-2 border-secondary"
                                                                        : ""
                                                                }`}
                                                            >
                                                                1
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    );

                                                    // Left ellipsis (if current page > 3)
                                                    if (currentPage > 3) {
                                                        pages.push(
                                                            <PaginationItem key="ellipsis-left">
                                                                <span className="px-3 text-[#04362c] text-lg">
                                                                    ...
                                                                </span>
                                                            </PaginationItem>
                                                        );
                                                    }

                                                    // Pages around current (show current - 1, current, current + 1)
                                                    const startPage = Math.max(
                                                        2,
                                                        currentPage - 1
                                                    );
                                                    const endPage = Math.min(
                                                        totalPages - 1,
                                                        currentPage + 1
                                                    );

                                                    for (
                                                        let i = startPage;
                                                        i <= endPage;
                                                        i++
                                                    ) {
                                                        pages.push(
                                                            <PaginationItem
                                                                key={i}
                                                            >
                                                                <PaginationLink
                                                                    onClick={() =>
                                                                        setCurrentPage(
                                                                            i
                                                                        )
                                                                    }
                                                                    isActive={
                                                                        currentPage ===
                                                                        i
                                                                    }
                                                                    className={`text-[#04362c] cursor-pointer text-lg ${
                                                                        currentPage ===
                                                                        i
                                                                            ? "border-2 border-secondary"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    {i}
                                                                </PaginationLink>
                                                            </PaginationItem>
                                                        );
                                                    }

                                                    // Right ellipsis (if current page < totalPages - 2)
                                                    if (
                                                        currentPage <
                                                        totalPages - 2
                                                    ) {
                                                        pages.push(
                                                            <PaginationItem key="ellipsis-right">
                                                                <span className="px-3 text-[#04362c] text-lg">
                                                                    ...
                                                                </span>
                                                            </PaginationItem>
                                                        );
                                                    }

                                                    // Always show last page
                                                    pages.push(
                                                        <PaginationItem
                                                            key={totalPages}
                                                        >
                                                            <PaginationLink
                                                                onClick={() =>
                                                                    setCurrentPage(
                                                                        totalPages
                                                                    )
                                                                }
                                                                isActive={
                                                                    currentPage ===
                                                                    totalPages
                                                                }
                                                                className={`text-[#04362c] cursor-pointer text-lg ${
                                                                    currentPage ===
                                                                    totalPages
                                                                        ? "border-2 border-secondary"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {totalPages}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    );
                                                }

                                                return pages;
                                            })()}

                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() =>
                                                        setCurrentPage((prev) =>
                                                            Math.min(
                                                                prev + 1,
                                                                totalPages
                                                            )
                                                        )
                                                    }
                                                    className={`text-[#04362c] text-lg ${
                                                        currentPage ===
                                                        totalPages
                                                            ? "pointer-events-none opacity-50"
                                                            : "cursor-pointer"
                                                    }`}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                                <p className="text-xs text-center text-[#04362c] mt-3">
                                    Showing {startIndex + 1} to{" "}
                                    {Math.min(
                                        endIndex,
                                        filteredTransactions.length
                                    )}{" "}
                                    of {filteredTransactions.length}{" "}
                                    transactions
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Add Transaction Dialog */}
                <AddTransactionDialog
                    open={isAddDialogOpen}
                    onOpenChange={(open) => {
                        setIsAddDialogOpen(open);
                        if (!open) {
                            setEntryMethod("selection"); // Reset to selection when closing
                        }
                    }}
                    entryMethod={entryMethod}
                    onMethodSelect={setEntryMethod}
                    onSave={handleAddTransaction}
                    accounts={accounts}
                />

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                >
                    <DialogContent className="max-w-md border-2 border-[#04362c]/30 bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">
                                Delete Transaction
                            </DialogTitle>
                            <DialogDescription className="text-sm text-[#04362c]/70 mt-1">
                                Are you sure you want to delete this
                                transaction? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="flex gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    setDeleteDialogOpen(false);
                                    setTransactionToDelete(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 bg-white text-[#04362c]/90 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteTransaction}
                                className="flex-1 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 font-medium transition-colors"
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Bulk Delete Confirmation Dialog */}
                <Dialog
                    open={bulkDeleteDialogOpen}
                    onOpenChange={setBulkDeleteDialogOpen}
                >
                    <DialogContent className="max-w-md border-2 border-[#04362c]/30 bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">
                                Delete Selected Transactions
                            </DialogTitle>
                            <DialogDescription className="text-sm text-[#04362c]/70 mt-1">
                                Are you sure you want to delete{" "}
                                {selectedTransactions.size} selected transaction
                                {selectedTransactions.size > 1 ? "s" : ""}? This
                                action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="flex gap-3 mt-6">
                            <Button
                                onClick={() => setBulkDeleteDialogOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 bg-white text-[#04362c]/90 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBulkDelete}
                                className="flex-1 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 font-medium transition-colors"
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete All Confirmation Dialog */}
                <Dialog
                    open={deleteAllDialogOpen}
                    onOpenChange={setDeleteAllDialogOpen}
                >
                    <DialogContent className="max-w-md border-2 border-[#04362c]/30 bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">
                                Delete All Transactions
                            </DialogTitle>
                            <DialogDescription className="text-sm text-[#04362c]/70 mt-1">
                                Are you sure you want to delete ALL{" "}
                                {transactions.length} transactions? This is a
                                destructive action and cannot be undone.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="flex gap-3 mt-6">
                            <Button
                                onClick={() => setDeleteAllDialogOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 bg-white text-[#04362c]/90 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteAll}
                                className="flex-1 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 font-medium transition-colors"
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete All"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

//Add Transaction Dialog Component
function AddTransactionDialog({
    open,
    onOpenChange,
    entryMethod,
    onMethodSelect,
    onSave,
    accounts,
}) {
    if (entryMethod === "selection") {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl border-2 border-[#04362c]/30 transition-all duration-500 ease-in-out animate-in fade-in-0 zoom-in-95">
                    {/* Header */}
                    <DialogHeader>
                        <div className="text-center animate-in fade-in-0 slide-in-from-top-4 duration-500">
                            <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c]">
                                Add New Transaction
                            </DialogTitle>
                            <DialogDescription className="text-sm text-[#04362c]/70 mt-1">
                                Choose how you'd like to add your transaction
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    {/* Method Selection Card */}
                    <div className="py-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
                        <div className="grid grid-cols-2 gap-6">
                            {/* Manual Entry Card */}
                            <button
                                onClick={() => onMethodSelect("manual")}
                                className="flex flex-col items-center p-6 bg-white border-2 border-[#04362c]/20 rounded-lg transition-all cursor-pointer group hover:bg-gray-50 hover:border-[#04362c]/40"
                            >
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                                    <PenTool className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="font-medium text-lg mb-2 text-[#04362c]">
                                    Manual Entry
                                </h3>
                                <p className="text-sm text-[#04362c]/70 text-center leading-relaxed">
                                    Fill in all transaction details manually and
                                    optionally attach a receipt
                                </p>
                            </button>
                            {/* AI-Assisted Entry Card */}
                            <button
                                onClick={() => onMethodSelect("ai-assisted")}
                                className="flex flex-col items-center p-6 bg-white border-2 border-[#04362c]/20 rounded-lg transition-all cursor-pointer group hover:bg-gray-50 hover:border-[#04362c]/40"
                            >
                                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                                    <Upload className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="font-medium text-lg mb-2 text-[#04362c]">
                                    AI-Assisted Entry
                                </h3>
                                <p className="text-sm text-[#04362c]/70 text-center leading-relaxed">
                                    Upload a receipt and let AI extract the
                                    details for you to verify
                                </p>
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }
    // If we're in "ai-assisted" mode, show AI upload screen
    if (entryMethod === "ai-assisted") {
        return (
            <AIAssistedEntry
                open={open}
                onOpenChange={onOpenChange}
                onSave={onSave}
                onBack={() => onMethodSelect("selection")}
                accounts={accounts}
            />
        );
    }

    // Otherwise, show the manual entry form
    return (
        <ManualEntryForm
            open={open}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onBack={() => onMethodSelect("selection")}
            accounts={accounts}
        />
    );
}

// AI-Assisted Entry Component
function AIAssistedEntry({
    open,
    onOpenChange,
    onSave,
    onBack,
    accounts = [],
}) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const [error, setError] = useState(null);

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setError("Please select an image file (PNG, JPG, JPEG)");
                return;
            }

            setSelectedFile(file);
            setError(null);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle scan receipt
    const handleScan = async () => {
        if (!selectedFile) {
            setError("Please select a file first");
            return;
        }

        setIsScanning(true);
        setError(null);

        try {
            const result = await scannerApi.scanReceipt(selectedFile);

            // Determine account based on payment method
            let selectedAccount = accounts.length > 0 ? accounts[0] : null;
            let selectedAccountName = selectedAccount?.account_name || "";
            let selectedAccountId = selectedAccount?.account_id || null;

            // If payment method is Cash, try to find or suggest Cash account
            if (
                result.payment_method &&
                result.payment_method.toLowerCase() === "cash"
            ) {
                const cashAccount = accounts.find((acc) =>
                    acc.account_name.toLowerCase().includes("cash")
                );
                if (cashAccount) {
                    selectedAccount = cashAccount;
                    selectedAccountName = cashAccount.account_name;
                    selectedAccountId = cashAccount.account_id;
                }
                // If no cash account exists, we'll use default but store payment method
            }

            // Map the scanned data to form format
            const mappedData = {
                date: result.date,
                description:
                    result.description || `Purchase from ${result.merchant}`,
                amount: Math.abs(result.amount),
                category: result.category || "Other",
                type: "expense",
                needOrWant: "need", // Default to need for AI scanned expenses
                account: selectedAccountName,
                accountId: selectedAccountId,
                supplier: result.merchant || "",
                location: result.location || "",
                reference: result.reference || "",
                department: "",
                project: "",
                // New fields for enhanced features
                confidence: result.confidence || {},
                warnings: result.warnings || [],
                duplicate_check: result.duplicate_check || {
                    is_duplicate: false,
                },
                payment_method: result.payment_method || null,
                raw_merchant: result.raw_merchant || result.merchant,
                needsCashAccount:
                    result.payment_method?.toLowerCase() === "cash" &&
                    !accounts.find((acc) =>
                        acc.account_name.toLowerCase().includes("cash")
                    ),
            };

            setScannedData(mappedData);
        } catch (err) {
            console.error("Scan error:", err);
            if (err.status === 401) {
                setError(
                    "Session expired. Please refresh the page and log in again."
                );
            } else {
                setError(
                    err.message || "Failed to scan receipt. Please try again."
                );
            }
        } finally {
            setIsScanning(false);
        }
    };

    // Reset state when dialog closes
    const handleClose = () => {
        setSelectedFile(null);
        setPreview(null);
        setScannedData(null);
        setError(null);
        onOpenChange(false);
    };

    // If we have scanned data, show the review form
    if (scannedData) {
        return (
            <AIReviewForm
                open={open}
                onOpenChange={handleClose}
                scannedData={scannedData}
                onSave={onSave}
                onBack={() => setScannedData(null)}
                accounts={accounts}
            />
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md border-2 border-[#04362c]/30 transition-all duration-500 ease-in-out animate-in fade-in-0 zoom-in-95">
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c] animate-in fade-in-0 slide-in-from-top-4 duration-500">
                        AI-Assisted Entry
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#04362c]/70 mt-1 animate-in fade-in-0 duration-500 delay-75">
                        Upload a receipt and let AI extract the details
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-150">
                    {/* File upload area */}
                    {!preview ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors">
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="font-medium mb-2">Upload Receipt</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Select an image of your receipt
                            </p>
                            <label className="inline-block px-4 py-2 border border-gray-300 rounded-lg cursor-pointer font-medium hover:shadow-md transition-shadow">
                                Select File
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Image preview */}
                            <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
                                <img
                                    src={preview}
                                    alt="Receipt preview"
                                    className="w-full h-64 object-contain bg-gray-50"
                                />
                                <button
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setPreview(null);
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Scan button */}
                            <button
                                onClick={handleScan}
                                disabled={isScanning}
                                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isScanning ? (
                                    <>
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-5 w-5" />
                                        Scan Receipt with AI
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Back button */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onBack}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:shadow-md transition-shadow"
                        >
                            Back
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// AI Review Form Component - shows scanned data for verification
function AIReviewForm({
    open,
    onOpenChange,
    scannedData,
    onSave,
    onBack,
    accounts = [],
}) {
    const [formData, setFormData] = useState(scannedData);

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.description || !formData.amount) {
            alert("Please fill in all required fields");
            return;
        }

        const transaction = {
            ...formData,
            amount:
                formData.type === "expense"
                    ? -Math.abs(parseFloat(formData.amount))
                    : Math.abs(parseFloat(formData.amount)),
        };

        onSave(transaction);
    };

    // Handle input changes
    const handleChange = (field, value) => {
        setFormData((prev) => {
            const updated = {
                ...prev,
                [field]: value,
            };

            // Auto-update category when type changes
            if (field === "type") {
                // Switch to first category of the new type
                updated.category =
                    value === "income"
                        ? incomeCategories[0]
                        : expenseCategories[0];
            }

            return updated;
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-[#04362c]/30 transition-all duration-500 ease-in-out animate-in fade-in-0 zoom-in-95">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-[#04362c] animate-in fade-in-0 slide-in-from-top-4 duration-500">
                        Review Scanned Transaction
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#04362c]/70 animate-in fade-in-0 duration-500 delay-75">
                        AI extracted the following details. Please verify and
                        edit if needed.
                    </DialogDescription>
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2 animate-in fade-in-0 duration-500 delay-100">
                        <Upload className="h-4 w-4" />
                        Extracted with AI Vision (Gemini)
                    </div>

                    {/* Duplicate Warning */}
                    {scannedData?.duplicate_check?.is_duplicate && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg animate-in fade-in-0 duration-500 delay-150">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-800">
                                        Similar transaction found
                                    </p>
                                    <p className="text-xs text-yellow-700 mt-1">
                                        {
                                            scannedData.duplicate_check
                                                .similar_transaction.description
                                        }{" "}
                                        - RM{" "}
                                        {scannedData.duplicate_check.similar_transaction.amount.toFixed(
                                            2
                                        )}{" "}
                                        on{" "}
                                        {
                                            scannedData.duplicate_check
                                                .similar_transaction.date
                                        }
                                    </p>
                                    <p className="text-xs text-yellow-600 mt-1 italic">
                                        Please verify this is not a duplicate
                                        before saving.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Validation Warnings */}
                    {scannedData?.warnings &&
                        scannedData.warnings.length > 0 && (
                            <div className="mt-2 space-y-2 animate-in fade-in-0 duration-500 delay-200">
                                {scannedData.warnings.map((warning, index) => (
                                    <div
                                        key={index}
                                        className={`p-2 rounded-lg border text-sm flex items-center gap-2 ${
                                            warning.type === "low_confidence"
                                                ? "bg-orange-50 border-orange-200"
                                                : "bg-blue-50 border-blue-200"
                                        }`}
                                    >
                                        <AlertCircle
                                            className={`h-4 w-4 flex-shrink-0 ${
                                                warning.type ===
                                                "low_confidence"
                                                    ? "text-orange-600"
                                                    : "text-blue-600"
                                            }`}
                                        />
                                        <p
                                            className={`text-xs ${
                                                warning.type ===
                                                "low_confidence"
                                                    ? "text-orange-700"
                                                    : "text-blue-700"
                                            }`}
                                        >
                                            {warning.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                    {/* Cash Account Suggestion */}
                    {scannedData?.needsCashAccount && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in-0 duration-500 delay-250">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-800">
                                        Cash payment detected
                                    </p>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Payment method:{" "}
                                        {scannedData.payment_method}. Consider
                                        creating a "Cash" account to track cash
                                        transactions separately.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Method Info */}
                    {scannedData?.payment_method &&
                        !scannedData?.needsCashAccount && (
                            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 flex items-center gap-2 animate-in fade-in-0 duration-500 delay-250">
                                <AlertCircle className="h-4 w-4" />
                                Payment method detected:{" "}
                                {scannedData.payment_method}
                            </div>
                        )}
                </DialogHeader>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-150"
                >
                    {/* Same form fields as ManualEntryForm */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date *
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) =>
                                    handleChange("date", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type *
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) =>
                                    handleChange("type", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                            </select>
                        </div>
                    </div>

                    {/* Need or Want - Only show for expenses */}
                    {formData.type === "expense" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Need or Want *
                            </label>
                            <select
                                value={formData.needOrWant}
                                onChange={(e) =>
                                    handleChange("needOrWant", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            >
                                <option value="need">Need</option>
                                <option value="want">Want</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) =>
                                handleChange("description", e.target.value)
                            }
                            placeholder="e.g., Grocery shopping"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            required
                        />
                    </div>

                    {/* Location field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                        </label>
                        <input
                            type="text"
                            value={formData.location || ""}
                            onChange={(e) =>
                                handleChange("location", e.target.value)
                            }
                            placeholder="e.g., Mid Valley, Kuala Lumpur"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        />
                        {scannedData?.location && (
                            <p className="text-xs text-gray-500 mt-1">
                                AI extracted: {scannedData.location}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount (RM) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={(e) =>
                                    handleChange("amount", e.target.value)
                                }
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) =>
                                    handleChange("category", value)
                                }
                            >
                                <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#04362c] bg-white hover:bg-white focus:bg-white">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(formData.type === "income"
                                        ? incomeCategories
                                        : expenseCategories
                                    ).map((category) => (
                                        <SelectItem
                                            key={category}
                                            value={category}
                                            className="text-[#04362c] focus:bg-transparent focus:text-[#04362c]"
                                        >
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account *
                        </label>
                        <select
                            value={formData.account}
                            onChange={(e) => {
                                const selectedAccount = accounts.find(
                                    (acc) => acc.account_name === e.target.value
                                );
                                setFormData((prev) => ({
                                    ...prev,
                                    account: e.target.value,
                                    accountId:
                                        selectedAccount?.account_id || null,
                                }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        >
                            {accounts.map((account) => (
                                <option
                                    key={account.account_id || account.id}
                                    value={account.account_name || account.name}
                                >
                                    {account.account_name || account.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium"
                        >
                            Rescan
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-[#04362c] text-white rounded-lg hover:bg-[#04362c]/90 font-medium transition-colors"
                        >
                            Add Transaction
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Manual Entry Form Component (separated for clarity)
function ManualEntryForm({
    open,
    onOpenChange,
    onSave,
    onBack,
    accounts = [],
}) {
    // Form state - holds all the input values
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0], // Get today's date in YYYY-MM-DD format
        description: "",
        amount: "",
        category: expenseCategories[0], // Default to first expense category
        type: "expense", // Default to expense
        needOrWant: "need", // Default to need for expenses
        account: accounts.length > 0 ? accounts[0].account_name : "", // Default to first account
        accountId: accounts.length > 0 ? accounts[0].account_id : null, // Store account ID
        expenseType: "needs", // Default to "needs" (vs "wants")
        // Expense-specific fields
        seller: "",
        location: "",
        taxAmount: "",
        taxDeductible: false,
        isReimbursable: false,
        // Income-specific fields
        payer: "",
        department: "",
        project: "",
        // Common field
        referenceNo: "",
    });

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault(); // Prevent page reload on form submit

        // Validate that required fields are filled
        if (!formData.description || !formData.amount) {
            alert("Please fill in all required fields");
            return;
        }

        // Validate type-specific required fields
        if (formData.type === "expense" && !formData.seller) {
            alert("Please enter the seller/merchant name");
            return;
        }

        if (formData.type === "income" && !formData.payer) {
            alert("Please enter the payer name");
            return;
        }

        // Create transaction object
        const transaction = {
            ...formData,
            // Convert amount to number and make negative for expenses
            amount:
                formData.type === "expense"
                    ? -Math.abs(parseFloat(formData.amount))
                    : Math.abs(parseFloat(formData.amount)),
            // Convert tax amount to number
            taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : 0,
        };

        // Call parent's onSave function
        onSave(transaction);
    };

    // Handle input changes
    const handleChange = (field, value) => {
        setFormData((prev) => {
            const updated = {
                ...prev, // Keep all existing values
                [field]: value, // Update only the changed field
            };

            // Auto-update category when type changes
            if (field === "type") {
                // Switch to first category of the new type
                updated.category =
                    value === "income"
                        ? incomeCategories[0]
                        : expenseCategories[0];
            }

            return updated;
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-[#04362c]/30 transition-all duration-500 ease-in-out animate-in fade-in-0 zoom-in-95">
                {/* Dialog Header */}
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl font-bold text-[#04362c] animate-in fade-in-0 slide-in-from-top-4 duration-500">
                        Add Transaction
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#04362c]/70 mt-1 animate-in fade-in-0 duration-500 delay-75">
                        Enter the transaction details below
                    </DialogDescription>
                </DialogHeader>

                {/* Dialog Body - Form */}
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-150"
                >
                    {/* Date and Type row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                Date *
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) =>
                                    handleChange("date", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                Type *
                            </label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) =>
                                    handleChange("type", value)
                                }
                            >
                                <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#04362c] bg-white hover:bg-white focus:bg-white">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        value="expense"
                                        className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                    >
                                        Expense
                                    </SelectItem>
                                    <SelectItem
                                        value="income"
                                        className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                    >
                                        Income
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Need or Want - Only show for expenses */}
                    {formData.type === "expense" && (
                        <div>
                            <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                Need or Want *
                            </label>
                            <Select
                                value={formData.needOrWant}
                                onValueChange={(value) =>
                                    handleChange("needOrWant", value)
                                }
                            >
                                <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#04362c] bg-white hover:bg-white focus:bg-white">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        value="need"
                                        className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                    >
                                        Need
                                    </SelectItem>
                                    <SelectItem
                                        value="want"
                                        className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                    >
                                        Want
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                            Description *
                        </label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) =>
                                handleChange("description", e.target.value)
                            }
                            placeholder="e.g., Grocery shopping"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                            required
                        />
                    </div>

                    {/* Amount and Category row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                Amount (RM) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={(e) =>
                                    handleChange("amount", e.target.value)
                                }
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                Category *
                            </label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) =>
                                    handleChange("category", value)
                                }
                            >
                                <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#04362c] bg-white hover:bg-white focus:bg-white">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(formData.type === "income"
                                        ? incomeCategories
                                        : expenseCategories
                                    ).map((category) => (
                                        <SelectItem
                                            key={category}
                                            value={category}
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Account */}
                    <div>
                        <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                            Account *
                        </label>
                        <Select
                            value={formData.account}
                            onValueChange={(value) => {
                                const selectedAccount = accounts.find(
                                    (acc) => acc.account_name === value
                                );
                                setFormData((prev) => ({
                                    ...prev,
                                    account: value,
                                    accountId:
                                        selectedAccount?.account_id || null,
                                }));
                            }}
                        >
                            <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#04362c] bg-white hover:bg-white focus:bg-white">
                                <SelectValue placeholder="Account" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((account) => (
                                    <>
                                        <option
                                            key={
                                                account.account_id || account.id
                                            }
                                            value={
                                                account.account_name ||
                                                account.name
                                            }
                                        >
                                            {account.account_name ||
                                                account.name}
                                        </option>
                                        <SelectItem
                                            key={account.account_id}
                                            value={account.account_name}
                                            className="text-[#04362c] focus:bg-accent/30 focus:text-[#04362c] hover:bg-accent/30"
                                        >
                                            {account.account_name}
                                        </SelectItem>
                                    </>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Expense-specific fields */}
                    {formData.type === "expense" && (
                        <>
                            {/* Seller/Merchant */}
                            <div>
                                <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                    Seller/Merchant *
                                </label>
                                <input
                                    type="text"
                                    value={formData.seller}
                                    onChange={(e) =>
                                        handleChange("seller", e.target.value)
                                    }
                                    placeholder="e.g., Walmart, Amazon"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                    required
                                />
                            </div>

                            {/* Location and Reference Number row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) =>
                                            handleChange(
                                                "location",
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., New York, Store #123"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                        Reference Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.referenceNo}
                                        onChange={(e) =>
                                            handleChange(
                                                "referenceNo",
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., INV-12345"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                    />
                                </div>
                            </div>

                            {/* Tax Amount */}
                            <div>
                                <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                    Tax Amount ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.taxAmount}
                                    onChange={(e) =>
                                        handleChange(
                                            "taxAmount",
                                            e.target.value
                                        )
                                    }
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                />
                            </div>

                            {/* Tax Deductible and Reimbursable checkboxes */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="taxDeductible"
                                        checked={formData.taxDeductible}
                                        onCheckedChange={(checked) =>
                                            handleChange(
                                                "taxDeductible",
                                                checked
                                            )
                                        }
                                    />
                                    <label
                                        htmlFor="taxDeductible"
                                        className="text-sm font-medium text-[#04362c]/90 cursor-pointer"
                                    >
                                        Tax Deductible
                                    </label>
                                </div>
                                <div className="flex items-center gap-2 flex-row-reverse">
                                    <Checkbox
                                        id="isReimbursable"
                                        checked={formData.isReimbursable}
                                        onCheckedChange={(checked) =>
                                            handleChange(
                                                "isReimbursable",
                                                checked
                                            )
                                        }
                                    />
                                    <label
                                        htmlFor="isReimbursable"
                                        className="text-sm font-medium text-[#04362c]/90 cursor-pointer"
                                    >
                                        Reimbursable
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Income-specific fields */}
                    {formData.type === "income" && (
                        <>
                            {/* Payer */}
                            <div>
                                <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                    Payer *
                                </label>
                                <input
                                    type="text"
                                    value={formData.payer}
                                    onChange={(e) =>
                                        handleChange("payer", e.target.value)
                                    }
                                    placeholder="e.g., Employer Name, Client Name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                    required
                                />
                            </div>

                            {/* Department and Project row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) =>
                                            handleChange(
                                                "department",
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., Engineering, Sales"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                        Project
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.project}
                                        onChange={(e) =>
                                            handleChange(
                                                "project",
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., Project Alpha"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                    />
                                </div>
                            </div>

                            {/* Reference Number for Income */}
                            <div>
                                <label className="block text-sm font-medium text-[#04362c]/90 mb-1">
                                    Reference Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.referenceNo}
                                    onChange={(e) =>
                                        handleChange(
                                            "referenceNo",
                                            e.target.value
                                        )
                                    }
                                    placeholder="e.g., PAY-12345"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                                />
                            </div>
                        </>
                    )}

                    {/* Footer Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:shadow-md transition-shadow"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-[#04362c] text-white rounded-lg hover:bg-[#04362c]/90 font-medium transition-colors"
                        >
                            Add Transaction
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default Transactions;
