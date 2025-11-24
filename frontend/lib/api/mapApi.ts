/**
 * Map API Utilities
 * Handles all map-related API calls
 */

import { getCurrentUserToken } from '@/lib/firebase'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'

// Log backend URL for debugging (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Backend URL:', BACKEND_URL)
}

interface CreateDonationData {
  donorId: string
  lat: number
  lng: number
  qtyKg: number
  foodType: string
  imageUrl?: string
  freshnessScore?: number
}

interface ClaimDonationData {
  donationId: string
  ngoId?: string
}

interface AssignVolunteerData {
  donationId: string
  volunteerId: string
}

/**
 * Create a new donation
 */
export async function createDonation(data: CreateDonationData) {
  const token = await getCurrentUserToken()
  if (!token) {
    throw new Error('Authentication required')
  }

  // Add timeout to prevent hanging
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(`${BACKEND_URL}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || error.detail || `Failed to create donation: ${response.statusText}`)
    }

    return response.json()
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    throw error
  }
}

/**
 * Claim a donation (NGO)
 */
export async function claimDonation(donationId: string) {
  const token = await getCurrentUserToken()
  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${BACKEND_URL}/api/donations/${donationId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ donationId })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || error.detail || 'Failed to claim donation')
  }

  return response.json()
}

/**
 * Assign volunteer to donation (Admin)
 */
export async function assignVolunteer(data: AssignVolunteerData) {
  const token = await getCurrentUserToken()
  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${BACKEND_URL}/api/volunteer/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || error.detail || 'Failed to assign volunteer')
  }

  return response.json()
}

/**
 * Get heatmap grid data
 */
export async function getHeatmapGrid(bbox: {
  southwest: { lat: number; lng: number }
  northeast: { lat: number; lng: number }
}, timeRange?: { start: string; end: string }) {
  const token = await getCurrentUserToken()
  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${BACKEND_URL}/api/geo/heatmap-grid`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || error.detail || 'Failed to get heatmap data')
  }

  return response.json()
}

