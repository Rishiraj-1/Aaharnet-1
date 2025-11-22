"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsGrid } from "@/components/stats-grid"
import { ActivityFeed } from "@/components/activity-feed"
import { DonationChart } from "@/components/donation-chart"
import { ImpactMetrics } from "@/components/impact-metrics"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { useVolunteerRoute } from "@/hooks/useVolunteerRoute"
import { Clock, Truck, Star, Heart, Package, Navigation, MapPin, Route } from "lucide-react"
import { useState } from "react"
import { optimizeVolunteerRoute } from "@/utils/api"
import { toast } from "sonner"

export default function VolunteerDashboard() {
  const navItems = [
    { label: "Dashboard", href: "/volunteer" },
    { label: "Available Tasks", href: "/volunteer/tasks" },
    { label: "My Deliveries", href: "/volunteer/deliveries" },
    { label: "Profile", href: "/volunteer/profile" },
  ]

  // Auth & user data
  const { user, userData, loading: authLoading } = useAuth()

  // Real-time deliveries data
  const { data: deliveries, loading: deliveriesLoading } = useFirestoreCollection<{
    id: string
    volunteer_id: string
    pickup_location: string
    delivery_location: string
    status: string
    distance_km: number
    created_at: string
    completed_at?: string
  }>('deliveries', {
    whereFilter: user?.uid ? {
      field: 'volunteer_id',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'created_at',
    orderByDirection: 'desc',
    limitCount: 10
  })

  // Available tasks
  const { data: availableTasks, loading: tasksLoading } = useFirestoreCollection<{
    id: string
    pickup_location: any
    delivery_location: any
    food_type: string
    quantity_kg: number
    status: string
    created_at: string
  }>('tasks', {
    whereFilter: {
      field: 'status',
      operator: '==',
      value: 'available'
    },
    orderByField: 'created_at',
    orderByDirection: 'desc',
    limitCount: 5
  })

  // AI route optimization state
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null)
  const [optimizingRoute, setOptimizingRoute] = useState(false)

  // Calculate stats
  const completedDeliveries = deliveries?.filter(d => d.status === 'completed').length || 0
  const activeDeliveries = deliveries?.filter(d => d.status === 'active' || d.status === 'in_progress').length || 0
  const totalDistance = deliveries?.reduce((sum, d) => sum + (d.distance_km || 0), 0) || 0
  const avgRating = 4.9 // This would come from a ratings collection
  const impactPoints = completedDeliveries * 50 + Math.round(totalDistance * 10)

  const stats = [
    { 
      label: "Hours Volunteered", 
      value: Math.round(completedDeliveries * 2.5).toString(), 
      icon: Clock, 
      trend: "↑ 8 hours this week" 
    },
    { 
      label: "Deliveries", 
      value: completedDeliveries.toString(), 
      icon: Truck, 
      trend: `${activeDeliveries} active` 
    },
    { 
      label: "Rating", 
      value: avgRating.toString(), 
      icon: Star 
    },
    { 
      label: "Impact Points", 
      value: impactPoints.toLocaleString(), 
      icon: Heart, 
      color: "text-accent" 
    },
  ]

  // Convert to activity feed
  const activities = deliveries?.slice(0, 3).map((delivery) => ({
    id: delivery.id,
    type: delivery.status === 'completed' ? "delivery" as const : "pickup" as const,
    title: `${delivery.status === 'completed' ? 'Delivery' : 'Pickup'} ${delivery.status}`,
    description: `${delivery.pickup_location} → ${delivery.delivery_location} (${delivery.distance_km?.toFixed(1)} km)`,
    timestamp: new Date(delivery.created_at).toLocaleString(),
    icon: delivery.status === 'completed' ? 
      <Truck className="w-5 h-5 text-primary" /> : 
      <Package className="w-5 h-5 text-primary" />,
  })) || []

  const impactMetrics = [
    { label: "Monthly Hours Goal", current: Math.round(completedDeliveries * 2.5), target: 200, unit: "hours" },
    { label: "Deliveries This Month", current: completedDeliveries, target: 60, unit: "deliveries" },
    { label: "Distance Covered", current: Math.round(totalDistance), target: 500, unit: "km" },
  ]

  // AI Route optimization function
  const optimizeRoute = async () => {
    if (!availableTasks || availableTasks.length === 0) {
      toast.error("No available tasks to optimize")
      return
    }

    if (!userData?.location) {
      toast.error("Please update your location in settings")
      return
    }

    setOptimizingRoute(true)
    try {
      const result = await optimizeVolunteerRoute({
        volunteer_id: user?.uid || '',
        start_location: {
          id: 'home',
          name: 'Your Location',
          latitude: userData.location.lat,
          longitude: userData.location.lng,
          location_type: 'volunteer_home'
        },
        locations: availableTasks.slice(0, 5).map((task, idx) => ({
          id: task.id,
          name: `Task ${idx + 1}`,
          latitude: task.pickup_location.lat,
          longitude: task.pickup_location.lng,
          location_type: 'donor' as any,
          priority: 1
        })),
        optimization_type: 'balanced'
      })
      
      setOptimizedRoute(result)
      toast.success(`Route optimized! Total: ${result.total_distance_km?.toFixed(1)} km, ${result.total_time_hours?.toFixed(1)} hours`)
    } catch (error) {
      console.error('Route optimization error:', error)
      toast.error("Failed to optimize route")
    } finally {
      setOptimizingRoute(false)
    }
  }

  // Loading state
  if (authLoading || deliveriesLoading || tasksLoading) {
    return (
      <DashboardLayout title="Volunteer Dashboard" navItems={navItems}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Volunteer Dashboard" navItems={navItems}>
      <div className="space-y-8">
        {/* Welcome Card */}
        {userData && (
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Welcome, {userData.name}! 🚚
                </h1>
                <p className="text-muted-foreground">
                  {completedDeliveries} deliveries completed • {Math.round(totalDistance)} km driven
                </p>
              </div>
              {activeDeliveries > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Active Deliveries</p>
                  <p className="text-2xl font-bold text-primary">{activeDeliveries}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Stats */}
        <StatsGrid stats={stats} columns={4} />

        {/* Charts and Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DonationChart />
          </div>
          <ImpactMetrics metrics={impactMetrics} />
        </div>

        {/* Activity Feed & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activities.length > 0 ? (
              <ActivityFeed activities={activities} />
            ) : (
              <Card className="p-6 text-center">
                <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No deliveries yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start making an impact by accepting tasks!
                </p>
                <Button className="bg-primary hover:bg-primary/90">
                  Find Available Tasks
                </Button>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={optimizeRoute}
                disabled={optimizingRoute}
              >
                <Navigation className="w-4 h-4 mr-2" />
                {optimizingRoute ? 'Optimizing...' : 'Optimize My Route (AI)'}
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Package className="w-4 h-4 mr-2" />
                Find Tasks
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Clock className="w-4 h-4 mr-2" />
                My Schedule
              </Button>
            </div>
          </Card>
        </div>

        {/* Optimized Route Display */}
        {optimizedRoute && (
          <Card className="p-6 bg-primary/10 border-primary/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Route className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">AI-Optimized Route</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Distance</p>
                    <p className="text-xl font-bold">{optimizedRoute.total_distance_km?.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Time</p>
                    <p className="text-xl font-bold">{optimizedRoute.total_time_hours?.toFixed(1)} hrs</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Efficiency</p>
                    <p className="text-xl font-bold">{optimizedRoute.route_efficiency?.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Route Sequence:</p>
                  {optimizedRoute.optimized_route?.slice(0, 5).map((stop: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                        {stop.sequence}
                      </div>
                      <span>{stop.location_name}</span>
                      <span className="text-muted-foreground">• {stop.arrival_time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Available Tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Available Tasks</h2>
            <span className="text-sm text-muted-foreground">{availableTasks?.length || 0} tasks</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTasks && availableTasks.length > 0 ? (
              availableTasks.slice(0, 6).map((task) => (
                <Card key={task.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{task.food_type}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {task.quantity_kg} kg
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Pickup required
                  </p>
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Accept Task
                  </Button>
                </Card>
              ))
            ) : (
              <Card className="p-6 col-span-full text-center">
                <p className="text-muted-foreground">No available tasks at the moment</p>
              </Card>
            )}
          </div>
        </div>

        {/* Gamification - Impact Stats */}
        {impactPoints > 0 && (
          <Card className="p-6 bg-gradient-to-r from-accent/10 to-primary/10">
            <div className="text-center">
              <Heart className="w-12 h-12 mx-auto mb-3 text-accent" />
              <h3 className="text-2xl font-bold mb-2">{impactPoints.toLocaleString()} Impact Points</h3>
              <p className="text-muted-foreground mb-4">
                You've helped deliver food to approximately {completedDeliveries * 10} people!
              </p>
              <div className="flex justify-center gap-4">
                <div className="px-4 py-2 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <p className="font-bold">Top 10%</p>
                </div>
                <div className="px-4 py-2 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Next Badge</p>
                  <p className="font-bold">200 pts away</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
