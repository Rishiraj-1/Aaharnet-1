"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Calendar, Clock, MapPin, Package, CheckCircle, XCircle, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"

// Mock data for demonstration
const mockSchedules = [
  {
    id: "1",
    date: "2024-01-15",
    time: "10:00 AM",
    type: "Pickup",
    location: "123 Main St, Indore",
    quantity: 50,
    foodType: "Vegetarian",
    status: "scheduled",
    volunteer: "John Doe"
  },
  {
    id: "2",
    date: "2024-01-16",
    time: "2:00 PM",
    type: "Pickup",
    location: "456 Park Ave, Indore",
    quantity: 75,
    foodType: "Non-Vegetarian",
    status: "completed",
    volunteer: "Jane Smith"
  },
  {
    id: "3",
    date: "2024-01-17",
    time: "11:00 AM",
    type: "Pickup",
    location: "789 Market St, Indore",
    quantity: 30,
    foodType: "Vegetarian",
    status: "pending",
    volunteer: null
  }
]

export default function DonorSchedulePage() {
  const navItems = [
    { label: "My Donations", href: "/donor" },
    { label: "Map", href: "/map" },
    { label: "Schedule Pickup", href: "/donor/schedule" },
    { label: "Analytics", href: "/donor/analytics" },
    { label: "Settings", href: "/donor/settings" },
  ]

  const { user, loading: authLoading } = useAuth()
  const [useMockData, setUseMockData] = useState(true)

  // Real data from Firestore
  const { data: realSchedules, loading: schedulesLoading } = useFirestoreCollection<{
    id: string
    donorId: string
    scheduledDate: string
    scheduledTime: string
    pickupLocation: string
    quantity: number
    foodType: string
    status: string
    volunteerId?: string
    volunteerName?: string
  }>('pickup_schedules', {
    whereFilter: user?.uid ? {
      field: 'donorId',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'scheduledDate',
    orderByDirection: 'desc',
    limitCount: 50
  })

  const schedules = useMockData ? mockSchedules : (realSchedules || [])
  const loading = useMockData ? false : schedulesLoading

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'pending':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <DashboardLayout title="Schedule Pickup" navItems={navItems}>
      <div className="space-y-6">
        {/* Toggle between mock and real data */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Data Source</h3>
              <p className="text-sm text-muted-foreground">
                {useMockData ? "Showing mock data for demonstration" : "Showing real data from database"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setUseMockData(!useMockData)}
              className="flex items-center gap-2"
            >
              {useMockData ? (
                <>
                  <ToggleLeft className="h-4 w-4" />
                  Switch to Real Data
                </>
              ) : (
                <>
                  <ToggleRight className="h-4 w-4" />
                  Switch to Mock Data
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Schedules</p>
                <p className="text-2xl font-bold">{schedules.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => s.status === 'scheduled' || s.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">
                  {schedules.reduce((sum, s) => sum + (s.quantity || 0), 0)} kg
                </p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Schedule List */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Pickup Schedules</h2>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule New Pickup
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No schedules found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or create a schedule."
                    : "You haven't scheduled any pickups yet."}
                </p>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Your First Pickup
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <Card key={schedule.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(schedule.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(schedule.status)}
                              {schedule.status}
                            </span>
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {schedule.type}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {schedule.date || schedule.scheduledDate}
                            </span>
                            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                            <span>{schedule.time || schedule.scheduledTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{schedule.location || schedule.pickupLocation}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{schedule.quantity} kg - {schedule.foodType}</span>
                          </div>
                          {schedule.volunteer && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Volunteer:</span>
                              <span className="font-medium">
                                {schedule.volunteer || schedule.volunteerName || 'Not assigned'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {(schedule.status === 'scheduled' || schedule.status === 'pending') && (
                          <>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive">
                              Cancel
                            </Button>
                          </>
                        )}
                        {schedule.status === 'completed' && (
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}

