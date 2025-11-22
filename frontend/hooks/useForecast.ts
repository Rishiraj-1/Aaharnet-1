"use client"

import useSWR from 'swr'
import { forecastDemand, forecastSurplus, type ForecastRequest } from '@/utils/api'
import { toast } from 'sonner'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch')
  return response.json()
}

/**
 * Hook for fetching food demand forecasts
 */
export function useDemandForecast(request: ForecastRequest | null) {
  const { data, error, isLoading, mutate } = useSWR(
    request ? ['/api/forecast/demand', request] : null,
    async () => {
      if (!request) return null
      try {
        return await forecastDemand(request)
      } catch (err: any) {
        toast.error(err.message || 'Failed to fetch demand forecast')
        throw err
      }
    }
  )

  return {
    forecast: data,
    loading: isLoading,
    error,
    refetch: mutate,
  }
}

/**
 * Hook for fetching food surplus forecasts
 */
export function useSurplusForecast(request: ForecastRequest | null) {
  const { data, error, isLoading, mutate } = useSWR(
    request ? ['/api/forecast/surplus', request] : null,
    async () => {
      if (!request) return null
      try {
        return await forecastSurplus(request)
      } catch (err: any) {
        toast.error(err.message || 'Failed to fetch surplus forecast')
        throw err
      }
    }
  )

  return {
    forecast: data,
    loading: isLoading,
    error,
    refetch: mutate,
  }
}

/**
 * Hook for creating a new forecast
 */
export function useCreateForecast() {
  const [loading, setLoading] = useState(false)

  const createDemandForecast = async (request: ForecastRequest) => {
    setLoading(true)
    try {
      const result = await forecastDemand(request)
      toast.success('Demand forecast created successfully')
      return result
    } catch (err: any) {
      toast.error(err.message || 'Failed to create forecast')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createSurplusForecast = async (request: ForecastRequest) => {
    setLoading(true)
    try {
      const result = await forecastSurplus(request)
      toast.success('Surplus forecast created successfully')
      return result
    } catch (err: any) {
      toast.error(err.message || 'Failed to create forecast')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    createDemandForecast,
    createSurplusForecast,
    loading,
  }
}

// Fix the import
import { useState } from 'react'

