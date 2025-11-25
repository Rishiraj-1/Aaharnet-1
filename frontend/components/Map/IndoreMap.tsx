"use client"

/**
 * Main Indore Map Component
 * Centered on Indore, India with role-specific interfaces
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@/styles/map.module.css'
import { useAuth } from '@/context/AuthContext'
import { useRole } from '@/hooks/useRole'
import { useFirestoreMapSync } from '@/hooks/useFirestoreMapSync'
import { ClusteredMarkers } from './ClusteredMarkers'
import { HeatmapLayer } from './HeatmapLayer'
import { MapLegend } from './MapLegend'
import { RolePanelDonor } from './RolePanelDonor'
import { RolePanelNGO } from './RolePanelNGO'
import { RolePanelVolunteer } from './RolePanelVolunteer'
import { RolePanelAdmin } from './RolePanelAdmin'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  MapPin, 
  Layers, 
  Filter, 
  Navigation,
  Plus,
  CheckCircle,
  Play,
  Shield,
  Database
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { seedData } from '@/utils/api'

// Map center: Indore, India (city center)
const MAP_CENTER: [number, number] = [22.7196, 75.8577]
const MAP_ZOOM = 13
// Indore city bounds (narrower than district)
const CITY_BBOX = {
  southwest: { lat: 22.6500, lng: 75.7500 },
  northeast: { lat: 22.8000, lng: 75.9500 }
}

// Fix for default Leaflet marker icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface MapControlsProps {
  onHeatmapToggle: () => void
  heatmapMode: 'off' | 'surplus' | 'demand' | 'both'
  onTimeSliderChange: (hours: number) => void
  timeRangeHours: number
  onFilterClick: () => void
  onCenterOnMe: () => void
  userRole: string
  onRoleAction: () => void
  isAdmin?: boolean
}

// Helper functions for role actions
function getRoleActionIcon(userRole: string) {
  switch (userRole) {
    case 'donor': return <Plus className="h-4 w-4" />
    case 'ngo': return <CheckCircle className="h-4 w-4" />
    case 'volunteer': return <Play className="h-4 w-4" />
    case 'admin': return <Shield className="h-4 w-4" />
    default: return <MapPin className="h-4 w-4" />
  }
}

function getRoleActionLabel(userRole: string) {
  switch (userRole) {
    case 'donor': return 'Create Donation'
    case 'ngo': return 'Claim Nearby'
    case 'volunteer': return 'Start Shift'
    case 'admin': return 'Moderation'
    default: return 'Action'
  }
}

function MapControls({
  onHeatmapToggle,
  heatmapMode,
  onTimeSliderChange,
  timeRangeHours,
  onFilterClick,
  onCenterOnMe,
  userRole,
  onRoleAction,
  isAdmin = false
}: MapControlsProps) {
  const [showTimeSlider, setShowTimeSlider] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const handleSeedData = async () => {
    try {
      setSeeding(true)
      toast.loading('Seeding data...', { id: 'seed-map' })
      const result = await seedData(true) // Force seed
      toast.success(result.message || 'Data seeded successfully!', { id: 'seed-map' })
      // Refresh page after a short delay to show new data
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed data', { id: 'seed-map' })
    } finally {
      setSeeding(false)
    }
  }

  // Show seed data button for all roles (not just admin)
  const showSeedButton = true

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
      {/* Role Badge */}
      <Card className="px-3 py-2 bg-background/95 backdrop-blur-sm border pointer-events-auto w-fit">
        <div className="flex items-center gap-2 text-sm font-medium capitalize">
          <span className="text-muted-foreground">Role:</span>
          <span>{userRole || 'Guest'}</span>
        </div>
      </Card>

      {/* Top Right Controls */}
      <div className="absolute top-0 right-0 flex flex-col gap-2 pointer-events-auto">
        {/* Heatmap Toggle */}
        <Card className="p-2 bg-background/95 backdrop-blur-sm border">
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onHeatmapToggle}
              className="w-full"
            >
              <Layers className="h-4 w-4 mr-2" />
              Heatmap: {heatmapMode === 'off' ? 'Off' : heatmapMode}
            </Button>
            {heatmapMode !== 'off' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTimeSlider(!showTimeSlider)}
                className="w-full text-xs"
              >
                Time Range
              </Button>
            )}
          </div>
        </Card>

        {/* Time Slider */}
        {showTimeSlider && (
          <Card className="p-3 bg-background/95 backdrop-blur-sm border w-64">
            <div className="space-y-2">
              <label className="text-xs font-medium">
                Past {timeRangeHours} hours
              </label>
              <input
                type="range"
                min="24"
                max="72"
                step="24"
                value={timeRangeHours}
                onChange={(e) => onTimeSliderChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>24h</span>
                <span>48h</span>
                <span>72h</span>
              </div>
            </div>
          </Card>
        )}

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onFilterClick}
          className="bg-background/95 backdrop-blur-sm"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>

        {/* Center on Me */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCenterOnMe}
          className="bg-background/95 backdrop-blur-sm"
        >
          <Navigation className="h-4 w-4" />
        </Button>

        {/* Seed Data Button (All Roles) */}
        {showSeedButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedData}
            disabled={seeding}
            className="bg-background/95 backdrop-blur-sm border-primary/20 hover:bg-primary/10"
            title="Seed map data for showcasing"
          >
            <Database className="h-4 w-4 mr-2" />
            {seeding ? 'Seeding...' : 'Seed Data'}
          </Button>
        )}
      </div>
    </div>
  )
}

