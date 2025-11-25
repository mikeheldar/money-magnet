<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

            <q-toolbar-title style="font-weight: 600;">
              Money Magnet
            </q-toolbar-title>

        <q-btn
          flat
          dense
          round
          icon="logout"
          aria-label="Logout"
          @click="logout"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-grey-1"
    >
      <q-list>
        <q-item-label
          header
          class="text-grey-8"
        >
          Navigation
        </q-item-label>

        <q-item
          clickable
          v-ripple
          to="/"
          exact
        >
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Dashboard</q-item-label>
            <q-item-label caption>Income & Expenses</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          to="/transactions"
        >
          <q-item-section avatar>
            <q-icon name="receipt" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Transactions</q-item-label>
            <q-item-label caption>Add & Manage</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          to="/forecast"
        >
          <q-item-section avatar>
            <q-icon name="trending_up" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Forecast</q-item-label>
            <q-item-label caption>Future Balance</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          to="/accounts"
        >
          <q-item-section avatar>
            <q-icon name="account_balance" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Accounts</q-item-label>
            <q-item-label caption>Manage Accounts</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          to="/account-types"
        >
          <q-item-section avatar>
            <q-icon name="category" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Account Types</q-item-label>
            <q-item-label caption>Manage Types & Categories</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
    import { defineComponent, ref } from 'vue'
    import { useRouter } from 'vue-router'
    import firebaseApi from '../services/firebase-api'

    export default defineComponent({
      name: 'MainLayout',
      setup() {
        const router = useRouter()
        const leftDrawerOpen = ref(false)

        const logout = async () => {
          try {
            await firebaseApi.logout()
          } catch (err) {
            console.error('Logout error:', err)
          } finally {
            localStorage.removeItem('authToken')
            router.push('/login')
          }
        }

    return {
      leftDrawerOpen,
      logout
    }
  }
})
</script>

