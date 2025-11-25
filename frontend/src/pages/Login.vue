<template>
  <div class="flex flex-center q-page--login" style="min-height: 100vh; width: 100%;">
    <q-card class="q-pa-md" style="min-width: 350px; box-shadow: 0 8px 24px rgba(78, 205, 196, 0.2);">
      <q-card-section>
                <div class="text-h4 text-center q-mb-md" style="color: #4ECDC4; font-weight: 600;">Money Magnet</div>
        <div class="text-subtitle2 text-center q-mb-lg" style="color: #6B7280;">Finance Management</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="username"
            label="Username"
            outlined
            :rules="[val => !!val || 'Username is required']"
          />

          <q-input
            v-model="password"
            label="Password"
            type="password"
            outlined
            :rules="[val => !!val || 'Password is required']"
          />

          <div v-if="error" class="text-negative q-mt-sm">
            {{ error }}
          </div>

          <div>
            <q-btn
              unelevated
              color="primary"
              size="lg"
              class="full-width"
              label="Login"
              type="submit"
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

export default defineComponent({
  name: 'LoginPage',
  setup() {
    const router = useRouter()
    const username = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')

    const onSubmit = async () => {
      loading.value = true
      error.value = ''

      try {
        const response = await api.login(username.value, password.value)
        
        if (response.success) {
          localStorage.setItem('authToken', response.token)
          router.push('/')
        } else {
          error.value = 'Invalid credentials'
        }
      } catch (err) {
        error.value = err.response?.data?.error || 'Login failed. Please try again.'
      } finally {
        loading.value = false
      }
    }

    return {
      username,
      password,
      loading,
      error,
      onSubmit
    }
  }
})
</script>

