"use client"

/**
 * useMarkerIconFactory Hook
 * Creates and caches marker icons based on role and status
 */

import { useMemo } from 'react'
import L from 'leaflet'

interface IconOptions {
  role: 'donor' | 'donor-own' | 'ngo' | 'volunteer' | 'admin' | 'pending'
  status?: string
  size?: 'small' | 'normal' | 'large'
}

// Default marker image URL
// NOTE: Place your marker image in frontend/public/ and update this path
// Example: If image is at frontend/public/marker-logo.jpg, use "/marker-logo.jpg"
// public/AAHARNET_ADMIN.png -> available at URL "/AAHARNET_ADMIN.png"
const DEFAULT_MARKER_URL = "/AAHARNET_ADMIN.png";

// Color palette for AAHARNET.AI
const COLORS = {
  donor: '#FF6B00', // Orange
  'donor-own': '#FF8C42', // Lighter orange for own donations
  ngo: '#00A991', // Teal
  volunteer: '#0066CC', // Blue
  admin: '#8B5CF6', // Purple
  pending: '#9CA3AF', // Grey
  available: '#10B981', // Green
  assigned: '#F59E0B', // Yellow
  picked: '#3B82F6', // Blue
  delivered: '#6B7280' // Grey
}

// Icon cache using WeakMap
const iconCache = new WeakMap<object, L.Icon>()

export function useMarkerIconFactory() {
  const getIcon = useMemo(() => {
    return (options: IconOptions): L.Icon => {
      const { role, status, size = 'normal' } = options
      
      // Create cache key
      const cacheKey = { role, status, size }
      
      // Check cache
      if (iconCache.has(cacheKey as any)) {
        return iconCache.get(cacheKey as any)!
      }

      // Size multipliers
      const sizeMultipliers = {
        small: 0.7,
        normal: 1.0,
        large: 1.3
      }
      const multiplier = sizeMultipliers[size]

      // Use different icons for different roles - all use distinct SVG icons
      const color = COLORS[role] || COLORS.pending
      const statusColor = status && COLORS[status as keyof typeof COLORS] 
        ? COLORS[status as keyof typeof COLORS] 
        : null
      
      const finalColor = statusColor || color
      
      // Different shapes for different roles
      let shapePath = ''
      let innerShape = ''
      
      if (role === 'donor' || role === 'donor-own') {
        // Package/box shape for donors (orange)
        shapePath = 'M16 0C7.163 0 0 7.163 0 16c0 11.5 16 24 16 24s16-12.5 16-24C32 7.163 24.837 0 16 0z'
        innerShape = '<rect x="8" y="10" width="16" height="12" rx="2" fill="#fff"/><path d="M8 10 L16 6 L24 10" stroke="#fff" stroke-width="1.5" fill="none"/>'
      } else if (role === 'ngo') {
        // Heart shape for NGO (teal)
        shapePath = 'M16 0C7.163 0 0 7.163 0 16c0 11.5 16 24 16 24s16-12.5 16-24C32 7.163 24.837 0 16 0z'
        innerShape = '<path d="M16 12c-2-2-6-2-6 4 0 4 6 8 6 8s6-4 6-8c0-6-4-6-6-4z" fill="#fff"/>'
      } else if (role === 'volunteer') {
        // Person/user shape for volunteer (blue)
        shapePath = 'M16 0C7.163 0 0 7.163 0 16c0 11.5 16 24 16 24s16-12.5 16-24C32 7.163 24.837 0 16 0z'
        innerShape = '<circle cx="16" cy="12" r="5" fill="#fff"/><path d="M8 24c0-4 3.5-7 8-7s8 3 8 7" fill="#fff"/>'
      } else {
        // Default circle for other roles
        shapePath = 'M16 0C7.163 0 0 7.163 0 16c0 11.5 16 24 16 24s16-12.5 16-24C32 7.163 24.837 0 16 0z'
        innerShape = '<circle cx="16" cy="16" r="8" fill="#fff"/>'
      }
      
      const svgIcon = `
        <svg width="${32 * multiplier}" height="${40 * multiplier}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path d="${shapePath}" fill="${finalColor}" stroke="#fff" stroke-width="2"/>
          ${innerShape}
        </svg>
      `
      const iconUrl = `data:image/svg+xml;base64,${btoa(svgIcon)}`
      const iconSize: [number, number] = [32 * multiplier, 40 * multiplier]

      // Create icon
      const icon = L.icon({
        iconUrl,
        iconSize,
        iconAnchor: [iconSize[0] / 2, iconSize[1]],
        popupAnchor: [0, -iconSize[1]],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41 * multiplier, 41 * multiplier],
        shadowAnchor: [12 * multiplier, 41 * multiplier]
      })

      // Cache icon
      iconCache.set(cacheKey as any, icon)

      return icon
    }
  }, [])

  return { getIcon }
}

