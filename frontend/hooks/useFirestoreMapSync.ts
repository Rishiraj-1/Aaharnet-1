"use client"

/**
 * useFirestoreMapSync Hook
 * Real-time Firestore synchronization for map data
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { collection, query, where, onSnapshot, Timestamp, QueryConstraint } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface BBox {
  southwest: { lat: number; lng: number }
  northeast: { lat: number; lng: number }
}

interface Filters {
  bbox?: BBox
  status?: string
  foodType?: string
  userId?: string
  userRole?: string
}

interface UseFirestoreMapSyncOptions {
  collections: string[]
  filters?: Filters
  debounceMs?: number
}

interface Donation {
  id: string
  donorId: string
  lat: number
  lng: number
  qtyKg: number
  foodType: string
  freshnessScore?: number
  status: 'available' | 'assigned' | 'picked' | 'delivered'
  createdAt: Timestamp | any
  imageUrl?: string
  donorName?: string
  ngoId?: string
  volunteerId?: string
}

interface Request {
  id: string
  ngoId: string
  lat: number
  lng: number
  foodType: string
  qtyKg: number
  status: string
  createdAt: Timestamp | any
}

interface Volunteer {
  id: string
  lat: number
  lng: number
  status: string
  currentTaskId?: string
  userId?: string
}

export function useFirestoreMapSync({
  collections,
  filters,
  debounceMs = 200
}: UseFirestoreMapSyncOptions) {
  const [donations, setDonations] = useState<Donation[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [lastUpdateTs, setLastUpdateTs] = useState<number>(Date.now())
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeRefs = useRef<Array<() => void>>([])

  // Helper to check if point is within bbox
  const isWithinBBox = useCallback((lat: number, lng: number, bbox?: BBox): boolean => {
    if (!bbox) return true
    return (
      lat >= bbox.southwest.lat &&
      lat <= bbox.northeast.lat &&
      lng >= bbox.southwest.lng &&
      lng <= bbox.northeast.lng
    )
  }, [])

  // Debounced update function
  const debouncedUpdate = useCallback((updateFn: () => void) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      updateFn()
      setLastUpdateTs(Date.now())
    }, debounceMs)
  }, [debounceMs])

  useEffect(() => {
    // Cleanup previous subscriptions
    unsubscribeRefs.current.forEach(unsubscribe => unsubscribe())
    unsubscribeRefs.current = []

    // Subscribe to donations
    if (collections.includes('donations')) {
      const constraints: QueryConstraint[] = []
      
      // Role-based filtering
      if (filters?.userRole === 'donor' && filters?.userId) {
        // Donors see their own donations + available ones
        // We'll filter client-side for "available" to avoid complex queries
        constraints.push(where('donorId', '==', filters.userId))
      } else if (filters?.userRole === 'ngo') {
        // NGOs see only available donations
        constraints.push(where('status', '==', 'available'))
      } else if (filters?.userRole === 'volunteer' && filters?.userId) {
        // Volunteers see assigned/picked donations
        constraints.push(where('volunteerId', '==', filters.userId))
      }
      // Admin sees all (no filters)
      
      if (filters?.status && filters?.userRole !== 'ngo') {
        constraints.push(where('status', '==', filters.status))
      }
      if (filters?.foodType) {
        constraints.push(where('foodType', '==', filters.foodType))
      }

      const q = constraints.length > 0
        ? query(collection(db, 'donations'), ...constraints)
        : collection(db, 'donations')

      const unsubscribe = onSnapshot(q, (snapshot) => {
        debouncedUpdate(() => {
          const docs: Donation[] = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            // Handle different location field formats
            const lat = data.lat || data.latitude || (data.location?.lat) || (data.location?.latitude)
            const lng = data.lng || data.longitude || (data.location?.lng) || (data.location?.longitude)
            
            if (lat && lng) {
              // Filter by bbox if provided
              if (isWithinBBox(lat, lng, filters?.bbox)) {
                docs.push({
                  id: doc.id,
                  ...data,
                  lat,
                  lng,
                  createdAt: data.createdAt || data.created_at || Timestamp.now()
                } as Donation)
              }
            }
          })
          setDonations(docs)
        })
      }, (error) => {
        console.error('Error listening to donations:', error)
      })

      unsubscribeRefs.current.push(unsubscribe)
    }

    // Subscribe to requests
    if (collections.includes('requests')) {
      const q = collection(db, 'requests')
      const unsubscribe = onSnapshot(q, (snapshot) => {
        debouncedUpdate(() => {
          const docs: Request[] = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            // Handle different location field formats
            const lat = data.lat || data.latitude || (data.location?.lat) || (data.location?.latitude)
            const lng = data.lng || data.longitude || (data.location?.lng) || (data.location?.longitude)
            
            if (lat && lng) {
              if (isWithinBBox(lat, lng, filters?.bbox)) {
                docs.push({
                  id: doc.id,
                  ...data,
                  lat,
                  lng,
                  createdAt: data.createdAt || data.created_at || Timestamp.now()
                } as Request)
              }
            }
          })
          setRequests(docs)
        })
      }, (error) => {
        console.error('Error listening to requests:', error)
      })

      unsubscribeRefs.current.push(unsubscribe)
    }

    // Subscribe to volunteers
    if (collections.includes('volunteers')) {
      const q = collection(db, 'volunteers')
      const unsubscribe = onSnapshot(q, (snapshot) => {
        debouncedUpdate(() => {
          const docs: Volunteer[] = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            // Handle different location field formats
            const lat = data.lat || data.latitude || (data.location?.lat) || (data.location?.latitude)
            const lng = data.lng || data.longitude || (data.location?.lng) || (data.location?.longitude)
            
            if (lat && lng) {
              if (isWithinBBox(lat, lng, filters?.bbox)) {
                docs.push({
                  id: doc.id,
                  ...data,
                  lat,
                  lng
                } as Volunteer)
              }
            }
          })
          setVolunteers(docs)
        })
      }, (error) => {
        console.error('Error listening to volunteers:', error)
      })

      unsubscribeRefs.current.push(unsubscribe)
    }

    // Cleanup function
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe())
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [collections, filters, debouncedUpdate, isWithinBBox])

  const forceRefresh = useCallback(() => {
    setLastUpdateTs(Date.now())
  }, [])

  return {
    donations,
    requests,
    volunteers,
    lastUpdateTs,
    forceRefresh
  }
}

