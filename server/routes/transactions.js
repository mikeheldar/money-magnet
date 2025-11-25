const db = require('../db/database');
const Boom = require('@hapi/boom');

const routes = [
  {
    method: 'GET',
    path: '/api/transactions',
    handler: async (request, h) => {
      try {
        const { period, startDate, endDate, account_id } = request.query;
        const userId = 1; // TODO: Get from auth
        
        let query = 'SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ?';
        const params = [userId];
        
        if (account_id) {
          query += ' AND t.account_id = ?';
          params.push(account_id);
        }
        
        if (period === 'weekly') {
          const today = new Date();
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          query += ' AND t.date >= ? AND t.date <= ?';
          params.push(weekStart.toISOString().split('T')[0]);
          params.push(weekEnd.toISOString().split('T')[0]);
        } else if (period === 'monthly') {
          const today = new Date();
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          query += ' AND t.date >= ? AND t.date <= ?';
          params.push(monthStart.toISOString().split('T')[0]);
          params.push(monthEnd.toISOString().split('T')[0]);
        } else if (period === 'yearly') {
          const today = new Date();
          const yearStart = new Date(today.getFullYear(), 0, 1);
          const yearEnd = new Date(today.getFullYear(), 11, 31);
          
          query += ' AND t.date >= ? AND t.date <= ?';
          params.push(yearStart.toISOString().split('T')[0]);
          params.push(yearEnd.toISOString().split('T')[0]);
        } else if (startDate && endDate) {
          query += ' AND t.date >= ? AND t.date <= ?';
          params.push(startDate);
          params.push(endDate);
        }
        
        query += ' ORDER BY t.date DESC, t.created_at DESC';
        
        const transactions = db.prepare(query).all(...params);
        
        // Join with accounts
        const transactionsWithAccounts = transactions.map(t => {
          if (t.account_id) {
            const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(t.account_id);
            return { ...t, account };
          }
          return t;
        });
        
        return transactionsWithAccounts;
      } catch (error) {
        throw Boom.badImplementation('Error fetching transactions', error);
      }
    }
  },
  {
    method: 'GET',
    path: '/api/transactions/summary',
    handler: async (request, h) => {
      try {
        const { period } = request.query;
        const userId = 1; // TODO: Get from auth
        
        let query = 'SELECT type, SUM(amount) as total FROM transactions WHERE user_id = ?';
        const params = [userId];
        
        if (period === 'weekly') {
          const today = new Date();
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          query += ' AND date >= ? AND date <= ?';
          params.push(weekStart.toISOString().split('T')[0]);
          params.push(weekEnd.toISOString().split('T')[0]);
        } else if (period === 'monthly') {
          const today = new Date();
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          query += ' AND date >= ? AND date <= ?';
          params.push(monthStart.toISOString().split('T')[0]);
          params.push(monthEnd.toISOString().split('T')[0]);
        } else if (period === 'yearly') {
          const today = new Date();
          const yearStart = new Date(today.getFullYear(), 0, 1);
          const yearEnd = new Date(today.getFullYear(), 11, 31);
          
          query += ' AND date >= ? AND date <= ?';
          params.push(yearStart.toISOString().split('T')[0]);
          params.push(yearEnd.toISOString().split('T')[0]);
        }
        
        query += ' GROUP BY type';
        
        const summary = db.prepare(query).all(...params);
        
        const income = summary.find(s => s.type === 'income')?.total || 0;
        const expense = summary.find(s => s.type === 'expense')?.total || 0;
        
        return {
          income: income,
          expense: Math.abs(expense),
          net: income + expense // expense is negative, so we add
        };
      } catch (error) {
        throw Boom.badImplementation('Error fetching summary', error);
      }
    }
  },
  {
    method: 'POST',
    path: '/api/transactions',
    handler: async (request, h) => {
      try {
        const { amount, date, type, description, category_id, account_id, merchant } = request.payload;
        const userId = 1; // TODO: Get from auth
        
        if (!amount || !date || !type) {
          return h.response({ error: 'Amount, date, and type are required' }).code(400);
        }
        
        if (type !== 'income' && type !== 'expense' && type !== 'transfer') {
          return h.response({ error: 'Type must be income, expense, or transfer' }).code(400);
        }
        
        // If expense, make amount negative
        const transactionAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
        
        const insert = db.prepare(`
          INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, merchant, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = insert.run(
          userId,
          account_id || null,
          category_id || null,
          type,
          transactionAmount,
          description || null,
          merchant || null,
          date
        );
        
        // Update account balance if account_id is provided
        if (account_id) {
          const updateAccount = db.prepare('UPDATE accounts SET balance_current = balance_current + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
          updateAccount.run(transactionAmount, account_id);
        }
        
        const transaction = db.prepare('SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?').get(result.lastInsertRowid);
        
        if (transaction.account_id) {
          const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(transaction.account_id);
          return { ...transaction, account };
        }
        
        return transaction;
      } catch (error) {
        throw Boom.badImplementation('Error creating transaction', error);
      }
    }
  },
  {
    method: 'DELETE',
    path: '/api/transactions/{id}',
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const userId = 1; // TODO: Get from auth
        
        // Get transaction before deleting
        const transaction = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId);
        
        if (!transaction) {
          return h.response({ error: 'Transaction not found' }).code(404);
        }
        
        // Update account balance if account_id is provided
        if (transaction.account_id) {
          const updateAccount = db.prepare('UPDATE accounts SET balance_current = balance_current - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
          updateAccount.run(transaction.amount, transaction.account_id);
        }
        
        const deleteStmt = db.prepare('DELETE FROM transactions WHERE id = ?');
        deleteStmt.run(id);
        
        return { success: true, message: 'Transaction deleted' };
      } catch (error) {
        throw Boom.badImplementation('Error deleting transaction', error);
      }
    }
  }
];

module.exports = routes;
