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
      { path: 'seed-data', component: () => import('pages/SeedData.vue') }
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

