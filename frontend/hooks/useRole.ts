"use client"

/**
 * useRole Hook
 * Gets current user's role from Firebase token custom claims
 */

import { useEffect, useState } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { auth, getIdTokenResultWithClaims } from '@/lib/firebase'

interface RoleInfo {
  role: string | null
  admin: boolean
  loading: boolean
}

export function useRole(): RoleInfo {
  const [roleInfo, setRoleInfo] = useState<RoleInfo>({
    role: null,
    admin: false,
    loading: true
  })

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setRoleInfo({ role: null, admin: false, loading: false })
        return
      }

      try {
        // Get token result with claims
        const idTokenResult = await user.getIdTokenResult(true)
        const claims = idTokenResult.claims || {}
        
        // Extract role and admin status from claims
        const role = (claims.role as string) || null
        const admin = !!(claims.admin as boolean)
        
        setRoleInfo({
          role,
          admin,
          loading: false
        })
      } catch (error) {
        console.error('Error getting role from token:', error)
        setRoleInfo({ role: null, admin: false, loading: false })
      }
    })

    return () => unsubscribe()
  }, [])

  return roleInfo
}

