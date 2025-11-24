"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, refreshIdToken } from '@/lib/firebase'
import { loginUser, registerUser, type RegisterData } from '@/utils/api'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  userData: any
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Omit<RegisterData, 'email' | 'password'>) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  updateUserData: (data: any) => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        try {
          // Get custom claims from token (source of truth for role)
          let tokenRole = null
          let isAdmin = false
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult(true)
            const claims = idTokenResult.claims || {}
            tokenRole = (claims.role as string) || null
            isAdmin = !!(claims.admin as boolean)
          } catch (tokenError) {
            console.warn('Could not get token claims:', tokenError)
          }
          
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const firestoreData = userDoc.data()
            // Sync Firestore with custom claims if they differ
            if (tokenRole && firestoreData.user_type !== tokenRole) {
              // Update Firestore to match custom claims
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...firestoreData,
                user_type: isAdmin ? 'admin' : tokenRole,
                updated_at: new Date().toISOString()
              }, { merge: true })
              setUserData({
                ...firestoreData,
                user_type: isAdmin ? 'admin' : tokenRole
              })
            } else {
              setUserData(firestoreData)
            }
          } else {
            // Create user document if it doesn't exist
            const role = isAdmin ? 'admin' : (tokenRole || 'donor')
            const newUserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'User',
              created_at: new Date().toISOString(),
              user_type: role,
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newUserData)
            setUserData(newUserData)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      } else {
        setUserData(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Try to login to backend (non-critical)
      try {
        const token = await userCredential.user.getIdToken()
        await loginUser(token)
      } catch (backendError) {
        // Non-critical error - user is already authenticated in Firebase
        console.warn('Backend login failed (non-critical):', backendError)
      }
      
      toast.success('Successfully signed in!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }

  const signUp = async (
    email: string, 
    password: string, 
    userData: Omit<RegisterData, 'email' | 'password'>
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Update profile with name
      if (userData.name) {
        await updateProfile(user, { displayName: userData.name })
      }
      
      // Get ID token for backend call
      const idToken = await user.getIdToken()
      
      // Determine role (donor, ngo, volunteer - admin is not allowed in registration)
      const role = userData.user_type === 'admin' ? 'donor' : (userData.user_type || 'donor')
      
      // Call backend to set role as custom claim
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
      const setRoleResponse = await fetch(`${backendUrl}/api/auth/set-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ role })
      })
      
      if (!setRoleResponse.ok) {
        const errorBody = await setRoleResponse.json().catch(() => ({}))
        throw new Error(errorBody?.message || 'Role assignment failed')
      }
      
      // Force token refresh to pick up custom claims
      await user.getIdToken(true)
      
      // Create user document in Firestore
      const newUserData = {
        uid: user.uid,
        email,
        name: userData.name,
        user_type: role,
        phone: userData.phone || '',
        created_at: new Date().toISOString(),
        ...userData
      }
      
      await setDoc(doc(db, 'users', user.uid), newUserData)
      
      // Register with backend (optional, frontend already created user in Firestore)
      try {
        await registerUser({
          uid: user.uid,
          email,
          ...userData
        })
      } catch (backendError) {
        // Non-critical error - user is already created in Firestore
        console.warn('Backend registration failed (non-critical):', backendError)
      }
      
      toast.success('Successfully signed up!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up')
      throw error
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      toast.success('Successfully signed out')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Try to login to backend (non-critical)
      try {
        const token = await result.user.getIdToken()
        await loginUser(token)
      } catch (backendError) {
        // Non-critical error - user is already authenticated in Firebase
        console.warn('Backend login failed (non-critical):', backendError)
      }
      
      toast.success('Successfully signed in with Google!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google')
      throw error
    }
  }

  const updateUserData = async (data: any) => {
    if (!user) return
    
    try {
      await setDoc(doc(db, 'users', user.uid), data, { merge: true })
      setUserData((prev: any) => ({ ...prev, ...data }))
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
      throw error
    }
  }

  const refreshToken = async () => {
    try {
      if (!user) {
        toast.error('No user logged in')
        return
      }
      
      // Force refresh the token to get updated custom claims
      const idTokenResult = await user.getIdTokenResult(true)
      const claims = idTokenResult.claims || {}
      const tokenRole = (claims.role as string) || null
      const isAdmin = !!(claims.admin as boolean)
      
      // Update Firestore to match custom claims
      const role = isAdmin ? 'admin' : (tokenRole || 'donor')
      await setDoc(doc(db, 'users', user.uid), {
        user_type: role,
        updated_at: new Date().toISOString()
      }, { merge: true })
      
      // Refresh user data
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        setUserData({
          ...userDoc.data(),
          user_type: role
        })
      }
      
      toast.success('Token refreshed! Your permissions have been updated.')
    } catch (error: any) {
      console.error('Error refreshing token:', error)
      toast.error(error.message || 'Failed to refresh token')
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        updateUserData,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

