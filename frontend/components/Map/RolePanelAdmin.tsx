"use client"

/**
 * Role Panel for Admins
 * Shows admin-specific interface with moderation tools
 */

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Download, Filter, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface Donation {
  id: string
  donorId: string
  qtyKg: number
  foodType: string
  status: string
  createdAt: any
}

interface Request {
  id: string
  ngoId: string
  qtyKg: number
  status: string
}

interface Volunteer {
  id: string
  status: string
}

interface RolePanelAdminProps {
  donations: Donation[]
  requests: Request[]
  volunteers: Volunteer[]
  onAction: () => void
}

export function RolePanelAdmin({
  donations,
  requests,
  volunteers,
  onAction
}: RolePanelAdminProps) {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  const totalDonations = donations.length
  const totalRequests = requests.length
  const activeVolunteers = volunteers.filter(v => v.status === 'active').length
  const pendingApprovals = donations.filter(d => d.status === 'pending').length

  const handleExport = () => {
    // Export functionality
    const data = {
      donations,
      requests,
      volunteers,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aaharnet-export-${Date.now()}.json`
    a.click()
  }

  const handleApprove = (id: string) => {
    // Approve functionality
    console.log('Approve:', id)
  }

  const handleReject = (id: string) => {
    // Reject functionality
    console.log('Reject:', id)
  }

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] w-96 bg-background/95 backdrop-blur-sm border">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Admin Dashboard</h3>
          <Badge variant="outline">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Donations</div>
            <div className="text-lg font-semibold">{totalDonations}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Requests</div>
            <div className="text-lg font-semibold">{totalRequests}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Volunteers</div>
            <div className="text-lg font-semibold">{activeVolunteers}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-lg font-semibold">{pendingApprovals}</div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="flex-1"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingApprovals > 0 && (
          <Card className="p-3 bg-yellow-500/10 border-yellow-500/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Pending Approvals</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {pendingApprovals} items require approval
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApprove('all')}
                  className="flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject('all')}
                  className="flex-1"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Review
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Export */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>

        {/* Moderation Tools */}
        <Button
          className="w-full"
          onClick={onAction}
        >
          <Shield className="h-4 w-4 mr-2" />
          Moderation Tools
        </Button>
      </div>
    </Card>
  )
}

