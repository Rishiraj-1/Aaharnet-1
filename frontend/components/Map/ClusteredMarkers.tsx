"use client"

/**
 * Clustered Markers Component
 * Displays donation markers with clustering and custom icons
 */

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
// Note: react-leaflet-cluster may need to be used differently
// For now, we'll render markers without clustering if the package structure differs
import L from 'leaflet'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Clock, Package, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useMarkerIconFactory } from '@/hooks/useMarkerIconFactory'
import { createDonation, claimDonation, updateDonation } from '@/lib/api/mapApi'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

interface Donation {
  id: string
  donorId: string
  lat: number
  lng: number
  qtyKg: number
  foodType: string
  freshnessScore?: number
  status: 'available' | 'assigned' | 'picked' | 'delivered'
  createdAt: any
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
  createdAt: any
}

interface Volunteer {
  id: string
  lat: number
  lng: number
  status: string
  currentTaskId?: string
}

interface ClusteredMarkersProps {
  donations: Donation[]
  requests: Request[]
  volunteers: Volunteer[]
  userRole: string
  userId: string
}

// Global state to track open popups (prevents closing during re-renders)
const openPopupsRef = React.createRef<Set<string>>()
if (!openPopupsRef.current) {
  openPopupsRef.current = new Set<string>()
}

