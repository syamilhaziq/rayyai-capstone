import { useState, useEffect } from "react";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../services/api";

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

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

export default function SuspiciousTransactions({ transactions, loading, formatCurrency: customFormatCurrency }) {
  const navigate = useNavigate();
  const format = customFormatCurrency || formatCurrency;

  const [suspiciousTransactions, setSuspiciousTransactions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setSuspiciousTransactions([]);
      return;
    }

    analyzeDubiousTransactions();
  }, [transactions]);

  const analyzeDubiousTransactions = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Limit to recent 100 transactions for API efficiency
      const recentTransactions = transactions.slice(0, 100).map(tx => ({
        id: String(tx.id || tx.transfer_id || tx.income_id || tx.expense_id || ''),
        date: tx.date_spent || tx.created_at || tx.date || tx.transfer_date || '',
        amount: Math.abs(Number(tx.amount) || 0),
        description: tx.description || tx.seller || tx.merchant || "Unknown",
        category: tx.category || "Uncategorized",
        type: tx.type || "expense"
      }));

      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Call backend endpoint
      const response = await fetch(`${API_BASE_URL}/insights/analyze-suspicious-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactions: recentTransactions
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }

      const data = await response.json();
      const suspiciousIds = data.suspicious_transactions || [];

      // Match suspicious IDs with original transaction data
      const flaggedTransactions = suspiciousIds.map(suspicious => {
        const originalTx = transactions.find(tx => {
          const txId = tx.id || tx.transfer_id || tx.income_id || tx.expense_id;
          return txId === suspicious.id || txId?.toString() === suspicious.id?.toString();
        });

        if (originalTx) {
          return {
            ...originalTx,
            reason: suspicious.reason,
            severity: suspicious.severity,
            details: suspicious.details
          };
        }
        return null;
      }).filter(Boolean);

      setSuspiciousTransactions(flaggedTransactions);
    } catch (err) {
      console.error('Error analyzing transactions:', err);
      setError(err.message || 'Failed to analyze transactions. Please try again.');
      setSuspiciousTransactions([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading || isAnalyzing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Transaction Review</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-600">
            {isAnalyzing ? "Analyzing transactions with AI..." : "Loading transactions..."}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Transaction Review</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={analyzeDubiousTransactions}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (suspiciousTransactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Transaction Review</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600">No suspicious transactions detected</p>
          <p className="text-sm text-gray-500 mt-2">All your recent transactions appear normal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Transaction Review</h3>
        </div>
        <button
          onClick={analyzeDubiousTransactions}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh analysis"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="space-y-3">
        {suspiciousTransactions.map((tx, index) => {
          const amount = Math.abs(Number(tx.amount) || 0);
          const date = tx.date_spent || tx.created_at || tx.date || tx.transfer_date;
          const description = tx.description || tx.seller || tx.merchant || "Unknown";

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                tx.severity === "high"
                  ? "bg-red-50 border-red-500"
                  : "bg-amber-50 border-amber-500"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        tx.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {tx.severity === "high" ? "HIGH RISK" : "MEDIUM RISK"}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {tx.reason}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2 truncate">
                    {description}
                  </p>

                  <p className="text-xs text-gray-600 mb-2">
                    {tx.details}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatDate(date)}</span>
                    <span className="font-medium text-gray-900">
                      {format(amount)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/transactions/all")}
                  className="flex-shrink-0 p-2 hover:bg-white rounded-lg transition-colors"
                  title="View details"
                >
                  <ExternalLink className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => navigate("/transactions/all")}
          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
        >
          View All Transactions
        </button>
      </div>
    </div>
  );
}
