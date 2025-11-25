const db = require('../db/database');
const Boom = require('@hapi/boom');

const routes = [
  {
    method: 'GET',
    path: '/api/accounts',
    handler: async (request, h) => {
      try {
        // For now, get first user (later add proper auth)
        const userId = 1;
        const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
        return accounts;
      } catch (error) {
        throw Boom.badImplementation('Error fetching accounts', error);
      }
    }
  },
  {
    method: 'GET',
    path: '/api/accounts/{id}',
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const userId = 1; // TODO: Get from auth
        const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId);
        
        if (!account) {
          return h.response({ error: 'Account not found' }).code(404);
        }
        
        return account;
      } catch (error) {
        throw Boom.badImplementation('Error fetching account', error);
      }
    }
  },
  {
    method: 'POST',
    path: '/api/accounts',
    handler: async (request, h) => {
      try {
        const { 
          name, 
          type, 
          account_type_id,
          balance_current, 
          balance_available, 
          interest_rate, 
          credit_limit,
          currency 
        } = request.payload;
        
        if (!name || (!type && !account_type_id)) {
          return h.response({ error: 'Name and type (or account_type_id) are required' }).code(400);
        }
        
        const userId = 1; // TODO: Get from auth
        
        // If account_type_id is not provided, try to find it by type code
        let finalAccountTypeId = account_type_id;
        if (!finalAccountTypeId && type) {
          const accountType = db.prepare('SELECT id FROM account_types WHERE code = ? AND user_id = ?').get(type, userId);
          if (accountType) {
            finalAccountTypeId = accountType.id;
          }
        }
        
        const insert = db.prepare(`
          INSERT INTO accounts (
            user_id, name, type, account_type_id, balance_current, balance_available, 
            interest_rate, credit_limit, currency
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = insert.run(
          userId,
          name,
          type || 'other',
          finalAccountTypeId,
          balance_current || 0,
          balance_available || balance_current || 0,
          interest_rate || null,
          credit_limit || null,
          currency || 'USD'
        );
        
        const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
        return account;
      } catch (error) {
        throw Boom.badImplementation('Error creating account', error);
      }
    }
  },
  {
    method: 'PUT',
    path: '/api/accounts/{id}',
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const userId = 1; // TODO: Get from auth
        const { 
          name, 
          type, 
          account_type_id,
          balance_current, 
          balance_available, 
          interest_rate, 
          credit_limit,
          currency,
          is_closed
        } = request.payload;
        
        const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId);
        
        if (!account) {
          return h.response({ error: 'Account not found' }).code(404);
        }
        
        // If account_type_id is not provided but type is, try to find it by type code
        let finalAccountTypeId = account_type_id;
        if (!finalAccountTypeId && type) {
          const accountType = db.prepare('SELECT id FROM account_types WHERE code = ? AND user_id = ?').get(type, userId);
          if (accountType) {
            finalAccountTypeId = accountType.id;
          }
        }
        
        const update = db.prepare(`
          UPDATE accounts 
          SET name = COALESCE(?, name),
              type = COALESCE(?, type),
              account_type_id = COALESCE(?, account_type_id),
              balance_current = COALESCE(?, balance_current),
              balance_available = COALESCE(?, balance_available),
              interest_rate = COALESCE(?, interest_rate),
              credit_limit = COALESCE(?, credit_limit),
              currency = COALESCE(?, currency),
              is_closed = COALESCE(?, is_closed),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        update.run(
          name,
          type,
          finalAccountTypeId,
          balance_current,
          balance_available,
          interest_rate,
          credit_limit,
          currency,
          is_closed,
          id
        );
        
        const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
        return updatedAccount;
      } catch (error) {
        throw Boom.badImplementation('Error updating account', error);
      }
    }
  },
  {
    method: 'DELETE',
    path: '/api/accounts/{id}',
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const userId = 1; // TODO: Get from auth
        
        const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId);
        
        if (!account) {
          return h.response({ error: 'Account not found' }).code(404);
        }
        
        // Check if account has transactions
        const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id = ?').get(id);
        const transactionCountNum = transactionCount.count;
        
        // Delete all transactions for this account first
        if (transactionCountNum > 0) {
          const deleteTransactions = db.prepare('DELETE FROM transactions WHERE account_id = ?');
          deleteTransactions.run(id);
        }
        
        // Delete the account
        const deleteStmt = db.prepare('DELETE FROM accounts WHERE id = ?');
        deleteStmt.run(id);
        
        return { 
          success: true, 
          message: 'Account deleted',
          transactionsDeleted: transactionCountNum
        };
      } catch (error) {
        throw Boom.badImplementation('Error deleting account', error);
      }
    }
  }
];

module.exports = routes;
