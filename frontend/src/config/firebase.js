// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCZUQ9iZmE1E99elI9k7XCeRNv8Kd8bOwE',
  authDomain: 'money-magnet-cf5a4.firebaseapp.com',
  projectId: 'money-magnet-cf5a4',
  storageBucket: 'money-magnet-cf5a4.firebasestorage.app',
  messagingSenderId: '1072429685938',
  appId: '1:1072429685938:web:0583fcae5579066aeb3dab',
  measurementId: 'G-Q34XCMGQL4'
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)

// Initialize Analytics (only in browser, not SSR)
let analytics = null
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app)
}

export { analytics }
export default app

