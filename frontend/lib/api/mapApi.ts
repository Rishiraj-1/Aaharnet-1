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

/**
 * Check if backend server is reachable
 */
async function checkBackendHealth(): Promise<{ isHealthy: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return { isHealthy: response.ok }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        return { isHealthy: false, error: 'Connection timeout' }
      }
      return { isHealthy: false, error: 'Connection failed' }
    }
  } catch (err: any) {
    return { isHealthy: false, error: err.message || 'Unknown error' }
  }
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

  // Check backend health first (quick check)
  const healthCheck = await checkBackendHealth()
  if (!healthCheck.isHealthy) {
    const isLocalhost = BACKEND_URL.includes('127.0.0.1') || BACKEND_URL.includes('localhost')
    if (isLocalhost) {
      throw new Error(
        `Backend server is not running at ${BACKEND_URL}. ` +
        `Please start the backend server: cd backend && python main.py ` +
        `Then verify it's running at ${BACKEND_URL}/health`
      )
    } else {
      throw new Error(
        `Backend server is not reachable at ${BACKEND_URL}. ` +
        `Please verify the server is running and accessible.`
      )
    }
  }

  // Log request details in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[createDonation] Making request to:', `${BACKEND_URL}/api/donations`)
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
    
    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[createDonation] Error details:', {
        name: error?.name,
        message: error?.message,
        type: typeof error,
        isTypeError: error instanceof TypeError
      })
    }
    
    // Handle abort/timeout errors
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    
    // Handle network errors (Failed to fetch, network errors, CORS issues)
    const isNetworkError = error instanceof TypeError || 
                          error.name === 'TypeError' ||
                          error.message?.includes('Failed to fetch') ||
                          error.message?.includes('fetch') ||
                          error.message?.includes('NetworkError') ||
                          error.message?.includes('Network request failed') ||
                          !error.response // No response means network issue
    
    if (isNetworkError) {
      const isLocalhost = BACKEND_URL.includes('127.0.0.1') || BACKEND_URL.includes('localhost')
      const troubleshooting = isLocalhost 
        ? `\n\nTroubleshooting:\n1. Start backend: cd backend && python main.py\n2. Test: ${BACKEND_URL}/health\n3. Check CORS in backend/.env`
        : `\n\nPlease verify:\n1. Backend server is running\n2. Network connectivity\n3. CORS configuration`
      
      const friendlyError = new Error(
        `Cannot connect to backend server at ${BACKEND_URL}.${troubleshooting}`
      )
      
      // Log the original error but throw the friendly one
      if (process.env.NODE_ENV === 'development') {
        console.error('[createDonation] Network error - original:', error)
      }
      
      throw friendlyError
    }
    
    // Re-throw if it's already a custom error with a message
    if (error instanceof Error && error.message && !isNetworkError) {
      throw error
    }
    
    // Fallback for unknown errors
    throw new Error(`An unexpected error occurred: ${error.message || 'Unknown error'}. Please try again.`)
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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${BACKEND_URL}/api/donations/${donationId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ donationId }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || error.detail || 'Failed to claim donation')
    }

    return response.json()
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'))) {
      const isLocalhost = BACKEND_URL.includes('127.0.0.1') || BACKEND_URL.includes('localhost')
      const troubleshooting = isLocalhost 
        ? `\n\nTroubleshooting:\n1. Start backend: python main.py (in backend directory)\n2. Test: ${BACKEND_URL}/health\n3. Check CORS settings`
        : `\n\nPlease verify backend server is running and accessible.`
      
      throw new Error(
        `Cannot connect to backend server at ${BACKEND_URL}.${troubleshooting}`
      )
    }
    
    if (error instanceof Error && error.message) {
      throw error
    }
    
    throw new Error('An unexpected error occurred while claiming the donation. Please try again.')
  }
}

/**
 * Assign volunteer to donation (Admin)
 */
export async function assignVolunteer(data: AssignVolunteerData) {
  const token = await getCurrentUserToken()
  if (!token) {
    throw new Error('Authentication required')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${BACKEND_URL}/api/volunteer/assign`, {
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
      throw new Error(error.error || error.detail || 'Failed to assign volunteer')
    }

    return response.json()
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'))) {
      const isLocalhost = BACKEND_URL.includes('127.0.0.1') || BACKEND_URL.includes('localhost')
      const troubleshooting = isLocalhost 
        ? `\n\nTroubleshooting:\n1. Start backend: python main.py (in backend directory)\n2. Test: ${BACKEND_URL}/health\n3. Check CORS settings`
        : `\n\nPlease verify backend server is running and accessible.`
      
      throw new Error(
        `Cannot connect to backend server at ${BACKEND_URL}.${troubleshooting}`
      )
    }
    
    if (error instanceof Error && error.message) {
      throw error
    }
    
    throw new Error('An unexpected error occurred while assigning the volunteer. Please try again.')
  }
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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${BACKEND_URL}/api/geo/heatmap-grid`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || error.detail || 'Failed to get heatmap data')
    }

    return response.json()
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'))) {
      const isLocalhost = BACKEND_URL.includes('127.0.0.1') || BACKEND_URL.includes('localhost')
      const troubleshooting = isLocalhost 
        ? `\n\nTroubleshooting:\n1. Start backend: python main.py (in backend directory)\n2. Test: ${BACKEND_URL}/health\n3. Check CORS settings`
        : `\n\nPlease verify backend server is running and accessible.`
      
      throw new Error(
        `Cannot connect to backend server at ${BACKEND_URL}.${troubleshooting}`
      )
    }
    
    if (error instanceof Error && error.message) {
      throw error
    }
    
    throw new Error('An unexpected error occurred while fetching heatmap data. Please try again.')
  }
}

