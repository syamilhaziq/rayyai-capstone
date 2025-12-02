// ===========================
// Transaction Data Mapper
// ===========================
// This utility maps backend API responses to frontend transaction format

/**
 * Map backend income record to frontend transaction format
 * @param {object} income - Income record from backend
 * @param {object} accountsMap - Optional map of account_id to account object {id: {name, type}}
 * @returns {object} Normalized transaction object
 */
export const mapIncomeToTransaction = (income, accountsMap = {}) => {
  const account = accountsMap[income.account_id];

  return {
    id: `income-${income.income_id}`, // Prefix to avoid ID conflicts with expenses
    rawId: income.income_id,
    date: income.date_received,
    description: income.description || 'Untitled Income',
    amount: Math.abs(income.amount), // Ensure positive for income
    category: income.category || 'Income',
    type: 'income',

    // Account info
    account: {
      name: account?.account_name || `Account #${income.account_id}`,
      type: account?.account_type || null,
      id: income.account_id,
    },
    accountId: income.account_id,
    accountType: account?.account_type || null,

    // Business details
    supplier: income.payer || '',
    department: income.department || '',
    project: income.project || '',
    location: '', // Income doesn't have location in backend
    reference: income.reference_no || '',

    // Additional fields
    statementId: income.statement_id || null,
    createdAt: income.created || null,
  };
};

/**
 * Map backend expense record to frontend transaction format
 * @param {object} expense - Expense record from backend
 * @param {object} accountsMap - Optional map of account_id to account object
 * @returns {object} Normalized transaction object
 */
export const mapExpenseToTransaction = (expense, accountsMap = {}) => {
  const account = accountsMap[expense.account_id];

  return {
    id: `expense-${expense.expense_id}`, // Prefix to avoid ID conflicts with income
    rawId: expense.expense_id,
    date: expense.date_spent,
    description: expense.description || 'Untitled Expense',
    amount: -Math.abs(expense.amount), // Ensure negative for expenses
    category: expense.category || 'Other',
    type: 'expense',

    // Account info
    account: {
      name: account?.account_name || `Account #${expense.account_id}`,
      type: account?.account_type || null,
      id: expense.account_id,
    },
    accountId: expense.account_id,
    accountType: account?.account_type || null,

    // Business details
    supplier: expense.seller || '',
    department: '', // Expense doesn't have department in backend
    project: '', // Expense doesn't have project in backend
    location: expense.location || '',
    reference: expense.reference_no || '',

    // Expense-specific fields
    expenseType: expense.expense_type || null, // 'need' or 'want'
    taxAmount: expense.tax_amount || 0,
    taxDeductible: expense.tax_deductible || false,
    isReimbursable: expense.is_reimbursable || false,
    cardId: expense.card_id || null,

    // Additional fields
    statementId: expense.statement_id || null,
    createdAt: expense.created || null,
  };
};

/**
 * Map backend transfer record to frontend transaction format
 * @param {object} transfer - Transfer record from backend
 * @param {object} accountsMap - Optional map of account_id to account object
 * @returns {object} Normalized transaction object
 */
export const mapTransferToTransaction = (transfer, accountsMap = {}) => {
  const account = accountsMap[transfer.account_id];

  return {
    id: `transfer-${transfer.transfer_id}`, // Prefix to avoid ID conflicts
    rawId: transfer.transfer_id,
    date: transfer.date_transferred,
    description: transfer.description || 'Untitled Transfer',
    amount: Math.abs(transfer.amount), // Positive amount for display
    category: transfer.category || 'Transfer',
    type: 'transfer',

    // Account info
    account: {
      name: account?.account_name || `Account #${transfer.account_id}`,
      type: account?.account_type || null,
      id: transfer.account_id,
    },
    accountId: transfer.account_id,
    accountType: account?.account_type || null,

    // Transfer-specific fields
    transferType: transfer.transfer_type || 'intra_person', // 'intra_person' or 'inter_person'
    recipientAccountName: transfer.recipient_account_name || '',
    recipientAccountNo: transfer.recipient_account_no || '',
    reference: transfer.reference_no || '',

    // Additional fields
    statementId: transfer.statement_id || null,
    createdAt: transfer.created || null,
  };
};

/**
 * Merge and normalize income, expense, and transfer records into unified transaction list
 * @param {Array} incomes - Array of income records from backend
 * @param {Array} expenses - Array of expense records from backend
 * @param {Array} transfers - Array of transfer records from backend
 * @param {object} accountsMap - Optional map of account IDs to account objects
 * @returns {Array} Unified and sorted transaction list
 */
export const mergeTransactions = (incomes = [], expenses = [], transfers = [], accountsMap = {}) => {
  // Map incomes to transaction format
  const incomeTransactions = incomes.map(income =>
    mapIncomeToTransaction(income, accountsMap)
  );

  // Map expenses to transaction format
  const expenseTransactions = expenses.map(expense =>
    mapExpenseToTransaction(expense, accountsMap)
  );

  // Map transfers to transaction format
  const transferTransactions = (transfers || []).map(transfer =>
    mapTransferToTransaction(transfer, accountsMap)
  );

  // Combine all arrays
  const allTransactions = [...incomeTransactions, ...expenseTransactions, ...transferTransactions];

  // Sort by date (newest first)
  allTransactions.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA; // Descending order
  });

  return allTransactions;
};

