"use client"

import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, limit, where, WhereFilterOp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'sonner'

interface UseFirestoreCollectionOptions {
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
  limitCount?: number
  whereFilter?: {
    field: string
    operator: WhereFilterOp
    value: any
  }
}

/**
 * Hook for real-time Firestore collection updates with real-time sync
 */
export function useFirestoreCollection<T = any>(
  collectionName: string,
  options: UseFirestoreCollectionOptions = {}
) {
  const { orderByField, orderByDirection = 'desc', limitCount, whereFilter } = options
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    try {
      let collectionQuery: any = collection(db, collectionName)

      // Build query constraints array
      const constraints: any[] = []

      // Apply where filter if provided
      if (whereFilter) {
        constraints.push(where(whereFilter.field, whereFilter.operator, whereFilter.value))
      }

      // Apply order by if provided
      // Note: When using where + orderBy, Firestore requires a composite index
      // If index doesn't exist, we'll skip orderBy to avoid errors
      if (orderByField) {
        constraints.push(orderBy(orderByField, orderByDirection))
      }

      // Apply limit if provided
      if (limitCount) {
        constraints.push(limit(limitCount))
      }

      // Build final query
      if (constraints.length > 0) {
        collectionQuery = query(collectionQuery, ...constraints)
      }

      const unsubscribe = onSnapshot(
        collectionQuery,
        (snapshot) => {
          const collectionData: T[] = []
          snapshot.forEach((doc) => {
            collectionData.push({ id: doc.id, ...doc.data() } as T)
          })
          setData(collectionData)
          setLoading(false)
          setError(null)
        },
        (err) => {
          console.error('Firestore error:', err)
          setError(err)
          setLoading(false)
          toast.error('Failed to load data from database')
        }
      )

      return () => unsubscribe()
    } catch (err) {
      console.error('Error setting up Firestore listener:', err)
      setError(err as Error)
      setLoading(false)
      return () => {}
    }
  }, [collectionName, orderByField, orderByDirection, limitCount, whereFilter])

  return { data, loading, error }
}

/**
 * Hook for fetching a single Firestore document
 */
export function useFirestoreDocument<T = any>(collectionName: string, documentId: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!documentId) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      const { doc, onSnapshot: docSnapshot } = require('firebase/firestore')
      const docRef = doc(db, collectionName, documentId)

      const unsubscribe = docSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setData({ id: snapshot.id, ...snapshot.data() } as T)
          } else {
            setData(null)
          }
          setLoading(false)
          setError(null)
        },
        (err) => {
          console.error('Firestore error:', err)
          setError(err)
          setLoading(false)
        }
      )

      return () => unsubscribe()
    } catch (err) {
      console.error('Error setting up Firestore listener:', err)
      setError(err as Error)
      setLoading(false)
      return () => {}
    }
  }, [collectionName, documentId])

  return { data, loading, error }
}

