"use client"

/**
 * Heatmap Layer Component
 * Displays heatmap overlay for donation density
 */

import React, { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

interface Donation {
  id: string
  lat: number
  lng: number
  qtyKg: number
  status: string
  createdAt: any
}

interface Request {
  id: string
  lat: number
  lng: number
  qtyKg: number
  status: string
  createdAt: any
}

interface HeatmapLayerProps {
  donations: Donation[]
  requests: Request[]
  mode: 'surplus' | 'demand' | 'both'
  timeRangeHours: number
}

export function HeatmapLayer({
  donations,
  requests,
  mode,
  timeRangeHours
}: HeatmapLayerProps) {
  const map = useMap()
  const heatLayerRef = useRef<L.HeatLayer | null>(null)

  useEffect(() => {
    // Filter data by time range
    const now = new Date()
    const cutoffTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000)

    const filterByTime = (item: Donation | Request) => {
      try {
        const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt)
        return createdAt >= cutoffTime
      } catch {
        return true // Include if timestamp parsing fails
      }
    }

    // Prepare heatmap points
    const points: Array<[number, number, number]> = []

    if (mode === 'surplus' || mode === 'both') {
      donations
        .filter(d => d.status === 'available' && d.lat && d.lng && filterByTime(d))
        .forEach(donation => {
          const weight = donation.qtyKg || 1
          points.push([donation.lat, donation.lng, weight])
        })
    }

    if (mode === 'demand' || mode === 'both') {
      requests
        .filter(r => r.lat && r.lng && filterByTime(r))
        .forEach(request => {
          const weight = request.qtyKg || 1
          points.push([request.lat, request.lng, weight])
        })
    }

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
    }

    // Create new heat layer
    if (points.length > 0) {
      const heatLayer = (L as any).heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.0: 'blue',
          0.5: 'cyan',
          0.7: 'lime',
          0.8: 'yellow',
          1.0: 'red'
        }
      })

      heatLayer.addTo(map)
      heatLayerRef.current = heatLayer
    }

    // Cleanup
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current)
      }
    }
  }, [donations, requests, mode, timeRangeHours, map])

  return null
}

