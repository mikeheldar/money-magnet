const db = require('../db/database');

const routes = [
  {
    method: 'POST',
    path: '/api/auth/login',
    handler: async (request, h) => {
      const { username, password } = request.payload;

      if (!username || !password) {
        return h.response({ error: 'Username and password are required' }).code(400);
      }

      // Simple password check (hardcoded for now)
      if (username === 'mike' && password === 'password') {
        // In a real app, you'd generate a JWT token here
        return {
          success: true,
          token: 'simple-auth-token',
          user: { username: 'mike' }
        };
      }

      return h.response({ error: 'Invalid credentials' }).code(401);
    }
  },
  {
    method: 'POST',
    path: '/api/auth/logout',
    handler: async (request, h) => {
      return { success: true, message: 'Logged out successfully' };
    }
  }
];

module.exports = routes;

