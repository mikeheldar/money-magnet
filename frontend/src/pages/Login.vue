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
            v-model="email"
            label="Email"
            type="email"
            outlined
            :rules="[val => !!val || 'Email is required', val => /.+@.+\..+/.test(val) || 'Please enter a valid email']"
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
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import firebaseApi from '../services/firebase-api'
import { auth } from '../config/firebase'

export default defineComponent({
  name: 'LoginPage',
  setup() {
    const router = useRouter()
    const email = ref('mike@example.com') // Default for testing
    const password = ref('password')
    const loading = ref(false)
    const error = ref('')

    onMounted(() => {
      // Check if user is already logged in
      auth.onAuthStateChanged((user) => {
        if (user) {
          router.push('/')
        }
      })
    })

    const onSubmit = async () => {
      loading.value = true
      error.value = ''

      try {
        const response = await firebaseApi.login(email.value, password.value)
        
        if (response.success) {
          localStorage.setItem('authToken', response.token)
          router.push('/')
        } else {
          error.value = 'Invalid credentials'
        }
      } catch (err) {
        error.value = err.message || 'Login failed. Please try again.'
      } finally {
        loading.value = false
      }
    }

    return {
      email,
      password,
      loading,
      error,
      onSubmit
    }
  }
})
</script>

