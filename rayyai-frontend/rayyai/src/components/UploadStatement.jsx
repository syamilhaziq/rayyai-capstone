import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    FileUp,
    CreditCard,
    Shield,
    FileText,
    Eye,
    EyeClosed,
    Landmark,
    Trash2,
    RefreshCw,
    AlertTriangle,
    X,
    Loader,
    CheckCircle2,
    XCircle,
    Info,
    CircleAlert,
    PenTool,
    Building2,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "./ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";
import { API_BASE_URL } from "../services/api";

// Mock processed transactions - array of transaction objects
const mockTransactions = [
    {
        id: "1",
        date: "2024-01-15",
        description: "Salary Deposit",
        amount: 5100,
        category: "Income",
        type: "income",
    },
    {
        id: "2",
        date: "2024-01-14",
        description: "Grocery Store",
        amount: -125.5,
        category: "Food",
        type: "expense",
    },
    {
        id: "3",
        date: "2024-01-13",
        description: "Gas Station",
        amount: -60.0,
        category: "Transportation",
        type: "expense",
    },
    {
        id: "4",
        date: "2024-01-12",
        description: "Netflix Subscription",
        amount: -15.99,
        category: "Entertainment",
        type: "expense",
    },
    {
        id: "5",
        date: "2024-01-11",
        description: "Electric Bill",
        amount: -85.0,
        category: "Utilities",
        type: "expense",
    },
];

