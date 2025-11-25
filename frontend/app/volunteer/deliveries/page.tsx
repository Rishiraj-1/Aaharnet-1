"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Package, MapPin, Clock, CheckCircle, Truck, ToggleLeft, ToggleRight, Award, Route, ArrowRight, TrendingUp, Target } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

const mockDeliveries = [
  {
    id: "1",
    donationId: "don1",
    pickupLocation: "123 Main St, Indore",
    deliveryLocation: "Community Center, Indore",
    quantity: 50,
    foodType: "Vegetarian",
    status: "completed",
    distance: 5.2,
    completedAt: "2024-01-15T10:30:00Z",
    points: 25
  },
  {
    id: "2",
    donationId: "don2",
    pickupLocation: "456 Park Ave, Indore",
    deliveryLocation: "Shelter Home, Indore",
    quantity: 75,
    foodType: "Non-Vegetarian",
    status: "completed",
    distance: 8.5,
    completedAt: "2024-01-14T14:20:00Z",
    points: 35
  },
  {
    id: "3",
    donationId: "don3",
    pickupLocation: "789 Market St, Indore",
    deliveryLocation: "Food Bank, Indore",
    quantity: 30,
    foodType: "Vegetarian",
    status: "in_progress",
    distance: 3.8,
    completedAt: null,
    points: 0
  }
]

export default function VolunteerDeliveriesPage() {
  const navItems = [
    { label: "Dashboard", href: "/volunteer" },
    { label: "Map", href: "/map" },
    { label: "Available Tasks", href: "/volunteer/tasks" },
    { label: "My Deliveries", href: "/volunteer/deliveries" },
    { label: "Profile", href: "/volunteer/profile" },
  ]

  const { user, loading: authLoading } = useAuth()
  const [useMockData, setUseMockData] = useState(true)

  const { data: realDeliveries, loading: deliveriesLoading } = useFirestoreCollection<{
    id: string
    volunteerId: string
    volunteer_id: string
    donationId: string
    pickupLocation: string
    deliveryLocation: string
    quantity: number
    quantity_kg: number
    foodType: string
    food_type: string
    status: string
    distance?: number
    completedAt?: string
    completed_at?: string
    createdAt: any
    created_at: string
  }>('deliveries', {
    whereFilter: user?.uid ? {
      field: 'volunteerId',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'createdAt',
    orderByDirection: 'desc',
    limitCount: 50
  })

  const deliveries = useMockData ? mockDeliveries : (realDeliveries || [])
  const loading = useMockData ? false : deliveriesLoading

  const stats = useMemo(() => {
    const completed = deliveries.filter(d => d.status === 'completed')
    return {
      total: deliveries.length,
      completed: completed.length,
      inProgress: deliveries.filter(d => d.status === 'in_progress' || d.status === 'assigned').length,
      totalDistance: deliveries.reduce((sum, d) => sum + (d.distance || 0), 0),
      totalPoints: deliveries.reduce((sum, d) => sum + ((d as any).points || 0), 0),
      totalQuantity: deliveries.reduce((sum, d) => sum + (d.quantity || d.quantity_kg || 0), 0)
    }
  }, [deliveries])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-500'
      case 'in_progress':
      case 'assigned':
        return 'bg-blue-500'
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <DashboardLayout title="My Deliveries" navItems={navItems}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Deliveries</h1>
            <p className="text-muted-foreground mt-1">Track your delivery history and impact</p>
          </div>
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AnimatedMetricCard
            title="Total Deliveries"
            value={stats.total}
            icon={Truck}
            gradient="from-blue-500 to-cyan-500"
            bgGradient="from-blue-500/10 to-cyan-500/10"
          />
          <AnimatedMetricCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle}
            gradient="from-emerald-500 to-teal-500"
            bgGradient="from-emerald-500/10 to-teal-500/10"
          />
          <AnimatedMetricCard
            title="Total Distance"
            value={`${stats.totalDistance.toFixed(1)} km`}
            icon={Route}
            gradient="from-amber-500 to-orange-500"
            bgGradient="from-amber-500/10 to-orange-500/10"
          />
          <AnimatedMetricCard
            title="Impact Points"
            value={stats.totalPoints}
            icon={Award}
            gradient="from-rose-500 to-pink-500"
            bgGradient="from-rose-500/10 to-pink-500/10"
          />
        </div>

        {/* Deliveries List */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Truck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Delivery History</h2>
                  <p className="text-sm text-muted-foreground">{deliveries.length} total deliveries</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading deliveries...</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-500/10 rounded-full blur-xl"></div>
                  <Truck className="h-16 w-16 text-blue-500 relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No deliveries found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data."
                    : "You haven't completed any deliveries yet."}
                </p>
                <Link href="/volunteer/tasks">
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                    <Target className="h-4 w-4 mr-2" />
                    View Available Tasks
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((delivery) => {
                  const completedDate = delivery.completedAt || delivery.completed_at
                  return (
                    <Card 
                      key={delivery.id} 
                      className={cn(
                        "p-5 border-0 shadow-md hover:shadow-lg transition-all duration-300",
                        "bg-gradient-to-br from-card to-muted/30",
                        delivery.status === 'completed' && "border-2 border-emerald-500/20"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={cn(getStatusColor(delivery.status), "text-white shadow-sm")}>
                              {delivery.status}
                            </Badge>
                            {(delivery as any).points > 0 && (
                              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1">
                                <Award className="h-3 w-3" />
                                {(delivery as any).points} points
                              </Badge>
                            )}
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                              <Package className="h-5 w-5 text-blue-500" />
                              {(delivery.quantity || delivery.quantity_kg || 0)} kg - {delivery.foodType || delivery.food_type}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-blue-500/10">
                                <MapPin className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Pickup</p>
                                <p className="font-semibold truncate">{delivery.pickupLocation}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Target className="h-4 w-4 text-emerald-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Delivery</p>
                                <p className="font-semibold truncate">{delivery.deliveryLocation}</p>
                              </div>
                            </div>
                            
                            {delivery.distance && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                  <Route className="h-4 w-4 text-amber-500" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Distance</p>
                                  <p className="font-semibold">{delivery.distance} km</p>
                                </div>
                              </div>
                            )}
                            
                            {completedDate && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                  <Clock className="h-4 w-4 text-purple-500" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Completed</p>
                                  <p className="font-semibold">
                                    {new Date(completedDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {delivery.status === 'completed' && (
                            <Button variant="outline" size="sm" className="shadow-sm">
                              <ArrowRight className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          )}
                          {(delivery.status === 'in_progress' || delivery.status === 'assigned') && (
                            <>
                              <Button variant="outline" size="sm" className="shadow-sm">
                                <Route className="h-4 w-4 mr-2" />
                                View Route
                              </Button>
                              <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Complete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
