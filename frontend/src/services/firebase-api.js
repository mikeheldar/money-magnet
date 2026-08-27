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
  limit,
  orderBy,
  Timestamp,
  serverTimestamp,
  setDoc,
  arrayUnion,
  writeBatch
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

  async register(email, password) {
    try {
      if (!auth) {
        throw new Error('Firebase Auth is not initialized. Please enable Authentication in Firebase Console.')
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      return {
        success: true,
        token: await userCredential.user.getIdToken(),
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email
        }
      }
    } catch (error) {
      let errorMessage = error.message
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account already exists with this email address.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.'
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
      // 'all' = no date filter, show all transactions
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
      // 'all' period: no date filter applied, fetch all user transactions

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

  async getTransactionsByDateRange(startDate, endDate) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const startTime = Date.now()
      console.log(`🔍 [CSV Import] getTransactionsByDateRange: Fetching existing transactions from ${startDate} to ${endDate}...`)

      const q = query(
        collection(db, 'transactions'),
        where('user_id', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )

      const snapshot = await getDocs(q)
      const elapsed = Date.now() - startTime
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: toDateString(doc.data().date)
      }))

      console.log(`✅ [CSV Import] getTransactionsByDateRange: Fetched ${results.length} existing transactions in ${elapsed}ms`)

      return results
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getTransactionsByDateRange')
      throw new Error(`Failed to fetch transactions by date range: ${errorMsg}`)
    }
  },

  async getTransactionsByDateRangeWithDetails(startDate, endDate, accountId = null) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      let q = query(
        collection(db, 'transactions'),
        where('user_id', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )

      if (accountId) {
        q = query(q, where('account_id', '==', accountId))
      }

      try {
        q = query(q, orderBy('date', 'desc'))
      } catch (e) {
        // orderBy may fail if index missing; continue without it
      }

      const snapshot = await getDocs(q)
      const transactions = []

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
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

      transactions.sort((a, b) => {
        const aDate = a.date || ''
        const bDate = b.date || ''
        return bDate.localeCompare(aDate)
      })

      return transactions
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getTransactionsByDateRangeWithDetails')
      throw new Error(`Failed to fetch transactions by date range: ${errorMsg}`)
    }
  },

  async batchCreateTransactions(transactions) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Firestore limit: 500 ops per batch, ~10MB total. Use 400 to be safe.
      const BATCH_SIZE = 400
      const allResults = []
      const totalBatches = Math.ceil(transactions.length / BATCH_SIZE)

      console.log(`📤 [CSV Import] batchCreateTransactions: ${transactions.length} transactions in ${totalBatches} batch(es) of ${BATCH_SIZE}`)

      for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const chunk = transactions.slice(i, i + BATCH_SIZE)

        console.log(`📤 [CSV Import] Committing batch ${batchNum}/${totalBatches} (${chunk.length} transactions)...`)

        const batch = writeBatch(db)

        chunk.forEach(transaction => {
          const docRef = doc(collection(db, 'transactions'))
          const transactionData = {
            ...transaction,
            user_id: userId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          }
          batch.set(docRef, transactionData)
          allResults.push({ id: docRef.id, ...transactionData })
        })

        await batch.commit()
        console.log(`✅ [CSV Import] Batch ${batchNum}/${totalBatches} committed successfully`)
      }

      console.log(`✅ [CSV Import] All ${transactions.length} transactions created`)
      return allResults
    } catch (error) {
      console.error('❌ [CSV Import] batchCreateTransactions failed:', error)
      throw new Error(`Batch creation failed: ${error.message}`)
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

      console.log('🔵 [Frontend] Creating transaction...')
      console.log('🔵 [Frontend] User ID:', userId)
      console.log('🔵 [Frontend] Transaction data:', JSON.stringify(transaction, null, 2))

      const transactionData = {
        ...transaction,
        user_id: userId,
        date: transaction.date || new Date().toISOString().split('T')[0],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }

      console.log('🔵 [Frontend] Transaction data to save:', JSON.stringify(transactionData, null, 2))
      console.log('🔵 [Frontend] Adding to Firestore collection "transactions"...')

      const docRef = await addDoc(collection(db, 'transactions'), transactionData)

      console.log('✅ [Frontend] Transaction created in Firestore!')
      console.log('✅ [Frontend] Document ID:', docRef.id)
      console.log('✅ [Frontend] This should trigger onTransactionCreated Firebase Function')
      console.log('✅ [Frontend] Waiting for N8N categorization...')

      // Update account balance
      if (transaction.account_id) {
        console.log('🔵 [Frontend] Updating account balance...')
        await this.updateAccountBalance(transaction.account_id, transaction.amount, transaction.type)
        console.log('✅ [Frontend] Account balance updated')
      }

      const result = { id: docRef.id, ...transactionData }
      console.log('✅ [Frontend] Transaction creation complete:', result.id)
      return result
    } catch (error) {
      console.error('❌ [Frontend] Error creating transaction:', error)
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

  // Admin: Delete all transactions for the current user
  async deleteAllTransactions() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const transactions = await this.getAllTransactions()
      const totalToDelete = transactions.length
      console.log('[deleteAllTransactions] Fetched', totalToDelete, 'transactions to delete')

      if (transactions.length === 0) {
        console.log('[deleteAllTransactions] No transactions to delete')
        return { success: true, deletedCount: 0 }
      }

      // Skip reverting account balances one-by-one (too slow for bulk delete)
      // Instead, we'll reset all account balances to 0 after deleting transactions
      console.log('[deleteAllTransactions] Skipping individual balance reverts (bulk delete optimization)')

      // Batch delete transactions (Firestore limit 500 per batch)
      const BATCH_SIZE = 500
      const numBatches = Math.ceil(transactions.length / BATCH_SIZE)
      let deletedCount = 0
      for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const batch = writeBatch(db)
        const chunk = transactions.slice(i, i + BATCH_SIZE)
        chunk.forEach(tx => {
          batch.delete(doc(db, 'transactions', tx.id))
          deletedCount++
        })
        await batch.commit()
        console.log('[deleteAllTransactions] Batch', batchNum, '/', numBatches, ':', chunk.length, 'deleted (total so far:', deletedCount, ')')
      }

      console.log('[deleteAllTransactions] All transactions deleted. Resetting account balances to 0...')

      // Reset all account balances to 0 (much faster than reverting one-by-one)
      const accounts = await this.getAccounts()
      console.log('[deleteAllTransactions] Found', accounts.length, 'accounts to reset')
      
      const accountBatches = Math.ceil(accounts.length / BATCH_SIZE)
      for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const batch = writeBatch(db)
        const chunk = accounts.slice(i, i + BATCH_SIZE)
        chunk.forEach(account => {
          batch.update(doc(db, 'accounts', account.id), {
            balance_current: 0,
            updated_at: serverTimestamp()
          })
        })
        await batch.commit()
        console.log('[deleteAllTransactions] Account balance reset batch', batchNum, '/', accountBatches, ':', chunk.length, 'accounts')
      }

      console.log('[deleteAllTransactions] Done. Deleted', deletedCount, 'transactions and reset', accounts.length, 'account balances to 0')
      return { success: true, deletedCount, accountsReset: accounts.length }
    } catch (error) {
      throw new Error(`Failed to delete all transactions: ${error.message}`)
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

  async createCategory(category) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const categoryData = {
        ...category,
        user_id: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'categories'), categoryData)
      return { id: docRef.id, ...categoryData }
    } catch (error) {
      throw new Error(`Failed to create category: ${error.message}`)
    }
  },

  async updateCategory(id, category) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const categoryRef = doc(db, 'categories', id)
      const categoryDoc = await getDoc(categoryRef)

      if (!categoryDoc.exists()) throw new Error('Category not found')
      if (categoryDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await updateDoc(categoryRef, {
        ...category,
        updated_at: serverTimestamp()
      })

      return { id, ...category }
    } catch (error) {
      throw new Error(`Failed to update category: ${error.message}`)
    }
  },

  async deleteCategory(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const categoryRef = doc(db, 'categories', id)
      const categoryDoc = await getDoc(categoryRef)

      if (!categoryDoc.exists()) throw new Error('Category not found')
      if (categoryDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await deleteDoc(categoryRef)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete category: ${error.message}`)
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

  async getForecastSeries(options = {}) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const { startDate, endDate, grain = 'weekly' } = options
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      const accounts = await this.getAccounts()
      const activeAccounts = accounts.filter(a => !a.is_closed)
      const activeIds = new Set(activeAccounts.map(a => a.id))

      function toStr(d) {
        return d.toISOString().split('T')[0]
      }
      function addDays(d, n) {
        const out = new Date(d)
        out.setDate(out.getDate() + n)
        return out
      }
      function addMonthsClamped(d, n) {
        const day = d.getDate()
        const out = new Date(d)
        out.setDate(1)
        out.setMonth(out.getMonth() + n)
        const lastDay = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate()
        out.setDate(Math.min(day, lastDay))
        return out
      }

      // Deterministic engine: real balances in the past (reconstructed from actual
      // transactions), and for the future each recurring bill/income lands on its own
      // scheduled date while everything non-recurring flows at a rolling baseline rate.
      const BASELINE_DAYS = 90
      const CROSSING_HORIZON_DAYS = 1825 // goal crossings are searched up to 5 years out

      const windowStart = new Date(startDate)
      const windowEnd = new Date(endDate)
      const horizonCandidate = addDays(today, CROSSING_HORIZON_DAYS)
      const horizonEnd = horizonCandidate > windowEnd ? horizonCandidate : windowEnd
      const baselineStart = addDays(today, -BASELINE_DAYS)
      const historyStart = baselineStart < windowStart ? baselineStart : windowStart

      const history = (await this.getTransactionsByDateRange(toStr(historyStart), todayStr))
        .filter(t => t.account_id && activeIds.has(t.account_id))

      const txnDelta = (t) => {
        const amt = Math.abs(parseFloat(t.amount) || 0)
        return t.type === 'income' ? amt : -amt
      }

      // Baseline: average daily net of NON-recurring flow only — recurring items are
      // modeled explicitly on their own dates below, so they must not also inflate the rate
      const baselineStartStr = toStr(baselineStart)
      let earliestStr = todayStr
      const baselineNetByAccount = {}
      history.forEach(t => {
        if (t.date < earliestStr) earliestStr = t.date
        if (t.recurring || t.date < baselineStartStr) return
        baselineNetByAccount[t.account_id] = (baselineNetByAccount[t.account_id] || 0) + txnDelta(t)
      })
      const observedDays = Math.min(
        BASELINE_DAYS,
        Math.max(7, Math.round((today - new Date(earliestStr)) / 864e5) + 1)
      )
      Object.keys(baselineNetByAccount).forEach(aid => {
        baselineNetByAccount[aid] /= observedDays
      })
      const baselineDailyNet = Object.values(baselineNetByAccount).reduce((s, v) => s + v, 0)

      // Recurring schedule: the latest occurrence of each recurring item (per account +
      // merchant + frequency) anchors its projected future dates and amount
      const recurringAnchors = {}
      history.forEach(t => {
        if (!t.recurring || !t.recurring_frequency) return
        const key = `${t.account_id}|${(t.merchant || t.description || '').toLowerCase()}|${t.recurring_frequency}`
        if (!recurringAnchors[key] || t.date > recurringAnchors[key].date) recurringAnchors[key] = t
      })

      const dayStrs = []
      for (let d = new Date(windowStart); d <= horizonEnd; d = addDays(d, 1)) dayStrs.push(toStr(d))
      const dayIndex = {}
      dayStrs.forEach((s, i) => { dayIndex[s] = i })
      let todayIdx = dayIndex[todayStr]
      if (todayIdx === undefined) todayIdx = todayStr < dayStrs[0] ? 0 : dayStrs.length - 1

      const deltasByAccount = {}
      activeAccounts.forEach(a => { deltasByAccount[a.id] = new Array(dayStrs.length).fill(0) })

      history.forEach(t => {
        const i = dayIndex[t.date]
        if (i !== undefined && i <= todayIdx) deltasByAccount[t.account_id][i] += txnDelta(t)
      })

      for (let i = todayIdx + 1; i < dayStrs.length; i++) {
        activeAccounts.forEach(a => {
          deltasByAccount[a.id][i] += baselineNetByAccount[a.id] || 0
        })
      }

      Object.values(recurringAnchors).forEach(t => {
        const arr = deltasByAccount[t.account_id]
        if (!arr) return
        const step = t.recurring_frequency === 'weekly'
          ? d => addDays(d, 7)
          : t.recurring_frequency === 'yearly'
            ? d => addMonthsClamped(d, 12)
            : d => addMonthsClamped(d, 1)
        let d = new Date(t.date)
        for (let guard = 0; guard < 800 && d <= horizonEnd; guard++) {
          const i = dayIndex[toStr(d)]
          if (i !== undefined && i > todayIdx) arr[i] += txnDelta(t)
          d = step(d)
        }
      })

      // Balance walk anchored at today's real balance: walking backward strips out the
      // actual deltas, walking forward adds the projected ones
      const dailyByAccount = {}
      activeAccounts.forEach(a => {
        const arr = new Array(dayStrs.length).fill(0)
        const deltas = deltasByAccount[a.id]
        arr[todayIdx] = a.balance_current || 0
        for (let i = todayIdx - 1; i >= 0; i--) arr[i] = arr[i + 1] - deltas[i + 1]
        for (let i = todayIdx + 1; i < arr.length; i++) arr[i] = arr[i - 1] + deltas[i]
        dailyByAccount[a.id] = arr
      })
      const dailyTotals = new Array(dayStrs.length).fill(0)
      activeAccounts.forEach(a => {
        const arr = dailyByAccount[a.id]
        for (let i = 0; i < dayStrs.length; i++) dailyTotals[i] += arr[i]
      })

      const buckets = []
      if (grain === 'daily') {
        for (let d = new Date(windowStart); d <= windowEnd; d = addDays(d, 1)) {
          buckets.push({ dateStr: toStr(d), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
        }
      } else if (grain === 'weekly') {
        const weekStart = new Date(windowStart)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        for (let d = new Date(weekStart); d <= windowEnd; d = addDays(d, 7)) {
          buckets.push({ dateStr: toStr(d), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
        }
      } else {
        let d = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1)
        while (d <= windowEnd) {
          buckets.push({ dateStr: toStr(d), label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) })
          d = addMonthsClamped(d, 1)
        }
      }

      const sampleAt = (arr, dateStr) => {
        let i = dayIndex[dateStr]
        if (i === undefined) i = dateStr < dayStrs[0] ? 0 : dayStrs.length - 1
        return Math.round(arr[i] * 100) / 100
      }

      let nowIndex = 0
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].dateStr >= todayStr) {
          nowIndex = i
          break
        }
        nowIndex = i
      }

      const totalValues = buckets.map(b => sampleAt(dailyTotals, b.dateStr))
      const series = activeAccounts.map(a => ({
        accountId: a.id,
        accountName: a.name,
        values: buckets.map(b => sampleAt(dailyByAccount[a.id], b.dateStr))
      }))

      // Goal crossings: the first projected day each save-up goal's tracked balance
      // (linked account if set, otherwise the total) reaches its target amount
      const allGoals = await this.getGoals()
      const goals = allGoals
        .filter(g => (g.goal_type || 'save_up') !== 'spend_limit' && Number(g.target_amount) > 0)
        .map(g => {
          const tracked = g.linked_account_id && dailyByAccount[g.linked_account_id]
            ? dailyByAccount[g.linked_account_id]
            : dailyTotals
          const target = Number(g.target_amount)
          const alreadyMet = tracked[todayIdx] >= target
          let crossDate = null
          if (!alreadyMet) {
            for (let i = todayIdx + 1; i < dayStrs.length; i++) {
              if (tracked[i] >= target) {
                crossDate = dayStrs[i]
                break
              }
            }
          }
          const onTrack = g.target_date ? (alreadyMet || (crossDate !== null && crossDate <= g.target_date)) : null

          // Coaching: when the goal is drifting (or has no crossing at all), how much
          // more per month closes the gap — measured against the projected balance at
          // the target date, or a 12-month plan when there is no usable target date
          let coach = null
          if (!alreadyMet && (onTrack === false || crossDate === null)) {
            const MONTH_DAYS = 30.44
            let shortfall, daysLeft, horizonMonths
            let ti = g.target_date ? dayIndex[g.target_date] : undefined
            if (ti === undefined && g.target_date && g.target_date > dayStrs[dayStrs.length - 1]) {
              ti = dayStrs.length - 1
            }
            if (ti !== undefined && ti > todayIdx + 7) {
              shortfall = target - tracked[ti]
              daysLeft = ti - todayIdx
              horizonMonths = null
            } else {
              shortfall = target - tracked[todayIdx]
              daysLeft = 365
              horizonMonths = 12
            }
            if (shortfall > 0) {
              coach = {
                shortfall: Math.round(shortfall * 100) / 100,
                requiredExtraPerMonth: Math.round((shortfall / (daysLeft / MONTH_DAYS)) * 100) / 100,
                horizonMonths
              }
            }
          }

          // Future trajectory of the tracked balance (today -> horizon), so the UI can
          // answer "what if I saved $X/mo more?" instantly: the what-if crossing is just
          // the first day where daily[i] + extraPerDay*i reaches the target - no refetch
          const projectionDaily = []
          for (let i = todayIdx; i < dayStrs.length; i++) {
            projectionDaily.push(Math.round(tracked[i] * 100) / 100)
          }

          return {
            id: g.id,
            title: g.title,
            mantra: g.mantra || null,
            target_amount: target,
            target_date: g.target_date || null,
            linked_account_id: g.linked_account_id || null,
            commitment: g.commitment || null,
            alreadyMet,
            crossDate,
            onTrack,
            coach,
            projection: { start: dayStrs[todayIdx], daily: projectionDaily }
          }
        })

      // Where the flexible money is: top non-recurring spending categories over the
      // baseline window, monthly-ized — recurring bills are excluded because they're
      // commitments, not levers. Categories are fetched once, lazily, only when a
      // goal needs coaching or has an accepted commitment to check.
      let flexSpend = []
      const committedGoals = goals.filter(g => g.commitment && g.commitment.category_id && !g.alreadyMet)
      const byId = {}
      if (goals.some(g => g.coach) || committedGoals.length > 0) {
        let cats = []
        try {
          cats = await this.getCategories()
        } catch (e) {
          console.warn('forecast: categories unavailable, using ids only')
        }
        cats.forEach(c => { byId[c.id] = c })
      }
      // Roll a child category up to its parent (same grouping rule as Budget/Goals)
      const rootOf = (cid) => {
        const cat = byId[cid]
        return cat && cat.parent_id && byId[cat.parent_id] ? cat.parent_id : cid
      }
      if (goals.some(g => g.coach)) {
        const spendByCat = {}
        history.forEach(t => {
          if (t.recurring || t.type !== 'expense' || t.date < baselineStartStr) return
          const key = t.category_id || 'uncategorized'
          spendByCat[key] = (spendByCat[key] || 0) + Math.abs(parseFloat(t.amount) || 0)
        })
        const rolled = {}
        Object.entries(spendByCat).forEach(([cid, total]) => {
          const rootId = rootOf(cid)
          rolled[rootId] = (rolled[rootId] || 0) + total
        })
        flexSpend = Object.entries(rolled)
          .map(([cid, total]) => ({
            categoryId: cid === 'uncategorized' ? null : cid,
            name: byId[cid] ? byId[cid].name : 'Uncategorized',
            perMonth: Math.round((total / observedDays) * 30.44 * 100) / 100
          }))
          .sort((a, b) => b.perMonth - a.perMonth)
          .slice(0, 3)
      }

      // Commitment adherence: when the user accepted the coach's plan ("save $X/mo
      // more out of category C"), compare month-to-date spend in C against a
      // pro-rated allowance = the category's baseline monthly spend minus $X
      if (committedGoals.length > 0) {
        const todayStr = dayStrs[todayIdx]
        const monthStartStr = todayStr.slice(0, 8) + '01'
        const [cy, cm, cd] = todayStr.split('-').map(Number)
        const daysInMonth = new Date(cy, cm, 0).getDate()
        const parseDay = (s) => {
          const [y, m, d] = s.split('-').map(Number)
          return new Date(y, m - 1, d)
        }
        const historyStartStr = toStr(historyStart)
        committedGoals.forEach(g => {
          const rootId = rootOf(g.commitment.category_id)
          let mtdSpend = 0
          let baseTotal = 0
          const catTxns = []
          history.forEach(t => {
            if (t.recurring || t.type !== 'expense') return
            if (rootOf(t.category_id || 'uncategorized') !== rootId) return
            const amt = Math.abs(parseFloat(t.amount) || 0)
            if (t.date >= baselineStartStr) baseTotal += amt
            if (t.date >= monthStartStr && t.date <= todayStr) mtdSpend += amt
            catTxns.push({ date: t.date, amt })
          })
          const basePerMonth = (baseTotal / observedDays) * 30.44
          const allowance = Math.max(0, basePerMonth - Number(g.commitment.extra_per_month || 0))

          // Week-over-week adherence since acceptance: each COMPLETED calendar week
          // (Mon-Sun, only weeks inside the fetched history) is "kept" when category
          // spend stayed within the weekly allowance; the acceptance week is pro-rated
          // from the acceptance day. Streaks count back from the last completed week.
          const weeklyAllowance = allowance * 7 / 30.44
          const acceptedStr = String(g.commitment.accepted_date || todayStr).slice(0, 10)
          const weeks = []
          const firstMonday = parseDay(acceptedStr)
          firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7))
          for (let ws = firstMonday; weeks.length < 26; ws = addDays(ws, 7)) {
            const wsStr = toStr(ws)
            const weStr = toStr(addDays(ws, 6))
            if (weStr >= todayStr) break // current week is not over yet
            if (wsStr < historyStartStr) continue // no transaction data that far back
            const fromStr = wsStr > acceptedStr ? wsStr : acceptedStr
            const coveredDays = Math.round((parseDay(weStr) - parseDay(fromStr)) / 864e5) + 1
            const weekAllow = weeklyAllowance * (coveredDays / 7)
            let spent = 0
            catTxns.forEach(t => {
              if (t.date >= fromStr && t.date <= weStr) spent += t.amt
            })
            weeks.push({
              start: wsStr,
              spent: Math.round(spent * 100) / 100,
              allowance: Math.round(weekAllow * 100) / 100,
              kept: spent <= weekAllow
            })
          }
          let keptStreak = 0
          let brokenStreak = 0
          for (let i = weeks.length - 1; i >= 0 && weeks[i].kept; i--) keptStreak++
          for (let i = weeks.length - 1; i >= 0 && !weeks[i].kept; i--) brokenStreak++

          g.commitmentStatus = {
            mtdSpend: Math.round(mtdSpend * 100) / 100,
            allowance: Math.round(allowance * 100) / 100,
            onPace: mtdSpend <= allowance * (cd / daysInMonth),
            weeks: weeks.slice(-8),
            keptStreak,
            brokenStreak
          }
        })
      }

      // Spending-limit goals: cap adherence for the goal's period (custom range, or the
      // current calendar month). Mirrors Goals.vue exactly — its own unfiltered fetch over
      // the union of goal ranges, category + direct children, recurring included — so this
      // verdict always matches the number on the Goals page. Fetch only fires when
      // spend-limit goals exist.
      let spendLimits = []
      const slGoals = allGoals.filter(g =>
        (g.goal_type || 'save_up') === 'spend_limit' && g.category_id && Number(g.target_amount) > 0)
      if (slGoals.length > 0) {
        let slCats = Object.values(byId)
        if (slCats.length === 0) {
          try {
            slCats = await this.getCategories()
          } catch (e) {
            console.warn('forecast: categories unavailable for spend limits')
          }
        }
        const slRange = (g) => {
          if (g.target_start_date && g.target_end_date) {
            return { start: g.target_start_date, end: g.target_end_date }
          }
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          return { start: monthStart.toISOString().split('T')[0], end: monthEnd.toISOString().split('T')[0] }
        }
        const slRanges = slGoals.map(slRange)
        const slStart = slRanges.map(r => r.start).sort()[0]
        const slEnd = slRanges.map(r => r.end).sort().slice(-1)[0]
        let slTxns = []
        try {
          slTxns = await this.getTransactionsByDateRange(slStart, slEnd)
        } catch (e) {
          console.warn('forecast: spend-limit transactions unavailable:', e.message)
        }
        const parseD = (s) => {
          const [y, m, d] = s.split('-').map(Number)
          return new Date(y, m - 1, d)
        }
        spendLimits = slGoals.map((g, i) => {
          const { start, end } = slRanges[i]
          const ids = new Set([g.category_id])
          slCats.forEach(c => { if (c.parent_id === g.category_id) ids.add(c.id) })
          let spent = 0
          slTxns.forEach(t => {
            if (t.type !== 'expense' || !ids.has(t.category_id)) return
            if (!t.date || t.date < start || t.date > end) return
            spent += Math.abs(parseFloat(t.amount) || 0)
          })
          const target = Number(g.target_amount)
          const totalDays = Math.max(1, Math.round((parseD(end) - parseD(start)) / 864e5) + 1)
          const doneDays = Math.min(totalDays, Math.max(0, Math.round((parseD(todayStr) - parseD(start)) / 864e5) + 1))
          const elapsedFrac = doneDays / totalDays
          const ended = todayStr > end
          // 'hot' = under the cap but ahead of the pro-rated burn rate for this point
          // in the period — the drift signal, before the cap is actually blown
          let status
          if (ended) status = spent <= target ? 'ended_kept' : 'ended_over'
          else if (spent > target) status = 'over'
          else if (spent > target * elapsedFrac) status = 'hot'
          else status = 'ok'
          const cat = slCats.find(c => c.id === g.category_id)
          return {
            id: g.id,
            title: g.title,
            category_id: g.category_id,
            category_name: cat ? cat.name : 'Category',
            target_amount: target,
            start,
            end,
            defaultPeriod: !(g.target_start_date && g.target_end_date),
            spent: Math.round(spent * 100) / 100,
            remaining: Math.round((target - spent) * 100) / 100,
            projected: elapsedFrac > 0 ? Math.round((spent / elapsedFrac) * 100) / 100 : Math.round(spent * 100) / 100,
            status
          }
        })
      }

      return {
        labels: buckets.map(b => b.label),
        nowIndex,
        series,
        totalValues,
        bucketDates: buckets.map(b => b.dateStr),
        goals,
        spendLimits,
        meta: {
          baselineDailyNet: Math.round(baselineDailyNet * 100) / 100,
          observedDays,
          recurringCount: Object.keys(recurringAnchors).length,
          horizonDays: CROSSING_HORIZON_DAYS,
          flexSpend
        }
      }
    } catch (error) {
      throw new Error(`Failed to get forecast series: ${error.message}`)
    }
  },

  // Budgets
  async getBudgets() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) {
        console.error('❌ [FirebaseAPI] getBudgets: Not authenticated')
        throw new Error('Not authenticated')
      }

      console.log('🟢 [FirebaseAPI] getBudgets: Fetching budgets for user:', userId)

      let q = query(
        collection(db, 'budgets'),
        where('user_id', '==', userId)
      )

      try {
        q = query(q, orderBy('created_at', 'desc'))
        console.log('🟢 [FirebaseAPI] getBudgets: Query with orderBy')
      } catch (e) {
        console.warn('⚠️ [FirebaseAPI] getBudgets: Index for budgets not found, will sort in memory:', e.message)
      }

      console.log('🟢 [FirebaseAPI] getBudgets: Executing query...')
      const snapshot = await getDocs(q)
      console.log('✅ [FirebaseAPI] getBudgets: Query executed, found', snapshot.docs.length, 'budgets')

      const budgets = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('📄 [FirebaseAPI] getBudgets: Budget doc:', {
          id: doc.id,
          category_id: data.category_id,
          amount: data.amount,
          period: data.period,
          start_date: data.start_date
        })
        return {
          id: doc.id,
          ...data
        }
      })

      console.log('✅ [FirebaseAPI] getBudgets: Returning', budgets.length, 'budgets')

      // Sort in memory if orderBy failed
      budgets.sort((a, b) => {
        const aTime = a.created_at?.toMillis?.() || a.created_at?.seconds || 0
        const bTime = b.created_at?.toMillis?.() || b.created_at?.seconds || 0
        return bTime - aTime
      })

      return budgets
    } catch (error) {
      console.error('❌ [FirebaseAPI] getBudgets error:', error)
      const errorMsg = handleFirestoreError(error, 'getBudgets')
      throw new Error(`Failed to fetch budgets: ${errorMsg}`)
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

  // Goals (vision board)
  // First-run setup signals for the Dashboard checklist: two cheap reads --
  // a limit(1) probe on transactions plus the (small) goals list, which also
  // answers whether any goal carries a target and a personal mantra
  async getSetupStatus() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const txnSnap = await getDocs(query(
        collection(db, 'transactions'),
        where('user_id', '==', userId),
        limit(1)
      ))
      const goals = await this.getGoals()
      return {
        hasTransactions: !txnSnap.empty,
        hasGoal: goals.some(g => (g.goal_type || 'save_up') !== 'spend_limit' && Number(g.target_amount) > 0),
        hasMantra: goals.some(g => g.mantra && String(g.mantra).trim())
      }
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getSetupStatus')
      throw new Error(`Failed to fetch setup status: ${errorMsg}`)
    }
  },

  async getGoals() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const q = query(
        collection(db, 'goals'),
        where('user_id', '==', userId)
      )
      const snapshot = await getDocs(q)
      const goals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      goals.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        const aOrder = a.sort_order ?? 0
        const bOrder = b.sort_order ?? 0
        if (aOrder !== bOrder) return aOrder - bOrder
        const aTime = a.created_at?.toMillis?.() ?? a.created_at?.seconds ?? 0
        const bTime = b.created_at?.toMillis?.() ?? b.created_at?.seconds ?? 0
        return bTime - aTime
      })
      return goals
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getGoals')
      throw new Error(`Failed to fetch goals: ${errorMsg}`)
    }
  },

  async createGoal(goal) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const goalData = {
        ...goal,
        user_id: userId,
        pinned: goal.pinned ?? false,
        links: goal.links ?? [],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
      const docRef = await addDoc(collection(db, 'goals'), goalData)
      return { id: docRef.id, ...goalData }
    } catch (error) {
      throw new Error(`Failed to create goal: ${error.message}`)
    }
  },

  async updateGoal(id, goal) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const goalRef = doc(db, 'goals', id)
      const goalDoc = await getDoc(goalRef)
      if (!goalDoc.exists()) throw new Error('Goal not found')
      if (goalDoc.data().user_id !== userId) throw new Error('Unauthorized')

      const updates = {
        title: goal.title,
        description: goal.description ?? null,
        mantra: goal.mantra ?? null,
        links: goal.links ?? [],
        target_date: goal.target_date ?? null,
        target_start_date: goal.target_start_date ?? null,
        target_end_date: goal.target_end_date ?? null,
        target_amount: goal.target_amount ?? null,
        current_amount: goal.current_amount ?? null,
        linked_account_id: goal.linked_account_id ?? null,
        goal_type: goal.goal_type ?? null,
        category_id: goal.category_id ?? null,
        pinned: goal.pinned ?? false,
        sort_order: goal.sort_order ?? null,
        updated_at: serverTimestamp()
      }
      await updateDoc(goalRef, updates)
      return { id, ...goal }
    } catch (error) {
      throw new Error(`Failed to update goal: ${error.message}`)
    }
  },

  // Set or clear a goal's accepted get-back-on-pace commitment without touching
  // any other field (updateGoal overwrites its full whitelist)
  async setGoalCommitment(id, commitment) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const goalRef = doc(db, 'goals', id)
      const goalDoc = await getDoc(goalRef)
      if (!goalDoc.exists()) throw new Error('Goal not found')
      if (goalDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await updateDoc(goalRef, { commitment: commitment ?? null, updated_at: serverTimestamp() })
      return { id, commitment: commitment ?? null }
    } catch (error) {
      throw new Error(`Failed to set goal commitment: ${error.message}`)
    }
  },

  async deleteGoal(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const goalRef = doc(db, 'goals', id)
      const goalDoc = await getDoc(goalRef)
      if (!goalDoc.exists()) throw new Error('Goal not found')
      if (goalDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await deleteDoc(goalRef)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete goal: ${error.message}`)
    }
  },

  // Recurring auto-detection: group history by account + normalized merchant name,
  // keep groups that repeat on a weekly/monthly/yearly cadence with consistent amounts,
  // and offer them as suggestions. Confirming flags the underlying transactions —
  // exactly what the forecast engine reads, so no separate bookkeeping exists.
  _normalizeMerchantName(t) {
    return (t.merchant || t.description || '')
      .toLowerCase()
      .replace(/\d+/g, ' ')
      .replace(/[^a-z&' ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  },

  async detectRecurringCandidates() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const BANDS = {
        weekly: { lo: 6, hi: 8, perMonth: 4.35 },
        monthly: { lo: 27, hi: 34, perMonth: 1 },
        yearly: { lo: 345, hi: 385, perMonth: 1 / 12 }
      }
      const HISTORY_DAYS = 760 // ~25 months, enough to see a yearly bill twice

      const today = new Date()
      const start = new Date(today)
      start.setDate(start.getDate() - HISTORY_DAYS)
      const toStr = (d) => d.toISOString().split('T')[0]

      const [txns, accounts, dismissedSnap] = await Promise.all([
        this.getTransactionsByDateRange(toStr(start), toStr(today)),
        this.getAccounts(),
        getDoc(doc(db, 'recurring_dismissals', userId))
      ])
      const dismissed = new Set(dismissedSnap.exists() ? dismissedSnap.data().keys || [] : [])
      const accountName = {}
      accounts.forEach(a => { accountName[a.id] = a.name })

      // A group where the user already flagged any transaction is theirs to manage —
      // never re-suggest it
      const groups = {}
      txns.forEach(t => {
        const name = this._normalizeMerchantName(t)
        if (!name || !t.account_id || !t.date) return
        const key = `${t.account_id}|${t.type}|${name}`
        ;(groups[key] = groups[key] || []).push(t)
      })

      const median = (arr) => {
        const s = [...arr].sort((a, b) => a - b)
        const m = Math.floor(s.length / 2)
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
      }

      const candidates = []
      Object.entries(groups).forEach(([key, list]) => {
        if (dismissed.has(key)) return
        if (list.some(t => t.recurring)) return

        // collapse same-day rows so split payments don't fake a cadence
        const byDate = {}
        list.forEach(t => { byDate[t.date] = t })
        const uniq = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
        if (uniq.length < 2) return

        const intervals = []
        for (let i = 1; i < uniq.length; i++) {
          intervals.push(Math.round((new Date(uniq[i].date) - new Date(uniq[i - 1].date)) / 864e5))
        }
        const med = median(intervals)
        const freq = Object.keys(BANDS).find(f => med >= BANDS[f].lo && med <= BANDS[f].hi)
        if (!freq) return
        if (freq !== 'yearly' && uniq.length < 3) return // weekly/monthly need 3+ hits

        // cadence check: most gaps sit in the band, or on a doubled gap (one missed cycle)
        const band = BANDS[freq]
        const ok = intervals.filter(g =>
          (g >= band.lo && g <= band.hi) || (g >= band.lo * 2 && g <= band.hi * 2)
        ).length
        if (ok / intervals.length < 0.7) return

        // amount check: real bills wobble a little; unrelated charges wobble a lot
        const amounts = uniq.map(t => Math.abs(parseFloat(t.amount) || 0))
        const medAmt = median(amounts)
        if (!medAmt) return
        const close = amounts.filter(a => Math.abs(a - medAmt) <= Math.max(2, medAmt * 0.25)).length
        if (close / amounts.length < 0.7) return

        const last = uniq[uniq.length - 1]
        candidates.push({
          key,
          account_id: last.account_id,
          account_name: accountName[last.account_id] || null,
          name: last.merchant || last.description || 'Unknown',
          type: last.type,
          frequency: freq,
          count: uniq.length,
          medianAmount: medAmt,
          monthlyAmount: medAmt * band.perMonth,
          firstDate: uniq[0].date,
          lastDate: last.date,
          txnIds: uniq.map(t => t.id)
        })
      })

      return candidates.sort((a, b) => b.monthlyAmount - a.monthlyAmount)
    } catch (error) {
      throw new Error(`Failed to detect recurring candidates: ${error.message}`)
    }
  },

  async confirmRecurringCandidate(txnIds, frequency) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')
      if (!Array.isArray(txnIds) || !txnIds.length) throw new Error('No transactions to update')

      for (let i = 0; i < txnIds.length; i += 400) {
        const batch = writeBatch(db)
        txnIds.slice(i, i + 400).forEach(id => {
          batch.update(doc(db, 'transactions', id), {
            recurring: true,
            recurring_frequency: frequency,
            updated_at: serverTimestamp()
          })
        })
        await batch.commit()
      }
      return { updated: txnIds.length, frequency }
    } catch (error) {
      throw new Error(`Failed to confirm recurring: ${error.message}`)
    }
  },

  async dismissRecurringCandidate(key) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      await setDoc(doc(db, 'recurring_dismissals', userId), {
        user_id: userId,
        keys: arrayUnion(key),
        updated_at: serverTimestamp()
      }, { merge: true })
      return { dismissed: key }
    } catch (error) {
      throw new Error(`Failed to dismiss suggestion: ${error.message}`)
    }
  },

  // ============ Belief Journal ============
  // One entry per day: the belief the banner headlined + the true fact that
  // grounded it. Written fire-and-forget by the banner; a same-day rewrite
  // just refreshes the evidence (latest wins). setDoc merge deep-merges the
  // entries map, so each day lands without clobbering the others.
  async saveBeliefEntry(entry) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const d = new Date()
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      await setDoc(doc(db, 'belief_journal', userId), {
        user_id: userId,
        entries: {
          [day]: {
            mantra: entry.mantra || null,
            personal: !!entry.personal,
            goal_id: entry.goalId || null,
            goal_title: entry.goalTitle || null,
            fact: entry.fact || null
          }
        },
        updated_at: serverTimestamp()
      }, { merge: true })
      return { day }
    } catch (error) {
      throw new Error(`Failed to save belief entry: ${error.message}`)
    }
  },

  async getBeliefJournal(limitDays = 14) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const snap = await getDoc(doc(db, 'belief_journal', userId))
      if (!snap.exists()) return []
      const entries = snap.data().entries || {}
      return Object.keys(entries).sort().reverse().slice(0, limitDays)
        .map(day => ({ day, ...entries[day] }))
    } catch (error) {
      throw new Error(`Failed to load belief journal: ${error.message}`)
    }
  },

  // Plaid Integration
  async createPlaidLinkToken() {
    try {
      console.log('🔵 [Plaid] Starting createPlaidLinkToken...')
      const userId = auth.currentUser?.uid
      console.log('🔵 [Plaid] User ID:', userId)

      if (!userId) {
        console.error('❌ [Plaid] Not authenticated')
        throw new Error('Not authenticated')
      }

      // Use Firebase Functions callable
      console.log('🔵 [Plaid] Importing Firebase Functions...')
      const { httpsCallable } = await import('firebase/functions')
      const { functions } = await import('../config/firebase')
      console.log('🔵 [Plaid] Functions instance:', functions)

      console.log('🔵 [Plaid] Creating callable function reference...')
      const createLinkToken = httpsCallable(functions, 'createPlaidLinkToken')

      console.log('🔵 [Plaid] Calling createPlaidLinkToken function...')
      const result = await createLinkToken()
      console.log('✅ [Plaid] Function call successful, result:', result)
      console.log('✅ [Plaid] Link token received:', result.data?.link_token ? 'Yes' : 'No')

      if (!result.data?.link_token) {
        console.error('❌ [Plaid] No link_token in response:', result)
        throw new Error('No link token in response')
      }

      return result.data.link_token
    } catch (error) {
      console.error('❌ [Plaid] Error creating link token:')
      console.error('  - Error object:', error)
      console.error('  - Error type:', typeof error)
      console.error('  - Error constructor:', error.constructor?.name)
      console.error('  - Error code:', error.code)
      console.error('  - Error message:', error.message)
      console.error('  - Error details:', error.details)
      console.error('  - Error stack:', error.stack)

      // Check if it's a Firebase Functions error
      if (error.code) {
        console.error('  - Firebase error code:', error.code)
        console.error('  - Firebase error message:', error.message)
        if (error.details) {
          console.error('  - Firebase error details:', JSON.stringify(error.details, null, 2))
        }
      }

      // Extract more detailed error message
      let errorMessage = 'Unknown error'
      if (error.details) {
        if (typeof error.details === 'string') {
          errorMessage = error.details
        } else if (error.details.message) {
          errorMessage = error.details.message
        } else {
          errorMessage = JSON.stringify(error.details)
        }
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.code) {
        errorMessage = `Error code: ${error.code}`
      }

      console.error('❌ [Plaid] Final error message:', errorMessage)
      throw new Error(`Failed to create Plaid link token: ${errorMessage}`)
    }
  },

  async exchangePlaidPublicToken(publicToken) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Use Firebase Functions callable
      const { httpsCallable } = await import('firebase/functions')
      const { functions } = await import('../config/firebase')
      const exchangeToken = httpsCallable(functions, 'exchangePlaidToken')

      const result = await exchangeToken({ publicToken })
      return result.data
    } catch (error) {
      console.error('Plaid exchange token error:', error)
      throw new Error(`Failed to exchange Plaid token: ${error.message || error.code || 'Unknown error'}`)
    }
  },

  async syncPlaidAccounts(accessToken) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Use Firebase Functions callable
      const { httpsCallable } = await import('firebase/functions')
      const { functions } = await import('../config/firebase')
      const syncAccounts = httpsCallable(functions, 'syncPlaidAccounts')

      const result = await syncAccounts({ accessToken })
      // Return the full result object which includes accounts, accountsCount, transactionsCount
      return result.data
    } catch (error) {
      console.error('Plaid sync accounts error:', error)
      throw new Error(`Failed to sync Plaid accounts: ${error.message || error.code || 'Unknown error'}`)
    }
  },

  async syncPlaidTransactions(accessToken = null) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const { httpsCallable } = await import('firebase/functions')
      const { functions } = await import('../config/firebase')
      const syncTransactions = httpsCallable(functions, 'syncPlaidTransactions', { timeout: 120000 })

      const result = await syncTransactions(accessToken ? { accessToken } : {})
      return result.data
    } catch (error) {
      console.error('Plaid sync transactions error:', error)
      throw new Error(`Failed to sync transactions: ${error.message || error.code || 'Unknown error'}`)
    }
  },

  // Trading & AI Features
  async getAutomationSettings() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const settingsRef = doc(db, 'automation_settings', userId)
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        return { id: settingsDoc.id, ...settingsDoc.data() }
      }

      // Return default settings
      return {
        rules: {
          autoCategorize: true,
          budgetAlerts: true,
          anomalyDetection: true,
          recurringDetection: true
        },
        n8n_webhook_url: ''
      }
    } catch (error) {
      throw new Error(`Failed to get automation settings: ${error.message}`)
    }
  },

  async updateAutomationRule(ruleName, value) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const settingsRef = doc(db, 'automation_settings', userId)
      const settingsDoc = await getDoc(settingsRef)

      const currentData = settingsDoc.exists() ? settingsDoc.data() : { rules: {} }

      await updateDoc(settingsRef, {
        rules: {
          ...currentData.rules,
          [ruleName]: value
        },
        updated_at: serverTimestamp()
      }, { merge: true })

      return { success: true }
    } catch (error) {
      throw new Error(`Failed to update automation rule: ${error.message}`)
    }
  },

  async getWorkflows() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const workflowsRef = collection(db, 'workflows')
      const q = query(
        workflowsRef,
        where('user_id', '==', userId)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      throw new Error(`Failed to get workflows: ${error.message}`)
    }
  },

  async createWorkflow(workflow) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const workflowData = {
        ...workflow,
        user_id: userId,
        active: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'workflows'), workflowData)
      return { id: docRef.id, ...workflowData }
    } catch (error) {
      throw new Error(`Failed to create workflow: ${error.message}`)
    }
  },

  async deleteWorkflow(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const workflowRef = doc(db, 'workflows', id)
      const workflowDoc = await getDoc(workflowRef)

      if (!workflowDoc.exists()) throw new Error('Workflow not found')
      if (workflowDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await deleteDoc(workflowRef)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete workflow: ${error.message}`)
    }
  },

  async getFinancialNews() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // This would typically call a Firebase Function that fetches from Finnhub
      // For now, return empty array - can be enhanced later
      return []
    } catch (error) {
      throw new Error(`Failed to get financial news: ${error.message}`)
    }
  },

  // Admin: Get uncategorized transactions
  // Includes transactions with null category_id OR invalid category_id (category doesn't exist)
  async getUncategorizedTransactions() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      // Get all transactions for the user
      const transactionsRef = collection(db, 'transactions')
      const transactionsQuery = query(
        transactionsRef,
        where('user_id', '==', userId)
      )
      const transactionsSnapshot = await getDocs(transactionsQuery)

      // Get all valid category IDs for this user
      const categoriesRef = collection(db, 'categories')
      const categoriesQuery = query(
        categoriesRef,
        where('user_id', '==', userId)
      )
      const categoriesSnapshot = await getDocs(categoriesQuery)
      const validCategoryIds = new Set(categoriesSnapshot.docs.map(doc => doc.id))

      // Filter transactions that are uncategorized (null category_id or invalid category_id)
      const uncategorizedTransactions = []
      transactionsSnapshot.docs.forEach(doc => {
        const transaction = { id: doc.id, ...doc.data() }
        const categoryId = transaction.category_id

        // Transaction is uncategorized if:
        // 1. category_id is null/undefined, OR
        // 2. category_id exists but is not in the valid categories list, OR
        // 3. category_id exists but category_name is missing (invalid category)
        if (!categoryId || !validCategoryIds.has(categoryId) || !transaction.category_name) {
          uncategorizedTransactions.push(transaction)
        }
      })

      return uncategorizedTransactions
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getUncategorizedTransactions')
      throw new Error(`Failed to get uncategorized transactions: ${errorMsg}`)
    }
  },

  // Admin: Get all transactions (for recategorization)
  async getAllTransactions() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const q = query(
        collection(db, 'transactions'),
        where('user_id', '==', userId)
      )

      const snapshot = await getDocs(q)
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return transactions
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getAllTransactions')
      throw new Error(`Failed to get all transactions: ${errorMsg}`)
    }
  },

  // Admin: Clear categories from all transactions
  async clearAllCategories() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const { writeBatch, doc, serverTimestamp, deleteField } = await import('firebase/firestore')

      const transactions = await this.getAllTransactions()

      if (transactions.length === 0) {
        return { success: true, clearedCount: 0 }
      }

      // Process in batches of 500 (Firestore limit)
      const batchSize = 500
      let clearedCount = 0

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = writeBatch(db)
        const batchTransactions = transactions.slice(i, i + batchSize)

        batchTransactions.forEach(transaction => {
          const transactionRef = doc(db, 'transactions', transaction.id)
          batch.update(transactionRef, {
            category_id: deleteField(),
            category_source: deleteField(),
            category_suggested: deleteField(),
            category_confidence: deleteField(),
            updated_at: serverTimestamp()
          })
        })

        await batch.commit()
        clearedCount += batchTransactions.length
      }

      return { success: true, clearedCount }
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'clearAllCategories')
      throw new Error(`Failed to clear categories: ${errorMsg}`)
    }
  },

  // Update all transactions for a merchant pattern and save mapping
  async updateTransactionsForMerchant({ user_id, merchant, category_id, transaction_type }) {
    try {
      if (!user_id || !merchant || !category_id || !transaction_type) {
        throw new Error('user_id, merchant, category_id, and transaction_type are required')
      }

      // Normalize merchant for pattern matching (same as N8N)
      const normalize = (str) => {
        if (!str) return ''
        return str
          .toUpperCase()
          .replace(/[^A-Z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }

      const pattern = normalize(merchant)

      // Get category name
      const categoryDoc = await getDoc(doc(db, 'categories', category_id))
      if (!categoryDoc.exists()) {
        throw new Error('Category not found')
      }
      const categoryName = categoryDoc.data().name

      // Call Firebase function to update all transactions and save mapping
      const { httpsCallable } = await import('firebase/functions')
      const { getFunctions } = await import('firebase/functions')
      const functions = getFunctions()
      const updateTransactionsForMerchantFn = httpsCallable(functions, 'updateTransactionsForMerchant')

      const result = await updateTransactionsForMerchantFn({
        user_id,
        merchant,
        pattern,
        category_id,
        category_name: categoryName,
        transaction_type
      })

      return result.data
    } catch (error) {
      throw new Error(`Failed to update transactions for merchant: ${error.message}`)
    }
  },

  // Admin: Batch categorize transactions via N8N
  async categorizeTransactionsBatch(transactions) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      if (!Array.isArray(transactions) || transactions.length === 0) {
        throw new Error('Transactions array is required and must not be empty')
      }

      console.log('🟢 [FirebaseAPI] Starting batch categorization for', transactions.length, 'transactions')

      // Prepare transactions for N8N (only send necessary fields)
      const payload = transactions.map(tx => ({
        transaction_id: tx.id || tx.transaction_id,
        user_id: tx.user_id || userId,
        description: tx.description || '',
        merchant: tx.merchant || '',
        type: tx.type || 'expense',
        amount: tx.amount || 0,
        date: tx.date || ''
      }))

      console.log('🟢 [FirebaseAPI] Prepared payload:', {
        count: payload.length,
        firstTransaction: payload[0],
        sampleIds: payload.slice(0, 5).map(t => t.transaction_id)
      })

      // Get N8N webhook URL - you'll need to configure this
      const N8N_WEBHOOK_URL = 'https://money-magnet-cf5a4.app.n8n.cloud/webhook/categorize-transactions-batch'

      console.log('🟢 [FirebaseAPI] Sending request to N8N:', {
        url: N8N_WEBHOOK_URL,
        transactionCount: payload.length
      })

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transactions: payload })
      })

      console.log('🟢 [FirebaseAPI] N8N response status:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [FirebaseAPI] N8N request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        throw new Error(`N8N request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ [FirebaseAPI] N8N response received:', {
        success: result.success,
        count: result.count,
        resultsCount: result.results?.length || 0,
        firstResult: result.results?.[0] || null,
        sampleResults: result.results?.slice(0, 3) || []
      })

      // Log sample of categorized results
      if (result.results && result.results.length > 0) {
        const categorized = result.results.filter(r => r.category_id)
        const uncategorized = result.results.filter(r => !r.category_id)
        console.log('📊 [FirebaseAPI] Categorization summary:', {
          total: result.results.length,
          categorized: categorized.length,
          uncategorized: uncategorized.length,
          categorizedSample: categorized.slice(0, 3),
          uncategorizedSample: uncategorized.slice(0, 3)
        })
      }

      return result
    } catch (error) {
      console.error('❌ [FirebaseAPI] Error in categorizeTransactionsBatch:', {
        message: error.message,
        stack: error.stack,
        error: error
      })
      throw new Error(`Failed to categorize transactions batch: ${error.message}`)
    }
  },

  // Balance Snapshots
  async createBalanceSnapshot(account_id, date) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) {
        console.error('❌ [FirebaseAPI] createBalanceSnapshot: Not authenticated')
        throw new Error('Not authenticated')
      }

      console.log('🟢 [FirebaseAPI] createBalanceSnapshot: Creating snapshot for account:', account_id)

      const { httpsCallable } = await import('firebase/functions')
      const { getFunctions } = await import('firebase/functions')
      const functions = getFunctions()
      const createBalanceSnapshotFn = httpsCallable(functions, 'createBalanceSnapshot')

      console.log('🟢 [FirebaseAPI] createBalanceSnapshot: Calling function with:', {
        account_id,
        date: date || null
      })

      const result = await createBalanceSnapshotFn({
        account_id,
        date: date || null // If not provided, uses current date
      })

      console.log('✅ [FirebaseAPI] createBalanceSnapshot: Success:', result.data)
      return result.data
    } catch (error) {
      console.error('❌ [FirebaseAPI] createBalanceSnapshot error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      })
      throw new Error(`Failed to create balance snapshot: ${error.message}`)
    }
  },

  async getBalanceSnapshots(account_id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) {
        console.error('❌ [FirebaseAPI] getBalanceSnapshots: Not authenticated')
        throw new Error('Not authenticated')
      }

      console.log('🟢 [FirebaseAPI] getBalanceSnapshots: Fetching snapshots for account:', account_id || 'all')

      const { httpsCallable } = await import('firebase/functions')
      const { getFunctions } = await import('firebase/functions')
      const functions = getFunctions()
      const getBalanceSnapshotsFn = httpsCallable(functions, 'getBalanceSnapshots')

      const result = await getBalanceSnapshotsFn({
        account_id: account_id || null // If not provided, gets all accounts
      })

      console.log('✅ [FirebaseAPI] getBalanceSnapshots: Success, found', result.data.snapshots?.length || 0, 'snapshots')
      return result.data.snapshots || []
    } catch (error) {
      console.error('❌ [FirebaseAPI] getBalanceSnapshots error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      })
      throw new Error(`Failed to get balance snapshots: ${error.message}`)
    }
  },

  // Account Mappings
  async getAccountMappings() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const q = query(
        collection(db, 'account_mappings'),
        where('user_id', '==', userId)
      )
      const snapshot = await getDocs(q)
      const mappings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      return mappings
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getAccountMappings')
      throw new Error(`Failed to fetch account mappings: ${errorMsg}`)
    }
  },

  async createAccountMapping(csvName, targetAccountId) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const mappingData = {
        user_id: userId,
        csv_name: csvName,
        target_account_id: targetAccountId,
        created_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'account_mappings'), mappingData)
      return { id: docRef.id, ...mappingData }
    } catch (error) {
      throw new Error(`Failed to create account mapping: ${error.message}`)
    }
  },

  async deleteAccountMapping(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const mappingRef = doc(db, 'account_mappings', id)
      const mappingDoc = await getDoc(mappingRef)

      if (!mappingDoc.exists()) throw new Error('Mapping not found')
      if (mappingDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await deleteDoc(mappingRef)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete account mapping: ${error.message}`)
    }
  },

  // Category Mappings
  async getCategoryMappings() {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const q = query(
        collection(db, 'category_mappings'),
        where('user_id', '==', userId)
      )
      const snapshot = await getDocs(q)
      const mappings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      return mappings
    } catch (error) {
      const errorMsg = handleFirestoreError(error, 'getCategoryMappings')
      throw new Error(`Failed to fetch category mappings: ${errorMsg}`)
    }
  },

  async createCategoryMapping(csvName, targetCategoryId) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const mappingData = {
        user_id: userId,
        csv_name: csvName,
        target_category_id: targetCategoryId,
        created_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'category_mappings'), mappingData)
      return { id: docRef.id, ...mappingData }
    } catch (error) {
      throw new Error(`Failed to create category mapping: ${error.message}`)
    }
  },

  async deleteCategoryMapping(id) {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('Not authenticated')

      const mappingRef = doc(db, 'category_mappings', id)
      const mappingDoc = await getDoc(mappingRef)

      if (!mappingDoc.exists()) throw new Error('Mapping not found')
      if (mappingDoc.data().user_id !== userId) throw new Error('Unauthorized')

      await deleteDoc(mappingRef)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete category mapping: ${error.message}`)
    }
  }
}

