/**
 * Firebase Configuration and Initialization
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp
if (!getApps().length) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Helper function to get current user's ID token
export async function getCurrentUserToken(): Promise<string | null> {
  const user = auth.currentUser
  if (user) {
    return await user.getIdToken()
  }
  return null
}

// Helper function to check if user is authenticated
export function isAuthenticated(): boolean {
  return auth.currentUser !== null
}

// Helper function to get ID token result with custom claims
export async function getIdTokenResultWithClaims() {
  const user = auth.currentUser
  if (!user) return null
  
  const idTokenResult = await user.getIdTokenResult(true)
  // custom claims are in idTokenResult.claims
  return idTokenResult.claims
}

// Helper function to force refresh the ID token (useful after custom claims are updated)
export async function refreshIdToken(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  
  try {
    // Force refresh the token to get updated custom claims
    await user.getIdToken(true)
    return true
  } catch (error) {
    console.error('Error refreshing token:', error)
    return false
  }
}

// Export app instance
export default app

