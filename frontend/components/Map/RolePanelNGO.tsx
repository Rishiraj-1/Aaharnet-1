"use client"

/**
 * Role Panel for NGOs
 * Shows NGO-specific interface with claimed offers and forecast
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Package, Clock, TrendingUp } from 'lucide-react'
import { claimDonation } from '@/lib/api/mapApi'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

interface Donation {
  id: string
  donorId: string
  qtyKg: number
  foodType: string
  status: string
  createdAt: any
  ngoId?: string
}

interface Request {
  id: string
  ngoId: string
  qtyKg: number
  foodType: string
  status: string
}

interface RolePanelNGOProps {
  donations: Donation[]
  requests: Request[]
  userId: string
  onAction: () => void
}

export function RolePanelNGO({ donations, requests, userId, onAction }: RolePanelNGOProps) {
  const { user } = useAuth()
  
  const claimedDonations = donations.filter(d => d.ngoId === userId)
  const availableDonations = donations.filter(d => d.status === 'available')
  const myRequests = requests.filter(r => r.ngoId === userId)

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

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] w-80 bg-background/95 backdrop-blur-sm border">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">NGO Dashboard</h3>
          <Badge variant="outline">{user?.displayName || 'NGO'}</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Claimed</div>
            <div className="text-lg font-semibold">{claimedDonations.length}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-lg font-semibold">{availableDonations.length}</div>
          </div>
        </div>

        {/* Forecast Card */}
        <Card className="p-3 bg-primary/10 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Demand Forecast</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Expected demand: {myRequests.reduce((sum, r) => sum + r.qtyKg, 0)} kg
          </div>
        </Card>

        {/* Claimed Offers */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Claimed Offers</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {claimedDonations.slice(0, 5).map((donation) => (
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
            {claimedDonations.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No claimed donations yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onAction}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Request Assistance
        </Button>
      </div>
    </Card>
  )
}

