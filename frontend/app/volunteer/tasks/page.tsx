"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Package, MapPin, Clock, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Truck } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

// Mock data
const mockTasks = [
  {
    id: "1",
    donationId: "don1",
    pickupLocation: "123 Main St, Indore",
    deliveryLocation: "Community Center, Indore",
    quantity: 50,
    foodType: "Vegetarian",
    status: "available",
    distance: 5.2,
    estimatedTime: 15,
    priority: "high"
  },
  {
    id: "2",
    donationId: "don2",
    pickupLocation: "456 Park Ave, Indore",
    deliveryLocation: "Shelter Home, Indore",
    quantity: 75,
    foodType: "Non-Vegetarian",
    status: "assigned",
    distance: 8.5,
    estimatedTime: 25,
    priority: "medium"
  },
  {
    id: "3",
    donationId: "don3",
    pickupLocation: "789 Market St, Indore",
    deliveryLocation: "Food Bank, Indore",
    quantity: 30,
    foodType: "Vegetarian",
    status: "completed",
    distance: 3.8,
    estimatedTime: 12,
    priority: "low"
  }
]

export default function VolunteerTasksPage() {
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
  const { data: realTasks, loading: tasksLoading } = useFirestoreCollection<{
    id: string
    donationId: string
    volunteerId?: string
    pickupLocation: string
    deliveryLocation: string
    quantity: number
    quantity_kg: number
    foodType: string
    food_type: string
    status: string
    distance?: number
    estimatedTime?: number
    priority?: string
  }>('deliveries', {
    orderByField: 'createdAt',
    orderByDirection: 'desc',
    limitCount: 50
  })

  // Filter tasks - available tasks or tasks assigned to this volunteer
  const filteredRealTasks = realTasks?.filter(task => 
    task.status === 'available' || task.volunteerId === user?.uid
  ) || []

  const tasks = useMockData ? mockTasks : filteredRealTasks
  const loading = useMockData ? false : tasksLoading

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-500'
      case 'assigned':
      case 'in_progress':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-gray-500'
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const stats = {
    total: tasks.length,
    available: tasks.filter(t => t.status === 'available').length,
    assigned: tasks.filter(t => t.status === 'assigned' || t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  }

  return (
    <DashboardLayout title="Available Tasks" navItems={navItems}>
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
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{stats.available}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold">{stats.assigned}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-500" />
            </div>
          </Card>
        </div>

        {/* Tasks List */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Delivery Tasks</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data."
                    : "No delivery tasks available at the moment."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <Card key={task.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          {task.priority && (
                            <Badge variant="outline">
                              {task.priority} priority
                            </Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {(task.quantity || task.quantity_kg || 0)} kg - {task.foodType || task.food_type}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Pickup: {task.pickupLocation}</p>
                              <p className="text-muted-foreground">Delivery: {task.deliveryLocation}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {task.distance && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Distance: </span>
                                <span className="font-medium">{task.distance} km</span>
                              </div>
                            )}
                            {task.estimatedTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Est. Time: </span>
                                <span className="font-medium">{task.estimatedTime} min</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {task.status === 'available' && (
                          <Button size="sm">
                            Accept Task
                          </Button>
                        )}
                        {(task.status === 'assigned' || task.status === 'in_progress') && (
                          <>
                            <Button variant="outline" size="sm">
                              View Route
                            </Button>
                            <Button size="sm">
                              Mark Complete
                            </Button>
                          </>
                        )}
                        {task.status === 'completed' && (
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

