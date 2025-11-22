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
import { auth, db } from '@/lib/firebase'
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
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            setUserData(userDoc.data())
          } else {
            // Create user document if it doesn't exist
            const newUserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'User',
              created_at: new Date().toISOString(),
              user_type: 'donor',
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
      
      // Update profile with name
      if (userData.name) {
        await updateProfile(userCredential.user, { displayName: userData.name })
      }
      
      // Create user document in Firestore
      const newUserData = {
        uid: userCredential.user.uid,
        email,
        name: userData.name,
        user_type: userData.user_type || 'donor',
        phone: userData.phone || '',
        created_at: new Date().toISOString(),
        ...userData
      }
      
      await setDoc(doc(db, 'users', userCredential.user.uid), newUserData)
      
      // Register with backend (optional, frontend already created user in Firestore)
      try {
        await registerUser({
          uid: userCredential.user.uid,
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

