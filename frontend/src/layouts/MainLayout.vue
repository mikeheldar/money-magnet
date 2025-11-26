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

        <q-btn-dropdown
          flat
          dense
          round
          icon="account_circle"
          aria-label="Account"
        >
          <q-list>
            <q-item clickable v-close-popup @click="logout">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Sign Out</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
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
          to="/budget"
        >
          <q-item-section avatar>
            <q-icon name="account_balance_wallet" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Budget</q-item-label>
            <q-item-label caption>Income & Expenses</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator spaced />

        <q-item-label
          header
          class="text-grey-8"
        >
          Trading & AI
        </q-item-label>

        <q-item
          clickable
          v-ripple
          to="/trading/insights"
        >
          <q-item-section avatar>
            <q-icon name="insights" />
          </q-item-section>

          <q-item-section>
            <q-item-label>AI Insights</q-item-label>
            <q-item-label caption>Smart Recommendations</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          to="/trading/automation"
        >
          <q-item-section avatar>
            <q-icon name="settings_ethernet" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Automation</q-item-label>
            <q-item-label caption>Workflows & Rules</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          to="/trading/analysis"
        >
          <q-item-section avatar>
            <q-icon name="analytics" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Market Analysis</q-item-label>
            <q-item-label caption>Trends & Predictions</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          to="/trading/portfolio"
        >
          <q-item-section avatar>
            <q-icon name="pie_chart" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Portfolio</q-item-label>
            <q-item-label caption>Holdings & Performance</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator spaced />

        <q-item-label
          header
          class="text-grey-8"
        >
          Settings
        </q-item-label>

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

        <q-item
          clickable
          v-ripple
          to="/budget-categories"
        >
          <q-item-section avatar>
            <q-icon name="label" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Budget Categories</q-item-label>
            <q-item-label caption>Manage Income & Expense Categories</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator spaced />

        <q-item
          clickable
          v-ripple
          @click="logout"
        >
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Sign Out</q-item-label>
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
    import { useQuasar } from 'quasar'
    import firebaseApi from '../services/firebase-api'
    import { auth } from '../config/firebase'

    export default defineComponent({
      name: 'MainLayout',
      setup() {
        const router = useRouter()
        const $q = useQuasar()
        const leftDrawerOpen = ref(false)

        const logout = async () => {
          try {
            await firebaseApi.logout()
            localStorage.removeItem('authToken')
            $q.notify({
              type: 'positive',
              message: 'Signed out successfully',
              position: 'top'
            })
            router.push('/login')
          } catch (err) {
            console.error('Logout error:', err)
            // Still redirect even if logout fails
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

