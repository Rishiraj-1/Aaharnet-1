"use client"

/**
 * useRealtimeLocation Hook
 * Provides real-time location tracking using Geolocation API watchPosition
 * Can update donations or volunteer locations in real-time
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { updateDonation } from '@/lib/api/mapApi'
import { toast } from 'sonner'

interface UseRealtimeLocationOptions {
  enabled?: boolean
  onLocationUpdate?: (position: GeolocationPosition) => void
  updateDonationId?: string | null // If provided, will update this donation's location
  updateInterval?: number // Minimum time between updates (ms), default 5000
  highAccuracy?: boolean
}

interface LocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  timestamp: number | null
  isTracking: boolean
  error: string | null
}

export function useRealtimeLocation({
  enabled = false,
  onLocationUpdate,
  updateDonationId,
  updateInterval = 5000, // 5 seconds default
  highAccuracy = true
}: UseRealtimeLocationOptions = {}) {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    isTracking: false,
    error: null
  })

  const watchIdRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const lastToastTimeRef = useRef<number>(0)
  const isUpdatingRef = useRef<boolean>(false)

  // Update donation location in backend
  const updateDonationLocation = useCallback(async (lat: number, lng: number) => {
    if (!updateDonationId || isUpdatingRef.current) {
      return
    }

    const now = Date.now()
    if (now - lastUpdateTimeRef.current < updateInterval) {
      return // Throttle updates
    }

    isUpdatingRef.current = true
    lastUpdateTimeRef.current = now

    try {
      console.log(`[useRealtimeLocation] Updating donation ${updateDonationId} location to ${lat}, ${lng}`)
      await updateDonation(updateDonationId, { lat, lng })
      console.log(`[useRealtimeLocation] Successfully updated donation location`)
      
      // Don't show toast on every update to avoid spam - only show every 30 seconds
      if (now - lastToastTimeRef.current > 30000) {
        lastToastTimeRef.current = now
        toast.success('Location updated', { duration: 2000 })
      }
    } catch (error: any) {
      console.error('[useRealtimeLocation] Error updating donation location:', error)
      toast.error('Failed to update location: ' + (error.message || 'Unknown error'))
    } finally {
      isUpdatingRef.current = false
    }
  }, [updateDonationId, updateInterval])

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        isTracking: false
      }))
      toast.error('Geolocation is not supported by your browser')
      return
    }

    if (watchIdRef.current !== null) {
      // Already tracking
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: 15000,
      maximumAge: 1000 // Use fresh position
    }

    setLocation(prev => ({ ...prev, isTracking: true, error: null }))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const timestamp = position.timestamp

        console.log(`[useRealtimeLocation] Position update: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

        setLocation({
          latitude,
          longitude,
          accuracy: accuracy || null,
          timestamp,
          isTracking: true,
          error: null
        })

        // Call custom callback if provided
        if (onLocationUpdate) {
          onLocationUpdate(position)
        }

        // Update donation location if donationId is provided
        if (updateDonationId) {
          updateDonationLocation(latitude, longitude)
        }
      },
      (error) => {
        let errorMessage = 'Failed to get location'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Please check your GPS settings.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please ensure GPS is enabled.'
            break
        }

        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          isTracking: false
        }))

        toast.error(errorMessage)
      },
      options
    )
  }, [highAccuracy, onLocationUpdate, updateDonationId, updateDonationLocation])

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setLocation(prev => ({
        ...prev,
        isTracking: false
      }))
    }
  }, [])

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      startTracking()
    } else {
      stopTracking()
    }

    return () => {
      stopTracking()
    }
  }, [enabled, startTracking, stopTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    location,
    startTracking,
    stopTracking,
    isTracking: location.isTracking
  }
}

