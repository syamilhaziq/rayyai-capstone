import React, { useState, useMemo, useEffect } from "react";
import { Brain, Search, Filter, SortAsc, CreditCard as CreditCardIcon, AlertCircle, RefreshCw, Trash2, Edit, CheckSquare, Wallet, TrendingUp, Gift, CreditCard as CreditCardIconLucide, Calendar, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import GlobalLoader from "../components/GlobalLoader";

// ✅ updated paths after moving files
import MetricCard from "../components/MetricCard";
import CreditCard from "../components/CreditCards";
import RecommendationCard from "../components/RecommendationCard";
import { cardsApi, transactionApi, accountApi } from "../services/api";

function CreditCardPage() {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("bank");
  const [filterBy, setFilterBy] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [newCard, setNewCard] = useState({
    bank: '',
    cardNumber: '',
    dueDate: '',
    balance: '',
    utilization: 0,
    annualFee: 0,
    availableCredit: 0,
    rewards: 0,
    cardType: 'Visa' // Always Visa
  });

  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState("all"); // all, expenses, payments
  const [transactionSort, setTransactionSort] = useState("date-desc"); // date-desc, date-asc, amount-desc, amount-asc
  const MAX_TRANSACTIONS_DISPLAY = 200;

  // Helper function to map card data - handles RHB and other banks
  const mapCardData = (card) => {
    // Normalize bank name - handle various formats (RHB, RHB Bank, etc.)
    let bankName = card.bank_name || card.card_name || "Unknown Bank";
    // Clean up bank name (remove extra spaces, normalize case)
    bankName = bankName.trim();
    
    return {
      card_id: card.card_id,
      bank: bankName,
      cardNumber: card.last_four_digits ? `************${card.last_four_digits}` : "************0000",
      dueDate: card.expiry_date || "N/A",
      balance: card.current_balance ? (typeof card.current_balance === 'number' 
        ? card.current_balance.toLocaleString() 
        : parseFloat(card.current_balance || 0).toLocaleString()) : "0",
      balanceRaw: typeof card.current_balance === 'number' ? card.current_balance : parseFloat(card.current_balance || 0),
      utilization: card.utilization_percentage || 0,
      annualFee: card.annual_fee || 0,
      availableCredit: card.credit_limit || 0, // This is the credit limit
      rewards: card.rewards_balance || 0,
      cardType: "Visa", // Always display Visa
    };
  };

  // Fetch credit cards from API
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedCards = await cardsApi.getAll();
        // Map backend data to frontend format
        const mappedCards = fetchedCards.map(mapCardData);
        setCards(mappedCards);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading credit cards:", err);
        setError(err.message || "Failed to load credit cards. Please try again.");
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch transactions and accounts (credit card metrics come from overview endpoint)
  useEffect(() => {
    const loadTransactions = async () => {
      setTransactionsLoading(true);
      setTransactionsError(null);
      try {
        // Fetch transactions and accounts in parallel
        const [fetchedTransactions, fetchedAccounts] = await Promise.all([
          transactionApi.getAll({}, true),
          accountApi.getAll().catch(() => []) // Gracefully handle if accounts fail
        ]);
        
        setAccounts(fetchedAccounts || []);
        
        // Filter transactions that are linked to credit card accounts
        const creditCardTransactions = fetchedTransactions.filter(transaction => {
          // Check if transaction account type is credit card
          const accountType = transaction.account?.type || transaction.account?.account_type || "";
          const accountName = transaction.account?.name || "";
          
          // Match credit card accounts
          return accountType?.toLowerCase().includes("credit") || 
                 accountName?.toLowerCase().includes("credit card");
        });
        
        setTransactions(creditCardTransactions);
        setTransactionsLoading(false);
      } catch (err) {
        console.error("Error loading transactions:", err);
        setTransactionsError(err.message || "Failed to load transactions.");
        setTransactionsLoading(false);
      }
    };
    
    loadTransactions();
  }, []);

  // Fetch aggregated overview metrics
  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      setOverviewLoading(true);
      setOverviewError(null);
      try {
        const data = await cardsApi.getOverview();
        if (isMounted) {
          setOverview(data);
        }
      } catch (err) {
        if (isMounted) {
          setOverviewError(err.message || "Failed to load overview");
        }
      } finally {
        if (isMounted) {
          setOverviewLoading(false);
        }
      }
    };

    loadOverview();
    return () => {
      isMounted = false;
    };
  }, []);

  // AI-powered recommendations from backend
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(null);

  // Fetch AI recommendations with caching
  useEffect(() => {
    let isMounted = true;
    const CACHE_KEY = 'creditCardRecommendations';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    const loadRecommendations = async () => {
      // Check cache first
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // Use cached data if less than 5 minutes old
          if (age < CACHE_DURATION && isMounted) {
            setRecommendations(cachedData);
            setRecommendationsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load cached recommendations:', err);
      }

      // Fetch fresh data
      setRecommendationsLoading(true);
      setRecommendationsError(null);
      try {
        const data = await cardsApi.getRecommendations(5); // Request max 5 recommendations

        if (isMounted) {
          // Filter to only show recommendations with match score >= 70%
          const filteredRecommendations = (data.recommendations || [])
            .filter(rec => rec.match_score >= 70)
            .slice(0, 5) // Ensure maximum 5 recommendations
            .map(rec => ({
              match: rec.match_score,
              bank: rec.bank_name || "Unknown Bank",
              title: rec.card_name || "Credit Card",
              offer: rec.highlighted_benefits?.[0] || "Special offers available",
              description: rec.primary_reason || "",
              analysis: rec.reasoning || [],
              annualFee: rec.annual_fee || 0,
              value: rec.value || 0,  // Fixed: backend returns 'value' not 'estimated_annual_value'
              cardBrand: rec.card_brand || "VISA",
              eligibilityCriteria: rec.eligibility_criteria || {},
              benefits: rec.benefits || {},
              promotions: rec.promotions || [],
              highlightedBenefits: rec.highlighted_benefits || [],
            }));

          setRecommendations(filteredRecommendations);

          // Cache the recommendations
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
              data: filteredRecommendations,
              timestamp: Date.now()
            }));
          } catch (err) {
            console.warn('Failed to cache recommendations:', err);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading recommendations:", err);
          setRecommendationsError(err.message || "Failed to load recommendations");
        }
      } finally {
        if (isMounted) {
          setRecommendationsLoading(false);
        }
      }
    };

    loadRecommendations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter and sort cards
  const filteredAndSortedCards = cards
    .filter(card => {
      const matchesSearch = card.bank.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           card.cardType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterBy === "all" || 
                           (filterBy === "high-utilization" && card.utilization > 5) ||
                           (filterBy === "low-fee" && card.annualFee < 200) ||
                           (filterBy === "visa" && card.cardType === "Visa") ||
                           (filterBy === "mastercard" && card.cardType === "MasterCard");
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "bank":
          return a.bank.localeCompare(b.bank);
        case "balance":
          return parseFloat(b.balance.replace(",", "")) - parseFloat(a.balance.replace(",", ""));
        case "utilization":
          return b.utilization - a.utilization;
        case "fee":
          return a.annualFee - b.annualFee;
        default:
          return 0;
      }
    });

  // Helper functions
  const handleCardSelect = (cardIndex, isSelected) => {
    const newSelected = new Set(selectedCards);
    if (isSelected) {
      newSelected.add(cardIndex);
    } else {
      newSelected.delete(cardIndex);
    }
    setSelectedCards(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedCards.size === filteredAndSortedCards.length) {
      setSelectedCards(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedCards(new Set(filteredAndSortedCards.map((_, index) => index)));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedCards.size} selected cards?`)) {
      // Implement bulk delete logic
      setSelectedCards(new Set());
      setShowBulkActions(false);
      addNotification("Cards deleted successfully", "success");
    }
  };

  const handleExport = () => {
    // Implement export functionality
    const dataStr = JSON.stringify(filteredAndSortedCards, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'credit-cards.json';
    link.click();
    addNotification("Data exported successfully", "success");
  };

  const addNotification = (message, type = "info") => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleAddCard = () => {
    // Validate required fields
    if (!newCard.bank || !newCard.cardNumber || !newCard.dueDate || !newCard.balance) {
      addNotification("Please fill in all required fields", "error");
      return;
    }

    // Validate card number (16 digits)
    if (!/^\d{16}$/.test(newCard.cardNumber.replace(/\s/g, ''))) {
      addNotification("Card number must be 16 digits", "error");
      return;
    }

    // Validate due date format (MM/YY)
    if (!/^\d{2}\/\d{2}$/.test(newCard.dueDate)) {
      addNotification("Due date must be in MM/YY format", "error");
      return;
    }

    // Calculate utilization based on balance and available credit
    const balanceNum = parseFloat(newCard.balance.replace(/,/g, ''));
    const utilizationCalc = newCard.availableCredit > 0 
      ? Math.round((balanceNum / newCard.availableCredit) * 100) 
      : 0;

    // Add the new card
    const cardToAdd = {
      ...newCard,
      utilization: utilizationCalc,
      balance: balanceNum.toLocaleString(),
      cardNumber: newCard.cardNumber.replace(/\s/g, '') // Remove spaces
    };

    setCards(prev => [...prev, cardToAdd]);
    
    // Reset form
    setNewCard({
      bank: '',
      cardNumber: '',
      dueDate: '',
      balance: '',
      utilization: 0,
      annualFee: 0,
      availableCredit: 0,
      rewards: 0,
      cardType: 'Visa' // Always Visa
    });
    
    setShowModal(false);
    addNotification("Credit card added successfully!", "success");
  };

  const handleInputChange = (field, value) => {
    setNewCard(prev => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Limit to 16 digits
    const limitedDigits = digits.slice(0, 16);
    // Add spaces every 4 digits
    return limitedDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const retryLoad = () => {
    setError(null);
    setIsLoading(true);
    // Reload the data
    const loadData = async () => {
      try {
        const fetchedCards = await cardsApi.getAll();
        const mappedCards = fetchedCards.map(mapCardData);
        setCards(mappedCards);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading credit cards:", err);
        setError(err.message || "Failed to load credit cards. Please try again.");
        setIsLoading(false);
      }
    };
    loadData();
  };

  const handleDeleteCard = async (cardId) => {
    if (!cardId) {
      addNotification("Invalid card ID", "error");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this credit card?")) {
      return;
    }

    try {
      await cardsApi.delete(cardId);
      // Remove the card from the local state
      setCards(prevCards => prevCards.filter(card => card.card_id !== cardId));
      addNotification("Credit card deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting card:", err);
      addNotification(err.message || "Failed to delete credit card", "error");
    }
  };

  // Calculate totals for display - using real card data
  const totalBalance = useMemo(() => {
    return cards.reduce((sum, card) => {
      // Use balanceRaw if available, otherwise parse balance string
      if (card.balanceRaw !== undefined) {
        return sum + (isNaN(card.balanceRaw) ? 0 : card.balanceRaw);
      }
      const balanceStr = card.balance || "0";
      const balanceNum = parseFloat(balanceStr.replace(/,/g, "") || 0);
      return sum + (isNaN(balanceNum) ? 0 : balanceNum);
    }, 0);
  }, [cards]);

  const totalCreditLimit = useMemo(() => {
    return cards.reduce((sum, card) => {
      // availableCredit in mapped data is actually credit_limit from backend
      const limit = card.availableCredit || 0;
      return sum + (typeof limit === 'number' ? limit : parseFloat(limit) || 0);
    }, 0);
  }, [cards]);

  const totalRewards = useMemo(() => {
    return cards.reduce((sum, card) => {
      const rewards = card.rewards || 0;
      return sum + (typeof rewards === 'number' ? rewards : parseFloat(rewards) || 0);
    }, 0);
  }, [cards]);

  const totalAnnualFee = useMemo(() => {
    return cards.reduce((sum, card) => {
      const fee = card.annualFee || 0;
      return sum + (typeof fee === 'number' ? fee : parseFloat(fee) || 0);
    }, 0);
  }, [cards]);

  // Use summary from overview endpoint (new structure)
  const overviewSummary = overview?.summary;

  const effectiveCreditLimit = useMemo(() => {
    if (overviewSummary?.total_limit) {
      return overviewSummary.total_limit;
    }
    return totalCreditLimit;
  }, [overviewSummary, totalCreditLimit]);

  const availableCredit = useMemo(() => {
    if (
      overviewSummary &&
      overviewSummary.total_available !== null &&
      overviewSummary.total_available !== undefined
    ) {
      return overviewSummary.total_available;
    }
    return Math.max(0, effectiveCreditLimit - totalBalance);
  }, [overviewSummary, effectiveCreditLimit, totalBalance]);

  const overallUtilization = useMemo(() => {
    if (
      overviewSummary &&
      overviewSummary.utilization_pct !== null &&
      overviewSummary.utilization_pct !== undefined
    ) {
      return overviewSummary.utilization_pct;
    }
    if (effectiveCreditLimit <= 0) return 0;
    return (totalBalance / effectiveCreditLimit) * 100;
  }, [overviewSummary, totalBalance, effectiveCreditLimit]);

  // Calculate spending from backend (current month) with frontend fallback
  const monthlySpending = useMemo(() => {
    // Use monthly_spending from backend (credit card expenses for current month)
    if (
      overviewSummary &&
      overviewSummary.monthly_spending !== undefined &&
      overviewSummary.monthly_spending !== null
    ) {
      return overviewSummary.monthly_spending;
    }

    // Fallback: calculate from transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date || t.transaction_date);
        return transactionDate >= thirtyDaysAgo && t.type === "expense";
      })
      .reduce((sum, t) => {
        const amount = Math.abs(t.amount || 0);
        return sum + amount;
      }, 0);
  }, [overviewSummary, transactions]);

  // Format currency helper
  const formatCurrency = (amount) => {
    const numeric = Number(amount);
    if (Number.isNaN(numeric)) {
      return "RM 0";
    }
    try {
      return new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency: "MYR",
        maximumFractionDigits: 2,
      }).format(numeric).replace("RM", "RM ");
    } catch {
      return `RM ${numeric.toLocaleString("en-MY", { maximumFractionDigits: 2 })}`;
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply filter
    if (transactionFilter === "expenses") {
      filtered = filtered.filter(t => t.type === "expense");
    } else if (transactionFilter === "payments") {
      filtered = filtered.filter(t => t.type === "expense" && t.amount < 0);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (transactionSort) {
        case "date-desc":
          return new Date(b.date || b.transaction_date) - new Date(a.date || a.transaction_date);
        case "date-asc":
          return new Date(a.date || a.transaction_date) - new Date(b.date || b.transaction_date);
        case "amount-desc":
          return Math.abs(b.amount || 0) - Math.abs(a.amount || 0);
        case "amount-asc":
          return Math.abs(a.amount || 0) - Math.abs(b.amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [transactions, transactionFilter, transactionSort]);

  const displayedTransactions = useMemo(
    () => filteredAndSortedTransactions.slice(0, MAX_TRANSACTIONS_DISPLAY),
    [filteredAndSortedTransactions]
  );

  // Key metrics data matching Dashboard design
  const keyMetricsData = useMemo(() => {
    const displayCreditLimit = effectiveCreditLimit;
    const creditLimitSource = cards.length ? "from cards" : "no cards linked";
    const usedFromOverview =
      overviewSummary && overviewSummary.total_balance !== null && overviewSummary.total_balance !== undefined
        ? overviewSummary.total_balance
        : totalBalance;

    return [
      {
        title: "Total Credit Limit",
        value: isLoading || overviewLoading ? "..." : formatCurrency(displayCreditLimit),
        subtitle:
          isLoading || overviewLoading
            ? "Loading..."
            : `${cards.length} active card${cards.length !== 1 ? "s" : ""} • ${creditLimitSource}`,
        icon: <CreditCardIconLucide className="w-5 h-5" />,
        color: "bg-[#d9f4ed] text-[#04362c]",
      },
      {
        title: "Available Credit",
        value: isLoading || overviewLoading ? "..." : formatCurrency(availableCredit),
        subtitle:
          isLoading || overviewLoading ? "Calculating..." : `${formatCurrency(usedFromOverview)} used`,
        icon: <Wallet className="w-5 h-5" />,
        color: "bg-[#def8f2] text-[#04362c]",
      },
      {
        title: "Credit Utilization",
        value: isLoading || overviewLoading ? "..." : `${overallUtilization.toFixed(1)}%`,
        subtitle:
          isLoading || overviewLoading
            ? "Calculating..."
            : overallUtilization > 70
            ? "High utilization - consider paying down"
            : overallUtilization > 50
            ? "Moderate utilization"
            : "Healthy credit usage",
        icon: <TrendingUp className="w-5 h-5" />,
        color:
          overallUtilization > 70
            ? "bg-[#fecaca] text-[#dc2626]"
            : overallUtilization > 50
            ? "bg-[#fed7aa] text-[#c2410c]"
            : "bg-[#e0efe9] text-[#04362c]",
      },
      {
        title: "Monthly Spending",
        value: isLoading || overviewLoading ? "..." : formatCurrency(monthlySpending),
        subtitle:
          isLoading || overviewLoading
            ? "Calculating..."
            : "Credit card expenses this month",
        icon: <Gift className="w-5 h-5" />,
        color: "bg-[#eef6f4] text-[#04362c]",
      },
    ];
  }, [
    isLoading,
    overviewLoading,
    effectiveCreditLimit,
    availableCredit,
    totalBalance,
    overallUtilization,
    monthlySpending,
    cards.length,
    overviewSummary,
  ]);

  // Skeleton loading component
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-8 border border-[#e5e7eb] shadow-sm flex flex-col items-center gap-6 w-full max-w-[380px]">
      <div className="w-80 h-[200px] bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-xl"></div>
      <div className="flex gap-3 w-full justify-between">
        <div className="h-6 w-20 bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-2xl"></div>
        <div className="h-6 w-20 bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-2xl"></div>
      </div>
      <div className="w-full h-[60px] bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-[10px]"></div>
      <div className="flex gap-4 w-full">
        <div className="flex-1 h-[70px] bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-xl"></div>
        <div className="flex-1 h-[70px] bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-xl"></div>
      </div>
      <div className="flex gap-3 w-full">
        <div className="flex-1 h-9 bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-md"></div>
        <div className="flex-1 h-9 bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-md"></div>
        <div className="flex-1 h-9 bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-md"></div>
      </div>
    </div>
  );

  // Brand token cache for consistent styling (matching Intelligence Dashboard)
  const brand = {
    ink: "#04362c",
    mint: "#0DAD8D",
    surface: "#eef2f0",
    ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0DAD8D]",
  };

  return (
    <div
      id="credit-cards-page"
      className="min-h-screen"
      style={{ background: brand.surface }}
      role="main"
      aria-label="Credit Cards Dashboard"
    >
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-5 right-5 z-[1000] flex flex-col gap-2" role="alert" aria-live="polite">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`flex items-center justify-between px-4 py-3 rounded-lg shadow-md min-w-[300px] animate-[slideIn_0.3s_ease-out] ${
                notification.type === 'success' ? 'bg-[#10b981] text-white' :
                notification.type === 'error' ? 'bg-[#ef4444] text-white' :
                'bg-[#3b82f6] text-white'
              }`}
            >
              <span>{notification.message}</span>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                aria-label="Dismiss notification"
                className="bg-transparent border-0 text-inherit text-lg cursor-pointer p-0 px-1 ml-3"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}


      <div className="w-full px-6 sm:px-8 lg:px-14 pt-14 pb-10 sm:pt-16 sm:pb-12 lg:pt-20 lg:pb-14">
      {/* Page Header */}
        <header className="mb-6 lg:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
                style={{ color: brand.ink }}
              >
            Credit Cards
          </h1>
              <p className="mt-2 text-xl sm:text-2xl md:text-[26px] text-black/70">
                Manage your credit portfolio • {cards.length} active cards • {formatCurrency(totalBalance)} total balance
        </p>
      </div>
          </div>
        </header>

        {/* Key Metrics Section - Matching Dashboard Design */}
        <section className="mb-8 rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-2xl font-semibold" style={{ color: brand.ink }}>
                Overview
              </h3>
              <p className="text-sm text-black/60">
                Credit Portfolio Summary
              </p>
            </div>
          </div>
          {isLoading && cards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <GlobalLoader size="medium" className="mx-auto mb-4" />
                <p className="text-black/70 text-lg">Loading credit card metrics...</p>
              </div>
          </div>
        ) : error ? (
            <div className="text-center p-12" style={{ color: brand.ink }}>
            <AlertCircle size={48} className="text-[#ef4444] mb-4" />
              <h3 className="text-2xl font-semibold mb-2" style={{ color: brand.ink }}>Unable to load statistics</h3>
              <p className="text-lg mb-4" style={{ color: brand.ink }}>Please check your connection and try again</p>
            <button
              onClick={retryLoad}
                className={`inline-flex items-center gap-2 px-4 py-2 bg-[#0DAD8D] text-white border-0 rounded-full text-sm font-medium cursor-pointer transition-all hover:bg-[#0a8d72] hover:-translate-y-0.5 ${brand.ring}`}
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {keyMetricsData.map((item) => (
                <MetricCard
                  key={item.title}
                  title={item.title}
                  value={item.value}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  iconColor={item.color}
                />
              ))}
            </div>
          )}
        </section>

      {/* Credit Cards Section */}
        <section className="mb-8 rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-2xl font-semibold" style={{ color: brand.ink }}>
                Your Credit Cards
              </h3>
              <p className="text-sm text-black/60">
              {filteredAndSortedCards.length} of {cards.length} cards shown
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Bulk Actions */}
            {showBulkActions && (
              <div className="flex items-center gap-2 px-3 py-2 bg-black/5 border border-black/10 rounded-lg">
                <button
                  onClick={handleSelectAll}
                  className={`flex items-center gap-1.5 px-3 py-1.5 bg-white text-black/70 border border-black/10 rounded-full text-sm font-medium cursor-pointer transition-all hover:bg-black/5 hover:border-black/20 ${brand.ring}`}
                  aria-label={selectedCards.size === filteredAndSortedCards.length ? "Deselect all cards" : "Select all cards"}
                >
                  <CheckSquare size={16} />
                  {selectedCards.size === filteredAndSortedCards.length ? "Deselect All" : "Select All"}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className={`flex items-center gap-1.5 px-3 py-1.5 bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] rounded-full text-sm font-medium cursor-pointer transition-all hover:bg-[#fee2e2] hover:border-[#fca5a5] ${brand.ring}`}
                  aria-label={`Delete ${selectedCards.size} selected cards`}
                >
                  <Trash2 size={16} />
                  Delete ({selectedCards.size})
                </button>
              </div>
            )}

            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: brand.ink }} aria-hidden="true" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2.5 pr-3.5 pl-10 border border-black/10 rounded-lg text-base bg-white transition-all focus:outline-none focus:border-[#0DAD8D] focus:ring-2 focus:ring-[#0DAD8D]/20 placeholder:text-black/40 ${brand.ring}`}
                style={{ color: brand.ink }}
                aria-label="Search credit cards"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2" style={{ color: brand.ink }}>
              <Filter size={16} />
              <Select value={filterBy} onValueChange={(v) => setFilterBy(v)}>
                <SelectTrigger className="control-select bg-white border border-black/10">
                  <SelectValue placeholder="All Cards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" style={{ color: brand.ink }}>All Cards</SelectItem>
                  <SelectItem value="high-utilization" style={{ color: brand.ink }}>High Utilization</SelectItem>
                  <SelectItem value="low-fee" style={{ color: brand.ink }}>Low Annual Fee</SelectItem>
                  <SelectItem value="visa" style={{ color: brand.ink }}>Visa Cards</SelectItem>
                  <SelectItem value="mastercard" style={{ color: brand.ink }}>MasterCard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2" style={{ color: brand.ink }}>
              <SortAsc size={16} />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                <SelectTrigger className="control-select bg-white border border-black/10">
                  <SelectValue placeholder="Bank Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank" style={{ color: brand.ink }}>Bank Name</SelectItem>
                  <SelectItem value="balance" style={{ color: brand.ink }}>Balance</SelectItem>
                  <SelectItem value="utilization" style={{ color: brand.ink }}>Utilization</SelectItem>
                  <SelectItem value="fee" style={{ color: brand.ink }}>Annual Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

          <div className="mt-6">
          {isLoading && cards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <GlobalLoader size="medium" className="mx-auto mb-4" />
                <p className="text-black/70 text-lg">Loading credit cards...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center p-12" style={{ color: brand.ink }}>
              <AlertCircle size={48} className="text-[#ef4444] mb-4" />
              <h3 className="text-2xl font-semibold mb-2" style={{ color: brand.ink }}>Unable to load credit cards</h3>
              <p className="text-lg mb-4" style={{ color: brand.ink }}>{error}</p>
              <button
                onClick={retryLoad}
                className={`inline-flex items-center gap-2 px-4 py-2 bg-[#0DAD8D] text-white border-0 rounded-full text-sm font-medium cursor-pointer transition-all hover:bg-[#0a8d72] hover:-translate-y-0.5 ${brand.ring}`}
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-8 justify-evenly items-start">
                {filteredAndSortedCards.map((card, index) => (
                  <CreditCard
                    key={`${card.bank}-${index}`}
                    {...card}
                    isSelected={selectedCards.has(index)}
                    onSelect={(isSelected) => handleCardSelect(index, isSelected)}
                    showSelection={showBulkActions}
                    onDelete={handleDeleteCard}
                  />
                ))}
              </div>

              {filteredAndSortedCards.length === 0 && !isLoading && (
                <div className="text-center p-12" style={{ color: brand.ink }}>
                  <CreditCardIcon size={48} className="mx-auto mb-4" style={{ color: brand.ink }} />
                  <h3 className="text-2xl font-semibold mb-2" style={{ color: brand.ink }}>No cards found</h3>
                  <p className="text-lg" style={{ color: brand.ink }}>Try adjusting your search or filter criteria</p>
                </div>
              )}
            </>
          )}
        </div>
        </section>

      {/* Smart Recommendations Section */}
        <section className="mb-8 rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
              <div className="inline-flex items-center gap-2 bg-[#0DAD8D]/10 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.3em] text-[#0DAD8D] mb-3">
                <span>RayyAI Smart Recommendations</span>
              </div>
              <h3 className="text-2xl font-semibold" style={{ color: brand.ink }}>
                AI-Powered Credit Card Matcher
              </h3>
              <p className="text-sm text-black/60">
                Based on your spending patterns and financial goals
              </p>
          </div>
          <div className="flex items-center gap-3">
              <span className="bg-[#0DAD8D]/10 text-[#0DAD8D] px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#0DAD8D]/30">Updated Today</span>
              <span className="bg-black/5 text-black/60 px-3 py-1.5 rounded-full text-[11px] font-medium">{recommendations.length} suggestions</span>
          </div>
        </div>

          <div className="mt-6">
          {recommendationsLoading && recommendations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <GlobalLoader size="medium" className="mx-auto mb-4" />
                <p className="text-black/70 text-lg">We're analyzing your spending patterns to provide personalized suggestions</p>
              </div>
            </div>
          ) : recommendationsError ? (
            <div className="text-center p-12" style={{ color: brand.ink }}>
              <Brain size={48} className="text-[#ef4444] mb-4" />
              <h3 className="text-2xl font-semibold mb-2" style={{ color: brand.ink }}>Unable to load recommendations</h3>
              <p className="text-lg mb-4" style={{ color: brand.ink }}>{recommendationsError}</p>
              <button
                onClick={() => window.location.reload()}
                className={`inline-flex items-center gap-2 px-4 py-2 bg-[#0DAD8D] text-white border-0 rounded-full text-sm font-medium cursor-pointer transition-all hover:bg-[#0a8d72] hover:-translate-y-0.5 ${brand.ring}`}
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {recommendations.map((rec, index) => (
                <RecommendationCard key={index} {...rec} />
              ))}
            </div>
          )}
        </div>
        </section>

        {/* Credit Card Transactions Section */}
        <section className="mb-8 rounded-3xl bg-white border border-black/5 shadow p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-2xl font-semibold" style={{ color: brand.ink }}>
                Recent Transactions
              </h3>
              <p className="text-sm text-black/60">
                Credit card spending and payments
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Transaction Filter */}
              <div className="flex items-center gap-2" style={{ color: brand.ink }}>
                <Filter size={16} />
                <Select value={transactionFilter} onValueChange={(v) => setTransactionFilter(v)}>
                  <SelectTrigger className="control-select bg-white border border-black/10 w-[140px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" style={{ color: brand.ink }}>All Transactions</SelectItem>
                    <SelectItem value="expenses" style={{ color: brand.ink }}>Expenses Only</SelectItem>
                    <SelectItem value="payments" style={{ color: brand.ink }}>Payments Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Sort */}
              <div className="flex items-center gap-2" style={{ color: brand.ink }}>
                <ArrowUpDown size={16} />
                <Select value={transactionSort} onValueChange={(v) => setTransactionSort(v)}>
                  <SelectTrigger className="control-select bg-white border border-black/10 w-[140px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc" style={{ color: brand.ink }}>Newest First</SelectItem>
                    <SelectItem value="date-asc" style={{ color: brand.ink }}>Oldest First</SelectItem>
                    <SelectItem value="amount-desc" style={{ color: brand.ink }}>Highest Amount</SelectItem>
                    <SelectItem value="amount-asc" style={{ color: brand.ink }}>Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <GlobalLoader size="medium" className="mx-auto mb-4" />
                <p className="text-black/70 text-lg">Loading transactions...</p>
              </div>
            </div>
          ) : transactionsError ? (
            <div className="text-center p-12" style={{ color: brand.ink }}>
              <AlertCircle size={48} className="text-[#ef4444] mb-4" />
              <h3 className="text-2xl font-semibold mb-2" style={{ color: brand.ink }}>Unable to load transactions</h3>
              <p className="text-lg mb-4" style={{ color: brand.ink }}>{transactionsError}</p>
            </div>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center p-12" style={{ color: brand.ink }}>
              <CreditCardIcon size={48} className="mx-auto mb-4" style={{ color: brand.ink }} />
              <h3 className="text-2xl font-semibold mb-2" style={{ color: brand.ink }}>No transactions found</h3>
              <p className="text-lg" style={{ color: brand.ink }}>
                {transactions.length === 0 
                  ? "No credit card transactions available. Transactions will appear here once you add expenses to credit card accounts."
                  : "No transactions match your current filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: brand.ink }}>Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: brand.ink }}>Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: brand.ink }}>Category</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: brand.ink }}>Account</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: brand.ink }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map((transaction, index) => {
                    const amount = transaction.amount || 0;
                    const isExpense = transaction.type === "expense" || amount < 0;
                    const displayAmount = Math.abs(amount);
                    
                    return (
                      <tr 
                        key={transaction.id || `transaction-${index}`}
                        className="border-b border-black/5 hover:bg-black/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-black/70">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-black/40" />
                            {formatDate(transaction.date || transaction.transaction_date)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium" style={{ color: brand.ink }}>
                          {transaction.description || transaction.notes || "No description"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="px-2 py-1 rounded-full bg-black/5 text-black/70 text-xs font-medium">
                            {transaction.category || "Uncategorized"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-black/70">
                          {transaction.account?.name || "Credit Card"}
                        </td>
                        <td className={`py-3 px-4 text-sm font-semibold text-right ${
                          isExpense ? "text-[#dc2626]" : "text-[#059669]"
                        }`}>
                          {isExpense ? "-" : "+"}{formatCurrency(displayAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                {filteredAndSortedTransactions.length > MAX_TRANSACTIONS_DISPLAY && (
                  <div className="mt-4 text-center text-sm text-black/60">
                    Showing {displayedTransactions.length} of {filteredAndSortedTransactions.length} transactions
                  </div>
                )}
            </div>
          )}
        </section>
      </div>


    </div>
  );
}

export default CreditCardPage;
