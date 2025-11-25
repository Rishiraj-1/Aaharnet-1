"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Package, MapPin, Clock, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Truck, Route, ArrowRight, Zap, Navigation, Target } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

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

  const filteredRealTasks = realTasks?.filter(task => 
    task.status === 'available' || task.volunteerId === user?.uid
  ) || []

  const tasks = useMockData ? mockTasks : filteredRealTasks
  const loading = useMockData ? false : tasksLoading

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-emerald-500'
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Available Tasks</h1>
            <p className="text-muted-foreground mt-1">Find and accept delivery tasks</p>
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
            <Link href="/map">
              <Button className="shadow-lg bg-gradient-to-r from-blue-500 to-blue-600">
                <Navigation className="h-4 w-4 mr-2" />
                View on Map
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AnimatedMetricCard
            title="Total Tasks"
            value={stats.total}
            icon={Package}
            gradient="from-blue-500 to-cyan-500"
            bgGradient="from-blue-500/10 to-cyan-500/10"
          />
          <AnimatedMetricCard
            title="Available"
            value={stats.available}
            icon={Target}
            gradient="from-emerald-500 to-teal-500"
            bgGradient="from-emerald-500/10 to-teal-500/10"
          />
          <AnimatedMetricCard
            title="Assigned"
            value={stats.assigned}
            icon={Truck}
            gradient="from-amber-500 to-orange-500"
            bgGradient="from-amber-500/10 to-orange-500/10"
          />
          <AnimatedMetricCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle}
            gradient="from-rose-500 to-pink-500"
            bgGradient="from-rose-500/10 to-pink-500/10"
          />
        </div>

        {/* Tasks List */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Delivery Tasks</h2>
                  <p className="text-sm text-muted-foreground">{tasks.length} total tasks</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-500/10 rounded-full blur-xl"></div>
                  <Package className="h-16 w-16 text-blue-500 relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data."
                    : "No delivery tasks available at the moment."}
                </p>
                <Link href="/map">
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    View Map
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className={cn(
                      "p-5 border-0 shadow-md hover:shadow-lg transition-all duration-300",
                      "bg-gradient-to-br from-card to-muted/30",
                      task.status === 'available' && "border-2 border-emerald-500/20 hover:border-emerald-500/40",
                      task.status === 'completed' && "opacity-75"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={cn(getStatusColor(task.status), "text-white shadow-sm")}>
                            {task.status}
                          </Badge>
                          {task.priority && (
                            <Badge variant="outline" className="border-primary/20">
                              {task.priority} priority
                            </Badge>
                          )}
                          {task.status === 'available' && (
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              <Zap className="h-3 w-3 mr-1" />
                              Quick Accept
                            </Badge>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-500" />
                            {(task.quantity || task.quantity_kg || 0)} kg - {task.foodType || task.food_type}
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              <MapPin className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Pickup</p>
                              <p className="font-semibold truncate">{task.pickupLocation}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                              <Target className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Delivery</p>
                              <p className="font-semibold truncate">{task.deliveryLocation}</p>
                            </div>
                          </div>
                          
                          {task.distance && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-amber-500/10">
                                <Route className="h-4 w-4 text-amber-500" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Distance</p>
                                <p className="font-semibold">{task.distance} km</p>
                              </div>
                            </div>
                          )}
                          
                          {task.estimatedTime && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-purple-500/10">
                                <Clock className="h-4 w-4 text-purple-500" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Est. Time</p>
                                <p className="font-semibold">{task.estimatedTime} min</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {task.status === 'available' && (
                          <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept Task
                          </Button>
                        )}
                        {(task.status === 'assigned' || task.status === 'in_progress') && (
                          <>
                            <Button variant="outline" size="sm" className="shadow-sm">
                              <Navigation className="h-4 w-4 mr-2" />
                              View Route
                            </Button>
                            <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Complete
                            </Button>
                          </>
                        )}
                        {task.status === 'completed' && (
                          <Button variant="outline" size="sm" className="shadow-sm">
                            <ArrowRight className="h-4 w-4 mr-2" />
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
