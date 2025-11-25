import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'

export default function (/* { store, ssrContext } */) {
  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHashHistory()
  })

  // Auth guard
  router.beforeEach((to, from, next) => {
    const isAuthenticated = localStorage.getItem('authToken')
    
    if (to.path === '/login') {
      if (isAuthenticated) {
        next('/')
      } else {
        next()
      }
    } else {
      if (isAuthenticated) {
        next()
      } else {
        next('/login')
      }
    }
  })

  return router
}

