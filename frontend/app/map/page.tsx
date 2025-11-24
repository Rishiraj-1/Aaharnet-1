"use client"

/**
 * Map Page
 * Main map interface for AAHARNET.AI
 */

import dynamic from 'next/dynamic'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Dynamically import the map component to avoid SSR issues with Leaflet
const IndoreMap = dynamic(() => import('@/components/Map/IndoreMap').then(mod => ({ default: mod.IndoreMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
})

export default function MapPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="w-full h-screen">
      <IndoreMap />
    </div>
  )
}

