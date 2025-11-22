"use client"

import useSWR from 'swr'
import { optimizeVolunteerRoute, type RouteOptimizationRequest, type RouteOptimizationResponse } from '@/utils/api'
import { toast } from 'sonner'
import { useState } from 'react'

/**
 * Hook for fetching and managing volunteer route optimization
 */
export function useVolunteerRoute(request: RouteOptimizationRequest | null) {
  const { data, error, isLoading, mutate } = useSWR(
    request ? ['/api/volunteer/optimize', request] : null,
    async () => {
      if (!request) return null
      try {
        return await optimizeVolunteerRoute(request)
      } catch (err: any) {
        toast.error(err.message || 'Failed to optimize route')
        throw err
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return {
    route: data,
    loading: isLoading,
    error,
    refetch: mutate,
  }
}

/**
 * Hook for optimizing a new route
 */
export function useOptimizeRoute() {
  const [loading, setLoading] = useState(false)

  const optimize = async (request: RouteOptimizationRequest) => {
    setLoading(true)
    try {
      const result = await optimizeVolunteerRoute(request)
      toast.success('Route optimized successfully!')
      return result
    } catch (err: any) {
      toast.error(err.message || 'Failed to optimize route')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    optimize,
    loading,
  }
}

