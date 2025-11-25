"use client"

/**
 * Role Panel for Donors
 * Shows donor-specific interface with quick-create donation
 */

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, Package, CheckCircle, Clock, MapPin, MapPinOff } from 'lucide-react'
import { createDonation } from '@/lib/api/mapApi'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation'

interface Donation {
  id: string
  donorId: string
  qtyKg: number
  foodType: string
  status: string
  createdAt: any
}

interface RolePanelDonorProps {
  donations: Donation[]
  userId: string
  onAction: () => void
  onLocationCaptured?: (lat: number, lng: number) => void
}

export function RolePanelDonor({ donations, userId, onAction, onLocationCaptured }: RolePanelDonorProps) {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    qtyKg: '',
    foodType: 'vegetarian',
    imageUrl: '',
    lat: 0,
    lng: 0
  })

  const myDonations = donations.filter(d => d.donorId === userId)
  const deliveredCount = myDonations.filter(d => d.status === 'delivered').length
  const availableCount = myDonations.filter(d => d.status === 'available').length
  
  // Get the first available donation for real-time tracking
  const availableDonation = myDonations.find(d => d.status === 'available')
  const [trackingDonationId, setTrackingDonationId] = useState<string | null>(null)
  
  // Real-time location tracking
  const { location, startTracking, stopTracking, isTracking } = useRealtimeLocation({
    enabled: false, // Controlled manually
    updateDonationId: trackingDonationId,
    updateInterval: 10000, // Update every 10 seconds
    highAccuracy: true
  })
  
  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking()
      setTrackingDonationId(null)
      toast.info('Real-time location tracking stopped')
    } else {
      if (!availableDonation) {
        toast.error('No available donation to track. Please create a donation first.')
        return
      }
      setTrackingDonationId(availableDonation.id)
      startTracking()
      toast.success('Real-time location tracking started')
    }
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const accuracy = position.coords.accuracy || 0
        
        // Log the captured coordinates for debugging
        console.log('[RolePanelDonor] Location captured:', { latitude, longitude, accuracy })
        
        // Validate coordinates are valid
        if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
          console.error('[RolePanelDonor] Invalid coordinates received:', { latitude, longitude })
          toast.error('Invalid location received. Please try again.')
          return
        }
        
        setFormData({
          ...formData,
          lat: latitude,
          lng: longitude
        })
        
        // Verify the coordinates were set correctly
        console.log('[RolePanelDonor] Form data updated with location:', { lat: latitude, lng: longitude })
        
        // Notify parent component to center map on captured location
        if (onLocationCaptured) {
          onLocationCaptured(latitude, longitude)
        }
        
        if (accuracy > 1000) {
          toast.warning(`Location captured (low accuracy: ${Math.round(accuracy)}m). Please enable GPS for better results.`)
        } else {
          toast.success(`Location captured! (Accuracy: ${Math.round(accuracy)}m)`)
        }
      },
      (error) => {
        console.error('Location error:', error)
        let errorMessage = 'Failed to get location'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Please check your GPS settings.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please ensure GPS is enabled.'
            break
        }
        
        toast.error(errorMessage)
      },
      options
    )
  }

  const handleCreateDonation = async () => {
    if (!user) {
      toast.error('Please sign in to create donations')
      return
    }

    if (!formData.lat || !formData.lng) {
      toast.error('Please capture your location first')
      return
    }

    if (!formData.qtyKg || Number(formData.qtyKg) <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    // Validate coordinates before creating
    if (!formData.lat || !formData.lng || formData.lat === 0 || formData.lng === 0) {
      toast.error('Invalid location. Please capture your location again.')
      return
    }

    setIsCreating(true)
    try {
      const donationData = {
        donorId: userId,
        lat: formData.lat,
        lng: formData.lng,
        qtyKg: Number(formData.qtyKg),
        foodType: formData.foodType
      }
      
      console.log('[RolePanelDonor] Creating donation with data:', donationData)
      console.log('[RolePanelDonor] Location coordinates:', { lat: donationData.lat, lng: donationData.lng })
      
      // Double-check coordinates are valid numbers
      if (isNaN(donationData.lat) || isNaN(donationData.lng)) {
        throw new Error('Invalid location coordinates. Please capture your location again.')
      }
      
      const result = await createDonation({
        donorId: userId,
        lat: donationData.lat,
        lng: donationData.lng,
        qtyKg: Number(formData.qtyKg),
        foodType: formData.foodType,
        imageUrl: formData.imageUrl || undefined,
        freshnessScore: 85 // Default, can be updated with vision API
      })
      
      console.log('Donation created successfully:', result)
      toast.success('Donation created successfully!')
      setIsDialogOpen(false)
      setFormData({
        qtyKg: '',
        foodType: 'vegetarian',
        imageUrl: '',
        lat: 0,
        lng: 0
      })
    } catch (error: any) {
      console.error('Error creating donation:', error)
      toast.error(error.message || 'Failed to create donation. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] w-80 bg-background/95 backdrop-blur-sm border">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Donor Dashboard</h3>
          <Badge variant="outline">{user?.displayName || 'Donor'}</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Delivered</div>
            <div className="text-lg font-semibold">{deliveredCount}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-lg font-semibold">{availableCount}</div>
          </div>
        </div>

        {/* Real-time Location Tracking */}
        {availableDonation && (
          <Button
            variant={isTracking ? "default" : "outline"}
            className="w-full"
            onClick={handleToggleTracking}
          >
            {isTracking ? (
              <>
                <MapPinOff className="h-4 w-4 mr-2" />
                Stop Tracking
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Start Real-time Tracking
              </>
            )}
          </Button>
        )}
        
        {isTracking && location.latitude && location.longitude && (
          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
            <div>Tracking: {availableDonation?.qtyKg} kg donation</div>
            <div>Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</div>
            {location.accuracy && (
              <div>Accuracy: {Math.round(location.accuracy)}m</div>
            )}
          </div>
        )}

        {/* Quick Create */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" onClick={onAction}>
              <Plus className="h-4 w-4 mr-2" />
              Create Donation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Donation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Quantity (kg)</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.qtyKg}
                  onChange={(e) => setFormData({ ...formData, qtyKg: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Food Type</Label>
                <RadioGroup
                  value={formData.foodType}
                  onValueChange={(value) => setFormData({ ...formData, foodType: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vegetarian" id="veg" />
                    <Label htmlFor="veg">Vegetarian</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non-vegetarian" id="nonveg" />
                    <Label htmlFor="nonveg">Non-Vegetarian</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vegan" id="vegan" />
                    <Label htmlFor="vegan">Vegan</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bakery" id="bakery" />
                    <Label htmlFor="bakery">Bakery</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Image URL (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleGetLocation}
                className="w-full"
              >
                Capture Location
              </Button>
              {formData.lat && formData.lng && (
                <div className="text-xs text-muted-foreground">
                  Location: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                </div>
              )}
              <Button
                onClick={handleCreateDonation}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? 'Creating...' : 'Create Donation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recent Donations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Donations</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {myDonations.slice(0, 5).map((donation) => (
              <div
                key={donation.id}
                className="p-2 bg-muted rounded text-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{donation.qtyKg} kg</span>
                  <span className="text-muted-foreground capitalize">{donation.foodType}</span>
                </div>
                <Badge variant={donation.status === 'delivered' ? 'default' : 'secondary'}>
                  {donation.status}
                </Badge>
              </div>
            ))}
            {myDonations.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No donations yet
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