/**
 * Convert accounts array to a map for quick lookup
 * @param {Array} accounts - Array of account objects from backend
 * @returns {object} Map of account_id to account object
 */
export const createAccountsMap = (accounts = []) => {
  return accounts.reduce((map, account) => {
    map[account.account_id] = account;
    return map;
  }, {});
};

/**
 * Map frontend transaction data to backend income format for create/update
 * @param {object} transaction - Frontend transaction object
 * @param {number} accountId - Account ID to associate with income
 * @returns {object} Backend income payload
 */
export const mapTransactionToIncome = (transaction, accountId) => {
  return {
    account_id: accountId || transaction.accountId,
    amount: Math.abs(parseFloat(transaction.amount)),
    description: transaction.description,
    category: transaction.category,
    date_received: transaction.date,
    payer: transaction.supplier || 'Unknown', // payer is required, provide default
    department: transaction.department || null,
    project: transaction.project || null,
    reference_no: transaction.reference || null,
  };
};

/**
 * Map frontend transaction data to backend expense format for create/update
 * @param {object} transaction - Frontend transaction object
 * @param {number} accountId - Account ID to associate with expense
 * @returns {object} Backend expense payload
 */
export const mapTransactionToExpense = (transaction, accountId) => {
  return {
    account_id: accountId || transaction.accountId,
    amount: Math.abs(parseFloat(transaction.amount)),
    description: transaction.description,
    category: transaction.category,
    date_spent: transaction.date,
    seller: transaction.supplier || 'Unknown', // seller is required, provide default
    location: transaction.location || null,
    reference_no: transaction.reference || null,
    expense_type: transaction.expenseType || 'needs', // Fixed: 'needs' not 'need'
    tax_amount: transaction.taxAmount || 0,
    tax_deductible: transaction.taxDeductible || false,
    is_reimbursable: transaction.isReimbursable || false,
    card_id: transaction.cardId || null,
  };
};

/**
 * Map frontend transaction data to backend transfer format for create/update
 * @param {object} transaction - Frontend transaction object
 * @param {number} accountId - Account ID to associate with transfer
 * @returns {object} Backend transfer payload
 */
export const mapTransactionToTransfer = (transaction, accountId) => {
  return {
    account_id: accountId || transaction.accountId,
    amount: Math.abs(parseFloat(transaction.amount)),
    description: transaction.description,
    category: transaction.category || 'Transfer',
    transfer_type: transaction.transferType || 'intra_person',
    date_transferred: transaction.date,
    recipient_account_name: transaction.recipientAccountName || null,
    recipient_account_no: transaction.recipientAccountNo || null,
    reference_no: transaction.reference || null,
  };
};

/**
 * Extract transaction type from prefixed ID
 * @param {string|number} id - Transaction ID (e.g., 'income-123', 'expense-456', 'transfer-789')
 * @returns {object} {type: 'income'|'expense'|'transfer', rawId: number}
 */
export const parseTransactionId = (id) => {
  // Convert to string if it's a number
  const idStr = String(id);
  
  // Check if it has the expected format (type-number)
  if (idStr.includes('-')) {
    const parts = idStr.split('-');
    const type = parts[0];
    const rawIdStr = parts.slice(1).join('-'); // Join remaining parts in case of multiple dashes
    
    // Validate type
    if (['income', 'expense', 'transfer'].includes(type)) {
      const rawId = parseInt(rawIdStr, 10);
      if (!isNaN(rawId)) {
        return {
          type: type,
          rawId: rawId,
        };
      }
    }
  }

  // If it's a plain number, try to infer from context (not recommended, but handle gracefully)
  const numericId = parseInt(idStr, 10);
  if (!isNaN(numericId)) {
    console.warn(`parseTransactionId: Received numeric ID without prefix: ${id}. This may cause issues.`);
    return {
      type: 'unknown',
      rawId: numericId,
    };
  }

  // Invalid format
  throw new Error(`Invalid transaction ID format: ${id}. Expected format: 'type-number' (e.g., 'transfer-123')`);
};

// ===========================
// Account Helpers
// ===========================

/**
 * Format account display name
 * @param {object} account - Account object from backend
 * @returns {string} Formatted account name
 */
export const formatAccountName = (account) => {
  if (!account) return 'Unknown Account';
  return account.account_name || `Account #${account.account_id}`;
};

/**
 * Get account type label
 * @param {string} accountType - Account type from backend
 * @returns {string} Human-readable account type
 */
export const getAccountTypeLabel = (accountType) => {
  const typeMap = {
    'savings': 'Savings Account',
    'current': 'Current Account',
    'credit': 'Credit Card',
    'debit': 'Debit Card',
    'wallet': 'E-Wallet',
    'cash': 'Cash',
  };

  return typeMap[accountType?.toLowerCase()] || accountType || 'Other';
};
