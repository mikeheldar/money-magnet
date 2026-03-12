<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h4 q-mb-md" style="color: #3BA99F; font-weight: 600;">About Money Magnet</div>
            <p class="text-body1 text-grey-9">
              Money Magnet helps you stay intentional with money while you track where you are and see where you're going.
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
            <q-btn color="primary" label="Go to Dashboard" icon="dashboard" to="/" />
            <q-btn flat color="primary" label="Goals & vision board" icon="emoji_events" to="/goals" class="q-ml-sm" />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AboutPage'
})
</script>
