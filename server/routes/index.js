const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');
const forecastRoutes = require('./forecast');
const accountRoutes = require('./accounts');
const accountTypeRoutes = require('./account-types');

const routes = [
  ...authRoutes,
  ...transactionRoutes,
  ...forecastRoutes,
  ...accountRoutes,
  ...accountTypeRoutes
];

module.exports = routes;

