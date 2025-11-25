"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Package, MapPin, Clock, CheckCircle, Truck, ToggleLeft, ToggleRight, Award } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"

// Mock data
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

  // Real data from Firestore
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
        return 'bg-green-500'
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
      <div className="space-y-6">
        {/* Toggle */}
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Distance</p>
                <p className="text-2xl font-bold">{stats.totalDistance.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impact Points</p>
                <p className="text-2xl font-bold">{stats.totalPoints}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
        </div>

        {/* Deliveries List */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Delivery History</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading deliveries...</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No deliveries found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data."
                    : "You haven't completed any deliveries yet."}
                </p>
                <Link href="/volunteer/tasks">
                  <Button>
                    View Available Tasks
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <Card key={delivery.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(delivery.status)}>
                            {delivery.status}
                          </Badge>
                          {(delivery as any).points > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {(delivery as any).points} points
                            </Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {(delivery.quantity || delivery.quantity_kg || 0)} kg - {delivery.foodType || delivery.food_type}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Pickup: {delivery.pickupLocation}</p>
                              <p className="text-muted-foreground">Delivery: {delivery.deliveryLocation}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {delivery.distance && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Distance: </span>
                                <span className="font-medium">{delivery.distance} km</span>
                              </div>
                            )}
                            {delivery.completedAt && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Completed: </span>
                                <span className="font-medium">
                                  {new Date(delivery.completedAt || delivery.completed_at || Date.now()).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {delivery.status === 'completed' && (
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        )}
                        {(delivery.status === 'in_progress' || delivery.status === 'assigned') && (
                          <>
                            <Button variant="outline" size="sm">
                              View Route
                            </Button>
                            <Button size="sm">
                              Mark Complete
                            </Button>
                          </>
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