export function ClusteredMarkers({
  donations,
  requests,
  volunteers,
  userRole,
  userId
}: ClusteredMarkersProps) {
  const { user } = useAuth()
  const { getIcon } = useMarkerIconFactory()

  const handleClaim = async (donationId: string) => {
    if (!user) {
      toast.error('Please sign in to claim donations')
      return
    }

    try {
      await claimDonation(donationId)
      toast.success('Donation claimed successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim donation')
    }
  }

  const handleEdit = (donation: Donation) => {
    // Open edit modal (to be implemented)
    toast.info('Edit functionality coming soon')
  }

  const handleAssign = async (donationId: string, volunteerId: string) => {
    // Admin assign functionality
    toast.info('Assign functionality coming soon')
  }

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'assigned': return 'bg-yellow-500'
      case 'picked': return 'bg-blue-500'
      case 'delivered': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  // Component to handle marker position updates with stable popup
  const UpdatingMarker = React.memo(({ donation, icon, children }: { donation: Donation; icon: L.Icon; children: React.ReactNode }) => {
    const markerRef = React.useRef<L.Marker | null>(null)
    const popupRef = React.useRef<L.Popup | null>(null)
    const isPopupOpenRef = React.useRef(false)
    const map = useMap()

    // Prevent position updates while popup is open
    React.useEffect(() => {
      if (markerRef.current && donation.lat && donation.lng && !isPopupOpenRef.current) {
        const newPos = L.latLng(donation.lat, donation.lng)
        const currentPos = markerRef.current.getLatLng()
        // Only update if position actually changed significantly
        if (!currentPos || currentPos.distanceTo(newPos) > 0.001) {
          markerRef.current.setLatLng(newPos)
        }
      }
    }, [donation.lat, donation.lng])

    // Track popup state and prevent closing - more robust approach
    React.useEffect(() => {
      if (!markerRef.current) return

      const marker = markerRef.current
      const popupId = `popup-${donation.id}`
      let preventCloseHandler: ((e: L.LeafletMouseEvent) => void) | null = null
      let contentWrapper: HTMLElement | null = null
      let stopPropagationHandler: ((e: Event) => void) | null = null
      
      const handlePopupOpen = () => {
        isPopupOpenRef.current = true
        if (openPopupsRef.current) {
          openPopupsRef.current.add(popupId)
        }
        
        // Get the popup and configure it
        const popup = marker.getPopup()
        if (popup) {
          popupRef.current = popup
          
          // Disable all auto-close behaviors
          popup.options.autoClose = false
          popup.options.closeOnClick = false
          popup.options.closeOnEscapeKey = true
          
          // Disable map dragging when popup is open to prevent accidental closes
          if (map.dragging) {
            map.dragging.disable()
          }
          
          // Prevent map clicks from closing popup
          preventCloseHandler = (e: L.LeafletMouseEvent) => {
            const target = e.originalEvent?.target as HTMLElement
            if (target) {
              // Check if click is inside popup
              const popupElement = target.closest('.leaflet-popup')
              if (popupElement) {
                e.originalEvent?.stopPropagation()
                e.originalEvent?.stopImmediatePropagation()
                e.originalEvent?.preventDefault()
                return false
              }
            }
          }
          
          // Add event listeners to prevent closing
          if (preventCloseHandler) {
            map.on('click', preventCloseHandler)
            map.on('mousedown', preventCloseHandler)
          }
          
          // Also prevent clicks on the popup content from bubbling to map
          // BUT allow button clicks to work normally
          const popupElement = popup.getElement()
          if (popupElement) {
            contentWrapper = popupElement.querySelector('.leaflet-popup-content-wrapper') as HTMLElement
            if (contentWrapper) {
              stopPropagationHandler = (e: Event) => {
                const target = e.target as HTMLElement
                // Allow button clicks and links to work normally
                if (target && (
                  target.tagName === 'BUTTON' || 
                  target.closest('button') ||
                  target.tagName === 'A' ||
                  target.closest('a')
                )) {
                  // Don't stop propagation for buttons/links - let them work
                  return
                }
                // For other elements, stop propagation to prevent popup from closing
                e.stopPropagation()
              }
              // Use capture phase only for mousedown to prevent map interactions
              // Don't use capture for click - let buttons handle their own clicks
              contentWrapper.addEventListener('mousedown', stopPropagationHandler, true)
              contentWrapper.addEventListener('mouseup', stopPropagationHandler, true)
              contentWrapper.addEventListener('touchstart', stopPropagationHandler, true)
              contentWrapper.addEventListener('touchend', stopPropagationHandler, true)
            }
          }
        }
      }

      const handlePopupClose = () => {
        isPopupOpenRef.current = false
        if (openPopupsRef.current) {
          openPopupsRef.current.delete(popupId)
        }
        
        // Re-enable map dragging
        if (map.dragging) {
          map.dragging.enable()
        }
        
        // Remove event listeners
        if (preventCloseHandler) {
          map.off('click', preventCloseHandler)
          map.off('mousedown', preventCloseHandler)
          preventCloseHandler = null
        }
        
        // Remove content wrapper listeners
        if (contentWrapper && stopPropagationHandler) {
          contentWrapper.removeEventListener('mousedown', stopPropagationHandler, true)
          contentWrapper.removeEventListener('mouseup', stopPropagationHandler, true)
          contentWrapper.removeEventListener('touchstart', stopPropagationHandler, true)
          contentWrapper.removeEventListener('touchend', stopPropagationHandler, true)
          contentWrapper = null
          stopPropagationHandler = null
        }
        
        popupRef.current = null
        
        // Now safe to update position if needed
        if (marker && donation.lat && donation.lng) {
          const newPos = L.latLng(donation.lat, donation.lng)
          const currentPos = marker.getLatLng()
          if (!currentPos || currentPos.distanceTo(newPos) > 0.001) {
            marker.setLatLng(newPos)
          }
        }
      }

      marker.on('popupopen', handlePopupOpen)
      marker.on('popupclose', handlePopupClose)

      return () => {
        marker.off('popupopen', handlePopupOpen)
        marker.off('popupclose', handlePopupClose)
        if (openPopupsRef.current) {
          openPopupsRef.current.delete(popupId)
        }
        // Cleanup
        if (map.dragging) {
          map.dragging.enable()
        }
        if (preventCloseHandler) {
          map.off('click', preventCloseHandler)
          map.off('mousedown', preventCloseHandler)
        }
        if (contentWrapper && stopPropagationHandler) {
          contentWrapper.removeEventListener('mousedown', stopPropagationHandler, true)
          contentWrapper.removeEventListener('mouseup', stopPropagationHandler, true)
          contentWrapper.removeEventListener('touchstart', stopPropagationHandler, true)
          contentWrapper.removeEventListener('touchend', stopPropagationHandler, true)
        }
      }
    }, [donation.id, donation.lat, donation.lng, map])

    return (
      <Marker
        ref={markerRef}
        position={[donation.lat, donation.lng]}
        icon={icon}
      >
        {children}
      </Marker>
    )
  }, (prevProps, nextProps) => {
    // Only re-render if position or key data changed significantly
    return (
      prevProps.donation.id === nextProps.donation.id &&
      Math.abs(prevProps.donation.lat - nextProps.donation.lat) < 0.001 &&
      Math.abs(prevProps.donation.lng - nextProps.donation.lng) < 0.001 &&
      prevProps.donation.status === nextProps.donation.status &&
      prevProps.donation.qtyKg === nextProps.donation.qtyKg &&
      prevProps.donation.foodType === nextProps.donation.foodType
    )
  })

  // Memoize handlers to prevent re-renders
  const handleClaimMemo = React.useCallback((donationId: string) => {
    return handleClaim(donationId)
  }, [user])

  const handleEditMemo = React.useCallback((donation: Donation) => {
    return handleEdit(donation)
  }, [])

  const handleAssignMemo = React.useCallback((donationId: string, volunteerId: string) => {
    return handleAssign(donationId, volunteerId)
  }, [])

  const donationMarkers = useMemo(() => {
    return donations
      .filter(d => d.lat && d.lng)
      .map((donation) => {
        const isOwner = donation.donorId === userId
        const canClaim = userRole === 'ngo' && donation.status === 'available'
        const canAssign = userRole === 'admin'
        const canEdit = userRole === 'donor' && isOwner && donation.status === 'available'

        const icon = getIcon({
          role: userRole === 'donor' && isOwner ? 'donor-own' : 'donor',
          status: donation.status,
          size: 'normal'
        })

        return (
          <UpdatingMarker
            key={`donation-${donation.id}`}
            donation={donation}
            icon={icon}
          >
            <Popup 
              key={`popup-${donation.id}-${donation.status}`}
              closeOnClick={false} 
              autoClose={false} 
              closeButton={true}
              closeOnEscapeKey={true}
              className="donation-popup"
              keepInView={true}
            >
              <div
                className="popup-content-wrapper"
                style={{ 
                  pointerEvents: 'auto',
                  position: 'relative',
                  zIndex: 1000
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.nativeEvent?.stopImmediatePropagation()
                  e.preventDefault()
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.nativeEvent?.stopImmediatePropagation()
                  e.preventDefault()
                }}
                onMouseUp={(e) => {
                  e.stopPropagation()
                  e.nativeEvent?.stopImmediatePropagation()
                  e.preventDefault()
                }}
                onTouchStart={(e) => {
                  e.stopPropagation()
                  e.nativeEvent?.stopImmediatePropagation()
                  e.preventDefault()
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation()
                  e.nativeEvent?.stopImmediatePropagation()
                  e.preventDefault()
                }}
              >
                <Card className="p-3 w-64">
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">
                          {donation.donorName || 'Anonymous Donor'}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(donation.createdAt)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(donation.status)}>
                        {donation.status}
                      </Badge>
                    </div>

                    {/* Image */}
                    {donation.imageUrl && (
                      <div className="relative w-full h-32 bg-muted rounded overflow-hidden">
                        <img
                          src={donation.imageUrl}
                          alt="Donation"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                        {!donation.imageUrl && (
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Details */}
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{donation.qtyKg} kg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{donation.foodType}</span>
                      </div>
                      {donation.freshnessScore !== undefined && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Freshness: {donation.freshnessScore}/100</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t">
                      {canClaim && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleClaimMemo(donation.id)
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onMouseUp={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="w-full"
                        >
                          Claim Donation
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleEditMemo(donation)
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onMouseUp={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="w-full"
                        >
                          Edit
                        </Button>
                      )}
                      {canAssign && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleAssignMemo(donation.id, '')
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onMouseUp={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="w-full"
                        >
                          Assign Volunteer
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          // Open Google Maps in new tab
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${donation.lat},${donation.lng}`
                          window.open(url, '_blank', 'noopener,noreferrer')
                          // Stop propagation AFTER opening the link to prevent popup from closing
                          e.stopPropagation()
                        }}
                        className="w-full"
                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Get Directions
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </Popup>
          </UpdatingMarker>
        )
      })
  }, [donations, userRole, userId, getIcon, handleClaimMemo, handleEditMemo, handleAssignMemo])

  // NGO Request Markers
  const ngoMarkers = useMemo(() => {
    return requests
      .filter(r => r.lat && r.lng)
      .map((request) => {
        const icon = getIcon({
          role: 'ngo',
          status: request.status,
          size: 'normal'
        })

        return (
          <Marker
            key={`ngo-${request.id}`}
            position={[request.lat, request.lng]}
            icon={icon}
          >
            <Popup 
              closeOnClick={false} 
              autoClose={false} 
              closeButton={true}
              closeOnEscapeKey={true}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Card className="p-3 w-64">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">NGO Request</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(request.createdAt)}
                        </p>
                      </div>
                      <Badge className="bg-teal-500">
                        {request.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>Needs {request.qtyKg} kg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{request.foodType}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`
                        window.open(url, '_blank', 'noopener,noreferrer')
                        e.stopPropagation()
                      }}
                      className="w-full"
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </Card>
              </div>
            </Popup>
          </Marker>
        )
      })
  }, [requests, getIcon])

  // Volunteer Markers
  const volunteerMarkers = useMemo(() => {
    return volunteers
      .filter(v => v.lat && v.lng)
      .map((volunteer) => {
        const icon = getIcon({
          role: 'volunteer',
          status: volunteer.status,
          size: 'normal'
        })

        return (
          <Marker
            key={`volunteer-${volunteer.id}`}
            position={[volunteer.lat, volunteer.lng]}
            icon={icon}
          >
            <Popup closeOnClick={false} autoClose={false} closeButton={true}>
              <Card className="p-3 w-64">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">Volunteer</h3>
                      <p className="text-xs text-muted-foreground">
                        Status: {volunteer.status || 'active'}
                      </p>
                    </div>
                    <Badge className="bg-blue-500">
                      Available
                    </Badge>
                  </div>
                  {volunteer.currentTaskId && (
                    <div className="text-xs text-muted-foreground">
                      Active Task: {volunteer.currentTaskId.substring(0, 8)}...
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${volunteer.lat},${volunteer.lng}`
                      window.open(url, '_blank', 'noopener,noreferrer')
                      e.stopPropagation()
                    }}
                    className="w-full"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Get Directions
                  </Button>
                </div>
              </Card>
            </Popup>
          </Marker>
        )
      })
  }, [volunteers, getIcon])

  // Render all markers
  return (
    <>
      {donationMarkers}
      {ngoMarkers}
      {volunteerMarkers}
    </>
  )
}