function CenterOnLocation({ lat, lng, autoCenter = false }: { lat: number; lng: number; autoCenter?: boolean }) {
  const map = useMap()
  const hasCenteredRef = React.useRef(false)
  
  useEffect(() => {
    // Only auto-center on first location or if explicitly requested
    if (autoCenter || !hasCenteredRef.current) {
      map.setView([lat, lng], map.getZoom())
      hasCenteredRef.current = true
    }
  }, [lat, lng, map, autoCenter])
  
  return null
}

function MapBounds({ bbox }: { bbox: typeof CITY_BBOX }) {
  const map = useMap()
  
  useEffect(() => {
    const bounds = L.latLngBounds(
      [bbox.southwest.lat, bbox.southwest.lng],
      [bbox.northeast.lat, bbox.northeast.lng]
    )
    map.setMaxBounds(bounds)
    map.setMinZoom(10)
  }, [bbox, map])
  
  return null
}

export function IndoreMap() {
  const { user } = useAuth()
  const { role, admin, loading: roleLoading } = useRole()
  const { theme } = useTheme()
  const [heatmapMode, setHeatmapMode] = useState<'off' | 'surplus' | 'demand' | 'both'>('off')
  const [timeRangeHours, setTimeRangeHours] = useState(24)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    foodType: '' as string,
    qtyMin: 0,
    qtyMax: 1000,
    status: '' as string
  })

  // Use role from token claims (source of truth), fallback to 'donor' if not set
  // Admin takes precedence over role
  const userRole = admin ? 'admin' : (role || 'donor')
  const userId = user?.uid || ''

  // Firestore real-time sync with role-based filtering
  const { donations, requests, volunteers, lastUpdateTs } = useFirestoreMapSync({
    collections: ['donations', 'requests', 'volunteers'],
    filters: {
      bbox: CITY_BBOX,
      status: filters.status || undefined,
      foodType: filters.foodType || undefined,
      userId: userRole !== 'admin' ? userId : undefined,
      userRole: userRole
    },
    debounceMs: 200
  })

  // Filter donations based on user role and filters
  const filteredDonations = useMemo(() => {
    let filtered = donations

    // Role-specific filtering (additional client-side filtering for complex cases)
    if (userRole === 'donor') {
      // Donors see their own donations + available donations nearby (within 10km)
      filtered = donations.filter(d => {
        if (d.donorId === userId) return true // Own donations
        if (d.status === 'available' && d.lat && d.lng) {
          // Show available donations (can be filtered by distance later)
          return true
        }
        return false
      })
    } else if (userRole === 'ngo') {
      // NGOs see only available donations they can claim
      filtered = donations.filter(d => d.status === 'available')
    } else if (userRole === 'volunteer') {
      // Volunteers see their assigned tasks + available tasks they can pick up
      filtered = donations.filter(d => 
        d.volunteerId === userId || 
        (d.status === 'assigned' || d.status === 'picked')
      )
    }
    // Admin sees all (no additional filtering)

    // Apply additional filters
    if (filters.foodType) {
      filtered = filtered.filter(d => d.foodType === filters.foodType)
    }
    if (filters.qtyMin > 0) {
      filtered = filtered.filter(d => (d.qtyKg || 0) >= filters.qtyMin)
    }
    if (filters.qtyMax < 1000) {
      filtered = filtered.filter(d => (d.qtyKg || 0) <= filters.qtyMax)
    }

    return filtered
  }, [donations, userRole, userId, filters])

  // Get user's current location - always fetch fresh location
  const handleCenterOnMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    console.log('[IndoreMap] Manual location request triggered')

    // Request location with timeout and better error handling
    // maximumAge: 0 forces a fresh location (no cached position)
    const options = {
      enableHighAccuracy: true,
      timeout: 20000, // 20 seconds
      maximumAge: 0 // Force fresh location - absolutely no cached positions
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const accuracy = position.coords.accuracy || 0
        const timestamp = new Date(position.timestamp).toLocaleString()
        
        console.log(`[IndoreMap] Manual location received: ${latitude}, ${longitude} (Accuracy: ${Math.round(accuracy)}m, Time: ${timestamp})`)
        
        // Validate location accuracy
        if (accuracy > 1000) {
          toast.warning(`Location accuracy is low (${Math.round(accuracy)}m). Please ensure GPS is enabled.`)
        }
        
        setUserLocation([latitude, longitude])
        toast.success(`Location found! (Accuracy: ${Math.round(accuracy)}m, Time: ${timestamp})`)
      },
      (error) => {
        console.error('[IndoreMap] Error getting location:', error)
        let errorMessage = 'Unable to get your location'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings and reload the page.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your device GPS settings.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please ensure GPS is enabled and try again.'
            break
          default:
            errorMessage = 'An unknown error occurred while getting your location.'
            break
        }
        
        toast.error(errorMessage)
        // Don't fallback to Indore - let user know they need to enable location
      },
      options
    )
  }, [])

  // Track if we should auto-center (only on first location or manual center)
  const [shouldAutoCenter, setShouldAutoCenter] = useState(false)
  const hasReceivedFirstLocation = React.useRef(false)

  // Real-time location tracking using watchPosition
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('[IndoreMap] Geolocation not supported')
      return
    }

    console.log('[IndoreMap] Starting real-time location tracking...')

    // First, clear any existing watch
    // Then get a fresh location immediately
    const getFreshLocation = () => {
      const options = {
        enableHighAccuracy: true,
        timeout: 20000, // 20 seconds
        maximumAge: 0 // Force fresh location - absolutely no cache
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const accuracy = position.coords.accuracy || 0
          const timestamp = new Date(position.timestamp).toLocaleString()
          
          console.log(`[IndoreMap] Fresh location received: ${latitude}, ${longitude} (Accuracy: ${Math.round(accuracy)}m, Time: ${timestamp})`)
          
          setUserLocation([latitude, longitude])
          
          if (!hasReceivedFirstLocation.current) {
            hasReceivedFirstLocation.current = true
            setShouldAutoCenter(true)
            toast.success(`Real-time location tracking started (Accuracy: ${Math.round(accuracy)}m)`, { duration: 3000 })
          }
        },
        (error) => {
          console.error('[IndoreMap] Error getting fresh location:', error)
          toast.error(`Location error: ${error.message}`)
        },
        options
      )
    }

    // Get fresh location immediately
    getFreshLocation()

    // Then start watching for continuous updates
    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0 // Always get fresh location - no cached positions
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const accuracy = position.coords.accuracy || 0
        const timestamp = new Date(position.timestamp).toLocaleString()
        
        console.log(`[IndoreMap] Location update: ${latitude}, ${longitude} (Accuracy: ${Math.round(accuracy)}m, Time: ${timestamp})`)
        
        // Update location in real-time (but don't auto-center unless first time)
        setUserLocation([latitude, longitude])
        
        // Only show toast on first location
        if (!hasReceivedFirstLocation.current) {
          hasReceivedFirstLocation.current = true
          setShouldAutoCenter(true) // Auto-center on first location
          toast.success(`Real-time location tracking started (Accuracy: ${Math.round(accuracy)}m)`, { duration: 3000 })
        }
      },
      (error) => {
        console.error('[IndoreMap] Error watching location:', error)
        let errorMsg = 'Location tracking error'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location permission denied. Please enable location access.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location unavailable. Check GPS settings.'
            break
          case error.TIMEOUT:
            errorMsg = 'Location request timed out. Ensure GPS is enabled.'
            break
        }
        toast.error(errorMsg)
      },
      watchOptions
    )

    // Cleanup: stop watching when component unmounts
    return () => {
      console.log('[IndoreMap] Stopping location tracking')
      navigator.geolocation.clearWatch(watchId)
    }
  }, []) // Empty deps - only run once on mount

  // Update shouldAutoCenter when user manually centers
  const handleCenterOnMeWithAutoCenter = useCallback(() => {
    setShouldAutoCenter(true)
    handleCenterOnMe()
    // Reset after a short delay so subsequent watchPosition updates don't auto-center
    setTimeout(() => setShouldAutoCenter(false), 1000)
  }, [handleCenterOnMe])

  const handleRoleAction = useCallback(() => {
    // This will be handled by role panels
    console.log('Role action triggered:', userRole)
  }, [userRole])

  // Get tile layer URL based on Mapbox key or fallback to OSM
  const tileLayerUrl = useMemo(() => {
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_KEY
    if (mapboxKey) {
      return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapboxKey}`
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  }, [])

  const tileLayerAttribution = useMemo(() => {
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_KEY
    if (mapboxKey) {
      return '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
    return '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }, [])

  return (
    <div className="relative w-full h-screen">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          url={tileLayerUrl}
          attribution={tileLayerAttribution}
        />
        <MapBounds bbox={CITY_BBOX} />
        {userLocation && <CenterOnLocation lat={userLocation[0]} lng={userLocation[1]} />}
        
        {/* Clustered Markers */}
        <ClusteredMarkers
          donations={filteredDonations}
          requests={requests}
          volunteers={volunteers}
          userRole={userRole}
          userId={userId}
        />

        {/* Heatmap Layer */}
        {heatmapMode !== 'off' && (
          <HeatmapLayer
            donations={donations}
            requests={requests}
            mode={heatmapMode}
            timeRangeHours={timeRangeHours}
          />
        )}
      </MapContainer>

      {/* Map Legend */}
      <MapLegend />

      {/* Map Controls */}
      <MapControls
        onHeatmapToggle={() => {
          const modes: Array<'off' | 'surplus' | 'demand' | 'both'> = ['off', 'surplus', 'demand', 'both']
          const currentIndex = modes.indexOf(heatmapMode)
          setHeatmapMode(modes[(currentIndex + 1) % modes.length])
        }}
        heatmapMode={heatmapMode}
        onTimeSliderChange={setTimeRangeHours}
        timeRangeHours={timeRangeHours}
        onFilterClick={() => setShowFilters(!showFilters)}
          onCenterOnMe={handleCenterOnMeWithAutoCenter}
        userRole={userRole}
        onRoleAction={handleRoleAction}
        isAdmin={admin}
      />

      {/* Role-Specific Panels */}
      {userRole === 'donor' && (
        <RolePanelDonor
          donations={filteredDonations}
          userId={userId}
          onAction={handleRoleAction}
          onLocationCaptured={(lat, lng) => {
            // Center map on captured location
            setUserLocation([lat, lng])
            toast.info('Map centered on your location')
          }}
        />
      )}
      {userRole === 'ngo' && (
        <RolePanelNGO
          donations={filteredDonations}
          requests={requests}
          userId={userId}
          onAction={handleRoleAction}
        />
      )}
      {userRole === 'volunteer' && (
        <RolePanelVolunteer
          donations={filteredDonations}
          volunteers={volunteers}
          userId={userId}
          onAction={handleRoleAction}
        />
      )}
      {userRole === 'admin' && (
        <RolePanelAdmin
          donations={donations}
          requests={requests}
          volunteers={volunteers}
          onAction={handleRoleAction}
        />
      )}

      {/* Filter Panel */}
      {showFilters && (
        <Card className="absolute bottom-4 left-4 z-[1000] p-4 bg-background/95 backdrop-blur-sm border w-64">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Filters</h3>
            <div className="space-y-2">
              <label className="text-xs font-medium">Food Type</label>
              <select
                value={filters.foodType}
                onChange={(e) => setFilters({ ...filters, foodType: e.target.value })}
                className="w-full p-2 text-sm border rounded"
              >
                <option value="">All Types</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="non-vegetarian">Non-Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="bakery">Bakery</option>
                <option value="dairy">Dairy</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Quantity (kg)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.qtyMin}
                  onChange={(e) => setFilters({ ...filters, qtyMin: Number(e.target.value) })}
                  className="w-full p-2 text-sm border rounded"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.qtyMax}
                  onChange={(e) => setFilters({ ...filters, qtyMax: Number(e.target.value) })}
                  className="w-full p-2 text-sm border rounded"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full p-2 text-sm border rounded"
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="picked">Picked</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </Card>
      )}

      {/* Floating Action Button */}
      <Button
        className={cn(
          "absolute bottom-4 right-4 z-[1000] rounded-full h-14 w-14 shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
        onClick={handleRoleAction}
        aria-label={getRoleActionLabel(userRole)}
      >
        {getRoleActionIcon(userRole)}
      </Button>
    </div>
  )
}

