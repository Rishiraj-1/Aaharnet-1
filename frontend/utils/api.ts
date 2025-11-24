/**
 * API Client for Backend Communication
 * Handles all API requests to FastAPI backend with Firebase Auth token injection
 */

import { getCurrentUserToken } from '@/lib/firebase'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'

// Generic API client interface
interface ApiClientConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  requireAuth?: boolean
}

/**
 * Generic API client function
 */
async function apiClient<T>(
  endpoint: string,
  config: ApiClientConfig = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    requireAuth = true,
  } = config

  // Get auth token if required
  let token: string | null = null
  if (requireAuth) {
    token = await getCurrentUserToken()
    if (!token) {
      throw new Error('Authentication required')
    }
  }

  // Prepare headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  // Make API request
  const url = `${BACKEND_URL}${endpoint}`
  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || errorData.detail || `API request failed: ${response.statusText}`)
  }

  return response.json()
}

// ==========================================
// Authentication Endpoints
// ==========================================

interface RegisterData {
  email: string
  uid?: string
  name: string
  user_type: 'donor' | 'ngo' | 'volunteer' | 'admin'
  phone?: string
}

interface LoginResponse {
  token: string
  user: any
}

export async function registerUser(data: RegisterData) {
  return apiClient<LoginResponse>('/api/auth/register', {
    method: 'POST',
    body: data,
    requireAuth: false,
  })
}

export async function loginUser(token: string) {
  return apiClient<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { token },
    requireAuth: false,
  })
}

export async function getUserProfile() {
  return apiClient<any>('/api/auth/profile')
}

export async function updateUserProfile(data: Partial<RegisterData>) {
  return apiClient<any>('/api/auth/profile', {
    method: 'PUT',
    body: data,
  })
}

// ==========================================
// Forecasting Endpoints
// ==========================================

interface ForecastRequest {
  historical_data: Array<{ date: string; value: number }>
  forecast_days?: number
  food_type?: string
  location?: string
}

interface ForecastResponse {
  predictions: Array<{
    date: string
    predicted_demand?: number
    predicted_surplus?: number
    lower_bound: number
    upper_bound: number
    confidence_interval: number
  }>
  trend: string
  confidence: number
  recommendations: string[]
  chart_data: {
    historical: Array<{ date: string; value: number }>
    forecast: Array<{ date: string; value: number }>
    trend_line: Array<{ date: string; value: number }>
  }
}

export async function forecastDemand(data: ForecastRequest) {
  return apiClient<ForecastResponse>('/api/forecast/demand', {
    method: 'POST',
    body: data,
  })
}

export async function forecastSurplus(data: ForecastRequest) {
  return apiClient<ForecastResponse>('/api/forecast/surplus', {
    method: 'POST',
    body: data,
  })
}

export async function analyzeDemandPatterns(data: {
  location: string
  food_types: string[]
  time_period: string
}) {
  return apiClient<any>('/api/forecast/analysis', {
    method: 'POST',
    body: data,
  })
}

// ==========================================
// Computer Vision Endpoints
// ==========================================

interface ShelfLifeRequest {
  food_type: string
  storage_conditions: Record<string, number>
  purchase_date?: string
}

interface ShelfLifeResponse {
  freshness_score: number
  estimated_hours_remaining: number
  confidence: number
  recommendations: string[]
  analysis_details: any
}

export async function analyzeShelfLife(data: ShelfLifeRequest) {
  return apiClient<ShelfLifeResponse>('/api/vision/shelf_life', {
    method: 'POST',
    body: data,
  })
}

export async function batchAnalyzeFood(images: string[], foodTypes: string[], storageConditions: Record<string, number>) {
  return apiClient<any>('/api/vision/batch_analysis', {
    method: 'POST',
    body: {
      images,
      food_types: foodTypes,
      storage_conditions: storageConditions,
    },
  })
}

// ==========================================
// Geospatial Endpoints
// ==========================================

interface HeatmapRequest {
  center_lat: number
  center_lng: number
  zoom_level?: number
  data_type?: 'donations' | 'requests' | 'volunteers'
}

interface HeatmapResponse {
  heatmap_data: Array<{ lat: number; lng: number; weight: number }>
  bounds: { north: number; south: number; east: number; west: number }
  summary: Record<string, any>
}

