import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { auth } from '../config/firebase'

export default function (/* { store, ssrContext } */) {
  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHashHistory()
  })

  // Auth guard with Firebase
  router.beforeEach((to, from, next) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (to.path === '/login') {
        if (user) {
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

