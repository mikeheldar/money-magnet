// Firebase/Firestore API service
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { db, auth } from '../config/firebase'

// Helper to convert Firestore timestamp to date string
const toDateString = (timestamp) => {
  if (!timestamp) return null
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString().split('T')[0]
  }
  return timestamp
}

// Helper to convert date string to Firestore timestamp
const toTimestamp = (dateString) => {
  if (!dateString) return null
  return Timestamp.fromDate(new Date(dateString))
}

// Helper to extract and log Firestore index creation links from errors
const handleFirestoreError = (error, context = '') => {
  const errorMessage = error.message || String(error)
  
  // Check if error contains Firestore index link
  const indexLinkMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s`]+/)
  if (indexLinkMatch) {
    const indexLink = indexLinkMatch[0]
    console.error(`%c🔗 Firestore Index Required for ${context}`, 'color: #ff6b6b; font-weight: bold; font-size: 14px;')
    console.error(`%cClick this link to create the index:`, 'color: #4ecdc4; font-weight: bold;')
    console.log(`%c${indexLink}`, 'color: #1e90ff; text-decoration: underline; font-size: 12px;')
    console.log('')
    
    // Also log as a clickable link
    console.group(`%c🔗 Firestore Index Link (${context})`, 'color: #ff6b6b; font-weight: bold;')
    console.log(`%cClick to create index:`, 'color: #4ecdc4;')
    console.log(`%c${indexLink}`, 'color: #1e90ff; text-decoration: underline; cursor: pointer;')
    console.groupEnd()
  }
  
  return errorMessage
}

export default {
  // Authentication
  async login(email, password) {
    try {
      // Check if auth is available
      if (!auth) {
        throw new Error('Firebase Auth is not initialized. Please enable Authentication in Firebase Console.')
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return {
        success: true,
        token: await userCredential.user.getIdToken(),
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email
        }
      }
    } catch (error) {
      // Provide more helpful error messages
      let errorMessage = error.message
      
      if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Authentication is not enabled. Please enable Email/Password authentication in Firebase Console.'
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.'
      }
      
      throw new Error(errorMessage)
    }
  },

  async logout() {
    try {
      await signOut(auth)
      return { success: true }
    } catch (error) {
      throw new Error(error.message)
    }
  },

  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback)
  },

  // Transactions
  async getTransactions(filters = {}) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      let q = query(collection(db, 'transactions'), where('user_id', '==', userId))

      // Firestore date filtering - store dates as strings for easier querying
      if (filters.period === 'weekly') {
        const today = new Date()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weekEndStr = weekEnd.toISOString().split('T')[0]
        q = query(q, where('date', '>=', weekStartStr), where('date', '<=', weekEndStr))
      } else if (filters.period === 'monthly') {
        const today = new Date()
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        const monthStartStr = monthStart.toISOString().split('T')[0]
        const monthEndStr = monthEnd.toISOString().split('T')[0]
        q = query(q, where('date', '>=', monthStartStr), where('date', '<=', monthEndStr))
      } else if (filters.period === 'yearly') {
        const today = new Date()
        const yearStart = new Date(today.getFullYear(), 0, 1)
        const yearEnd = new Date(today.getFullYear(), 11, 31)
        const yearStartStr = yearStart.toISOString().split('T')[0]
        const yearEndStr = yearEnd.toISOString().split('T')[0]
        q = query(q, where('date', '>=', yearStartStr), where('date', '<=', yearEndStr))
      }

      if (filters.account_id) {
        q = query(q, where('account_id', '==', filters.account_id))
      }

      // Try to order by date, but fall back if index doesn't exist
      try {
        q = query(q, orderBy('date', 'desc'))
      } catch (e) {
        // If index doesn't exist, we'll sort in memory
        console.warn('Firestore index may be needed for date ordering')
      }

      let snapshot
      try {
        snapshot = await getDocs(q)
      } catch (e) {
        // If query fails due to missing index, try without orderBy
        if (e.message && e.message.includes('index')) {
          handleFirestoreError(e, 'getTransactions')
          // Retry without orderBy
          q = query(collection(db, 'transactions'), where('user_id', '==', userId))
          if (filters.account_id) {
            q = query(q, where('account_id', '==', filters.account_id))
          }
          snapshot = await getDocs(q)
        } else {
          throw e
        }
      }
      const transactions = []
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        // Get category and account names
        let categoryName = null
        let accountName = null
        
        if (data.category_id) {
          const categoryDoc = await getDoc(doc(db, 'categories', data.category_id))
          if (categoryDoc.exists()) {
            categoryName = categoryDoc.data().name
          }
        }
        
        if (data.account_id) {
          const accountDoc = await getDoc(doc(db, 'accounts', data.account_id))
          if (accountDoc.exists()) {
            accountName = accountDoc.data().name
          }
        }

        transactions.push({
          id: docSnap.id,
          ...data,
          date: toDateString(data.date),
          category_name: categoryName,
          account_name: accountName
        })
      }

      // Sort by date descending if orderBy didn't work
      transactions.sort((a, b) => {
        const aDate = a.date || ''
        const bDate = b.date || ''
        return bDate.localeCompare(aDate)
      })

      return transactions
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getTransactions')
      throw new Error(`Failed to fetch transactions: ${errorMsg}`)
    }
  },

  async getTransactionSummary(period = 'monthly') {
    try {
      const transactions = await this.getTransactions({ period })
      
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      
      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      
      return {
        income,
        expense,
        net: income - expense
      }
    } catch (error) {
      throw new Error(`Failed to fetch transaction summary: ${error.message}`)
    }
  },

  async createTransaction(transaction) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const transactionData = {
        ...transaction,
        user_id: userId,
        date: transaction.date || new Date().toISOString().split('T')[0],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'transactions'), transactionData)
      
      // Update account balance
      if (transaction.account_id) {
        await this.updateAccountBalance(transaction.account_id, transaction.amount, transaction.type)
      }

      return { id: docRef.id, ...transactionData }
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`)
    }
  },

  async updateTransaction(id, transaction) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const transactionRef = doc(db, 'transactions', id)
      const transactionDoc = await getDoc(transactionRef)
      
      if (!transactionDoc.exists()) throw new Error('Transaction not found')
      if (transactionDoc.data().user_id !== userId) throw new Error('Unauthorized')

      // Get old transaction data to revert account balance
      const oldData = transactionDoc.data()
      
      // Revert old account balance
      if (oldData.account_id) {
        const oldAmount = parseFloat(oldData.amount) || 0
        const oldType = oldData.type
        // Revert: if it was income, subtract; if expense, add back
        if (oldType === 'income') {
          await this.updateAccountBalance(oldData.account_id, oldAmount, 'expense')
        } else {
          await this.updateAccountBalance(oldData.account_id, oldAmount, 'income')
        }
      }

      // Update transaction
      const transactionData = {
        ...transaction,
        date: transaction.date || oldData.date,
        updated_at: serverTimestamp()
      }

      await updateDoc(transactionRef, transactionData)
      
      // Update new account balance
      if (transaction.account_id) {
        const newAmount = parseFloat(transaction.amount) || 0
        await this.updateAccountBalance(transaction.account_id, newAmount, transaction.type)
      }

      return { id, ...transactionData }
    } catch (error) {
      throw new Error(`Failed to update transaction: ${error.message}`)
    }
  },

  async deleteTransaction(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Get transaction before deleting to revert account balance
      const transactionDoc = await getDoc(doc(db, 'transactions', id))
      if (!transactionDoc.exists()) throw new Error('Transaction not found')
      
      const transactionData = transactionDoc.data()
      if (transactionData.user_id !== userId) throw new Error('Unauthorized')

      // Revert account balance
      if (transactionData.account_id) {
        const amount = transactionData.type === 'income' 
          ? -transactionData.amount 
          : transactionData.amount
        await this.updateAccountBalance(transactionData.account_id, amount, transactionData.type === 'income' ? 'expense' : 'income')
      }

      await deleteDoc(doc(db, 'transactions', id))
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete transaction: ${error.message}`)
    }
  },

  // Accounts
  async getAccounts() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      let q = query(
        collection(db, 'accounts'),
        where('user_id', '==', userId)
      )
      
      // Try to order by created_at, but fall back if index doesn't exist
      try {
        q = query(q, orderBy('created_at', 'desc'))
      } catch (e) {
        // Index might not exist yet, fetch without ordering
        console.warn('Index for accounts not found, fetching without orderBy')
      }
      
      let snapshot
      try {
        snapshot = await getDocs(q)
      } catch (e) {
        // If query fails due to missing index, try without orderBy
        if (e.message && e.message.includes('index')) {
          handleFirestoreError(e, 'getAccounts')
          // Retry without orderBy
          q = query(collection(db, 'accounts'), where('user_id', '==', userId))
          snapshot = await getDocs(q)
        } else {
          throw e
        }
      }
      const accounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Sort in memory if orderBy failed
      if (accounts.length > 0 && accounts[0].created_at) {
        accounts.sort((a, b) => {
          const aTime = a.created_at?.toMillis?.() || 0
          const bTime = b.created_at?.toMillis?.() || 0
          return bTime - aTime
        })
      }
      
      return accounts
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getAccounts')
      throw new Error(`Failed to fetch accounts: ${errorMsg}`)
    }
  },

  async createAccount(account) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const accountData = {
        ...account,
        user_id: userId,
        balance_current: parseFloat(account.balance_current || 0),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'accounts'), accountData)
      return { id: docRef.id, ...accountData }
    } catch (error) {
      throw new Error(`Failed to create account: ${error.message}`)
    }
  },

  async updateAccount(id, account) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const accountRef = doc(db, 'accounts', id)
      const accountDoc = await getDoc(accountRef)
      
      if (!accountDoc.exists()) throw new Error('Account not found')
      if (accountDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await updateDoc(accountRef, {
        ...account,
        balance_current: parseFloat(account.balance_current || 0),
        updated_at: serverTimestamp()
      })

      return { id, ...account }
    } catch (error) {
      throw new Error(`Failed to update account: ${error.message}`)
    }
  },

  async deleteAccount(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const accountRef = doc(db, 'accounts', id)
      const accountDoc = await getDoc(accountRef)
      
      if (!accountDoc.exists()) throw new Error('Account not found')
      if (accountDoc.data().user_id !== userId) throw new Error('Unauthorized')

      // Delete all associated transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('account_id', '==', id),
        where('user_id', '==', userId)
      )
      const transactionsSnapshot = await getDocs(transactionsQuery)
      
      const deletePromises = transactionsSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      await deleteDoc(accountRef)
      return { success: true, transactionsDeleted: transactionsSnapshot.size }
    } catch (error) {
      throw new Error(`Failed to delete account: ${error.message}`)
    }
  },

  async updateAccountBalance(accountId, amount, type) {
    try {
      const accountRef = doc(db, 'accounts', accountId)
      const accountDoc = await getDoc(accountRef)
      
      if (!accountDoc.exists()) return

      const currentBalance = accountDoc.data().balance_current || 0
      let newBalance = currentBalance

      if (type === 'income') {
        newBalance += parseFloat(amount)
      } else if (type === 'expense') {
        newBalance -= parseFloat(amount)
      }

      await updateDoc(accountRef, {
        balance_current: newBalance,
        updated_at: serverTimestamp()
      })
    } catch (error) {
      console.error('Failed to update account balance:', error)
    }
  },

  // Account Types
  async getAccountTypes() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      let q = query(
        collection(db, 'account_types'),
        where('user_id', '==', userId)
      )
      
      try {
        q = query(q, orderBy('name'))
      } catch (e) {
        console.warn('Index for account_types not found, will sort in memory')
      }
      
      let snapshot
      try {
        snapshot = await getDocs(q)
      } catch (e) {
        // If query fails due to missing index, try without orderBy
        if (e.message && e.message.includes('index')) {
          handleFirestoreError(e, 'getAccountTypes')
          // Retry without orderBy
          q = query(collection(db, 'account_types'), where('user_id', '==', userId))
          snapshot = await getDocs(q)
        } else {
          throw e
        }
      }
      const types = []
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        let categoryName = null
        
        if (data.category_id) {
          const categoryDoc = await getDoc(doc(db, 'account_type_categories', data.category_id))
          if (categoryDoc.exists()) {
            categoryName = categoryDoc.data().name
          }
        }

        types.push({
          id: docSnap.id,
          ...data,
          category_name: categoryName
        })
      }

      // Sort in memory if orderBy failed
      types.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

      return types
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getAccountTypes')
      throw new Error(`Failed to fetch account types: ${errorMsg}`)
    }
  },

  async getAccountTypeCategories() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      let q = query(
        collection(db, 'account_type_categories'),
        where('user_id', '==', userId)
      )
      
      try {
        q = query(q, orderBy('name'))
      } catch (e) {
        console.warn('Index for account_type_categories not found, will sort in memory')
      }
      
      let snapshot
      try {
        snapshot = await getDocs(q)
      } catch (e) {
        // If query fails due to missing index, try without orderBy
        if (e.message && e.message.includes('index')) {
          handleFirestoreError(e, 'getAccountTypeCategories')
          // Retry without orderBy
          q = query(collection(db, 'account_type_categories'), where('user_id', '==', userId))
          snapshot = await getDocs(q)
        } else {
          throw e
        }
      }
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Sort in memory if orderBy failed
      categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      
      return categories
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getAccountTypeCategories')
      throw new Error(`Failed to fetch account type categories: ${errorMsg}`)
    }
  },

  async createAccountTypeCategory(category) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const docRef = await addDoc(collection(db, 'account_type_categories'), {
        ...category,
        user_id: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
      
      return { id: docRef.id, ...category }
    } catch (error) {
      throw new Error(`Failed to create category: ${error.message}`)
    }
  },

  async updateAccountTypeCategory(id, category) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      await updateDoc(doc(db, 'account_type_categories', id), {
        ...category,
        updated_at: serverTimestamp()
      })
      
      return { id, ...category }
    } catch (error) {
      throw new Error(`Failed to update category: ${error.message}`)
    }
  },

  async deleteAccountTypeCategory(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      await deleteDoc(doc(db, 'account_type_categories', id))
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete category: ${error.message}`)
    }
  },

  async createAccountType(accountType) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Generate code from name if not provided
      const code = accountType.code || accountType.name.toLowerCase().replace(/\s+/g, '_')

      const docRef = await addDoc(collection(db, 'account_types'), {
        ...accountType,
        code,
        user_id: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
      
      // Get category name
      let categoryName = null
      if (accountType.category_id) {
        const categoryDoc = await getDoc(doc(db, 'account_type_categories', accountType.category_id))
        if (categoryDoc.exists()) {
          categoryName = categoryDoc.data().name
        }
      }

      return { id: docRef.id, ...accountType, category_name: categoryName }
    } catch (error) {
      throw new Error(`Failed to create account type: ${error.message}`)
    }
  },

  async updateAccountType(id, accountType) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Generate code from name if not provided
      const code = accountType.code || accountType.name.toLowerCase().replace(/\s+/g, '_')

      await updateDoc(doc(db, 'account_types', id), {
        ...accountType,
        code,
        updated_at: serverTimestamp()
      })
      
      return { id, ...accountType }
    } catch (error) {
      throw new Error(`Failed to update account type: ${error.message}`)
    }
  },

  async deleteAccountType(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      await deleteDoc(doc(db, 'account_types', id))
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete account type: ${error.message}`)
    }
  },

  // Account Balances by Type
  async getBalancesByType(groupBy = 'type') {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const accounts = await this.getAccounts()
      const accountTypes = await this.getAccountTypes()
      const categories = await this.getAccountTypeCategories()

      if (groupBy === 'account') {
        return accounts
          .filter(a => !a.is_closed)
          .map(account => {
            const accountType = accountTypes.find(t => t.id === account.account_type_id)
            const category = accountType 
              ? categories.find(c => c.id === accountType.category_id)
              : null
            
            return {
              account_name: account.name,
              account_id: account.id,
              type_name: accountType?.name || account.type,
              category_name: category?.name || 'Uncategorized',
              category_name_for_color: category?.name || null,
              total_balance: account.balance_current || 0
            }
          })
      } else if (groupBy === 'category') {
        const grouped = {}
        
        accounts
          .filter(a => !a.is_closed)
          .forEach(account => {
            const accountType = accountTypes.find(t => t.id === account.account_type_id)
            const category = accountType 
              ? categories.find(c => c.id === accountType.category_id)
              : null
            const categoryName = category?.name || 'Uncategorized'
            
            if (!grouped[categoryName]) {
              grouped[categoryName] = {
                group_name: categoryName,
                category_id: category?.id || 0,
                category_name_for_color: category?.name || null,
                total_balance: 0,
                account_count: 0
              }
            }
            
            grouped[categoryName].total_balance += account.balance_current || 0
            grouped[categoryName].account_count += 1
          })
        
        return Object.values(grouped)
      } else {
        // Group by type
        const grouped = {}
        
        accounts
          .filter(a => !a.is_closed)
          .forEach(account => {
            const accountType = accountTypes.find(t => t.id === account.account_type_id)
            const typeName = accountType?.name || account.type || 'Unknown'
            const category = accountType 
              ? categories.find(c => c.id === accountType.category_id)
              : null
            
            if (!grouped[typeName]) {
              grouped[typeName] = {
                type_name: typeName,
                type_id: accountType?.id || 0,
                category_name: category?.name || 'Uncategorized',
                category_name_for_color: category?.name || null,
                total_balance: 0,
                account_count: 0
              }
            }
            
            grouped[typeName].total_balance += account.balance_current || 0
            grouped[typeName].account_count += 1
          })
        
        return Object.values(grouped)
      }
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getBalancesByType')
      throw new Error(`Failed to fetch balances by type: ${errorMsg}`)
    }
  },

  // Categories
  async getCategories() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      let q = query(
        collection(db, 'categories'),
        where('user_id', '==', userId)
      )
      
      try {
        q = query(q, orderBy('name'))
      } catch (e) {
        console.warn('Index for categories not found, will sort in memory')
      }
      
      let snapshot
      try {
        snapshot = await getDocs(q)
      } catch (e) {
        // If query fails due to missing index, try without orderBy
        if (e.message && e.message.includes('index')) {
          handleFirestoreError(e, 'getCategories')
          // Retry without orderBy
          q = query(collection(db, 'categories'), where('user_id', '==', userId))
          snapshot = await getDocs(q)
        } else {
          throw e
        }
      }
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Sort in memory if orderBy failed
      categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      
      return categories
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getCategories')
      throw new Error(`Failed to fetch categories: ${errorMsg}`)
    }
  },

  // Forecast
  async getForecast(targetDate) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Get all accounts and their current balances
      const accounts = await this.getAccounts()
      const totalBalance = accounts
        .filter(a => !a.is_closed)
        .reduce((sum, a) => sum + (a.balance_current || 0), 0)

      // Get average monthly income/expense
      const summary = await this.getTransactionSummary('monthly')
      const averageMonthlyNet = summary.net

      // Calculate days until target date
      const today = new Date()
      const target = new Date(targetDate)
      const daysDiff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
      const monthsDiff = daysDiff / 30

      // Projected balance
      const projectedBalance = totalBalance + (averageMonthlyNet * monthsDiff)

      return {
        currentBalance: totalBalance,
        projectedBalance,
        targetDate,
        daysUntil: daysDiff
      }
    } catch (error) {
      throw new Error(`Failed to calculate forecast: ${error.message}`)
    }
  },

  // Budgets
  async getBudgets() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      let q = query(
        collection(db, 'budgets'),
        where('user_id', '==', userId)
      )
      
      try {
        q = query(q, orderBy('created_at', 'desc'))
      } catch (e) {
        console.warn('Index for budgets not found, will sort in memory')
      }
      
      const snapshot = await getDocs(q)
      const budgets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Sort in memory if orderBy failed
      budgets.sort((a, b) => {
        const aTime = a.created_at?.toMillis?.() || 0
        const bTime = b.created_at?.toMillis?.() || 0
        return bTime - aTime
      })
      
      return budgets
    } catch (error) {
      throw new Error(`Failed to fetch budgets: ${error.message}`)
    }
  },

  async createBudget(budget) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const budgetData = {
        ...budget,
        user_id: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'budgets'), budgetData)
      return { id: docRef.id, ...budgetData }
    } catch (error) {
      throw new Error(`Failed to create budget: ${error.message}`)
    }
  },

  async updateBudget(id, budget) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const budgetRef = doc(db, 'budgets', id)
      const budgetDoc = await getDoc(budgetRef)
      
      if (!budgetDoc.exists()) throw new Error('Budget not found')
      if (budgetDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await updateDoc(budgetRef, {
        ...budget,
        updated_at: serverTimestamp()
      })

      return { id, ...budget }
    } catch (error) {
      throw new Error(`Failed to update budget: ${error.message}`)
    }
  },

  async deleteBudget(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const budgetRef = doc(db, 'budgets', id)
      const budgetDoc = await getDoc(budgetRef)
      
      if (!budgetDoc.exists()) throw new Error('Budget not found')
      if (budgetDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await deleteDoc(budgetRef)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete budget: ${error.message}`)
    }
  },

  // Plaid Integration
  async createPlaidLinkToken() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Use Firebase Functions callable
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      const functions = getFunctions()
      const createLinkToken = httpsCallable(functions, 'createPlaidLinkToken')
      
      const result = await createLinkToken()
      return result.data.link_token
    } catch (error) {
      throw new Error(`Failed to create Plaid link token: ${error.message}`)
    }
  },

  async exchangePlaidPublicToken(publicToken) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Use Firebase Functions callable
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      const functions = getFunctions()
      const exchangeToken = httpsCallable(functions, 'exchangePlaidToken')
      
      const result = await exchangeToken({ publicToken })
      return result.data
    } catch (error) {
      throw new Error(`Failed to exchange Plaid token: ${error.message}`)
    }
  },

  async syncPlaidAccounts(accessToken) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Use Firebase Functions callable
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      const functions = getFunctions()
      const syncAccounts = httpsCallable(functions, 'syncPlaidAccounts')
      
      const result = await syncAccounts({ accessToken })
      return result.data.accounts
    } catch (error) {
      throw new Error(`Failed to sync Plaid accounts: ${error.message}`)
    }
  }
}

