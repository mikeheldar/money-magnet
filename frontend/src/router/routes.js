const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/Dashboard.vue') },
      { path: 'transactions', component: () => import('pages/Transactions.vue') },
      { path: 'forecast', component: () => import('pages/Forecast.vue') },
      { path: 'accounts', component: () => import('pages/Accounts.vue') },
      { path: 'account-types', component: () => import('pages/AccountTypes.vue') },
      { path: 'budget', component: () => import('pages/Budget.vue') },
      { path: 'budget-categories', component: () => import('pages/BudgetCategories.vue') },
      { path: 'seed-data', component: () => import('pages/SeedData.vue') },
      { path: 'trading/insights', component: () => import('pages/trading/Insights.vue') },
      { path: 'trading/automation', component: () => import('pages/trading/Automation.vue') },
      { path: 'trading/analysis', component: () => import('pages/trading/Analysis.vue') },
      { path: 'trading/portfolio', component: () => import('pages/trading/Portfolio.vue') },
      { path: 'admin', component: () => import('pages/Admin.vue') }
    ]
  },
  {
    path: '/login',
    component: () => import('pages/Login.vue')
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/Error404.vue')
  }
]

export default routes

