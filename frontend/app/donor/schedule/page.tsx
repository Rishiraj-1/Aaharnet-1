"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Calendar, Clock, MapPin, Package, CheckCircle, XCircle, AlertCircle, ToggleLeft, ToggleRight, Plus, Sparkles } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

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
        return 'bg-emerald-500'
      case 'pending':
        return 'bg-amber-500'
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

  const stats = {
    total: schedules.length,
    upcoming: schedules.filter(s => s.status === 'scheduled' || s.status === 'pending').length,
    completed: schedules.filter(s => s.status === 'completed').length,
    totalQuantity: schedules.reduce((sum, s) => sum + (s.quantity || 0), 0)
  }

  return (
    <DashboardLayout title="Schedule Pickup" navItems={navItems}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pickup Schedule</h1>
            <p className="text-muted-foreground mt-1">Manage your scheduled food pickups</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setUseMockData(!useMockData)}
              className="flex items-center gap-2 shadow-sm"
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
            <Button className="shadow-lg bg-gradient-to-r from-primary to-primary/80">
              <Plus className="h-4 w-4 mr-2" />
              Schedule New Pickup
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AnimatedMetricCard
            title="Total Schedules"
            value={stats.total}
            icon={Calendar}
            gradient="from-blue-500 to-cyan-500"
            bgGradient="from-blue-500/10 to-cyan-500/10"
          />
          <AnimatedMetricCard
            title="Upcoming"
            value={stats.upcoming}
            icon={Clock}
            gradient="from-amber-500 to-orange-500"
            bgGradient="from-amber-500/10 to-orange-500/10"
          />
          <AnimatedMetricCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle}
            gradient="from-emerald-500 to-teal-500"
            bgGradient="from-emerald-500/10 to-teal-500/10"
          />
          <AnimatedMetricCard
            title="Total Quantity"
            value={`${stats.totalQuantity} kg`}
            icon={Package}
            gradient="from-rose-500 to-pink-500"
            bgGradient="from-rose-500/10 to-pink-500/10"
          />
        </div>

        {/* Schedule List */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Pickup Schedules</h2>
                  <p className="text-sm text-muted-foreground">{schedules.length} total schedules</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl"></div>
                  <Calendar className="h-16 w-16 text-primary relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No schedules found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or create a schedule."
                    : "You haven't scheduled any pickups yet."}
                </p>
                <Button className="bg-gradient-to-r from-primary to-primary/80">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Your First Pickup
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <Card 
                    key={schedule.id} 
                    className={cn(
                      "p-5 border-0 shadow-md hover:shadow-lg transition-all duration-300",
                      "bg-gradient-to-br from-card to-muted/30",
                      schedule.status === 'completed' && "opacity-75"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={cn(getStatusColor(schedule.status), "text-white shadow-sm")}>
                            <span className="flex items-center gap-1.5">
                              {getStatusIcon(schedule.status)}
                              {schedule.status}
                            </span>
                          </Badge>
                          <Badge variant="outline" className="border-primary/20">
                            {schedule.type}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Date & Time</p>
                              <p className="font-semibold">
                                {schedule.date || schedule.scheduledDate}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {schedule.time || schedule.scheduledTime}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="font-semibold truncate">
                                {schedule.location || schedule.pickupLocation}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Quantity</p>
                              <p className="font-semibold">
                                {schedule.quantity} kg - {schedule.foodType}
                              </p>
                            </div>
                          </div>
                          
                          {schedule.volunteer && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Sparkles className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Volunteer</p>
                                <p className="font-semibold">
                                  {schedule.volunteer || schedule.volunteerName || 'Not assigned'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {(schedule.status === 'scheduled' || schedule.status === 'pending') && (
                          <>
                            <Button variant="outline" size="sm" className="shadow-sm">
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive shadow-sm">
                              Cancel
                            </Button>
                          </>
                        )}
                        {schedule.status === 'completed' && (
                          <Button variant="outline" size="sm" className="shadow-sm">
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
