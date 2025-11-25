const db = require('../db/database');
const Boom = require('@hapi/boom');

const routes = [
  {
    method: 'GET',
    path: '/api/forecast',
    handler: async (request, h) => {
      try {
        const { targetDate } = request.query;
        
        if (!targetDate) {
          return h.response({ error: 'targetDate is required' }).code(400);
        }
        
        const today = new Date();
        const target = new Date(targetDate);
        
        // Get current month summary
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const currentMonthQuery = `
          SELECT type, SUM(amount) as total 
          FROM transactions 
          WHERE date >= ? AND date <= ?
          GROUP BY type
        `;
        
        const currentMonthSummary = db.prepare(currentMonthQuery).all(
          currentMonthStart.toISOString().split('T')[0],
          currentMonthEnd.toISOString().split('T')[0]
        );
        
        const currentIncome = currentMonthSummary.find(s => s.type === 'income')?.total || 0;
        const currentExpense = currentMonthSummary.find(s => s.type === 'expense')?.total || 0;
        
        // Get all accounts total balance
        const accountsQuery = 'SELECT SUM(balance) as total FROM accounts';
        const accountsResult = db.prepare(accountsQuery).get();
        const currentBalance = accountsResult?.total || 0;
        
        // Calculate days in current month
        const daysInMonth = currentMonthEnd.getDate();
        const currentDay = today.getDate();
        const daysRemaining = daysInMonth - currentDay;
        
        // Calculate average daily expense/income for current month
        const avgDailyIncome = currentDay > 0 ? currentIncome / currentDay : 0;
        const avgDailyExpense = currentDay > 0 ? Math.abs(currentExpense) / currentDay : 0;
        
        // Calculate projected balance
        // If target date is in current month
        if (target.getMonth() === today.getMonth() && target.getFullYear() === today.getFullYear()) {
          const daysUntilTarget = target.getDate() - currentDay;
          const projectedIncome = avgDailyIncome * daysUntilTarget;
          const projectedExpense = avgDailyExpense * daysUntilTarget;
          const projectedBalance = currentBalance + projectedIncome - projectedExpense;
          
          return {
            currentBalance,
            currentMonth: {
              income: currentIncome,
              expense: Math.abs(currentExpense),
              net: currentIncome + currentExpense,
              daysRemaining,
              avgDailyIncome,
              avgDailyExpense
            },
            targetDate: targetDate,
            projectedBalance,
            projectedIncome,
            projectedExpense
          };
        } else {
          // For future months, use monthly averages
          const monthsDiff = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
          
          // Get historical monthly averages
          const historicalQuery = `
            SELECT 
              type,
              AVG(total) as avg
            FROM (
              SELECT 
                type,
                strftime('%Y-%m', date) as month,
                SUM(amount) as total
              FROM transactions
              WHERE date < ?
              GROUP BY type, month
            )
            GROUP BY type
          `;
          
          const historical = db.prepare(historicalQuery).all(currentMonthStart.toISOString().split('T')[0]);
          const avgMonthlyIncome = historical.find(h => h.type === 'income')?.avg || 0;
          const avgMonthlyExpense = Math.abs(historical.find(h => h.type === 'expense')?.avg || 0);
          
          // Calculate projected balance
          const projectedIncome = avgMonthlyIncome * monthsDiff;
          const projectedExpense = avgMonthlyExpense * monthsDiff;
          const projectedBalance = currentBalance + projectedIncome - projectedExpense;
          
          return {
            currentBalance,
            currentMonth: {
              income: currentIncome,
              expense: Math.abs(currentExpense),
              net: currentIncome + currentExpense,
              daysRemaining,
              avgDailyIncome,
              avgDailyExpense
            },
            targetDate: targetDate,
            projectedBalance,
            projectedIncome,
            projectedExpense,
            monthsDiff
          };
        }
      } catch (error) {
        throw Boom.badImplementation('Error calculating forecast', error);
      }
    }
  }
];

module.exports = routes;