export default function UploadStatement() {
    // Brand token cache for consistent styling (matching Transaction History)
    const brand = {
        ink: "#04362c",
        mint: "#0DAD8D",
        surface: "#eef2f0",
        ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0DAD8D]",
    };

    // Shared helper function to infer expense type (wants vs needs) based on category and description
    // This matches the backend logic in routers/transactions.py
    const inferExpenseType = (category, description, amount) => {
        if (!category && !description) return "needs";
        
        const text = `${category || ""} ${description || ""}`.toLowerCase();
        
        // Check for transfers - return null (will be handled as transfer type)
        const transferKeywords = ["transfer", "savings", "saving", "own account", "self transfer", "internal transfer", 
                                 "tabung", "asb", "sspni", "ssp1m", "stash", "goal transfer", "auto-save"];
        if (transferKeywords.some(keyword => text.includes(keyword))) {
            return null; // Will be handled as transfer
        }
        
        // Shopping is always wants
        if (category === "Shopping" || category?.toLowerCase() === "shopping") {
            return "wants";
        }
        const shoppingKeywords = ["shopping", "shop", "mall", "purchase", "buy", "retail", "store", "fashion", "clothing", "apparel", "online shopping", "e-commerce", "marketplace"];
        if (shoppingKeywords.some(keyword => text.includes(keyword))) {
            return "wants";
        }
        
        // Dining - always wants if clearly dining out, or if amount > 50
        const diningKeywords = ["restaurant", "cafe", "bistro", "dining", "dine", "food court", "foodcourt", "takeout", "dining out"];
        const isDining = diningKeywords.some(keyword => text.includes(keyword));
        if (isDining) {
            if (amount === undefined || amount === null || Math.abs(amount) > 50) {
                return "wants";
            }
            // Still wants if clearly dining out
            if (["restaurant", "cafe", "bistro", "dining out", "takeout"].some(keyword => text.includes(keyword))) {
                return "wants";
            }
        }
        
        // Other wants keywords
        const wantsKeywords = ["entertainment", "travel", "personal care", "gym", "fitness", "spa", "salon", "beauty", "cinema", "movie", "game"];
        if (wantsKeywords.some(keyword => text.includes(keyword))) {
            return "wants";
        }
        
        // Default to needs
        return "needs";
    };

    // State management
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showTransactions, setShowTransactions] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("statements");
    const [extractedTransactions, setExtractedTransactions] = useState(null);
    const [extractingStatementId, setExtractingStatementId] = useState(null);
    const [editingAccountInfo, setEditingAccountInfo] = useState(false);
    // Cache for processed statements: { statementId: extractedData }
    // Load from localStorage on mount, persist on change
    const [processedStatements, setProcessedStatements] = useState(() => {
        try {
            const stored = localStorage.getItem("processedStatements");
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error(
                "Error loading processed statements from localStorage:",
                error
            );
            return {};
        }
    });
    // State for expandable rows in preview modal
    const [expandedPreviewRow, setExpandedPreviewRow] = useState(null);
    const [editingCell, setEditingCell] = useState(null); // { transactionId, field }
    const [editedPreviewTransactions, setEditedPreviewTransactions] = useState(
        []
    );
    // State for accounts (needed for dropdown in edit form)
    const [accounts, setAccounts] = useState([]);
    // State for credit cards (needed to check if card exists before creating)
    const [creditCards, setCreditCards] = useState([]);
    // State for import progress
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    // State for duplicate detection dialog
    const [duplicateDialog, setDuplicateDialog] = useState({
        isOpen: false,
        file: null,
        duplicateInfo: null,
    });
    // State for PDF viewer dialog
    const [pdfViewerDialog, setPdfViewerDialog] = useState({
        isOpen: false,
        pdfUrl: null,
        fileName: null,
    });
    // State for alert dialog
    const [alertDialog, setAlertDialog] = useState({
        isOpen: false,
        type: "info", // 'success', 'error', 'warning', 'info'
        title: "",
        message: "",
    });

    // State for rescan confirmation dialog
    const [rescanConfirmDialog, setRescanConfirmDialog] = useState({
        isOpen: false,
        file: null,
    });
    // State for delete confirmation dialog
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
        isOpen: false,
        file: null,
    });

    // Refs for file inputs to reset them after canceling duplicate dialog
    const statementInputRef = useRef(null);

    // Category lists
    const expenseCategories = [
        "Housing",
        "Groceries",
        "Dining",
        "Transportation",
        "Shopping",
        "Entertainment",
        "Healthcare",
        "Bills & Utilities",
        "Education",
        "Travel",
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

    // ✅ Fetch statements on component mount AND when tab changes
    useEffect(() => {
        fetchStatementsByTab();
        fetchAccounts();
        fetchCreditCards();
    }, [activeTab]); // Re-fetch when tab changes

    // Persist processedStatements to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(
                "processedStatements",
                JSON.stringify(processedStatements)
            );
        } catch (error) {
            console.error(
                "Error saving processed statements to localStorage:",
                error
            );
        }
    }, [processedStatements]);

    // Handle drawer animation
    useEffect(() => {
        if (showTransactions) {
            // Small delay to trigger animation after mount
            setTimeout(() => setIsDrawerOpen(true), 10);
        } else {
            setIsDrawerOpen(false);
        }
    }, [showTransactions]);

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            if (pdfViewerDialog.pdfUrl && pdfViewerDialog.pdfUrl.startsWith('blob:')) {
                URL.revokeObjectURL(pdfViewerDialog.pdfUrl);
            }
        };
    }, [pdfViewerDialog.pdfUrl]);

    // Helper function to close drawer with animation
    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => {
            setShowTransactions(false);
            setExtractedTransactions(null);
        }, 300); // Match the transition duration
    };

    // Helper function to show alert dialog
    const showAlert = (type, title, message) => {
        setAlertDialog({
            isOpen: true,
            type,
            title,
            message,
        });
    };

    // Helper function to close PDF viewer and cleanup blob URL
    const closePdfViewer = () => {
        // Cleanup blob URL to prevent memory leaks
        if (pdfViewerDialog.pdfUrl && pdfViewerDialog.pdfUrl.startsWith('blob:')) {
            URL.revokeObjectURL(pdfViewerDialog.pdfUrl);
        }
        setPdfViewerDialog({
            isOpen: false,
            pdfUrl: null,
            fileName: null,
        });
    };

    // Fetch user accounts for dropdown
    const fetchAccounts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/accounts/`, {
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
        }
    };

    // Fetch user credit cards
    const fetchCreditCards = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/cards/`, {
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setCreditCards(data);
            }
        } catch (error) {
            console.error("Error fetching credit cards:", error);
        }
    };

    // ✅ Fetch ALL statements (used for manual refresh button)
    const fetchAllStatements = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/statement`, {
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem(
                        "token"
                    )}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch statements");
            }

            const regularStatements = await response.json();

            // Transform all statements
            const allStatements = regularStatements.map(transformStatement);

            // Sort by upload date (newest first)
            allStatements.sort((a, b) => b.uploadDate - a.uploadDate);

            setUploadedFiles(allStatements);
        } catch (error) {
            console.error("Error fetching statements:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ Optimized: Fetch statements based on active tab only
    const fetchStatementsByTab = async () => {
        setIsLoading(true);
        try {
            // Only fetch regular financial statements
            const response = await fetch(`${API_BASE_URL}/statement`, {
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem(
                        "token"
                    )}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch statements");
            }

            const statements = await response.json();
            const transformedStatements =
                statements.map(transformStatement);
            transformedStatements.sort(
                (a, b) => b.uploadDate - a.uploadDate
            );
            setUploadedFiles(transformedStatements);
        } catch (error) {
            console.error("Error fetching statements:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ Transform backend statement data to frontend format
    const transformStatement = (statement) => {
        // Use display_name if available, fallback to extracting filename from URL
        const filename =
            statement.display_name ||
            statement.statement_url.split("/").pop() ||
            "Unknown file";

        // Debug logging
        console.log(
            `[TRANSFORM] Statement ${statement.statement_id}: display_name="${statement.display_name}", using filename="${filename}"`
        );

        // Determine file type
        let type = statement.statement_type.toLowerCase();
        if (type === "credit_card") type = "credit";

        // Format date range if period dates exist (for bank/credit statements)
        let dateRange = null;
        if (statement.period_start && statement.period_end) {
            const startDate = new Date(statement.period_start);
            const endDate = new Date(statement.period_end);
            dateRange = `${startDate.toLocaleDateString(
                "en-GB"
            )} - ${endDate.toLocaleDateString("en-GB")}`;
        }

        return {
            id: statement.statement_id.toString(),
            statementId: statement.statement_id,
            name: filename,
            size: "N/A",
            status: "completed",
            uploadDate: new Date(
                statement.date_uploaded || statement.created_at
            ),
            type: type,
            transactionsCount: null,
            dateRange: dateRange,
            extractedData: statement.extracted_data,
            statementUrl: statement.statement_url,
            fileName: filename, // Also store in fileName for PDF viewer
        };
    };

    // useCallback - memoizes function to prevent unnecessary re-renders
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        // Default to statement upload for drag-and-drop
        handleStatementUpload(files);
    }, []);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        handleStatementUpload(files);
    };

    // ✅ Upload financial statements (bank/credit/ewallet/receipt)
    const handleStatementUpload = async (
        files,
        forceUpload = false,
        statementTypeOverride = null
    ) => {
        setIsProcessing(true);

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);

                // Determine statement type based on filename or use override
                let statementType = statementTypeOverride;
                if (!statementType) {
                    if (file.name.toLowerCase().includes("credit")) {
                        statementType = "credit_card";
                    } else if (file.name.toLowerCase().includes("ewallet")) {
                        statementType = "ewallet";
                    } else if (file.name.toLowerCase().includes("receipt")) {
                        statementType = "receipt";
                    } else {
                        statementType = "bank";
                    }
                }

                // Create temporary file entry for UI feedback
                const tempFile = {
                    id:
                        "temp-" +
                        Date.now().toString() +
                        Math.random().toString(36).substring(2, 11),
                    name: file.name,
                    size: formatFileSize(file.size),
                    status: "processing",
                    uploadDate: new Date(),
                    type:
                        statementType === "credit_card"
                            ? "credit"
                            : statementType,
                };

                // Add temporary file for immediate UI feedback
                setUploadedFiles((prev) => [tempFile, ...prev]);

                try {
                    const url = `${API_BASE_URL}/statement?statement_type=${statementType}${
                        forceUpload ? "&force_upload=true" : ""
                    }`;

                    const response = await fetch(url, {
                        method: "POST",
                        body: formData,
                        credentials: "include",
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    });

                    if (!response.ok) {
                        const errorData = await response.json();

                        // Handle duplicate detection (409 Conflict)
                        if (response.status === 409) {
                            // Remove temp file
                            setUploadedFiles((prev) =>
                                prev.filter((f) => f.id !== tempFile.id)
                            );

                            // Show duplicate dialog with detailed information
                            setDuplicateDialog({
                                isOpen: true,
                                file: file,
                                duplicateInfo:
                                    errorData.detail.duplicate_statement,
                                uploadType: "statement",
                                statementType: statementType,
                            });
                            return; // Exit early, don't throw error
                        }

                        throw new Error(
                            errorData.detail?.message ||
                                errorData.detail ||
                                "Upload failed"
                        );
                    }

                    // Remove temp file
                    setUploadedFiles((prev) =>
                        prev.filter((f) => f.id !== tempFile.id)
                    );

                    // Refresh all statements
                    await fetchStatementsByTab();
                } catch (error) {
                    console.error("Upload error:", error);
                    // Update temp file to show error
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === tempFile.id ? { ...f, status: "error" } : f
                        )
                    );
                    showAlert(
                        "error",
                        "Upload Failed",
                        `Failed to upload ${file.name}: ${error.message}`
                    );
                }
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // ✅ Delete statement (soft delete)
    const handleDeleteStatement = async () => {
        const file = deleteConfirmDialog.file;
        if (!file) return;

        setDeleteConfirmDialog({ isOpen: false, file: null });

        try {
            const endpoint = `/statement/${file.statementId}`;

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to delete statement");
            }

            // Remove from UI
            setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id));

            // Remove from processed statements cache (localStorage)
            setProcessedStatements((prev) => {
                const updated = { ...prev };
                delete updated[file.statementId];
                return updated;
            });
        } catch (error) {
            console.error("Delete error:", error);
            showAlert(
                "error",
                "Delete Failed",
                `Failed to delete statement: ${error.message}`
            );
        }
    };

    // Helper function to format bytes into human-readable size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Function returns appropriate icon/element based on status
    const getStatusIcon = (status) => {
        switch (status) {
            case "completed":
                return <span className="text-green-500 text-xl">✓</span>;
            case "processing":
                return (
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                );
            case "error":
                return <span className="text-red-500 text-xl">⚠</span>;
            default:
                return null;
        }
    };

    // Helper function to format filename for display (remove underscores, file extensions, add spaces)
    const formatFileName = (fileName) => {
        if (!fileName) return "";
        // Remove file extension
        let formatted = fileName.replace(/\.[^/.]+$/, "");
        // Replace underscores with spaces
        formatted = formatted.replace(/_/g, " ");
        // Add space before capital letters that follow lowercase (e.g., "Sep-Oct2025" -> "Sep-Oct 2025")
        formatted = formatted.replace(/([a-z])([A-Z])/g, "$1 $2");
        // Add space before numbers that follow letters (e.g., "Oct2025" -> "Oct 2025")
        formatted = formatted.replace(/([a-zA-Z])(\d)/g, "$1 $2");
        // Add space after numbers that are followed by letters (e.g., "2025Sep" -> "2025 Sep")
        formatted = formatted.replace(/(\d)([a-zA-Z])/g, "$1 $2");
        return formatted;
    };

    // Returns object with icon, label, and styling for different file types
    const getFileTypeInfo = (type) => {
        switch (type) {
            case "bank":
                return {
                    icon: <Building2 className="w-6 h-6" style={{ color: brand.ink }} />,
                    label: "Bank Statement",
                    color: "bg-blue-100 text-blue-800",
                };
            case "credit":
                return {
                    icon: <CreditCard className="w-6 h-6" style={{ color: brand.ink }} />,
                    label: "Credit Card",
                    color: "bg-purple-100 text-purple-800",
                };
            case "ewallet":
                return {
                    icon: <FileText className="w-6 h-6" style={{ color: brand.ink }} />,
                    label: "E-Wallet",
                    color: "bg-green-100 text-green-800",
                };
            case "receipt":
                return {
                    icon: <FileText className="w-6 h-6" style={{ color: brand.ink }} />,
                    label: "Receipt",
                    color: "bg-orange-100 text-orange-800",
                };
            default:
                return {
                    icon: <FileText className="w-6 h-6" style={{ color: brand.ink }} />,
                    label: "Document",
                    color: "bg-gray-100 text-[#04362c]/90",
                };
        }
    };

    const viewTransactions = async (file) => {
        setSelectedFile(file);
        setShowTransactions(true);
    };

    // Helper function to initialize transactions with default values (DRY - Don't Repeat Yourself)
    const initializeTransactionsWithDefaults = (result) => {
        // Use account info from AI extraction if available, otherwise use first account
        const extractedAccountName =
            result.account_info?.account_name ||
            result.account_info?.account_type ||
            "";

        // Check if the extracted account name matches an existing account
        const matchingAccount = accounts.find(
            (acc) =>
                acc.account_name.toLowerCase() ===
                extractedAccountName.toLowerCase()
        );

        const defaultAccount =
            extractedAccountName || accounts[0]?.account_name || "";
        const defaultAccountId =
            matchingAccount?.account_id ||
            (extractedAccountName ? null : accounts[0]?.account_id) ||
            null;

        return (result.transactions || []).map((txn, idx) => {
            // Determine if this is a transfer based on category or transfer_type
            const isTransfer = txn.category === "Transfer" || txn.transfer_type || 
                              (txn.description?.toLowerCase().includes("transfer") && 
                               (txn.description?.toLowerCase().includes("savings") || 
                                txn.description?.toLowerCase().includes("own account") ||
                                txn.description?.toLowerCase().includes("internal")));
            
            // Infer expense type for expenses (not transfers or income)
            let expenseType = null;
            if (txn.type === "debit" && !isTransfer) {
                const inferred = inferExpenseType(txn.category, txn.description, txn.amount);
                expenseType = inferred || "needs"; // Default to needs if null (shouldn't happen for expenses)
            }
            
            return {
                ...txn,
                id: `preview-${idx}`,
                account: defaultAccount,
                accountId: defaultAccountId,
                // For expenses
                seller: txn.merchant || "",
                location: txn.location || "",
                reference_no: "",
                tax_amount: 0,
                expenseType: expenseType, // null for transfers/income, "needs"/"wants" for expenses
                // For transfers
                transfer_type: txn.transfer_type || (isTransfer ? "intra_person" : null),
                // For income
                payer: "",
            };
        });
    };

    // Optimized helper to update a single transaction field (reduces repeated map operations)
    const updateTransactionField = (transactionId, updates) => {
        setEditedPreviewTransactions((prev) =>
            prev.map((t) => (t.id === transactionId ? { ...t, ...updates } : t))
        );
    };

    // Open PDF in new tab (avoids CORS issues with S3)
    const handlePreviewPdf = async (file) => {
        // Use backend proxy endpoint to serve PDF (avoids CORS issues)
        const token = localStorage.getItem("token");
        const pdfUrl = `${API_BASE_URL}/statement/${file.statementId}/view?token=${encodeURIComponent(token || "")}`;
        
        // Try to fetch the PDF first to check if it exists and create blob URL
        try {
            const response = await fetch(pdfUrl, {
                credentials: 'include',
            });
            
            if (!response.ok) {
                // File doesn't exist or error occurred
                let errorMessage = `The statement file "${file.fileName || 'statement'}" could not be found.`;
                
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        errorMessage = errorData.detail;
                    }
                } catch {
                    // If response is not JSON, use default message
                }
                
                showAlert(
                    'error',
                    'File Not Available',
                    errorMessage + ' It may have been deleted or the file URL is invalid. Please try uploading the statement again.'
                );
                return;
            }
            
            // Check if response is actually a PDF
            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.includes('application/pdf') && !contentType.includes('image/')) {
                // Response might be an error JSON
                try {
                    const errorData = await response.json();
                    showAlert(
                        'error',
                        'File Not Available',
                        errorData.detail || `The statement file could not be loaded.`
                    );
                    return;
                } catch {
                    // Not JSON, continue
                }
            }
            
            // Create blob URL from the PDF data
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Open PDF in integrated dialog viewer with blob URL
            setPdfViewerDialog({
                isOpen: true,
                pdfUrl: blobUrl,
                fileName: file.fileName || "Statement.pdf",
            });
        } catch (error) {
            console.error('Error loading PDF:', error);
            showAlert(
                'error',
                'Unable to Load Statement',
                `Failed to load the statement file. Please check your connection and try again.`
            );
        }
    };

    // Process statement with AI to extract transactions
    const handleProcessStatement = async (file) => {
        setExtractingStatementId(file.statementId);
        setSelectedFile(file);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${API_BASE_URL}/statement/preview/${file.statementId}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.detail || "Failed to extract transactions"
                );
            }

            const result = await response.json();

            // Log if backend returned cached data (optimization - no Gemini API call!)
            if (result.cached) {
                console.log(
                    `✅ Using backend cached data (last processed: ${result.last_processed})`
                );
            } else {
                console.log(
                    `🔄 Fresh extraction from Gemini AI (cached for future requests)`
                );
            }

            setExtractedTransactions(result);
            // Initialize editable transactions using shared helper
            const transactionsWithDefaults =
                initializeTransactionsWithDefaults(result);
            setEditedPreviewTransactions(transactionsWithDefaults);
            // Cache the extracted data for this statement
            setProcessedStatements((prev) => ({
                ...prev,
                [file.statementId]: result,
            }));

            // Refresh the file list to get updated display_name from backend
            await fetchStatementsByTab();

            setShowTransactions(true);
        } catch (error) {
            console.error("Extraction error:", error);
            showAlert(
                "error",
                "Extraction Failed",
                `Failed to extract transactions: ${error.message}`
            );
        } finally {
            setExtractingStatementId(null);
        }
    };


    // View previously extracted transactions from cache
    const handleViewExtractedTransactions = (file) => {
        const cachedData = processedStatements[file.statementId];
        if (cachedData) {
            setSelectedFile(file);
            setExtractedTransactions(cachedData);
            // Re-initialize editable transactions using shared helper
            const transactionsWithDefaults =
                initializeTransactionsWithDefaults(cachedData);
            setEditedPreviewTransactions(transactionsWithDefaults);
            setShowTransactions(true);
        }
    };

    // Show rescan confirmation dialog
    const showRescanConfirmation = (file) => {
        setRescanConfirmDialog({
            isOpen: true,
            file: file,
        });
    };

    // Rescan statement - re-extract with improved AI prompt and update cache
    const handleRescanStatement = async () => {
        const file = rescanConfirmDialog.file;

        // Close confirmation dialog
        setRescanConfirmDialog({ isOpen: false, file: null });

        setExtractingStatementId(file.statementId);
        setSelectedFile(file);

        try {
            const token = localStorage.getItem("token");
            // Force refresh to bypass cache and re-extract with Gemini
            const response = await fetch(
                `${API_BASE_URL}/statement/preview/${file.statementId}?force_refresh=true`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.detail || "Failed to re-extract transactions"
                );
            }

            const result = await response.json();
            setExtractedTransactions(result);

            // Initialize editable transactions using shared helper
            const transactionsWithDefaults =
                initializeTransactionsWithDefaults(result);
            setEditedPreviewTransactions(transactionsWithDefaults);

            // Update cache with new extraction
            setProcessedStatements((prev) => ({
                ...prev,
                [file.statementId]: result,
            }));

            // Refresh the file list to get updated display_name from backend
            await fetchStatementsByTab();

            setShowTransactions(true);
            showAlert(
                "success",
                "Re-extraction Successful",
                `Re-extracted ${result.total_transactions} transactions with improved location detection!`
            );
        } catch (error) {
            console.error("Re-extraction error:", error);
            showAlert(
                "error",
                "Re-extraction Failed",
                `Failed to re-extract transactions: ${error.message}`
            );
        } finally {
            setExtractingStatementId(null);
        }
    };

    // Import extracted transactions to database using cached data (no re-processing)
    const handleImportTransactions = async () => {
        if (
            !editedPreviewTransactions ||
            editedPreviewTransactions.length === 0
        ) {
            showAlert(
                "warning",
                "No Transactions",
                "No transactions to import"
            );
            return;
        }

        if (!extractedTransactions?.account_info?.account_number) {
            showAlert(
                "warning",
                "Missing Account Number",
                "Account number is missing. Cannot create account without account number."
            );
            return;
        }

        setIsImporting(true);
        setImportProgress(0);

        const token = localStorage.getItem("token");
        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;
        const errors = [];

        try {
            // Step 1: Create or find account ONCE using the extracted account info
            const accountInfo = extractedTransactions.account_info;
            let targetAccountId = null;

            // Check if account already exists by account number
            const accountsResponse = await fetch(`${API_BASE_URL}/accounts/`, {
                method: "GET",
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (accountsResponse.ok) {
                const existingAccounts = await accountsResponse.json();
                const matchingAccount = existingAccounts.find(
                    (acc) => acc.account_no === accountInfo.account_number
                );

                if (matchingAccount) {
                    targetAccountId = matchingAccount.account_id;
                    console.log(
                        `Using existing account: ${matchingAccount.account_name} (${matchingAccount.account_no})`
                    );
                }
            }
            // Create credit card if it's a credit card statement and doesn't exist
            const statementType = extractedTransactions?.statement_type;
            if (statementType === "credit_card" && accountInfo.account_number) {
                const cardNumber = accountInfo.account_number;

                // Check if credit card already exists (match by last 4 digits)
                const existingCard = creditCards.find((card) =>
                    card.card_number.endsWith(cardNumber.slice(-4))
                );

                if (!existingCard) {
                    // Determine card brand from account_type or account_name
                    const accountType =
                        accountInfo.account_type?.toLowerCase() || "";
                    const accountName =
                        accountInfo.account_name?.toLowerCase() || "";
                    let cardBrand = "Unknown";

                    if (
                        accountType.includes("visa") ||
                        accountName.includes("visa")
                    ) {
                        cardBrand = "Visa";
                    } else if (
                        accountType.includes("mastercard") ||
                        accountName.includes("mastercard")
                    ) {
                        cardBrand = "Mastercard";
                    } else if (
                        accountType.includes("amex") ||
                        accountName.includes("american express")
                    ) {
                        cardBrand = "American Express";
                    }

                    // Use AI-extracted bank name or fallback to string matching
                    let bankName = accountInfo.bank_name || "Unknown";

                    // Fallback: If AI didn't extract bank_name, try to extract it from account_name
                    if (bankName === "Unknown") {
                        const commonBanks = [
                            "Maybank",
                            "CIMB",
                            "Public Bank",
                            "RHB",
                            "Hong Leong",
                            "AmBank",
                            "HSBC",
                            "Standard Chartered",
                            "Citibank",
                            "UOB",
                            "Alliance Bank",
                            "Affin Bank",
                            "Bank Islam",
                            "Bank Rakyat",
                        ];
                        for (const bank of commonBanks) {
                            if (
                                accountName.includes(bank.toLowerCase()) ||
                                accountType.includes(bank.toLowerCase())
                            ) {
                                bankName = bank;
                                break;
                            }
                        }
                    }

                    const currentYear = new Date().getFullYear();

                    // Get credit card terms from AI extraction (if available)
                    const creditCardTerms =
                        extractedTransactions?.credit_card_terms || {};

                    // Create the credit card with extracted terms
                    const createCardResponse = await fetch(
                        `${API_BASE_URL}/cards/`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                user_id: 0, // Placeholder - will be overridden by backend with authenticated user's ID
                                card_number: cardNumber,
                                card_name:
                                    accountInfo.account_name ||
                                    `${cardBrand} Credit Card`,
                                bank_name: bankName, // ✅ Now uses AI-extracted bank_name
                                card_brand: cardBrand,
                                expiry_month: 12,
                                expiry_year: currentYear + 3,
                                credit_limit:
                                    creditCardTerms.credit_limit || 0.0,
                                annual_fee: creditCardTerms.annual_fee || 0.0,
                                current_balance:
                                    creditCardTerms.current_balance || 0.0,
                                next_payment_amount:
                                    creditCardTerms.minimum_payment || null,
                                next_payment_date:
                                    creditCardTerms.payment_due_date || null,
                                benefits: {},
                            }),
                        }
                    );

                    if (createCardResponse.ok) {
                        const newCard = await createCardResponse.json();
                        console.log("Auto-registered credit card:", newCard);

                        // Create initial terms history record using extracted data
                        try {
                            // Use extracted interest rate or default to 18%
                            const interestRate =
                                creditCardTerms.interest_rate || 18.0;
                            const minimumPayment =
                                creditCardTerms.minimum_payment || null;

                            // Use statement start date as effective date, or today if not available
                            const effectiveDate =
                                extractedTransactions?.statement_period
                                    ?.start_date ||
                                new Date().toISOString().split("T")[0];

                            const termsHistoryResponse = await fetch(
                                `${API_BASE_URL}/cards/${newCard.card_id}/history`,
                                {
                                    method: "POST",
                                    credentials: "include",
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        card_id: newCard.card_id,
                                        effective_date: effectiveDate,
                                        interest_rate: interestRate,
                                        minimum_payment: minimumPayment,
                                    }),
                                }
                            );

                            if (termsHistoryResponse.ok) {
                                const termsHistory =
                                    await termsHistoryResponse.json();
                                console.log(
                                    "Created initial terms history:",
                                    termsHistory
                                );
                            } else {
                                const termsError =
                                    await termsHistoryResponse.json();
                                console.warn(
                                    "Failed to create terms history (non-critical):",
                                    termsError
                                );
                            }
                        } catch (termsError) {
                            console.warn(
                                "Failed to create terms history (non-critical):",
                                termsError
                            );
                        }

                        // Refresh credit cards list to update state
                        await fetchCreditCards();
                    } else {
                        const errorData = await createCardResponse.json();
                        console.error(
                            "Failed to create credit card:",
                            errorData
                        );
                        console.error("Request payload was:", {
                            user_id: 0,
                            card_number: cardNumber,
                            card_name:
                                accountInfo.account_name ||
                                `${cardBrand} Credit Card`,
                            bank_name: bankName,
                            card_brand: cardBrand,
                            expiry_month: 12,
                            expiry_year: currentYear + 3,
                            credit_limit: 0.0,
                            annual_fee: 0.0,
                            current_balance: 0.0,
                            benefits: {},
                        });
                    }
                }
            }
            // Create account if it doesn't exist
            if (!targetAccountId) {
                const accountName =
                    accountInfo.account_name ||
                    accountInfo.account_type ||
                    `Account ${accountInfo.account_number}`;
                const accountType = accountInfo.account_type
                    ?.toLowerCase()
                    .includes("savings")
                    ? "savings"
                    : accountInfo.account_type
                          ?.toLowerCase()
                          .includes("current")
                    ? "current"
                    : accountInfo.account_type?.toLowerCase().includes("credit")
                    ? "credit"
                    : "savings"; // default

                const createAccountResponse = await fetch(
                    `${API_BASE_URL}/accounts/`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            account_name: accountName,
                            account_type: accountType,
                            account_no: accountInfo.account_number,
                        }),
                    }
                );

                if (createAccountResponse.ok) {
                    const newAccount = await createAccountResponse.json();
                    targetAccountId = newAccount.account_id;
                    console.log(
                        `Created new account: ${accountName} (${accountInfo.account_number})`
                    );
                } else {
                    throw new Error("Failed to create account");
                }
            }

            // Step 2: Import all transactions using the single account
            const totalTransactions = editedPreviewTransactions.length;

            // Log the full array before import to check for duplicates
            console.log(`=== IMPORT DEBUG: Total transactions to import: ${totalTransactions} ===`);
            console.log("Checking for duplicates in preview array...");

            // Check for duplicates in the preview array
            const seenTransactions = new Map();
            editedPreviewTransactions.forEach((txn, idx) => {
                const key = `${txn.date}_${txn.description}_${txn.amount}`;
                if (seenTransactions.has(key)) {
                    console.warn(`DUPLICATE FOUND in preview array at index ${idx}:`, {
                        original_index: seenTransactions.get(key),
                        duplicate_index: idx,
                        transaction: { date: txn.date, description: txn.description, amount: txn.amount }
                    });
                } else {
                    seenTransactions.set(key, idx);
                }
            });
            console.log(`Unique transactions: ${seenTransactions.size}, Total: ${totalTransactions}, Duplicates: ${totalTransactions - seenTransactions.size}`);

            for (let i = 0; i < totalTransactions; i++) {
                const txn = editedPreviewTransactions[i];

                // Update progress
                const progress = Math.round(
                    ((i + 1) / totalTransactions) * 100
                );
                setImportProgress(progress);

                try {
                    const isTransfer = txn.type === "transfer" || txn.category === "Transfer";
                    const isIncome =
                        txn.type === "credit" || txn.type === "income";
                    const endpoint = isIncome
                        ? "/transactions/income"
                        : "/transactions/expense";

                    const transactionData = isIncome
                        ? {
                              account_id: targetAccountId,
                              amount: Math.abs(txn.amount),
                              description: txn.description || "",
                              category: txn.category || "Other",
                              date_received: txn.date,
                              payer: txn.payer || txn.merchant || "Unknown",
                              reference_no: txn.reference_no || null,
                              statement_id: extractedTransactions.statement_id,
                          }
                        : {
                              account_id: targetAccountId,
                              amount: Math.abs(txn.amount),
                              description: txn.description || "",
                              category: txn.category || "Other",
                              date_spent: txn.date,
                              seller: txn.seller || txn.merchant || "Unknown",
                              location: txn.location || null,
                              reference_no: txn.reference_no || null,
                              tax_amount: txn.tax_amount || 0,
                              expense_type: txn.expenseType || null,
                              statement_id: extractedTransactions.statement_id,
                          };

                    console.log(`Importing transaction ${i + 1}/${totalTransactions}:`, {
                        endpoint,
                        date: txn.date,
                        description: txn.description,
                        amount: txn.amount,
                        type: txn.type
                    });

                    const txnResponse = await fetch(
                        `${API_BASE_URL}${endpoint}`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(transactionData),
                        }
                    );

                    if (txnResponse.ok) {
                        successCount++;
                    } else if (txnResponse.status === 409) {
                        // Duplicate transaction - skip silently
                        skippedCount++;
                        console.log(
                            `Transaction ${i + 1} already exists - skipped`
                        );
                    } else {
                        const errorData = await txnResponse.json();
                        throw new Error(
                            errorData.detail || "Failed to create transaction"
                        );
                    }
                } catch (txnError) {
                    // Only count as failure if it's not a duplicate
                    if (!txnError.message?.includes("409")) {
                        failCount++;
                        errors.push(`Row ${i + 1}: ${txnError.message}`);
                    }
                    console.error(
                        `Failed to import transaction ${i + 1}:`,
                        txnError
                    );
                }
            }

            // Step 3: Update account balance and get reconciliation info
            let reconciliationWarning = null;
            try {
                const processResponse = await fetch(
                    `${API_BASE_URL}/statement/process/${extractedTransactions.statement_id}`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (processResponse.ok) {
                    const processResult = await processResponse.json();

                    // Temporarily disabled: Don't show balance mismatch warning to user
                    // Check for reconciliation warning
                    // if (processResult.reconciliation && !processResult.reconciliation.matches) {
                    //     const recon = processResult.reconciliation;
                    //     reconciliationWarning = `Balance Mismatch Detected!\n\nExtracted closing balance: RM ${recon.extracted_closing_balance}\nCalculated from transactions: RM ${recon.calculated_closing_balance}\nDifference: RM ${recon.difference}\n\nThis may indicate missing transactions in the statement.`;
                    // }

                    console.log("Balance updated successfully:", processResult);
                } else {
                    console.warn("Failed to update balance, but transactions were imported");
                }
            } catch (balanceError) {
                console.error("Error updating balance:", balanceError);
                // Don't fail the import if balance update fails
            }

            // Show result
            setImportProgress(100);
            setTimeout(() => {
                if (reconciliationWarning) {
                    // Show reconciliation warning with import results
                    showAlert(
                        "warning",
                        "Import Completed - Balance Warning",
                        `Imported: ${successCount} transactions${skippedCount > 0 ? `\nSkipped: ${skippedCount} (already exist)` : ""}${failCount > 0 ? `\nFailed: ${failCount}` : ""}\n\n${reconciliationWarning}`
                    );
                } else if (failCount === 0 && skippedCount === 0) {
                    showAlert(
                        "success",
                        "Import Successful",
                        `Successfully imported ${successCount} transactions.`
                    );
                } else if (failCount === 0 && skippedCount > 0) {
                    showAlert(
                        "success",
                        "Import Completed",
                        `Imported: ${successCount} transactions\nSkipped: ${skippedCount} (already exist)`
                    );
                } else {
                    showAlert(
                        "warning",
                        "Import Completed with Issues",
                        `Imported: ${successCount}\nSkipped: ${skippedCount} (duplicates)\nFailed: ${failCount}\n\nErrors:\n${errors
                            .slice(0, 5)
                            .join("\n")}${errors.length > 5 ? "\n..." : ""}`
                    );
                }

                // Refresh accounts
                fetchAccounts();

                // Close drawer
                setShowTransactions(false);
                setExtractedTransactions(null);
            }, 300);
        } catch (error) {
            console.error("Import error:", error);
            showAlert(
                "error",
                "Import Failed",
                `Failed to import transactions:\n\n${error.message}`
            );
        } finally {
            setIsImporting(false);
            setImportProgress(0);
        }
    };

    // Helper functions that return CSS classes based on state
    const getDragOverClasses = (isDragOver) => {
        return isDragOver
            ? "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 border-primary-foreground bg-primary-foreground/10 shadow-lg"
            : "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 border-gray-300";
    };


    // Handle force upload after user confirms
    const handleCancelDuplicate = () => {
        // Close dialog
        setDuplicateDialog({
            isOpen: false,
            file: null,
            duplicateInfo: null,
        });

        // Reset file inputs so the same file can be selected again
        if (statementInputRef.current) statementInputRef.current.value = "";
    };

    const handleForceUpload = () => {
        const { file, statementType } = duplicateDialog;

        // Close dialog
        setDuplicateDialog({
            isOpen: false,
            file: null,
            duplicateInfo: null,
        });

        // Reset file inputs after force upload
        if (statementInputRef.current) statementInputRef.current.value = "";

        // Retry upload with force flag
        handleStatementUpload([file], true, statementType);
    };

    return (
        <div
            id="upload-statement-page"
            className="min-h-screen text-lg md:text-xl lg:text-2xl flex flex-col py-10 sm:py-12 md:py-16 lg:py-20"
            style={{
                background: brand.surface,
                margin: "0",
                border: "0",
                padding: "80px",
            }}
        >
            <div className="w-full">
                {/* Header section */}
                <div className="mb-8 sm:mb-12">
                    <div className="flex items-center gap-2 mb-4">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-left" style={{ color: brand.ink }}>
                            Document Upload Center
                        </h1>
                    </div>
                    <p className="font-medium text-2xl sm:text-3xl leading-relaxed text-left" style={{ color: 'rgba(4, 54, 44, 0.9)' }}>
                        Upload your financial documents for comprehensive
                        analysis and insights
                    </p>
                </div>

                {/* Upload Section */}
                <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-6">
                            {/* Bank & Credit Card Upload */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border shadow-xl mb-10" style={{ borderColor: brand.ink + '33' }}>
                                <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: brand.ink + '33' }}>
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: brand.ink }}>
                                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 pt-1" />
                                        Upload Financial Statements
                                    </h2>
                                    <p className="text-sm sm:text-base mt-1" style={{ color: brand.ink + 'CC' }}>
                                        Bank statements, credit card statements,
                                        and other financial documents
                                    </p>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div
                                        className={getDragOverClasses(
                                            isDragOver
                                        )}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <FileUp className="w-16 h-16 mx-auto mb-4" style={{ color: brand.ink }} />
                                        <h3 className="mb-2 font-medium" style={{ color: brand.ink }}>
                                            Upload Financial Documents
                                        </h3>
                                        <p className="mb-4" style={{ color: brand.ink + 'CC' }}>
                                            Drag and drop your bank statements,
                                            credit card statements, or click to
                                            browse
                                        </p>
                                        <div className="space-y-2 mb-4">
                                            <p className="text-xs" style={{ color: brand.ink + 'B3' }}>
                                                Supported formats: PDF, JPG, PNG
                                            </p>
                                            <p className="text-xs" style={{ color: brand.ink + 'CC' }}>
                                                Maximum file size: 10MB per file
                                            </p>
                                        </div>
                                        <input
                                            ref={statementInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="statement-upload"
                                        />
                                        <label
                                            htmlFor="statement-upload"
                                            className="px-6 py-3 rounded-lg cursor-pointer transition-all flex items-center gap-2 w-fit mx-auto font-semibold shadow-md hover:shadow-lg"
                                            style={{ 
                                                backgroundColor: brand.ink,
                                                color: '#ffffff'
                                            }}
                                        >
                                            <FileUp className="w-5 h-5" />{" "}
                                            Choose Files
                                        </label>
                                    </div>

                                    {isProcessing && (
                                        <div className="mt-4 p-4 rounded-lg flex items-center justify-center gap-3" style={{ backgroundColor: brand.mint + '1A' }}>
                                            <Loader className="w-5 h-5 animate-spin" style={{ color: brand.mint }} />
                                            <p className="text-sm" style={{ color: brand.ink }}>
                                                Processing uploaded files...
                                                This may take a few moments.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Uploaded Files List */}
                    <div id="statement-list-section" className="bg-white/95 backdrop-blur-sm rounded-xl border shadow-xl" style={{ borderColor: brand.ink + '33' }}>
                        <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: brand.ink + '33' }}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: brand.ink }}>
                                        <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                                        Your Documents
                                    </h2>
                                    <p className="text-sm sm:text-base mt-1" style={{ color: brand.ink + 'CC' }}>
                                        View and manage your financial statements
                                    </p>
                                </div>
                                <button
                                    onClick={fetchStatementsByTab}
                                    disabled={isLoading}
                                    className="p-3 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-md flex-shrink-0 disabled:opacity-50 focus:outline-none focus:ring-0 border-0"
                                    title="Refresh"
                                >
                                    <RefreshCw
                                        className={`w-6 h-6 text-[#04362c] ${
                                            isLoading ? "animate-spin" : ""
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="space-y-4">
                                {isLoading ? (
                                    <div className="text-center py-12">
                                        <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: brand.ink + '99' }} />
                                        <p style={{ color: brand.ink + 'CC' }}>
                                            Loading statements...
                                        </p>
                                    </div>
                                ) : uploadedFiles.length === 0 ? (
                                    <div className="text-center py-12 rounded-lg border" style={{ borderColor: brand.ink + '33', backgroundColor: brand.surface }}>
                                        <FileUp className="w-16 h-16 mx-auto mb-4" style={{ color: brand.ink + '99' }} />
                                        <p className="font-medium mb-2" style={{ color: brand.ink + 'CC' }}>
                                            No financial statements uploaded yet
                                        </p>
                                        <p className="text-sm" style={{ color: brand.ink + 'B3' }}>
                                            Upload your bank statements, credit cards, or e-wallet statements to get started
                                        </p>
                                    </div>
                                ) : (
                                    uploadedFiles.map((file) => {
                                        const typeInfo = getFileTypeInfo(
                                            file.type
                                        );
                                        return (
                                            <div
                                                key={file.id}
                                                className="p-4 sm:p-6 rounded-lg border hover:shadow-lg transition-all duration-300 bg-white"
                                                style={{ borderColor: brand.ink + '33' }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="flex items-center justify-center">
                                                            {typeInfo.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                <p className="font-medium" style={{ color: brand.ink }}>
                                                                    {formatFileName(file.name)}
                                                                </p>
                                                                <span
                                                                    className={`px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}
                                                                >
                                                                    {
                                                                        typeInfo.label
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: brand.ink + 'CC' }}>
                                                                <span>
                                                                    Uploaded{" "}
                                                                    {file.uploadDate.toLocaleDateString(
                                                                        "en-GB"
                                                                    )}
                                                                </span>
                                                                {file.dateRange && (
                                                                    <>
                                                                        <span>
                                                                            •
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                file.dateRange
                                                                            }
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {file.reportDate && (
                                                                    <>
                                                                        <span>
                                                                            •
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                file.reportDate
                                                                            }
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {file.creditScore && (
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="px-2 py-1 rounded text-xs border border-emerald-200 text-emerald-700">
                                                                        Credit
                                                                        Score:{" "}
                                                                        {
                                                                            file.creditScore
                                                                        }
                                                                    </span>
                                                                    <span
                                                                        className={getCreditScoreClasses(
                                                                            file.creditScore
                                                                        )}
                                                                    >
                                                                        {file.creditScore >=
                                                                        750
                                                                            ? "Excellent"
                                                                            : file.creditScore >=
                                                                              650
                                                                            ? "Good"
                                                                            : "Fair"}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                        {file.status ===
                                                            "completed" && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {/* Process button for bank/credit/ewallet statements */}
                                                                {(file.type ===
                                                                    "bank" ||
                                                                    file.type ===
                                                                        "credit" ||
                                                                    file.type ===
                                                                        "ewallet") &&
                                                                    !processedStatements[
                                                                        file
                                                                            .statementId
                                                                    ] && (
                                                                        <button
                                                                            onClick={() =>
                                                                                handleProcessStatement(
                                                                                    file
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                extractingStatementId ===
                                                                                file.statementId
                                                                            }
                                                                            className="px-3 py-1 text-sm bg-[#04362c] text-white rounded-md hover:bg-[#04362c]/90 transition-colors flex items-center gap-1 disabled:bg-gray-400"
                                                                        >
                                                                            {extractingStatementId ===
                                                                            file.statementId ? (
                                                                                <>
                                                                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                                                    Processing...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <FileUp className="w-4 h-4" />
                                                                                    Process
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                {/* Preview Extracted button - shows after processing */}
                                                                {(file.type ===
                                                                    "bank" ||
                                                                    file.type ===
                                                                        "credit" ||
                                                                    file.type ===
                                                                        "ewallet") &&
                                                                    processedStatements[
                                                                        file
                                                                            .statementId
                                                                    ] && (
                                                                        <>
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleViewExtractedTransactions(
                                                                                        file
                                                                                    )
                                                                                }
                                                                                className="px-3 py-1 text-sm border border-[#04362c] text-[#04362c] rounded-md hover:bg-[#04362c]/10 transition-colors flex items-center gap-1"
                                                                            >
                                                                                <Eye className="w-4 h-4" />
                                                                                Preview
                                                                                Extracted
                                                                            </button>
                                                                            {/* Rescan button - allows re-extraction */}
                                                                            <button
                                                                                onClick={() =>
                                                                                    showRescanConfirmation(
                                                                                        file
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    extractingStatementId ===
                                                                                    file.statementId
                                                                                }
                                                                                className="px-3 py-1 text-sm border border-[#0DAD8D] text-[#0DAD8D] rounded-md hover:bg-[#0DAD8D]/10 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                title="Re-extract transactions from this statement"
                                                                            >
                                                                                {extractingStatementId ===
                                                                                file.statementId ? (
                                                                                    <>
                                                                                        <div className="animate-spin h-4 w-4 border-2 border-[#0DAD8D] border-t-transparent rounded-full"></div>
                                                                                        Rescanning...
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <RefreshCw className="w-4 h-4" />
                                                                                        Rescan
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                {/* Combined View/Export button for statements, Analyze for credit reports */}
                                                                <button
                                                                    onClick={() => {
                                                                        if (
                                                                            file.type ===
                                                                            "ctos"
                                                                        ) {
                                                                            viewTransactions(
                                                                                file
                                                                            );
                                                                        } else {
                                                                            handlePreviewPdf(
                                                                                file
                                                                            );
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                                                                >
                                                                    {file.type ===
                                                                    "ctos" ? (
                                                                        <>
                                                                            <Eye className="w-4 h-4" />
                                                                            Analyze
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Eye className="w-4 h-4" />
                                                                            View
                                                                            PDF
                                                                        </>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        setDeleteConfirmDialog({ isOpen: true, file })
                                                                    }
                                                                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center gap-1"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Preview Drawer */}
                {showTransactions && selectedFile && (
                    <>
                        {/* Backdrop */}
                        <div
                            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
                                isDrawerOpen ? "opacity-100" : "opacity-0"
                            }`}
                            onClick={closeDrawer}
                        ></div>

                        {/* Drawer */}
                        <div
                            className={`fixed top-0 right-0 h-full w-full md:w-[90%] lg:w-[85%] shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-hidden flex flex-col ${
                                isDrawerOpen
                                    ? "translate-x-0"
                                    : "translate-x-full"
                            }`}
                            style={{ backgroundColor: brand.surface }}
                        >
                            {/* Drawer Header */}
                            <div className="text-white p-4 sm:p-5 flex-shrink-0" style={{ backgroundColor: brand.ink }}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg sm:text-xl font-semibold">
                                            {`Transactions from ${formatFileName(selectedFile.name)}`}
                                        </h2>
                                        <p className="text-xs sm:text-sm text-white/90 mt-1.5">
                                            Preview of extracted transactions - you can categorize and modify them
                                        </p>
                                    </div>
                                    <button
                                        onClick={closeDrawer}
                                        className="ml-3 p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                                        title="Close drawer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Drawer Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
                                {false ? (
                                    // Credit Report Analysis View
                                    <div className="space-y-6">
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: brand.mint + '1A' }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Shield className="w-4 h-4" style={{ color: brand.mint }} />
                                                    <span className="text-xs sm:text-sm font-medium" style={{ color: brand.ink }}>
                                                        Credit Score
                                                    </span>
                                                </div>
                                                <p className="text-xl sm:text-2xl font-bold" style={{ color: brand.mint }}>
                                                    {selectedFile.creditScore ||
                                                        "N/A"}
                                                </p>
                                                <p className="text-xs" style={{ color: brand.ink + 'CC' }}>
                                                    {selectedFile.scoreText || 
                                                     (selectedFile.creditScore &&
                                                      selectedFile.creditScore >= 750
                                                        ? "Excellent"
                                                          : selectedFile.creditScore >= 700
                                                          ? "Very Good"
                                                          : selectedFile.creditScore >= 650
                                                        ? "Good"
                                                          : selectedFile.creditScore >= 600
                                                          ? "Fair"
                                                          : "Poor") || "Not available"}{" "}
                                                    {selectedFile.creditScore && "Rating"}
                                                </p>
                                            </div>

                                            <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: brand.ink + '0D' }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CreditCard className="w-4 h-4" style={{ color: brand.ink }} />
                                                    <span className="text-xs sm:text-sm font-medium" style={{ color: brand.ink }}>
                                                        Credit Utilization
                                                    </span>
                                                </div>
                                                <p className="text-xl sm:text-2xl font-bold" style={{ color: brand.ink }}>
                                                    {selectedFile.creditUtilization !== null && selectedFile.creditUtilization !== undefined
                                                        ? `${selectedFile.creditUtilization.toFixed(1)}%`
                                                        : "N/A"}
                                                </p>
                                                <p className="text-xs" style={{ color: brand.ink + 'CC' }}>
                                                    {selectedFile.creditUtilization !== null && selectedFile.creditUtilization !== undefined
                                                        ? selectedFile.creditUtilization < 30
                                                            ? "Excellent"
                                                            : selectedFile.creditUtilization < 50
                                                            ? "Good"
                                                            : selectedFile.creditUtilization < 70
                                                            ? "Fair"
                                                            : "High"
                                                        : "Not available"}
                                                </p>
                                            </div>

                                            <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: brand.surface }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle2 className="w-4 h-4" style={{ color: brand.mint }} />
                                                    <span className="text-xs sm:text-sm font-medium" style={{ color: brand.ink }}>
                                                        Payment History
                                                    </span>
                                                </div>
                                                <p className="text-xl sm:text-2xl font-bold" style={{ color: brand.ink }}>
                                                    {selectedFile.paymentHistory || "N/A"}
                                                </p>
                                                <p className="text-xs" style={{ color: brand.ink + 'CC' }}>
                                                    {selectedFile.paymentHistory
                                                        ? "Status from report"
                                                        : "Not available"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Enhanced CTOS Report Summary with AI Insights */}
                                        {(() => {
                                            const data = selectedFile.extractedData;
                                            const hasNewData = data && (
                                                data.credit_facility_summary ||
                                                data.ctos_score ||
                                                data.legal_records ||
                                                data.credit_utilisation ||
                                                (data.loan_applications && data.loan_applications.length > 0) ||
                                                data.employment_info ||
                                                data.ptptn_status
                                            );
                                            const hasOldData = data && data.additional_info;
                                            
                                            return hasNewData || hasOldData;
                                        })() ? (
                                            <div className="space-y-4">
                                                {/* Key Metrics Grid */}
                                                {selectedFile.extractedData.credit_facility_summary && (
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        <div className="p-3 sm:p-4 rounded-lg border" style={{ backgroundColor: brand.ink + '0D', borderColor: brand.ink + '33' }}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <CreditCard className="w-4 h-4" style={{ color: brand.ink }} />
                                                                <span className="text-xs sm:text-sm font-medium" style={{ color: brand.ink }}>Total Credit Facilities</span>
                                                            </div>
                                                            <p className="text-lg sm:text-xl font-bold" style={{ color: brand.ink }}>
                                                                {selectedFile.extractedData.credit_facilities?.length || 0}
                                                            </p>
                                                            <p className="text-xs mt-1" style={{ color: brand.ink + '99' }}>
                                                                Active credit accounts
                                                            </p>
                                                        </div>
                                                        <div className="p-3 sm:p-4 rounded-lg border" style={{ backgroundColor: brand.surface, borderColor: brand.ink + '33' }}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <FileText className="w-4 h-4" style={{ color: brand.ink }} />
                                                                <span className="text-xs sm:text-sm font-medium" style={{ color: brand.ink }}>Total Outstanding</span>
                                                            </div>
                                                            <p className="text-lg sm:text-xl font-bold" style={{ color: brand.ink }}>
                                                                {selectedFile.extractedData.credit_facility_summary.total_outstanding_balance 
                                                                    ? new Intl.NumberFormat("en-MY", {
                                                                        style: "currency",
                                                                        currency: "MYR",
                                                                        maximumFractionDigits: 0,
                                                                    }).format(selectedFile.extractedData.credit_facility_summary.total_outstanding_balance)
                                                                    : "N/A"}
                                                            </p>
                                                            <p className="text-xs mt-1" style={{ color: brand.ink + '99' }}>
                                                                Out of {selectedFile.extractedData.credit_facility_summary.total_credit_limit 
                                                                    ? new Intl.NumberFormat("en-MY", {
                                                                        style: "currency",
                                                                        currency: "MYR",
                                                                        maximumFractionDigits: 0,
                                                                    }).format(selectedFile.extractedData.credit_facility_summary.total_credit_limit)
                                                                    : "N/A"} limit
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Risk Factors */}
                                                {selectedFile.extractedData.ctos_score?.risk_factors && 
                                                 selectedFile.extractedData.ctos_score.risk_factors.length > 0 && (
                                                    <div className="p-4 rounded-lg bg-red-50/30 border border-red-100">
                                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                                            <span>⚠️</span>
                                                            <span>Risk Factors</span>
                                                        </h4>
                                                        <ul className="space-y-1.5">
                                                            {selectedFile.extractedData.ctos_score.risk_factors.map((factor, idx) => (
                                                                <li key={idx} className="text-sm text-[#04362c]/80 flex items-start gap-2">
                                                                    <span className="text-red-500 mt-1">•</span>
                                                                    <span>{factor}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Legal Records Alert */}
                                                {selectedFile.extractedData.legal_records && (
                                                    (selectedFile.extractedData.legal_records.is_bankrupt ||
                                                     selectedFile.extractedData.legal_records.legal_records_personal_24m > 0 ||
                                                     selectedFile.extractedData.legal_records.has_special_attention_accounts) && (
                                                        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                                                            <h4 className="font-medium mb-2 text-red-700 flex items-center gap-2">
                                                                <span>🚨</span>
                                                                <span>Legal & Special Attention Records</span>
                                                            </h4>
                                                            <div className="space-y-1 text-sm text-red-700/80">
                                                                {selectedFile.extractedData.legal_records.is_bankrupt && (
                                                                    <p>• <span className="font-medium">Bankruptcy Status:</span> Active</p>
                                                                )}
                                                                {selectedFile.extractedData.legal_records.legal_records_personal_24m > 0 && (
                                                                    <p>• <span className="font-medium">Legal Records (Personal):</span> {selectedFile.extractedData.legal_records.legal_records_personal_24m} in last 24 months</p>
                                                                )}
                                                                {selectedFile.extractedData.legal_records.has_special_attention_accounts && (
                                                                    <p>• <span className="font-medium">Special Attention Accounts:</span> Yes</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )}

                                                {/* Credit Utilisation Insights */}
                                                {selectedFile.extractedData.credit_utilisation && (
                                                    <div className="p-4 rounded-lg bg-amber-50/30 border border-amber-100">
                                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                                            <span>📈</span>
                                                            <span>Credit Utilisation Analysis</span>
                                                        </h4>
                                                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                                                            {selectedFile.extractedData.credit_utilisation.outstanding_percentage_of_limit !== null && (
                                                                <div>
                                                                    <span className="font-medium">Overall Utilisation:</span>{" "}
                                                                    <span className={selectedFile.extractedData.credit_utilisation.outstanding_percentage_of_limit > 70 
                                                                        ? "text-red-600 font-bold" 
                                                                        : selectedFile.extractedData.credit_utilisation.outstanding_percentage_of_limit > 50 
                                                                        ? "text-amber-600 font-semibold" 
                                                                        : "text-green-600"}>
                                                                        {selectedFile.extractedData.credit_utilisation.outstanding_percentage_of_limit.toFixed(1)}%
                                                                    </span>
                                                                    {selectedFile.extractedData.credit_utilisation.outstanding_percentage_of_limit > 70 && (
                                                                        <span className="ml-2 text-xs text-red-600">⚠️ High</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {selectedFile.extractedData.credit_utilisation.avg_utilisation_credit_card_6m !== null && (
                                                                <div>
                                                                    <span className="font-medium">Avg Credit Card (6M):</span>{" "}
                                                                    {selectedFile.extractedData.credit_utilisation.avg_utilisation_credit_card_6m.toFixed(1)}%
                                                                </div>
                                                            )}
                                                            {selectedFile.extractedData.credit_utilisation.number_of_unsecured_facilities !== null && (
                                                                <div>
                                                                    <span className="font-medium">Unsecured Facilities:</span>{" "}
                                                                    {selectedFile.extractedData.credit_utilisation.number_of_unsecured_facilities}
                                                                </div>
                                                            )}
                                                            {selectedFile.extractedData.credit_utilisation.number_of_secured_facilities !== null && (
                                                                <div>
                                                                    <span className="font-medium">Secured Facilities:</span>{" "}
                                                                    {selectedFile.extractedData.credit_utilisation.number_of_secured_facilities}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Recent Loan Applications */}
                                                {selectedFile.extractedData.loan_applications && 
                                                 selectedFile.extractedData.loan_applications.length > 0 && (
                                                    <div className="p-4 rounded-lg bg-indigo-50/30 border border-indigo-100">
                                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                                            <span>📝</span>
                                                            <span>Recent Loan Applications (Last 12 Months)</span>
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {selectedFile.extractedData.loan_applications.slice(0, 3).map((app, idx) => (
                                                                <div key={idx} className="text-sm bg-white/50 p-2 rounded border border-indigo-100">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-medium">{app.application_type?.replace('_', ' ').toUpperCase() || 'Unknown'}</p>
                                                                            <p className="text-xs text-[#04362c]/60">
                                                                                {app.lender_name || 'Unknown Lender'} • {app.application_date || 'Date unknown'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="font-semibold">
                                                                                {app.amount ? new Intl.NumberFormat("en-MY", {
                                                                                    style: "currency",
                                                                                    currency: "MYR",
                                                                                    maximumFractionDigits: 0,
                                                                                }).format(app.amount) : 'N/A'}
                                                                            </p>
                                                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                                                app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                                                app.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-red-100 text-red-700'
                                                                            }`}>
                                                                                {app.status || 'Unknown'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {selectedFile.extractedData.loan_applications.length > 3 && (
                                                                <p className="text-xs text-[#04362c]/60 italic">
                                                                    + {selectedFile.extractedData.loan_applications.length - 3} more application(s)
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Credit Facility Summary */}
                                                {selectedFile.extractedData.credit_facility_summary && (
                                                    <div className="p-4 rounded-lg bg-green-50/30 border border-green-100">
                                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                                            <span>✅</span>
                                                            <span>Credit Application Summary</span>
                                                        </h4>
                                                        <div className="grid md:grid-cols-3 gap-3 text-sm">
                                                            <div>
                                                                <span className="font-medium">Total Applications:</span>{" "}
                                                                {selectedFile.extractedData.credit_facility_summary.credit_applications_12m_total || 0}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Approved:</span>{" "}
                                                                <span className="text-green-600 font-semibold">
                                                                    {selectedFile.extractedData.credit_facility_summary.credit_applications_12m_approved || 0}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Pending:</span>{" "}
                                                                <span className="text-amber-600 font-semibold">
                                                                    {selectedFile.extractedData.credit_facility_summary.credit_applications_12m_pending || 0}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Employment & Business Info */}
                                                {selectedFile.extractedData.employment_info && 
                                                 (selectedFile.extractedData.employment_info.has_directorships || 
                                                  selectedFile.extractedData.employment_info.has_business_interests) && (
                                                    <div className="p-4 rounded-lg bg-teal-50/30 border border-teal-100">
                                                        <h4 className="font-medium mb-2 flex items-center gap-2">
                                                            <span>💼</span>
                                                            <span>Business Interests</span>
                                                        </h4>
                                                        <div className="text-sm space-y-1">
                                                            {selectedFile.extractedData.employment_info.has_directorships && (
                                                                <p>
                                                                    <span className="font-medium">Directorships:</span>{" "}
                                                                    {selectedFile.extractedData.employment_info.directorships_count || 0}
                                                                </p>
                                                            )}
                                                            {selectedFile.extractedData.employment_info.has_business_interests && (
                                                                <p>
                                                                    <span className="font-medium">Business Interests:</span>{" "}
                                                                    {selectedFile.extractedData.employment_info.business_interests_count || 0}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : selectedFile.extractedData && selectedFile.extractedData.additional_info ? (
                                            // Fallback: Show old format data if new format is not available
                                        <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50">
                                            <h4 className="font-medium mb-2">
                                                    Credit Report Summary
                                            </h4>
                                                <div className="space-y-2 text-sm text-[#04362c]/80">
                                                    {selectedFile.activeAccounts !== null && selectedFile.activeAccounts !== undefined && (
                                                        <p>
                                                            <span className="font-medium">Active Accounts:</span> {selectedFile.activeAccounts}
                                                        </p>
                                                    )}
                                                    {selectedFile.totalCreditLimit !== null && selectedFile.totalCreditLimit !== undefined && (
                                                        <p>
                                                            <span className="font-medium">Total Credit Limit:</span> {new Intl.NumberFormat("en-MY", {
                                                                style: "currency",
                                                                currency: "MYR",
                                                                maximumFractionDigits: 0,
                                                            }).format(selectedFile.totalCreditLimit)}
                                                        </p>
                                                    )}
                                                    {selectedFile.extractedData.additional_info.negative_items !== null && selectedFile.extractedData.additional_info.negative_items !== undefined && (
                                                        <p>
                                                            <span className="font-medium">Negative Items:</span> {selectedFile.extractedData.additional_info.negative_items ? "Yes" : "No"}
                                                        </p>
                                                    )}
                                                    {selectedFile.extractedData.additional_info.remarks && (
                                                        <p>
                                                            <span className="font-medium">Remarks:</span> {selectedFile.extractedData.additional_info.remarks}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50">
                                            <p className="text-sm text-[#04362c]/80">
                                                    {selectedFile.creditScore 
                                                        ? "Credit score extracted. Click 'Analyze' to extract detailed insights from your CTOS report."
                                                        : "AI analysis in progress. Your credit report has been successfully uploaded. Click 'Analyze' to extract detailed insights."}
                                            </p>
                                        </div>
                                        )}
                                    </div>
                                ) : (
                                    // Transaction Table View
                                    <div>
                                        {/* Show extraction summary if available */}
                                        {extractedTransactions &&
                                            (() => {
                                                // Calculate period from transactions if not provided by AI
                                                let startDate =
                                                    extractedTransactions
                                                        .statement_period
                                                        ?.start_date;
                                                let endDate =
                                                    extractedTransactions
                                                        .statement_period
                                                        ?.end_date;

                                                if (
                                                    (!startDate || !endDate) &&
                                                    extractedTransactions
                                                        .transactions?.length >
                                                        0
                                                ) {
                                                    const dates =
                                                        extractedTransactions.transactions
                                                            .map((t) => t.date)
                                                            .filter(Boolean)
                                                            .sort();
                                                    startDate = dates[0];
                                                    endDate =
                                                        dates[dates.length - 1];
                                                }

                                                return (
                                                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border" style={{ backgroundColor: brand.surface, borderColor: brand.ink + '33' }}>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
                                                            <div>
                                                                <span style={{ color: brand.ink + 'CC' }}>
                                                                    Total Pages:
                                                                </span>
                                                                <p className="font-bold" style={{ color: brand.ink }}>
                                                                    {
                                                                        extractedTransactions
                                                                            .summary
                                                                            .total_pages
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span style={{ color: brand.ink + 'CC' }}>
                                                                    Transactions:
                                                                </span>
                                                                <p className="font-bold" style={{ color: brand.ink }}>
                                                                    {
                                                                        extractedTransactions
                                                                            .summary
                                                                            .total_transactions
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <label className="block mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                    Period:
                                                                </label>
                                                                {editingAccountInfo ? (
                                                                    <div className="flex gap-2 items-center">
                                                                        <input
                                                                            type="date"
                                                                            value={extractedTransactions.statement_period?.start_date || startDate || ''}
                                                                            onChange={(e) => {
                                                                                setExtractedTransactions(prev => ({
                                                                                    ...prev,
                                                                                    statement_period: {
                                                                                        ...(prev.statement_period || {}),
                                                                                        start_date: e.target.value
                                                                                    }
                                                                                }));
                                                                            }}
                                                                            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 font-bold"
                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink, focusRingColor: brand.mint }}
                                                                        />
                                                                        <span className="text-xs" style={{ color: brand.ink + '99' }}>to</span>
                                                                        <input
                                                                            type="date"
                                                                            value={extractedTransactions.statement_period?.end_date || endDate || ''}
                                                                            onChange={(e) => {
                                                                                setExtractedTransactions(prev => ({
                                                                                    ...prev,
                                                                                    statement_period: {
                                                                                        ...(prev.statement_period || {}),
                                                                                        end_date: e.target.value
                                                                                    }
                                                                                }));
                                                                            }}
                                                                            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 font-bold"
                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink, focusRingColor: brand.mint }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                <p className="font-bold" style={{ color: brand.ink }}>
                                                                        {startDate && endDate
                                                                        ? `${startDate} to ${endDate}`
                                                                        : "N/A"}
                                                                </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Account Information Section - Editable */}
                                                        {extractedTransactions.account_info && (
                                                            <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4" style={{ borderColor: brand.ink + '33' }}>
                                                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                                                    <h4 className="text-xs sm:text-sm font-semibold" style={{ color: brand.ink }}>
                                                                        Account Information
                                                                </h4>
                                                                    {!editingAccountInfo && (
                                                                        <button
                                                                            onClick={() => setEditingAccountInfo(true)}
                                                                            className="text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                                            style={{ color: brand.mint }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.mint + '1A'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            title="Edit account information"
                                                                        >
                                                                            <PenTool className="h-3 w-3" />
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                                                                    {/* Account Number */}
                                                                    <div>
                                                                        <label className="block mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                            Account Number:
                                                                        </label>
                                                                        {editingAccountInfo ? (
                                                                            <input
                                                                                type="text"
                                                                                value={extractedTransactions.account_info.account_number || ''}
                                                                                onChange={(e) => {
                                                                                    setExtractedTransactions(prev => ({
                                                                                        ...prev,
                                                                                        account_info: {
                                                                                            ...prev.account_info,
                                                                                            account_number: e.target.value
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded focus:outline-none focus:ring-2 font-medium"
                                                                                style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                placeholder="Enter account number"
                                                                            />
                                                                        ) : (
                                                                        <div
                                                                            onClick={() => setEditingAccountInfo(true)}
                                                                            className="font-bold cursor-pointer px-2 py-1 rounded transition-colors"
                                                                            style={{ 
                                                                                color: extractedTransactions.account_info.account_number ? brand.ink : '#ef4444'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            title={extractedTransactions.account_info.account_number ? "Click to edit" : "Click to add account number"}
                                                                        >
                                                                                {extractedTransactions.account_info.account_number || "Not detected"}
                                                                        </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Account Name */}
                                                                    <div>
                                                                        <label className="block mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                            Account Name:
                                                                        </label>
                                                                        {editingAccountInfo ? (
                                                                            <input
                                                                                type="text"
                                                                                value={extractedTransactions.account_info.account_name || ''}
                                                                                onChange={(e) => {
                                                                                    setExtractedTransactions(prev => ({
                                                                                        ...prev,
                                                                                        account_info: {
                                                                                            ...prev.account_info,
                                                                                            account_name: e.target.value
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded focus:outline-none focus:ring-2 font-medium"
                                                                                style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                placeholder="Enter account name"
                                                                            />
                                                                        ) : (
                                                                        <div
                                                                            onClick={() => setEditingAccountInfo(true)}
                                                                            className="font-bold cursor-pointer px-2 py-1 rounded transition-colors"
                                                                            style={{ 
                                                                                color: extractedTransactions.account_info.account_name ? brand.ink : '#ef4444'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            title={extractedTransactions.account_info.account_name ? "Click to edit" : "Click to add account name"}
                                                                        >
                                                                                {extractedTransactions.account_info.account_name || "Not detected"}
                                                                        </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Account Type */}
                                                                    <div>
                                                                        <label className="block mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                            Account Type:
                                                                        </label>
                                                                        {editingAccountInfo ? (
                                                                            <select
                                                                                value={extractedTransactions.account_info.account_type || ''}
                                                                                onChange={(e) => {
                                                                                    setExtractedTransactions(prev => ({
                                                                                        ...prev,
                                                                                        account_info: {
                                                                                            ...prev.account_info,
                                                                                            account_type: e.target.value
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded focus:outline-none focus:ring-2 font-medium"
                                                                                style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                            >
                                                                                <option value="">Select type</option>
                                                                                <option value="Savings Account">Savings Account</option>
                                                                                <option value="Current Account">Current Account</option>
                                                                                <option value="Credit Card">Credit Card</option>
                                                                                <option value="E-Wallet">E-Wallet</option>
                                                                                <option value="Fixed Deposit">Fixed Deposit</option>
                                                                                <option value="Investment Account">Investment Account</option>
                                                                                <option value="Loan Account">Loan Account</option>
                                                                                <option value="Other">Other</option>
                                                                            </select>
                                                                        ) : (
                                                                        <div
                                                                            onClick={() => setEditingAccountInfo(true)}
                                                                            className="font-bold cursor-pointer px-2 py-1 rounded transition-colors"
                                                                            style={{ 
                                                                                color: extractedTransactions.account_info.account_type ? brand.ink : '#ef4444'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            title={extractedTransactions.account_info.account_type ? "Click to edit" : "Click to select account type"}
                                                                        >
                                                                                {extractedTransactions.account_info.account_type || "Not detected"}
                                                                        </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Save/Cancel buttons */}
                                                                {editingAccountInfo && (
                                                                    <div className="flex gap-2 mt-3 sm:mt-4">
                                                                        <button
                                                                            onClick={() => setEditingAccountInfo(false)}
                                                                            className="px-3 py-1.5 text-sm text-white rounded-lg transition-colors font-medium"
                                                                            style={{ backgroundColor: brand.mint }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink}
                                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brand.mint}
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingAccountInfo(false);
                                                                                // Optionally reload original data if you want cancel to revert
                                                                            }}
                                                                            className="px-3 py-1.5 text-sm border rounded-lg transition-colors font-medium"
                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Balance Section - Editable */}
                                                        {(extractedTransactions.opening_balance != null ||
                                                            extractedTransactions.closing_balance != null ||
                                                            editingAccountInfo) && (
                                                            <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4" style={{ borderColor: brand.ink + '33' }}>
                                                                <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3" style={{ color: brand.ink }}>
                                                                    Balance Information
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                                                                    {/* Opening Balance */}
                                                                    <div>
                                                                        <label className="block mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                            Opening Balance:
                                                                        </label>
                                                                        {editingAccountInfo ? (
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={extractedTransactions.opening_balance != null ? extractedTransactions.opening_balance : ''}
                                                                                onChange={(e) => {
                                                                                    setExtractedTransactions(prev => ({
                                                                                        ...prev,
                                                                                        opening_balance: e.target.value ? parseFloat(e.target.value) : null
                                                                                    }));
                                                                                }}
                                                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded focus:outline-none focus:ring-2 font-medium"
                                                                                style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                placeholder="0.00"
                                                                            />
                                                                        ) : (
                                                                            <div
                                                                                onClick={() => setEditingAccountInfo(true)}
                                                                                className="font-bold cursor-pointer px-2 py-1 rounded transition-colors"
                                                                                style={{ 
                                                                                    color: extractedTransactions.opening_balance != null ? brand.ink : '#ef4444'
                                                                                }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                                title={extractedTransactions.opening_balance != null ? "Click to edit" : "Click to add opening balance"}
                                                                            >
                                                                                {extractedTransactions.opening_balance != null
                                                                                    ? `RM ${extractedTransactions.opening_balance.toFixed(2)}`
                                                                                    : "Not detected"}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Closing Balance */}
                                                                    <div>
                                                                        <label className="block mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                            Closing Balance:
                                                                        </label>
                                                                        {editingAccountInfo ? (
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={extractedTransactions.closing_balance != null ? extractedTransactions.closing_balance : ''}
                                                                                onChange={(e) => {
                                                                                    setExtractedTransactions(prev => ({
                                                                                        ...prev,
                                                                                        closing_balance: e.target.value ? parseFloat(e.target.value) : null
                                                                                    }));
                                                                                }}
                                                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded focus:outline-none focus:ring-2 font-medium"
                                                                                style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                placeholder="0.00"
                                                                            />
                                                                        ) : (
                                                                            <div
                                                                                onClick={() => setEditingAccountInfo(true)}
                                                                                className="font-bold cursor-pointer px-2 py-1 rounded transition-colors"
                                                                                style={{ 
                                                                                    color: extractedTransactions.closing_balance != null ? brand.ink : '#ef4444'
                                                                                }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                                title={extractedTransactions.closing_balance != null ? "Click to edit" : "Click to add closing balance"}
                                                                            >
                                                                                {extractedTransactions.closing_balance != null
                                                                                    ? `RM ${extractedTransactions.closing_balance.toFixed(2)}`
                                                                                    : "Not detected"}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Empty third column for alignment */}
                                                                    <div></div>
                                                                </div>
                                                                {extractedTransactions.opening_balance != null && 
                                                                 extractedTransactions.closing_balance != null && 
                                                                 !editingAccountInfo && (
                                                                    <div className="mt-2 text-xs" style={{ color: brand.ink + '99' }}>
                                                                        Net Change: RM {(extractedTransactions.closing_balance - extractedTransactions.opening_balance).toFixed(2)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                        <div className="overflow-x-auto h-full">
                                            <table className="w-full">
                                                <thead className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: brand.surface }}>
                                                    <tr>
                                                        <th className="text-left py-2 px-3 text-xs sm:text-sm font-medium border-b" style={{ color: brand.ink, borderColor: brand.ink + '33' }}>
                                                            Date
                                                        </th>
                                                        <th className="text-left py-2 px-3 text-xs sm:text-sm font-medium border-b" style={{ color: brand.ink, borderColor: brand.ink + '33' }}>
                                                            Description
                                                        </th>
                                                        <th className="text-left py-2 px-3 text-xs sm:text-sm font-medium border-b" style={{ color: brand.ink, borderColor: brand.ink + '33' }}>
                                                            Category
                                                        </th>
                                                        <th className="text-left py-2 px-3 text-xs sm:text-sm font-medium border-b" style={{ color: brand.ink, borderColor: brand.ink + '33' }}>
                                                            Account
                                                        </th>
                                                        <th className="text-left py-2 px-3 text-xs sm:text-sm font-medium border-b" style={{ color: brand.ink, borderColor: brand.ink + '33' }}>
                                                            Type
                                                        </th>
                                                        <th className="text-right py-2 px-3 text-xs sm:text-sm font-medium border-b" style={{ color: brand.ink, borderColor: brand.ink + '33' }}>
                                                            Amount
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {editedPreviewTransactions.map(
                                                        (transaction) => {
                                                            const isExpanded =
                                                                expandedPreviewRow ===
                                                                transaction.id;
                                                            const isTransfer = transaction.type === "transfer";
                                                            const isExpense =
                                                                transaction.type === "debit" && !isTransfer;
                                                            const isIncome =
                                                                transaction.type === "credit" && !isTransfer;

                                                            return (
                                                                <React.Fragment
                                                                    key={
                                                                        transaction.id
                                                                    }
                                                                >
                                                                    <tr className="border-b hover:bg-opacity-50" style={{ borderColor: brand.ink + '1A' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.surface} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                                        {/* Date - Editable */}
                                                                        <td className="py-2 px-3 text-xs sm:text-sm">
                                                                            {editingCell?.transactionId === transaction.id && editingCell?.field === 'date' ? (
                                                                                <input
                                                                                    type="date"
                                                                                    value={transaction.date || ''}
                                                                                    onChange={(e) => {
                                                                                        updateTransactionField(transaction.id, { date: e.target.value });
                                                                                    }}
                                                                                    onBlur={() => setEditingCell(null)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            setEditingCell(null);
                                                                                        }
                                                                                    }}
                                                                                    autoFocus
                                                                                    className="w-full px-2 py-1 text-xs sm:text-sm border rounded focus:outline-none focus:ring-2"
                                                                                    style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                />
                                                                            ) : (
                                                                            <div
                                                                                    onClick={() => setEditingCell({ transactionId: transaction.id, field: 'date' })}
                                                                                    className="cursor-pointer px-2 py-1 rounded transition-colors"
                                                                                    style={{ color: brand.ink }}
                                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                                    title="Click to edit date"
                                                                                >
                                                                                    {transaction.date || 'N/A'}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        
                                                                        {/* Description - Click to expand */}
                                                                        <td className="py-2 px-3 text-xs sm:text-sm">
                                                                            <div
                                                                                onClick={() => {
                                                                                    setExpandedPreviewRow(isExpanded ? null : transaction.id);
                                                                                    setEditingCell(null); // Close any open edit cell
                                                                                }}
                                                                                className="cursor-pointer px-2 py-1 rounded transition-colors flex items-center gap-2"
                                                                                style={{ color: brand.ink }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                                title="Click to view/edit details"
                                                                            >
                                                                                {isExpanded ? (
                                                                                    <ChevronDown className="h-3 w-3" style={{ color: brand.mint }} />
                                                                                ) : (
                                                                                    <ChevronRight className="h-3 w-3" style={{ color: brand.ink + '99' }} />
                                                                                )}
                                                                                <span className="truncate">{transaction.description || 'N/A'}</span>
                                                                            </div>
                                                                        </td>
                                                                        
                                                                        {/* Category - Editable */}
                                                                        <td className="py-2 px-3 text-xs sm:text-sm">
                                                                            {editingCell?.transactionId === transaction.id && editingCell?.field === 'category' ? (
                                                                                <select
                                                                                    value={transaction.category || ''}
                                                                                    onChange={(e) => {
                                                                                        const newCategory = e.target.value;
                                                                                        const updates = { category: newCategory };
                                                                                        // If category is Transfer, ensure type is also transfer
                                                                                        if (newCategory === 'Transfer') {
                                                                                            updates.type = 'transfer';
                                                                                            updates.expenseType = null;
                                                                                            updates.transfer_type = transaction.transfer_type || 'intra_person';
                                                                                        } else if (transaction.type === 'debit' && transaction.type !== 'transfer') {
                                                                                            // Recalculate expenseType if it's an expense (not transfer)
                                                                                            const inferredType = inferExpenseType(newCategory, transaction.description, Math.abs(transaction.amount));
                                                                                            updates.expenseType = inferredType || "needs";
                                                                                        }
                                                                                        updateTransactionField(transaction.id, updates);
                                                                                        setEditingCell(null);
                                                                                    }}
                                                                                    onBlur={() => setEditingCell(null)}
                                                                                    autoFocus
                                                                                    className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                >
                                                                                    {(isExpense ? expenseCategories : incomeCategories).map((cat) => (
                                                                                        <option key={cat} value={cat}>
                                                                                            {cat}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                <span
                                                                                    onClick={() => setEditingCell({ transactionId: transaction.id, field: 'category' })}
                                                                                    className="px-2 py-1 rounded text-xs bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors inline-block"
                                                                                    title="Click to change category"
                                                                                >
                                                                                    {transaction.category || 'Other'}
                                                                            </span>
                                                                            )}
                                                                        </td>
                                                                        
                                                                        {/* Account - Editable */}
                                                                        <td className="py-2 px-3 text-xs sm:text-sm">
                                                                            {editingCell?.transactionId === transaction.id && editingCell?.field === 'account' ? (
                                                                                <select
                                                                                    value={transaction.accountId || ''}
                                                                                    onChange={(e) => {
                                                                                        const selectedAccount = accounts.find(acc => acc.account_id === parseInt(e.target.value));
                                                                                        updateTransactionField(transaction.id, {
                                                                                            accountId: e.target.value ? parseInt(e.target.value) : null,
                                                                                            account: selectedAccount?.account_name || ''
                                                                                        });
                                                                                        setEditingCell(null);
                                                                                    }}
                                                                                    onBlur={() => setEditingCell(null)}
                                                                                    autoFocus
                                                                                    className="w-full px-2 py-1 text-xs sm:text-sm border rounded focus:outline-none focus:ring-2"
                                                                                    style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                >
                                                                                    <option value="">Select account</option>
                                                                                    {accounts.map((acc) => (
                                                                                        <option key={acc.account_id} value={acc.account_id}>
                                                                                            {acc.account_name}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                <div
                                                                                    onClick={() => setEditingCell({ transactionId: transaction.id, field: 'account' })}
                                                                                    className="cursor-pointer px-2 py-1 rounded transition-colors"
                                                                                    style={{ color: brand.ink }}
                                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.ink + '1A'}
                                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                                    title="Click to change account"
                                                                                >
                                                                                    {transaction.account || "Not set"}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        
                                                                        {/* Type - Editable */}
                                                                        <td className="py-2 px-3 text-xs sm:text-sm">
                                                                            {editingCell?.transactionId === transaction.id && editingCell?.field === 'type' ? (
                                                                                <select
                                                                                    value={transaction.type || 'debit'}
                                                                                    onChange={(e) => {
                                                                                        const newType = e.target.value;
                                                                                        const currentAmount = Math.abs(transaction.amount);
                                                                                        const updates = {
                                                                                            type: newType,
                                                                                            amount: newType === 'credit' ? currentAmount : -currentAmount
                                                                                        };
                                                                                        // If changing to transfer, set category to Transfer
                                                                                        if (newType === 'transfer') {
                                                                                            updates.category = 'Transfer';
                                                                                            updates.expenseType = null;
                                                                                            updates.transfer_type = transaction.transfer_type || 'intra_person';
                                                                                        } else if (newType === 'debit') {
                                                                                            // If changing to expense, ensure category is not Transfer and recalculate expenseType
                                                                                            if (transaction.category === 'Transfer') {
                                                                                                // Reset category if it was Transfer
                                                                                                updates.category = 'Other';
                                                                                            }
                                                                                            const inferredType = inferExpenseType(updates.category || transaction.category, transaction.description, currentAmount);
                                                                                            updates.expenseType = inferredType || "needs";
                                                                                        } else if (newType === 'credit') {
                                                                                            // If changing to income, remove expenseType
                                                                                            updates.expenseType = null;
                                                                                        }
                                                                                        updateTransactionField(transaction.id, updates);
                                                                                        setEditingCell(null);
                                                                                    }}
                                                                                    onBlur={() => setEditingCell(null)}
                                                                                    autoFocus
                                                                                    className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                >
                                                                                    <option value="debit">Expense</option>
                                                                                    <option value="credit">Income</option>
                                                                                    <option value="transfer">Transfer</option>
                                                                                </select>
                                                                            ) : (
                                                                                <span
                                                                                    onClick={() => setEditingCell({ transactionId: transaction.id, field: 'type' })}
                                                                                    className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                                                                                    transaction.type === 'transfer'
                                                                                        ? "bg-blue-100 text-blue-700"
                                                                                        : isIncome
                                                                                        ? "bg-green-100 text-green-700"
                                                                                        : "bg-red-100 text-red-700"
                                                                                }`}
                                                                                    title="Click to change type"
                                                                            >
                                                                                    {transaction.type === 'transfer' ? "Transfer" : isIncome ? "Income" : "Expense"}
                                                                            </span>
                                                                            )}
                                                                        </td>
                                                                        
                                                                        {/* Amount - Editable */}
                                                                        <td className="py-2 px-3 text-right font-semibold text-sm sm:text-base" style={{ color: isIncome ? brand.mint : '#ef4444' }}>
                                                                            {editingCell?.transactionId === transaction.id && editingCell?.field === 'amount' ? (
                                                                                <div className="flex items-center justify-end gap-1">
                                                                                    <span>{isIncome ? "+" : "-"}</span>
                                                                                    <span>RM</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        value={Math.abs(transaction.amount) || 0}
                                                                                        onChange={(e) => {
                                                                                            const value = parseFloat(e.target.value) || 0;
                                                                                            updateTransactionField(transaction.id, {
                                                                                                amount: isIncome ? value : -value
                                                                                            });
                                                                                        }}
                                                                                        onBlur={() => setEditingCell(null)}
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                setEditingCell(null);
                                                                                            }
                                                                                        }}
                                                                                        autoFocus
                                                                                        className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <div
                                                                                    onClick={() => setEditingCell({ transactionId: transaction.id, field: 'amount' })}
                                                                                    className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors inline-block"
                                                                                    title="Click to edit amount"
                                                                        >
                                                                                    {isIncome ? "+" : "-"}RM {Math.abs(transaction.amount || 0).toFixed(2)}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>

                                                                    {/* Expandable edit form */}
                                                                    {isExpanded && (
                                                                        <tr className="bg-gray-50">
                                                                            <td
                                                                                colSpan="6"
                                                                                className="p-6"
                                                                            >
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    {/* Description */}
                                                                                    <div>
                                                                                        <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                            Description
                                                                                            *
                                                                                        </label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={
                                                                                                transaction.description
                                                                                            }
                                                                                            onChange={(
                                                                                                e
                                                                                            ) =>
                                                                                                updateTransactionField(
                                                                                                    transaction.id,
                                                                                                    {
                                                                                                        description:
                                                                                                            e
                                                                                                                .target
                                                                                                                .value,
                                                                                                    }
                                                                                                )
                                                                                            }
                                                                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                        />
                                                                                    </div>

                                                                                    {/* Amount */}
                                                                                    <div>
                                                                                        <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                            Amount
                                                                                            *
                                                                                        </label>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            value={Math.abs(
                                                                                                transaction.amount
                                                                                            )}
                                                                                            onChange={(
                                                                                                e
                                                                                            ) =>
                                                                                                updateTransactionField(
                                                                                                    transaction.id,
                                                                                                    {
                                                                                                        amount: isIncome
                                                                                                            ? parseFloat(
                                                                                                                  e
                                                                                                                      .target
                                                                                                                      .value
                                                                                                              )
                                                                                                            : -parseFloat(
                                                                                                                  e
                                                                                                                      .target
                                                                                                                      .value
                                                                                                              ),
                                                                                                    }
                                                                                                )
                                                                                            }
                                                                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                        />
                                                                                    </div>

                                                                                    {/* Category */}
                                                                                    <div>
                                                                                        <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                            Category
                                                                                            *
                                                                                        </label>
                                                                                        <select
                                                                                            value={
                                                                                                transaction.category
                                                                                            }
                                                                                            onChange={(
                                                                                                e
                                                                                            ) =>
                                                                                                updateTransactionField(
                                                                                                    transaction.id,
                                                                                                    {
                                                                                                        category:
                                                                                                            e
                                                                                                                .target
                                                                                                                .value,
                                                                                                    }
                                                                                                )
                                                                                            }
                                                                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                        >
                                                                                            {(isExpense
                                                                                                ? expenseCategories
                                                                                                : incomeCategories
                                                                                            ).map(
                                                                                                (
                                                                                                    cat
                                                                                                ) => (
                                                                                                    <option
                                                                                                        key={
                                                                                                            cat
                                                                                                        }
                                                                                                        value={
                                                                                                            cat
                                                                                                        }
                                                                                                    >
                                                                                                        {
                                                                                                            cat
                                                                                                        }
                                                                                                    </option>
                                                                                                )
                                                                                            )}
                                                                                        </select>
                                                                                    </div>

                                                                                    {/* Account */}
                                                                                    <div>
                                                                                        <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                            Account
                                                                                            *
                                                                                        </label>
                                                                                        <select
                                                                                            value={
                                                                                                transaction.accountId ||
                                                                                                "custom"
                                                                                            }
                                                                                            onChange={(
                                                                                                e
                                                                                            ) => {
                                                                                                if (
                                                                                                    e
                                                                                                        .target
                                                                                                        .value ===
                                                                                                    "custom"
                                                                                                ) {
                                                                                                    updateTransactionField(
                                                                                                        transaction.id,
                                                                                                        {
                                                                                                            accountId:
                                                                                                                null,
                                                                                                            account:
                                                                                                                "",
                                                                                                        }
                                                                                                    );
                                                                                                } else {
                                                                                                    const selectedAccount =
                                                                                                        accounts.find(
                                                                                                            (
                                                                                                                acc
                                                                                                            ) =>
                                                                                                                acc.account_id ===
                                                                                                                parseInt(
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value
                                                                                                                )
                                                                                                        );
                                                                                                    updateTransactionField(
                                                                                                        transaction.id,
                                                                                                        {
                                                                                                            accountId:
                                                                                                                selectedAccount?.account_id,
                                                                                                            account:
                                                                                                                selectedAccount?.account_name,
                                                                                                        }
                                                                                                    );
                                                                                                }
                                                                                            }}
                                                                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                        >
                                                                                            {accounts.map(
                                                                                                (
                                                                                                    acc
                                                                                                ) => (
                                                                                                    <option
                                                                                                        key={
                                                                                                            acc.account_id
                                                                                                        }
                                                                                                        value={
                                                                                                            acc.account_id
                                                                                                        }
                                                                                                    >
                                                                                                        {
                                                                                                            acc.account_name
                                                                                                        }
                                                                                                    </option>
                                                                                                )
                                                                                            )}
                                                                                            <option value="custom">
                                                                                                +
                                                                                                New
                                                                                                Account
                                                                                                (Type
                                                                                                Below)
                                                                                            </option>
                                                                                        </select>
                                                                                        {!transaction.accountId && (
                                                                                            <div className="mt-2">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    placeholder="Enter new account name..."
                                                                                                    value={
                                                                                                        transaction.account ||
                                                                                                        ""
                                                                                                    }
                                                                                                    onChange={(
                                                                                                        e
                                                                                                    ) =>
                                                                                                        updateTransactionField(
                                                                                                            transaction.id,
                                                                                                            {
                                                                                                                account:
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value,
                                                                                                            }
                                                                                                        )
                                                                                                    }
                                                                                                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:ring-2"
                                                                                                    style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                                />
                                                                                                <p className="text-xs text-blue-600 mt-1">
                                                                                                    New
                                                                                                    account
                                                                                                    will
                                                                                                    be
                                                                                                    created
                                                                                                    with
                                                                                                    this
                                                                                                    name
                                                                                                </p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Date */}
                                                                                    <div>
                                                                                        <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                            Date
                                                                                            *
                                                                                        </label>
                                                                                        <input
                                                                                            type="date"
                                                                                            value={
                                                                                                transaction.date
                                                                                            }
                                                                                            onChange={(
                                                                                                e
                                                                                            ) => {
                                                                                                const updated =
                                                                                                    editedPreviewTransactions.map(
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
                                                                                                setEditedPreviewTransactions(
                                                                                                    updated
                                                                                                );
                                                                                            }}
                                                                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                        />
                                                                                    </div>

                                                                                    {/* Need vs Want for expenses */}
                                                                                    {isExpense && (
                                                                                        <div>
                                                                                            <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                                Need
                                                                                                or
                                                                                                Want
                                                                                                *
                                                                                            </label>
                                                                                            <select
                                                                                                value={
                                                                                                    transaction.expenseType ||
                                                                                                    "needs"
                                                                                                }
                                                                                                onChange={(
                                                                                                    e
                                                                                                ) => {
                                                                                                    const updated =
                                                                                                        editedPreviewTransactions.map(
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
                                                                                                                                  .value,
                                                                                                                      }
                                                                                                                    : t
                                                                                                        );
                                                                                                    setEditedPreviewTransactions(
                                                                                                        updated
                                                                                                    );
                                                                                                }}
                                                                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                            >
                                                                                                <option value="needs">
                                                                                                    Need
                                                                                                </option>
                                                                                                <option value="wants">
                                                                                                    Want
                                                                                                </option>
                                                                                            </select>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Transfer Type (for transfers only) */}
                                                                                    {transaction.type === 'transfer' && (
                                                                                        <div>
                                                                                            <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                                Transfer Type *
                                                                                            </label>
                                                                                            <select
                                                                                                value={transaction.transfer_type || 'intra_person'}
                                                                                                onChange={(e) => {
                                                                                                    const updated = editedPreviewTransactions.map(
                                                                                                        (t) =>
                                                                                                            t.id === transaction.id
                                                                                                                ? {
                                                                                                                      ...t,
                                                                                                                      transfer_type: e.target.value,
                                                                                                                  }
                                                                                                                : t
                                                                                                    );
                                                                                                    setEditedPreviewTransactions(updated);
                                                                                                }}
                                                                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                                style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                            >
                                                                                                <option value="intra_person">Internal Transfer (to own account/savings)</option>
                                                                                                <option value="inter_person">Transfer to Others</option>
                                                                                            </select>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Seller/Payer */}
                                                                                    <div>
                                                                                        <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                            {transaction.type === 'transfer' 
                                                                                                ? "Recipient" 
                                                                                                : isExpense
                                                                                                ? "Seller"
                                                                                                : "Payer"}{" "}
                                                                                            (Optional)
                                                                                        </label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={
                                                                                                isExpense
                                                                                                    ? transaction.seller
                                                                                                    : transaction.payer
                                                                                            }
                                                                                            onChange={(
                                                                                                e
                                                                                            ) => {
                                                                                                const updated =
                                                                                                    editedPreviewTransactions.map(
                                                                                                        (
                                                                                                            t
                                                                                                        ) =>
                                                                                                            t.id ===
                                                                                                            transaction.id
                                                                                                                ? {
                                                                                                                      ...t,
                                                                                                                      [isExpense
                                                                                                                          ? "seller"
                                                                                                                          : "payer"]:
                                                                                                                          e
                                                                                                                              .target
                                                                                                                              .value,
                                                                                                                  }
                                                                                                                : t
                                                                                                    );
                                                                                                setEditedPreviewTransactions(
                                                                                                    updated
                                                                                                );
                                                                                            }}
                                                                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                        />
                                                                                    </div>

                                                                                    {/* Location (for expenses only) */}
                                                                                    {isExpense && (
                                                                                        <div>
                                                                                            <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                                Location
                                                                                                (Optional)
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
                                                                                                    const updated =
                                                                                                        editedPreviewTransactions.map(
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
                                                                                                    setEditedPreviewTransactions(
                                                                                                        updated
                                                                                                    );
                                                                                                }}
                                                                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                            />
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Reference No */}
                                                                                    <div>
                                                                                        <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: brand.ink + 'CC' }}>
                                                                                            Reference
                                                                                            No
                                                                                            (Optional)
                                                                                        </label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={
                                                                                                transaction.reference_no ||
                                                                                                ""
                                                                                            }
                                                                                            onChange={(
                                                                                                e
                                                                                            ) => {
                                                                                                const updated =
                                                                                                    editedPreviewTransactions.map(
                                                                                                        (
                                                                                                            t
                                                                                                        ) =>
                                                                                                            t.id ===
                                                                                                            transaction.id
                                                                                                                ? {
                                                                                                                      ...t,
                                                                                                                      reference_no:
                                                                                                                          e
                                                                                                                              .target
                                                                                                                              .value,
                                                                                                                  }
                                                                                                                : t
                                                                                                    );
                                                                                                setEditedPreviewTransactions(
                                                                                                    updated
                                                                                                );
                                                                                            }}
                                                                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg"
                                                                                            style={{ borderColor: brand.ink + '66', color: brand.ink }}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        }
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Bottom spacing for scroll area */}
                                        <div className="pb-6"></div>
                                    </div>
                                )}
                            </div>

                            {/* Drawer Footer - Sticky */}
                            <div className="flex justify-between items-center gap-3 p-4 sm:p-5 border-t flex-shrink-0" style={{ borderColor: brand.ink + '33', backgroundColor: brand.surface }}>
                                <button
                                    onClick={closeDrawer}
                                    disabled={isImporting}
                                    className="px-4 py-2 rounded-lg border transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ 
                                        borderColor: brand.ink + '66',
                                        color: brand.ink
                                    }}
                                    onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = brand.ink + '1A')}
                                    onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    Close Preview
                                </button>
                                {extractedTransactions ? (
                                    <button
                                        onClick={handleImportTransactions}
                                        disabled={isImporting}
                                        className="relative px-4 py-2 rounded-lg overflow-hidden transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-md hover:shadow-lg disabled:cursor-not-allowed min-w-[200px] sm:min-w-[240px]"
                                        style={{
                                            backgroundColor: isImporting
                                                ? brand.surface
                                                : brand.mint,
                                            color: isImporting
                                                ? brand.ink
                                                : "white",
                                        }}
                                    >
                                        {/* Progress Bar Background (fills from left to right) */}
                                        {isImporting && (
                                            <div
                                                className="absolute inset-0 transition-all duration-300 ease-out"
                                                style={{
                                                    width: `${importProgress}%`,
                                                    backgroundColor: brand.ink,
                                                }}
                                            />
                                        )}

                                        {/* Button Content (always on top of progress bar) */}
                                        <div
                                            className="relative z-10 flex items-center gap-2"
                                            style={{
                                                color: isImporting
                                                    ? "white"
                                                    : "inherit",
                                            }}
                                        >
                                            {isImporting ? (
                                                <>
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                    <span>
                                                        Importing{" "}
                                                        {
                                                            extractedTransactions
                                                                .summary
                                                                .total_transactions
                                                        }{" "}
                                                        Transactions...{" "}
                                                        {importProgress}%
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileUp className="w-4 h-4" />
                                                    Import{" "}
                                                    {
                                                        extractedTransactions
                                                            .summary
                                                            .total_transactions
                                                    }{" "}
                                                    Transactions
                                                </>
                                            )}
                                        </div>
                                    </button>
                                ) : (
                                    <button 
                                        className="px-4 py-2 text-white rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg"
                                        style={{ backgroundColor: brand.ink }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brand.mint}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brand.ink}
                                    >
                                        {selectedFile.type === "ctos" ||
                                        selectedFile.type === "ccris"
                                            ? "Apply Insights to Dashboard"
                                            : "Import All Transactions"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Duplicate Detection Dialog */}
                {duplicateDialog.isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
                            onClick={() =>
                                setDuplicateDialog({
                                    isOpen: false,
                                    file: null,
                                    duplicateInfo: null,
                                    uploadType: null,
                                })
                            }
                        ></div>

                        {/* Dialog */}
                        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
                            {/* Header with Close Button */}
                            <div className="relative px-5 pt-5 pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-[#04362c]">
                                            Duplicate File Detected
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            This file already exists in your
                                            records
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setDuplicateDialog({
                                                isOpen: false,
                                                file: null,
                                                duplicateInfo: null,
                                                uploadType: null,
                                            })
                                        }
                                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-5 py-4">
                                <p className="text-sm text-gray-600 mb-3">
                                    This file has already been uploaded
                                    previously. Here are the details:
                                </p>

                                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 space-y-2.5 border border-gray-200/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-gray-600">
                                            Statement ID
                                        </span>
                                        <span className="text-sm text-[#04362c] font-medium">
                                            {
                                                duplicateDialog.duplicateInfo
                                                    ?.statement_id
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-gray-600">
                                            Type
                                        </span>
                                        <span className="text-sm text-[#04362c] font-medium capitalize">
                                            {
                                                duplicateDialog.duplicateInfo
                                                    ?.statement_type
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-gray-600">
                                            Uploaded
                                        </span>
                                        <span className="text-sm text-[#04362c] font-medium">
                                            {duplicateDialog.duplicateInfo
                                                ?.date_uploaded
                                                ? new Date(
                                                      duplicateDialog.duplicateInfo.date_uploaded
                                                  ).toLocaleDateString("en-GB")
                                                : "N/A"}
                                        </span>
                                    </div>
                                    {duplicateDialog.duplicateInfo
                                        ?.period_start &&
                                        duplicateDialog.duplicateInfo
                                            ?.period_end && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-600">
                                                    Period
                                                </span>
                                                <span className="text-sm text-[#04362c] font-medium">
                                                    {new Date(
                                                        duplicateDialog.duplicateInfo.period_start
                                                    ).toLocaleDateString(
                                                        "en-GB"
                                                    )}{" "}
                                                    -{" "}
                                                    {new Date(
                                                        duplicateDialog.duplicateInfo.period_end
                                                    ).toLocaleDateString(
                                                        "en-GB"
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    {duplicateDialog.duplicateInfo
                                        ?.credit_score && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-600">
                                                Credit Score
                                            </span>
                                            <span className="text-sm text-[#04362c] font-medium">
                                                {
                                                    duplicateDialog
                                                        .duplicateInfo
                                                        .credit_score
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-amber-800 text-xs font-medium">
                                        Uploading this file again will create a
                                        duplicate entry in your records.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-5 pb-5 flex gap-3">
                                <button
                                    onClick={handleCancelDuplicate}
                                    className="flex-1 px-4 py-2 text-sm border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleForceUpload}
                                    className="flex-1 px-4 py-2 text-sm bg-[#0DAD8D] text-white rounded-xl font-semibold hover:bg-[#0a9374] transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    Upload Anyway
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* PDF Viewer Dialog */}
                {pdfViewerDialog.isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300"
                            onClick={closePdfViewer}
                        ></div>

                        {/* PDF Viewer Modal */}
                        <div className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#04362c] to-[#0DAD8D] text-white border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">
                                            PDF Viewer
                                        </h3>
                                        <p className="text-sm text-white/80">
                                            {pdfViewerDialog.fileName}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={closePdfViewer}
                                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* PDF Content */}
                            <div className="flex-1 overflow-hidden bg-gray-100">
                                <iframe
                                    src={pdfViewerDialog.pdfUrl}
                                    className="w-full h-full"
                                    title="PDF Viewer"
                                    style={{ border: "none" }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Rescan Confirmation Dialog */}
                {rescanConfirmDialog.isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
                            onClick={() =>
                                setRescanConfirmDialog({ isOpen: false, file: null })
                            }
                        ></div>

                        {/* Dialog */}
                        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
                            {/* Header with Icon and Close Button */}
                            <div className="relative px-5 pt-5 pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                                        <RefreshCw className="w-5 h-5 text-blue-600" />
                                    </div>
                                    {/* Title */}
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-[#04362c]">
                                            Re-scan this statement?
                                        </h3>
                                    </div>
                                    {/* Close Button */}
                                    <button
                                        onClick={() =>
                                            setRescanConfirmDialog({ isOpen: false, file: null })
                                        }
                                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-5 py-4">
                                <p className="text-sm text-gray-600 mb-3">
                                    This will:
                                </p>
                                <ul className="text-sm text-gray-600 space-y-2 ml-4">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 mt-0.5">•</span>
                                        <span>Re-extract transactions using the latest AI</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 mt-0.5">•</span>
                                        <span>Replace the cached preview data</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 mt-0.5">•</span>
                                        <span>Allow you to review and import fresh results</span>
                                    </li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <strong>Note:</strong> Duplicate prevention will skip already imported transactions.
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
                                <button
                                    onClick={() =>
                                        setRescanConfirmDialog({ isOpen: false, file: null })
                                    }
                                    className="px-5 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRescanStatement}
                                    className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Rescan
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Alert Dialog */}
                {alertDialog.isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
                            onClick={() =>
                                setAlertDialog({
                                    isOpen: false,
                                    type: "info",
                                    title: "",
                                    message: "",
                                })
                            }
                        ></div>

                        {/* Dialog */}
                        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
                            {/* Header with Icon and Close Button */}
                            <div className="relative px-5 pt-5 pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    {/* Icon */}
                                    <div
                                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                            alertDialog.type === "success"
                                                ? "bg-green-100"
                                                : alertDialog.type === "error"
                                                ? "bg-red-100"
                                                : alertDialog.type === "warning"
                                                ? "bg-amber-100"
                                                : "bg-blue-100"
                                        }`}
                                    >
                                        {alertDialog.type === "success" && (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        )}
                                        {alertDialog.type === "error" && (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        )}
                                        {alertDialog.type === "warning" && (
                                            <CircleAlert className="w-5 h-5 text-amber-600" />
                                        )}
                                        {alertDialog.type === "info" && (
                                            <Info className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>
                                    {/* Title */}
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-[#04362c]">
                                            {alertDialog.title}
                                        </h3>
                                    </div>
                                    {/* Close Button */}
                                    <button
                                        onClick={() =>
                                            setAlertDialog({
                                                isOpen: false,
                                                type: "info",
                                                title: "",
                                                message: "",
                                            })
                                        }
                                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-5 py-4">
                                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                    {alertDialog.message}
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
                                <button
                                    onClick={() =>
                                        setAlertDialog({
                                            isOpen: false,
                                            type: "info",
                                            title: "",
                                            message: "",
                                        })
                                    }
                                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        alertDialog.type === "success"
                                            ? "bg-green-600 hover:bg-green-700 text-white"
                                            : alertDialog.type === "error"
                                            ? "bg-red-600 hover:bg-red-700 text-white"
                                            : alertDialog.type === "warning"
                                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                    }`}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteConfirmDialog.isOpen} onOpenChange={(open) => !open && setDeleteConfirmDialog({ isOpen: false, file: null })}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Statement</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{deleteConfirmDialog.file?.name}"? 
                                This action cannot be undone and will remove all associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="px-6 py-3 rounded-xl border border-[#04362c]/20 bg-white text-base font-semibold text-[#04362c] hover:bg-[#04362c]/5 transition-all">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteStatement}
                                className="px-6 py-3 rounded-xl bg-[#0DAD8D] text-white text-base font-semibold shadow-lg hover:bg-[#0DAD8D]/90 transition-all inline-flex items-center gap-2 justify-center"
                            >
                                <Trash2 className="w-5 h-5" />
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

    );
}
