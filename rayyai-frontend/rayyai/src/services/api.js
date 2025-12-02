// ===========================
// API Configuration
// ===========================

// Detect environment and set API base URL accordingly
const isDevelopment = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('192.168');

// API URLs for different environments
const API_URLS = {
  local: 'http://localhost:8000',
  production: 'https://rayyai-api-service-838873798405.us-central1.run.app'
};

// Auto-select API URL based on environment
export const API_BASE_URL = isDevelopment ? API_URLS.local : API_URLS.production;

// Log current API configuration for debugging
console.log(`🌐 API Mode: ${isDevelopment ? 'Local Development' : 'Production'}`);
console.log(`📡 API Base URL: ${API_BASE_URL}`);

// ===========================
// Token Management
// ===========================

/**
 * Get the authentication token from localStorage
 * @returns {string|null} The JWT token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Set the authentication token in localStorage
 * @param {string} token - The JWT token to store
 */
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

/**
 * Remove the authentication token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem('token');
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if token exists
 */
export const isAuthenticated = () => {
  return !!getToken();
};

// ===========================
// HTTP Client Setup
// ===========================

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Make an HTTP request with automatic token injection and error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise} Response data
 */
const request = async (endpoint, options = {}) => {
  // Construct full URL
  const url = `${API_BASE_URL}${endpoint}`;

  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authentication token if available
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Merge options
  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Check if request was successful
    if (!response.ok) {
      // Try to parse error response
      const contentType = response.headers.get('content-type');
      let errorData;

      try {
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = await response.text();
        }
      } catch {
        errorData = 'An error occurred';
      }

      throw new ApiError(
        errorData.detail || errorData.message || errorData || 'An error occurred',
        response.status,
        errorData
      );
    }

    // Handle successful response
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    // Check if response has content
    if (contentLength === '0' || response.status === 204) {
      return null; // No content to parse
    }

    let data;

    if (contentType && contentType.includes('application/json')) {
      // Try to parse JSON, but handle empty responses
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } else {
      data = await response.text();
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      throw new ApiError(
        'Invalid response from server',
        0,
        null
      );
    }

    throw new ApiError(
      error.message || 'Network error occurred',
      0,
      null
    );
  }
};

/**
 * HTTP method helpers
 */
const api = {
  get: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, data, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: (endpoint, data, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'DELETE' }),

  patch: (endpoint, data, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ===========================
// Authentication API
// ===========================

export const authApi = {
  /**
   * Login user
   * @param {object} credentials - Email and password
   * @returns {Promise<object>} User data and token
   */
  login: async (credentials) => {
    // Backend expects JSON with email and password
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email || credentials.username, // Support both email and username for backwards compatibility
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.detail || 'Login failed', response.status, error);
    }

    const data = await response.json();

    // Store the token
    if (data.access_token) {
      setToken(data.access_token);
    }

    return data;
  },

  /**
   * Register new user
   * @param {object} userData - User registration data
   * @returns {Promise<object>} Created user data
   */
  register: (userData) => api.post('/users/', userData),

  /**
   * Logout user (clears token)
   */
  logout: () => {
    removeToken();
  },

  /**
   * Get current user profile
   * @returns {Promise<object>} User profile data
   */
  getCurrentUser: () => api.get('/users/me'),
};

// ===========================
// Transaction API - Income
// ===========================

