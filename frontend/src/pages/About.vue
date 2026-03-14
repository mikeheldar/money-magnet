<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h4 q-mb-md" style="color: #3BA99F; font-weight: 600;">About Money Magnet</div>
            <p class="text-body1 text-grey-9">
              Where intention meets numbers—manifest your financial future. Money Magnet helps you stay intentional with money while you track where you are and see where you're going.
            </p>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md" style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h6 q-mb-sm" style="color: #3BA99F; font-weight: 600;">The story behind it</div>
            <p class="text-body2 text-grey-8">
              I've tried a lot of money management solutions: manually in spreadsheets for years, Mint when it came out (I was really excited—it didn't live up to everything it promised and eventually was bought and fizzled out), Rocket Money for subscriptions and savings finds, and I pay for Monarch now. None of them had a couple of features I wanted.
            </p>
            <p class="text-body2 text-grey-8 q-mt-sm">
              <strong>One:</strong> The ability to clearly forecast or predict how much cash I'll have in an account. I know when my bills come out and the seasonality of my bills—daily, weekly, bi-weekly, monthly, quarterly, yearly. I know my spending trends, when I buy camp for my kids, when I'll need car maintenance. I wanted a great predictive model that says what I should have for sure and probably in the next week, month, and quarter, and how much I'll save based on current setup and transfers. That desire for a good forecast led to an early name for the site: <em>Forecash</em>.
            </p>
            <p class="text-body2 text-grey-8 q-mt-sm">
              <strong>Two:</strong> As I work on my beliefs and skills around money, I've read books like <em>Rich Dad Poor Dad</em> and <em>The 5am Club</em> and started mantras I repeat regularly—like "I am a money magnet." Financial learning and reminders became important to me, and goals matter. So the app is called <strong>Money Magnet</strong> (other ideas along the way included Mintation and Moneyfestation).
            </p>
            <p class="text-body2 text-grey-8 q-mt-sm">
              Money Magnet combines <strong>financial goals</strong>, <strong>improving beliefs around money with mantras</strong>, and <strong>tools to forecast</strong> how you'll do toward those goals with your current behavior. Right now it's being built and hardened for personal use, with the goal of expanding when it's proven.
            </p>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md" style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h6 q-mb-sm" style="color: #3BA99F; font-weight: 600;">Why Money Magnet</div>
            <p class="text-body2 text-grey-8">
              This is your space for money mantras and manifestation—daily quotes and a vision board for your financial goals—alongside practical tools that turn intention into action. Track spending, plan budgets, and forecast your balance so you can move toward what you want with clarity.
            </p>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md" style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h6 q-mb-sm" style="color: #3BA99F; font-weight: 600;">Who it's for</div>
            <p class="text-body2 text-grey-8">
              Money Magnet is for anyone who wants to align their money with their values and dreams, not just log transactions. Whether you're setting intentions, building a vision board, or keeping a clear view of income and expenses, you get both the mindset and the numbers in one place.
            </p>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md" style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h6 q-mb-sm" style="color: #3BA99F; font-weight: 600;">What you can do</div>
            <ul class="text-body2 text-grey-8 q-pl-md">
              <li>Create and pin financial goals with links and time horizons—a vision board for your money</li>
              <li>See daily mantras and quotes to stay intentional about wealth and value</li>
              <li>Track income and expenses and manage transactions</li>
              <li>Budget by category and compare to actuals</li>
              <li>Forecast your balance and see where you're headed</li>
              <li>Manage accounts and recurring transactions</li>
            </ul>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md" style="border-radius: 12px;">
          <q-card-section class="text-center">
            <div class="text-body2 text-grey-8 q-mb-md">Ready to bring intention and numbers together?</div>
            <template v-if="isLoggedIn">
              <q-btn color="primary" label="Go to Dashboard" icon="dashboard" to="/" />
              <q-btn flat color="primary" label="Goals & vision board" icon="emoji_events" to="/goals" class="q-ml-sm" />
            </template>
            <template v-else>
              <q-btn color="primary" label="Sign up" icon="person_add" to="/signup" />
              <q-btn flat color="primary" label="Log in" icon="login" to="/login" class="q-ml-sm" />
            </template>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { auth } from '../config/firebase'

export default defineComponent({
  name: 'AboutPage',
  setup() {
    const isLoggedIn = ref(!!auth.currentUser)
    let unsubscribe = null
    onMounted(() => {
      unsubscribe = auth.onAuthStateChanged((user) => {
        isLoggedIn.value = !!user
      })
    })
    onUnmounted(() => {
      if (unsubscribe) unsubscribe()
    })
    return { isLoggedIn }
  }
})
</script>
