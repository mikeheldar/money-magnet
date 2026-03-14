<template>
  <div class="flex flex-center q-page--login" style="min-height: 100vh; width: 100%;">
    <q-card class="q-pa-md" style="min-width: 350px; box-shadow: 0 8px 24px rgba(78, 205, 196, 0.2);">
      <q-card-section>
        <div class="text-h4 text-center q-mb-md" style="color: #4ECDC4; font-weight: 600;">Money Magnet</div>
        <div class="text-subtitle2 text-center q-mb-lg" style="color: #6B7280;">Create your account</div>
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
            :rules="[val => !!val || 'Password is required', val => val.length >= 6 || 'At least 6 characters']"
          />

          <q-input
            v-model="confirmPassword"
            label="Confirm password"
            type="password"
            outlined
            :rules="[val => !!val || 'Confirm your password', val => val === password || 'Passwords do not match']"
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
              label="Sign up"
              type="submit"
              :loading="loading"
            />
          </div>

          <div class="text-center">
            <router-link to="/login" class="text-primary" style="text-decoration: none;">Already have an account? Log in</router-link>
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
  name: 'SignUpPage',
  setup() {
    const router = useRouter()
    const email = ref('')
    const password = ref('')
    const confirmPassword = ref('')
    const loading = ref(false)
    const error = ref('')

    onMounted(() => {
      auth.onAuthStateChanged((user) => {
        if (user) router.push('/')
      })
    })

    const onSubmit = async () => {
      loading.value = true
      error.value = ''
      try {
        await firebaseApi.register(email.value, password.value)
        const token = await auth.currentUser.getIdToken()
        localStorage.setItem('authToken', token)
        router.push('/')
      } catch (err) {
        error.value = err.message || 'Sign up failed. Please try again.'
      } finally {
        loading.value = false
      }
    }

    return {
      email,
      password,
      confirmPassword,
      loading,
      error,
      onSubmit
    }
  }
})
</script>
