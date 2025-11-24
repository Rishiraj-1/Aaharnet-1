"use client"

/**
 * Clustered Markers Component
 * Displays donation markers with clustering and custom icons
 */

import React, { useMemo } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
// Note: react-leaflet-cluster may need to be used differently
// For now, we'll render markers without clustering if the package structure differs
import L from 'leaflet'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Package, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useMarkerIconFactory } from '@/hooks/useMarkerIconFactory'
import { createDonation, claimDonation } from '@/lib/api/mapApi'
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
          <Marker
            key={`donation-${donation.id}`}
            position={[donation.lat, donation.lng]}
            icon={icon}
          >
            <Popup>
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
                        onClick={() => handleClaim(donation.id)}
                        className="w-full"
                      >
                        Claim Donation
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(donation)}
                        className="w-full"
                      >
                        Edit
                      </Button>
                    )}
                    {canAssign && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(donation.id, '')}
                        className="w-full"
                      >
                        Assign Volunteer
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${donation.lat},${donation.lng}`,
                          '_blank'
                        )
                      }}
                      className="w-full"
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </div>
              </Card>
            </Popup>
          </Marker>
        )
      })
  }, [donations, userRole, userId, getIcon, handleClaim, handleEdit, handleAssign])

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
            <Popup>
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
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`,
                        '_blank'
                      )
                    }}
                    className="w-full"
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
            <Popup>
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
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${volunteer.lat},${volunteer.lng}`,
                        '_blank'
                      )
                    }}
                    className="w-full"
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