export async function generateHeatmap(data: HeatmapRequest) {
  return apiClient<HeatmapResponse>('/api/geo/heatmap', {
    method: 'POST',
    body: data,
  })
}

export async function findNearbyUsers(data: {
  latitude: number
  longitude: number
  radius_km?: number
  user_type?: 'donor' | 'ngo' | 'volunteer'
}) {
  return apiClient<any>('/api/geo/nearby', {
    method: 'POST',
    body: data,
  })
}

export async function findOptimalMatches(data: {
  donor_location: { lat: number; lng: number }
  ngo_location: { lat: number; lng: number }
  food_type: string
  quantity: number
  urgency?: 'low' | 'normal' | 'high' | 'urgent'
}) {
  return apiClient<any>('/api/geo/matching', {
    method: 'POST',
    body: data,
  })
}

// ==========================================
// Volunteer Route Optimization
// ==========================================

interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  location_type: 'donor' | 'ngo' | 'warehouse' | 'volunteer_home'
  capacity?: number
  priority?: number
  time_window_start?: string
  time_window_end?: string
}

interface RouteOptimizationRequest {
  volunteer_id: string
  start_location: Location
  locations: Location[]
  max_route_time_hours?: number
  vehicle_capacity?: number
  optimization_type?: 'time' | 'distance' | 'cost' | 'balanced'
}

interface RouteOptimizationResponse {
  optimized_route: Array<{
    sequence: number
    location_id: string
    location_name: string
    location_type: string
    latitude: number
    longitude: number
    arrival_time: string
    priority: number
    capacity?: number
  }>
  total_distance_km: number
  total_time_hours: number
  total_cost: number
  route_efficiency: number
  recommendations: string[]
  alternative_routes: any[]
}

export async function optimizeVolunteerRoute(data: RouteOptimizationRequest) {
  return apiClient<RouteOptimizationResponse>('/api/volunteer/optimize', {
    method: 'POST',
    body: data,
  })
}

export async function assignVolunteersToTasks(data: {
  volunteers: any[]
  tasks: any[]
  constraints: any
}) {
  return apiClient<any>('/api/volunteer/assign', {
    method: 'POST',
    body: data,
  })
}

export async function analyzeRoutePerformance(data: {
  route_data: any[]
  analysis_type?: 'efficiency' | 'cost' | 'time' | 'environmental'
}) {
  return apiClient<any>('/api/volunteer/analyze', {
    method: 'POST',
    body: data,
  })
}

// ==========================================
// AI Chatbot Endpoints
// ==========================================

export async function chatWithBot(data: {
  message: string
  conversation_id?: string
  language?: string
}) {
  return apiClient<any>('/api/chatbot/chat', {
    method: 'POST',
    body: data,
  })
}

export async function transcribeVoice(audioBlob: Blob) {
  const formData = new FormData()
  formData.append('audio', audioBlob)

  const token = await getCurrentUserToken()
  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${BACKEND_URL}/api/chatbot/transcribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Transcription failed')
  }

  return response.json()
}

// ==========================================
// Emergency Response Endpoints
// ==========================================

export async function createEmergencyAlert(data: {
  location: { lat: number; lng: number }
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}) {
  return apiClient<any>('/api/emergency/alert', {
    method: 'POST',
    body: data,
  })
}

export async function getActiveAlerts() {
  return apiClient<any[]>('/api/emergency/alerts')
}

export async function getDisasterData(data: {
  location: string
  event_type?: string
  date_range?: { start: string; end: string }
}) {
  return apiClient<any>('/api/emergency/disaster-data', {
    method: 'POST',
    body: data,
  })
}

// ==========================================
// Health Check
// ==========================================

export async function checkBackendHealth() {
  return apiClient<{ status: string; service: string }>('/health', {
    requireAuth: false,
  })
}

// ==========================================
// Admin Endpoints
// ==========================================

export async function listUsers() {
  return apiClient<{ users: any[]; count: number }>('/api/auth/admin/users')
}

export async function setAdminRole(uid: string) {
  return apiClient<{ ok: boolean; message: string; uid: string }>('/api/auth/admin/set-admin', {
    method: 'POST',
    body: { uid },
  })
}

export async function seedData(force: boolean = false) {
  return apiClient<{ message: string; seeded: boolean }>('/api/auth/admin/seed-data', {
    method: 'POST',
    body: { force },
  })
}