export const incomeApi = {
  /**
   * Get all income records with optional filters
   * @param {object} params - Query parameters (skip, limit, category, start_date, end_date)
   * @returns {Promise<Array>} List of income records
   */
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.skip !== undefined) queryParams.append('skip', params.skip);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.category) queryParams.append('category', params.category);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    const queryString = queryParams.toString();
    return api.get(`/transactions/income${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get a specific income record by ID
   * @param {number} incomeId - Income record ID
   * @returns {Promise<object>} Income record data
   */
  getById: (incomeId) => api.get(`/transactions/income/${incomeId}`),

  /**
   * Create a new income record
   * @param {object} incomeData - Income data to create
   * @returns {Promise<object>} Created income record
   */
  create: (incomeData) => api.post('/transactions/income', incomeData),

  /**
   * Update an existing income record
   * @param {number} incomeId - Income record ID
   * @param {object} incomeData - Updated income data
   * @returns {Promise<object>} Updated income record
   */
  update: (incomeId, incomeData) => api.put(`/transactions/income/${incomeId}`, incomeData),

  /**
   * Delete an income record
   * @param {number} incomeId - Income record ID
   * @returns {Promise<void>}
   */
  delete: (incomeId) => api.delete(`/transactions/income/${incomeId}`),
};

// ===========================
// Transaction API - Expenses
// ===========================

export const expenseApi = {
  /**
   * Get all expense records with optional filters
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} List of expense records
   */
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.skip !== undefined) queryParams.append('skip', params.skip);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.category) queryParams.append('category', params.category);
    if (params.expense_type) queryParams.append('expense_type', params.expense_type);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.min_amount !== undefined) queryParams.append('min_amount', params.min_amount);
    if (params.max_amount !== undefined) queryParams.append('max_amount', params.max_amount);

    const queryString = queryParams.toString();
    return api.get(`/transactions/expense${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get a specific expense record by ID
   * @param {number} expenseId - Expense record ID
   * @returns {Promise<object>} Expense record data
   */
  getById: (expenseId) => api.get(`/transactions/expense/${expenseId}`),

  /**
   * Create a new expense record
   * @param {object} expenseData - Expense data to create
   * @returns {Promise<object>} Created expense record
   */
  create: (expenseData) => api.post('/transactions/expense', expenseData),

  /**
   * Update an existing expense record
   * @param {number} expenseId - Expense record ID
   * @param {object} expenseData - Updated expense data
   * @returns {Promise<object>} Updated expense record
   */
  update: (expenseId, expenseData) => api.put(`/transactions/expense/${expenseId}`, expenseData),

  /**
   * Delete an expense record
   * @param {number} expenseId - Expense record ID
   * @returns {Promise<void>}
   */
  delete: (expenseId) => api.delete(`/transactions/expense/${expenseId}`),
};

// ===========================
// Transaction API - Transfers
// ===========================

export const transferApi = {
  /**
   * Get all transfer records with optional filters
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} List of transfer records
   */
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.skip !== undefined) queryParams.append('skip', params.skip);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.transfer_type) queryParams.append('transfer_type', params.transfer_type);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    const queryString = queryParams.toString();
    return api.get(`/transactions/transfer${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get a specific transfer record by ID
   * @param {number} transferId - Transfer record ID
   * @returns {Promise<object>} Transfer record data
   */
  getById: (transferId) => api.get(`/transactions/transfer/${transferId}`),

  /**
   * Create a new transfer record
   * @param {object} transferData - Transfer data to create
   * @returns {Promise<object>} Created transfer record
   */
  create: (transferData) => api.post('/transactions/transfer', transferData),

  /**
   * Update an existing transfer record
   * @param {number} transferId - Transfer record ID
   * @param {object} transferData - Updated transfer data
   * @returns {Promise<object>} Updated transfer record
   */
  update: (transferId, transferData) => api.put(`/transactions/transfer/${transferId}`, transferData),

  /**
   * Delete a transfer record
   * @param {number} transferId - Transfer record ID
   * @returns {Promise<void>}
   */
  delete: (transferId) => api.delete(`/transactions/transfer/${transferId}`),
};

// ===========================
// Unified Transaction API
// ===========================

import {
  mergeTransactions,
  createAccountsMap,
  parseTransactionId,
  mapTransactionToIncome,
  mapTransactionToExpense,
  mapTransactionToTransfer
} from '../utils/transactionMapper';

export const transactionApi = {
  /**
   * Get all transactions (income + expenses) in a unified format
   * @param {object} params - Filter parameters
   * @param {boolean} includeAccounts - Whether to fetch and include account details
   * @returns {Promise<Array>} Unified list of transactions
   */
  getAll: async (params = {}, includeAccounts = true) => {
    try {
      // Fetch income, expenses, transfers, and optionally accounts in parallel
      // Handle transfers gracefully in case the table doesn't exist yet
      const promises = [
        incomeApi.getAll(params),
        expenseApi.getAll(params),
        transferApi.getAll(params).catch(err => {
          console.warn('Failed to fetch transfers (table may not exist yet):', err);
          return []; // Return empty array if transfers fail
        }),
      ];

      if (includeAccounts) {
        promises.push(accountApi.getAll());
      }

      const results = await Promise.all(promises);
      const [incomes, expenses, transfers, accounts] = includeAccounts 
        ? results 
        : [...results, null];

      // Create accounts map for quick lookup
      const accountsMap = includeAccounts && accounts
        ? createAccountsMap(accounts)
        : {};

      // Merge and normalize transactions
      return mergeTransactions(incomes, expenses, transfers || [], accountsMap);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  /**
   * Create a new transaction (income, expense, or transfer)
   * @param {object} transactionData - Transaction data
   * @param {number} accountId - Account ID
   * @returns {Promise<object>} Created transaction
   */
  create: async (transactionData, accountId) => {
    const { type } = transactionData;

    if (type === 'income') {
      const incomePayload = mapTransactionToIncome(transactionData, accountId);
      return await incomeApi.create(incomePayload);
    } else if (type === 'expense') {
      const expensePayload = mapTransactionToExpense(transactionData, accountId);
      return await expenseApi.create(expensePayload);
    } else if (type === 'transfer') {
      const transferPayload = mapTransactionToTransfer(transactionData, accountId);
      return await transferApi.create(transferPayload);
    } else {
      throw new Error(`Invalid transaction type: ${type}`);
    }
  },

  /**
   * Update an existing transaction
   * @param {string} transactionId - Prefixed transaction ID (e.g., 'income-123', 'transfer-456')
   * @param {object} transactionData - Updated transaction data
   * @param {number} accountId - Account ID
   * @returns {Promise<object>} Updated transaction
   */
  update: async (transactionId, transactionData, accountId) => {
    const { type, rawId } = parseTransactionId(transactionId);

    if (type === 'income') {
      const incomePayload = mapTransactionToIncome(transactionData, accountId);
      return await incomeApi.update(rawId, incomePayload);
    } else if (type === 'expense') {
      const expensePayload = mapTransactionToExpense(transactionData, accountId);
      return await expenseApi.update(rawId, expensePayload);
    } else if (type === 'transfer') {
      const transferPayload = mapTransactionToTransfer(transactionData, accountId);
      return await transferApi.update(rawId, transferPayload);
    } else {
      throw new Error(`Invalid transaction ID format: ${transactionId}`);
    }
  },

  /**
   * Delete a transaction
   * @param {string} transactionId - Prefixed transaction ID (e.g., 'expense-456', 'transfer-789')
   * @returns {Promise<void>}
   */
  delete: async (transactionId) => {
    try {
      const { type, rawId } = parseTransactionId(transactionId);

      if (type === 'income') {
        return await incomeApi.delete(rawId);
      } else if (type === 'expense') {
        return await expenseApi.delete(rawId);
      } else if (type === 'transfer') {
        return await transferApi.delete(rawId);
      } else {
        throw new Error(`Invalid transaction type: ${type}. Transaction ID: ${transactionId}`);
      }
    } catch (error) {
      // Re-throw with more context
      if (error.message.includes('Invalid transaction ID format')) {
        throw error;
      }
      throw new Error(`Failed to delete transaction ${transactionId}: ${error.message}`);
    }
  },

  /**
   * Delete multiple transactions in bulk
   * @param {string[]} transactionIds - Array of prefixed transaction IDs
   * @returns {Promise<object>} Deletion result
   */
  bulkDelete: async (transactionIds) => {
    const token = getToken();
    if (!token) {
      throw new ApiError('No authentication token found', 401, null);
    }

    const url = `${API_BASE_URL}/transactions/bulk-delete`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transaction_ids: transactionIds }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Bulk delete failed' }));
      throw new ApiError(error.detail || 'Bulk delete failed', response.status, error);
    }

    return await response.json();
  },

  /**
   * Delete all transactions for the current user
   * @returns {Promise<object>} Deletion result
   */
  deleteAll: async () => {
    const token = getToken();
    if (!token) {
      throw new ApiError('No authentication token found', 401, null);
    }

    const url = `${API_BASE_URL}/transactions/delete-all`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Delete all failed' }));
      throw new ApiError(error.detail || 'Delete all failed', response.status, error);
    }

    return await response.json();
  },
};

// ===========================
// Account API
// ===========================

export const accountApi = {
  /**
   * Get all accounts for the current user
   * @returns {Promise<Array>} List of accounts
   */
  getAll: () => api.get('/accounts/'),

  /**
   * Get a specific account by ID
   * @param {number} accountId - Account ID
   * @returns {Promise<object>} Account data
   */
  getById: (accountId) => api.get(`/accounts/${accountId}`),

  /**
   * Create a new account
   * @param {object} accountData - Account data
   * @returns {Promise<object>} Created account
   */
  create: (accountData) => api.post('/accounts/', accountData),

  /**
   * Update an account
   * @param {number} accountId - Account ID
   * @param {object} accountData - Updated account data
   * @returns {Promise<object>} Updated account
   */
  update: (accountId, accountData) => api.put(`/accounts/${accountId}`, accountData),

  /**
   * Delete an account
   * @param {number} accountId - Account ID
   * @returns {Promise<void>}
   */
  delete: (accountId) => api.delete(`/accounts/${accountId}`),
};

// ===========================
// Budget API
// ===========================

export const budgetApi = {
  /**
   * Get all budgets
   * @returns {Promise<object>} Budget list with budgets array
   */
  getAll: async () => {
    const response = await api.get('/budgets');
    // Backend returns { budgets: [...], total: ..., skip: ..., limit: ... }
    return response.budgets || [];
  },

  /**
   * Get budget details with real spending calculations
   * @param {number} budgetId - Budget ID
   * @returns {Promise<object>} Budget details with spending data
   */
  getDetails: (budgetId) => api.get(`/budgets/${budgetId}/details`),

  /**
   * Get a specific budget by ID
   * @param {number} budgetId - Budget ID
   * @returns {Promise<object>} Budget data
   */
  getById: (budgetId) => api.get(`/budgets/${budgetId}`),

  /**
   * Create a new budget
   * @param {object} budgetData - Budget data
   * @returns {Promise<object>} Created budget
   */
  create: (budgetData) => api.post('/budgets/', budgetData),

  /**
   * Update a budget
   * @param {number} budgetId - Budget ID
   * @param {object} budgetData - Updated budget data
   * @returns {Promise<object>} Updated budget
   */
  update: (budgetId, budgetData) => api.put(`/budgets/${budgetId}`, budgetData),

  /**
   * Delete a budget
   * @param {number} budgetId - Budget ID
   * @returns {Promise<void>}
   */
  delete: (budgetId) => api.delete(`/budgets/${budgetId}`),
};

// ===========================
// Goals API
// ===========================

export const goalsApi = {
  /**
   * Get all goals
   * @returns {Promise<Array>} List of goals
   */
  getAll: () => api.get('/goals/'),

  /**
   * Get a specific goal by ID
   * @param {number} goalId - Goal ID
   * @returns {Promise<object>} Goal data
   */
  getById: (goalId) => api.get(`/goals/${goalId}`),

  /**
   * Create a new goal
   * @param {object} goalData - Goal data
   * @returns {Promise<object>} Created goal
   */
  create: (goalData) => api.post('/goals/', goalData),

  /**
   * Update a goal
   * @param {number} goalId - Goal ID
   * @param {object} goalData - Updated goal data
   * @returns {Promise<object>} Updated goal
   */
  update: (goalId, goalData) => api.put(`/goals/${goalId}`, goalData),

  /**
   * Delete a goal
   * @param {number} goalId - Goal ID
   * @returns {Promise<void>}
   */
  delete: (goalId) => api.delete(`/goals/${goalId}`),
};

// ===========================
// Cards API
// ===========================

export const cardsApi = {
  /**
   * Get all credit cards
   * @returns {Promise<Array>} List of cards
   */
  getAll: () => api.get('/cards/'),

  /**
   * Get aggregated credit card overview metrics
   * @returns {Promise<object>} Overview data
   */
  getOverview: () => api.get('/cards/overview'),

  /**
   * Get a specific card by ID
   * @param {number} cardId - Card ID
   * @returns {Promise<object>} Card data
   */
  getById: (cardId) => api.get(`/cards/${cardId}`),

  /**
   * Create a new card
   * @param {object} cardData - Card data
   * @returns {Promise<object>} Created card
   */
  create: (cardData) => api.post('/cards/', cardData),

  /**
   * Update a card
   * @param {number} cardId - Card ID
   * @param {object} cardData - Updated card data
   * @returns {Promise<object>} Updated card
   */
  update: (cardId, cardData) => api.put(`/cards/${cardId}`, cardData),

  /**
   * Delete a card
   * @param {number} cardId - Card ID
   * @returns {Promise<void>}
   */
  delete: (cardId) => api.delete(`/cards/${cardId}`),

  /**
   * Get terms history for a specific card
   * @param {number} cardId - Card ID
   * @returns {Promise<Array>} List of history records
   */
  getHistory: (cardId) => api.get(`/cards/${cardId}/history`),

  /**
   * Get AI-powered credit card recommendations
   * @param {number} maxResults - Maximum number of recommendations (default: 5, max: 10)
   * @returns {Promise<object>} Recommendations with match scores and reasoning
   */
  getRecommendations: (maxResults = 5) => {
    const queryParams = new URLSearchParams();
    if (maxResults !== 5) queryParams.append('max_results', maxResults);
    const queryString = queryParams.toString();
    return api.get(`/cards/recommendations/ai${queryString ? `?${queryString}` : ''}`);
  },
};

// ===========================
// RayyAI API
// ===========================

export const rayyaiApi = {
  /**
   * Get AI insights and analysis
   * @param {object} params - Query parameters
   * @returns {Promise<object>} AI analysis data
   */
  getInsights: (params = {}) => {
    const queryParams = new URLSearchParams(params);
    const queryString = queryParams.toString();
    return api.get(`/rayyai/${queryString ? `?${queryString}` : ''}`);
  },
};

// ===========================
// Chat API
// ===========================

export const chatApi = {
  /**
   * Create a new conversation
   * @param {object} conversationData - Conversation data (optional title)
   * @returns {Promise<object>} Created conversation
   */
  createConversation: (conversationData = {}) => {
    return api.post('/chat/conversations', conversationData);
  },

  /**
   * Get list of conversations
   * @param {object} params - Query parameters (skip, limit)
   * @returns {Promise<object>} List of conversations
   */
  getConversations: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.skip !== undefined) queryParams.append('skip', params.skip);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    const queryString = queryParams.toString();
    return api.get(`/chat/conversations${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get a specific conversation
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<object>} Conversation details
   */
  getConversation: (conversationId) => {
    return api.get(`/chat/conversations/${conversationId}`);
  },

  /**
   * Delete a conversation
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<void>}
   */
  deleteConversation: (conversationId) => {
    return api.delete(`/chat/conversations/${conversationId}`);
  },

  /**
   * Get messages for a conversation
   * @param {number} conversationId - Conversation ID
   * @param {number} limit - Optional message limit
   * @returns {Promise<Array>} List of messages
   */
  getMessages: (conversationId, limit = null) => {
    const queryParams = new URLSearchParams();
    if (limit !== null) queryParams.append('limit', limit);
    const queryString = queryParams.toString();
    return api.get(`/chat/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Send a message (creates conversation if needed)
   * @param {string} message - Message content
   * @param {File[]} files - Optional array of files to upload
   * @returns {Promise<object>} Response with message, assistant response, and conversation
   */
  sendMessage: async (message, files = []) => {
    // Always use FormData for consistency (backend expects FormData)
    const formData = new FormData();
    formData.append('message', message);
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('files', file);
      });
    }

    const token = getToken();
    const url = `${API_BASE_URL}/chat/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = await response.text();
          }
        } catch {
          errorData = 'An error occurred';
        }

        throw new ApiError(
          errorData.detail || errorData.message || errorData || 'An error occurred',
          response.status,
          errorData
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }
      return await response.text();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message || 'Network error occurred', 0, null);
    }
  },

  /**
   * Send a message to a specific conversation
   * @param {number} conversationId - Conversation ID
   * @param {string} message - Message content
   * @param {File[]} files - Optional array of files to upload
   * @returns {Promise<object>} Response with message, assistant response, and conversation
   */
  sendMessageToConversation: async (conversationId, message, files = [], options = {}) => {
    // Always use FormData for consistency (backend expects FormData)
    const formData = new FormData();
    formData.append('message', message);
    if (files && files.length > 0) {
      console.log(`Appending ${files.length} file(s) to FormData`);
      files.forEach((file, index) => {
        console.log(`  - File ${index}: ${file.name}, type: ${file.type}, size: ${file.size}`);
        formData.append('files', file);
      });
    } else {
      console.log('No files to append to FormData');
    }

    const token = getToken();
    const url = `${API_BASE_URL}/chat/conversations/${conversationId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
        ...options,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = await response.text();
          }
        } catch {
          errorData = 'An error occurred';
        }

        throw new ApiError(
          errorData.detail || errorData.message || errorData || 'An error occurred',
          response.status,
          errorData
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }
      return await response.text();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message || 'Network error occurred', 0, null);
    }
  },

  /**
   * Update an existing message's content
   * @param {number} messageId - Message ID
   * @param {string} content - Updated content
   * @returns {Promise<object>}
   */
  updateMessage: (messageId, content) => {
    const query = encodeURIComponent(content);
    return api.patch(`/chat/messages/${messageId}?content=${query}`);
  },

  /**
   * Delete a chat message
   * @param {number} messageId - Message ID
   * @returns {Promise<object>}
   */
  deleteMessage: (messageId) => {
    return api.delete(`/chat/messages/${messageId}`);
  },

  /**
   * Refresh user's financial context cache
   * @returns {Promise<object>} Refresh result
   */
  refreshContext: () => {
    return api.post('/chat/context/refresh');
  },

  /**
   * Trigger context summarization
   * @returns {Promise<object>} Summarization result
   */
  summarizeContext: () => {
    return api.post('/chat/context/summarize');
  },

  /**
   * Update conversation title (rename)
   * @param {number} conversationId - Conversation ID
   * @param {string} title - New title
   * @returns {Promise<object>} Updated conversation
   */
  updateConversation: (conversationId, title) => {
    return api.patch(`/chat/conversations/${conversationId}?title=${encodeURIComponent(title)}`);
  },
};

// ===========================
// Scanner API
// ===========================

export const scannerApi = {
  /**
   * Scan a receipt image and extract transaction details using AI
   * @param {File} imageFile - The receipt image file
   * @returns {Promise<object>} Extracted transaction data
   */
  scanReceipt: async (imageFile) => {
    const formData = new FormData();
    formData.append('file', imageFile);

    const token = getToken();

    if (!token) {
      throw new ApiError('No authentication token found. Please log in again.', 401, null);
    }

    const url = `${API_BASE_URL}/scanner/scan-receipt`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          data.detail || `HTTP error! status: ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message, 0, null);
    }
  },
};

// Export default API object with all endpoints
export default {
  auth: authApi,
  income: incomeApi,
  expense: expenseApi,
  transfer: transferApi,
  transactions: transactionApi, // Unified transaction API
  accounts: accountApi,
  budgets: budgetApi,
  goals: goalsApi,
  cards: cardsApi,
  rayyai: rayyaiApi,
  scanner: scannerApi,
  chat: chatApi,
};
