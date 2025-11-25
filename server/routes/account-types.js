const db = require('../db/database');
const Boom = require('@hapi/boom');

const routes = [
  // Account Type Categories
  {
    method: 'GET',
    path: '/api/account-type-categories',
    handler: async (request, h) => {
      try {
        const userId = 1; // TODO: Get from auth
        const categories = db.prepare('SELECT * FROM account_type_categories WHERE user_id = ? ORDER BY name').all(userId);
        return categories;
      } catch (error) {
        throw Boom.badImplementation('Error fetching account type categories', error);
      }
    }
  },
  {
    method: 'POST',
    path: '/api/account-type-categories',
    handler: async (request, h) => {
      try {
        const { name, description } = request.payload;
        const userId = 1; // TODO: Get from auth
        
        if (!name) {
          return h.response({ error: 'Name is required' }).code(400);
        }
        
        const insert = db.prepare('INSERT INTO account_type_categories (user_id, name, description) VALUES (?, ?, ?)');
        const result = insert.run(userId, name, description || null);
        
        const category = db.prepare('SELECT * FROM account_type_categories WHERE id = ?').get(result.lastInsertRowid);
        return category;
      } catch (error) {
        throw Boom.badImplementation('Error creating account type category', error);
      }
    }
  },
  {
    method: 'PUT',
    path: '/api/account-type-categories/{id}',
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const userId = 1;
        const { name, description } = request.payload;
        
        const category = db.prepare('SELECT * FROM account_type_categories WHERE id = ? AND user_id = ?').get(id, userId);
        if (!category) {
          return h.response({ error: 'Category not found' }).code(404);
        }
        
        const update = db.prepare('UPDATE account_type_categories SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        update.run(name, description, id);
        
        return db.prepare('SELECT * FROM account_type_categories WHERE id = ?').get(id);
      } catch (error) {
        throw Boom.badImplementation('Error updating account type category', error);
      }
    }
  },
  {
    method: 'DELETE',
    path: '/api/account-type-categories/{id}',
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const userId = 1;
        
        // Check if category has account types
        const typeCount = db.prepare('SELECT COUNT(*) as count FROM account_types WHERE category_id = ?').get(id);
        if (typeCount.count > 0) {
          return h.response({ error: 'Cannot delete category with existing account types' }).code(400);
        }
        
        const deleteStmt = db.prepare('DELETE FROM account_type_categories WHERE id = ? AND user_id = ?');
        deleteStmt.run(id, userId);
        
        return { success: true, message: 'Category deleted' };
      } catch (error) {
        throw Boom.badImplementation('Error deleting account type category', error);
      }
    }
  },
  
  // Account Types
  {
    method: 'GET',
    path: '/api/account-types',
    handler: async (request, h) => {
      try {
        const userId = 1; // TODO: Get from auth
        const types = db.prepare(`
          SELECT at.*, atc.name as category_name 
          FROM account_types at 
          LEFT JOIN account_type_categories atc ON at.category_id = atc.id 
          WHERE at.user_id = ? 
          ORDER BY atc.name, at.name
        `).all(userId);
        return types;
      } catch (error) {
        throw Boom.badImplementation('Error fetching account types', error);
      }
    }
  },
  {
    method: 'POST',
    path: '/api/account-types',
    handler: async (request, h) => {
      try {
        const { name, code, description, category_id } = request.payload;
        const userId = 1; // TODO: Get from auth
        
        if (!name || !code) {
          return h.response({ error: 'Name and code are required' }).code(400);
        }
        
        const insert = db.prepare('INSERT INTO account_types (user_id, category_id, name, code, description) VALUES (?, ?, ?, ?, ?)');
        const result = insert.run(userId, category_id || null, name, code, description || null);
        
        const accountType = db.prepare(`
          SELECT at.*, atc.name as category_name 
          FROM account_types at 
          LEFT JOIN account_type_categories atc ON at.category_id = atc.id 
          WHERE at.id = ?
        `).get(result.lastInsertRowid);
        return accountType;
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return h.response({ error: 'Account type code already exists' }).code(400);
        }
        throw Boom.badImplementation('Error creating account type', error);
      }
    }
  },
  {
    method: 'PUT',
    path: '/api/account-types/{id}',
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const userId = 1;
        const { name, code, description, category_id } = request.payload;
        
        const accountType = db.prepare('SELECT * FROM account_types WHERE id = ? AND user_id = ?').get(id, userId);
        if (!accountType) {
          return h.response({ error: 'Account type not found' }).code(404);
        }
        
        const update = db.prepare('UPDATE account_types SET name = COALESCE(?, name), code = COALESCE(?, code), description = COALESCE(?, description), category_id = COALESCE(?, category_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        update.run(name, code, description, category_id, id);
        
        return db.prepare(`
          SELECT at.*, atc.name as category_name 
          FROM account_types at 
          LEFT JOIN account_type_categories atc ON at.category_id = atc.id 
          WHERE at.id = ?
        `).get(id);
      } catch (error) {
        throw Boom.badImplementation('Error updating account type', error);
      }
    }
  },
  {
    method: 'DELETE',
    path: '/api/account-types/{id}',
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const userId = 1;
        
        // Check if account type is used by accounts
        const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE account_type_id = ?').get(id);
        if (accountCount.count > 0) {
          return h.response({ error: 'Cannot delete account type that is in use' }).code(400);
        }
        
        const deleteStmt = db.prepare('DELETE FROM account_types WHERE id = ? AND user_id = ?');
        deleteStmt.run(id, userId);
        
        return { success: true, message: 'Account type deleted' };
      } catch (error) {
        throw Boom.badImplementation('Error deleting account type', error);
      }
    }
  },
  
  // Get balances by account type/category for dashboard
  {
    method: 'GET',
    path: '/api/accounts/balances-by-type',
    handler: async (request, h) => {
      try {
        const userId = 1;
        const { groupBy } = request.query; // 'account', 'type', or 'category'
        
        if (groupBy === 'account') {
          // Group by individual accounts
          const query = `
            SELECT 
              a.name as account_name,
              a.id as account_id,
              COALESCE(at.name, a.type) as type_name,
              COALESCE(atc.name, 'Uncategorized') as category_name,
              a.balance_current as total_balance,
              atc.name as category_name_for_color
            FROM accounts a
            LEFT JOIN account_types at ON a.account_type_id = at.id
            LEFT JOIN account_type_categories atc ON at.category_id = atc.id
            WHERE a.user_id = ? AND a.is_closed = 0
            ORDER BY atc.name, at.name, a.name
          `;
          return db.prepare(query).all(userId);
        } else if (groupBy === 'category') {
          // Group by category
          const query = `
            SELECT 
              COALESCE(atc.name, 'Uncategorized') as group_name,
              COALESCE(atc.id, 0) as category_id,
              COALESCE(atc.name, 'Uncategorized') as category_name_for_color,
              SUM(a.balance_current) as total_balance,
              COUNT(a.id) as account_count
            FROM accounts a
            LEFT JOIN account_types at ON a.account_type_id = at.id
            LEFT JOIN account_type_categories atc ON at.category_id = atc.id
            WHERE a.user_id = ? AND a.is_closed = 0
            GROUP BY atc.id, atc.name
            ORDER BY atc.name
          `;
          return db.prepare(query).all(userId);
        } else {
          // Group by account type
          const query = `
            SELECT 
              COALESCE(at.name, a.type) as type_name,
              COALESCE(at.id, 0) as type_id,
              at.code as type_code,
              COALESCE(atc.name, 'Uncategorized') as category_name,
              COALESCE(atc.name, 'Uncategorized') as category_name_for_color,
              SUM(a.balance_current) as total_balance,
              COUNT(a.id) as account_count
            FROM accounts a
            LEFT JOIN account_types at ON a.account_type_id = at.id
            LEFT JOIN account_type_categories atc ON at.category_id = atc.id
            WHERE a.user_id = ? AND a.is_closed = 0
            GROUP BY at.id, at.name, at.code, atc.name
            ORDER BY atc.name, at.name
          `;
          return db.prepare(query).all(userId);
        }
      } catch (error) {
        throw Boom.badImplementation('Error fetching balances by type', error);
      }
    }
  }
];

module.exports = routes;

