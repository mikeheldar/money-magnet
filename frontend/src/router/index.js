import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { auth } from '../config/firebase'

export default function (/* { store, ssrContext } */) {
  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHashHistory()
  })

  // Auth guard with Firebase (allow login, signup, and about without auth)
  const publicPaths = ['/login', '/signup', '/about']
  router.beforeEach((to, from, next) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (publicPaths.includes(to.path)) {
        if (user && (to.path === '/login' || to.path === '/signup')) {
          next('/')
        } else {
          next()
        }
      } else {
        if (user) {
          next()
        } else {
          next('/login')
        }
      }
      unsubscribe()
    })
  })

  return router
}

