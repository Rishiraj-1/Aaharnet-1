"use client"

/**
 * Debug Component - Check Current Role
 * Temporary component to debug role issues
 */

import { useAuth } from '@/context/AuthContext'
import { useRole } from '@/hooks/useRole'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useState } from 'react'
import { toast } from 'sonner'

export function DebugRole() {
  const { user, userData, refreshToken } = useAuth()
  const { role, admin, loading } = useRole()
  const [tokenClaims, setTokenClaims] = useState<any>(null)

  const checkTokenClaims = async () => {
    if (!user) {
      toast.error('No user logged in')
      return
    }

    try {
      const tokenResult = await user.getIdTokenResult(true)
      setTokenClaims(tokenResult.claims)
      toast.success('Token claims retrieved')
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  if (!user) {
    return (
      <Card className="p-4 m-4">
        <p>Not logged in</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 m-4 space-y-4">
      <h3 className="font-bold">Role Debug Info</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>User ID:</strong> {user.uid}
        </div>
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        
        <div className="border-t pt-2 mt-2">
          <strong>From useRole Hook:</strong>
          <div className="ml-4">
            <div>Role: {role || 'null'}</div>
            <div>Admin: {admin ? 'Yes' : 'No'}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <div className="border-t pt-2 mt-2">
          <strong>From Firestore (userData):</strong>
          <div className="ml-4">
            <div>user_type: {userData?.user_type || 'null'}</div>
          </div>
        </div>

        {tokenClaims && (
          <div className="border-t pt-2 mt-2">
            <strong>From Token Claims:</strong>
            <pre className="ml-4 bg-muted p-2 rounded text-xs overflow-auto">
              {JSON.stringify(tokenClaims, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={checkTokenClaims} size="sm" variant="outline">
          Check Token Claims
        </Button>
        <Button onClick={refreshToken} size="sm" variant="outline">
          Refresh Token
        </Button>
      </div>
    </Card>
  )
}

