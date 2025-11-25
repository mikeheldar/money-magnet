import axios from 'axios'

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://money-magnet-api.vercel.app/api'  // Update this to your actual API URL
    : 'http://localhost:3001/api')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default {
  // Auth
  async login(username, password) {
    return api.post('/auth/login', { username, password })
  },

  async logout() {
    return api.post('/auth/logout')
  },

  // Transactions
  async getTransactions(params = {}) {
    return api.get('/transactions', { params })
  },

  async getTransactionsByAccount(accountId) {
    return api.get('/transactions', { params: { account_id: accountId } })
  },

  async getTransactionSummary(period = 'monthly') {
    return api.get('/transactions/summary', { params: { period } })
  },

  async createTransaction(transaction) {
    return api.post('/transactions', transaction)
  },

  async deleteTransaction(id) {
    return api.delete(`/transactions/${id}`)
  },

  // Forecast
  async getForecast(targetDate) {
    return api.get('/forecast', { params: { targetDate } })
  },

  // Accounts
  async getAccounts() {
    return api.get('/accounts')
  },

  async getAccount(id) {
    return api.get(`/accounts/${id}`)
  },

  async createAccount(account) {
    return api.post('/accounts', account)
  },

  async updateAccount(id, account) {
    return api.put(`/accounts/${id}`, account)
  },

  // Transaction Categories
  async getCategories() {
    return api.get('/categories')
  },

  async createCategory(category) {
    return api.post('/categories', category)
  },

  // Account Type Categories
  async getAccountTypeCategories() {
    return api.get('/account-type-categories')
  },

  async createAccountTypeCategory(category) {
    return api.post('/account-type-categories', category)
  },

  async updateAccountTypeCategory(id, category) {
    return api.put(`/account-type-categories/${id}`, category)
  },

  async deleteAccountTypeCategory(id) {
    return api.delete(`/account-type-categories/${id}`)
  },

  // Account Types
  async getAccountTypes() {
    return api.get('/account-types')
  },

  async createAccountType(accountType) {
    return api.post('/account-types', accountType)
  },

  async updateAccountType(id, accountType) {
    return api.put(`/account-types/${id}`, accountType)
  },

  async deleteAccountType(id) {
    return api.delete(`/account-types/${id}`)
  },

  // Account Balances by Type
  async getBalancesByType(groupBy = 'type') {
    return api.get('/accounts/balances-by-type', { params: { groupBy } })
  },

  async deleteAccount(id) {
    return api.delete(`/accounts/${id}`)
  }
}

