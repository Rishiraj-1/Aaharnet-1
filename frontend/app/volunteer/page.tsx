"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { useVolunteerRoute } from "@/hooks/useVolunteerRoute"
import { Clock, Truck, Star, Heart, Package, Navigation, MapPin, Route, ArrowRight, Sparkles, Zap, Activity, Award, Target, TrendingUp, CheckCircle } from "lucide-react"
import { useState } from "react"
import { optimizeVolunteerRoute } from "@/utils/api"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function VolunteerDashboard() {
  const navItems = [
    { label: "Dashboard", href: "/volunteer" },
    { label: "Map", href: "/map" },
    { label: "Available Tasks", href: "/volunteer/tasks" },
    { label: "My Deliveries", href: "/volunteer/deliveries" },
    { label: "Profile", href: "/volunteer/profile" },
  ]

  const { user, userData, loading: authLoading } = useAuth()

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

  const [optimizedRoute, setOptimizedRoute] = useState<any>(null)
  const [optimizingRoute, setOptimizingRoute] = useState(false)

  const completedDeliveries = deliveries?.filter(d => d.status === 'completed').length || 0
  const activeDeliveries = deliveries?.filter(d => d.status === 'active' || d.status === 'in_progress').length || 0
  const totalDistance = deliveries?.reduce((sum, d) => sum + (d.distance_km || 0), 0) || 0
  const avgRating = 4.9
  const impactPoints = completedDeliveries * 50 + Math.round(totalDistance * 10)
  const hoursVolunteered = Math.round(completedDeliveries * 2.5)

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
        {/* Hero Section - Unique Design */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Truck className="h-6 w-6" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    Volunteer Dashboard
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome, {userData?.name || 'Volunteer'}! 🚚
                </h1>
                <p className="text-lg text-white/90 mb-6">
                  {completedDeliveries} deliveries completed • {Math.round(totalDistance)} km driven • {hoursVolunteered} hours volunteered
                </p>
                
                {/* Impact Stats in Hero */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Active Deliveries</p>
                    <p className="text-2xl font-bold">{activeDeliveries}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Impact Points</p>
                    <p className="text-2xl font-bold">{impactPoints}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Rating</p>
                    <p className="text-2xl font-bold">{avgRating} ⭐</p>
                  </div>
                </div>
              </div>
              
              {activeDeliveries > 0 && (
                <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5" />
                    <p className="text-sm font-medium">Active Now</p>
                  </div>
                  <p className="text-3xl font-bold mb-1">{activeDeliveries}</p>
                  <p className="text-sm text-white/80">In progress</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/map">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-blue-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Navigation className="h-6 w-6 text-blue-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Open Map</h3>
              <p className="text-sm text-muted-foreground">View tasks & routes</p>
            </Card>
          </Link>
          
          <Link href="/volunteer/tasks">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-blue-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <Package className="h-6 w-6 text-emerald-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Find Tasks</h3>
              <p className="text-sm text-muted-foreground">Available deliveries</p>
            </Card>
          </Link>
          
          <Card 
            className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-blue-500/50 bg-gradient-to-br from-background to-muted/30"
            onClick={optimizeRoute}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <Route className="h-6 w-6 text-amber-500" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-lg mb-1">Optimize Route</h3>
            <p className="text-sm text-muted-foreground">AI-powered optimization</p>
          </Card>
          
          <Link href="/volunteer/deliveries">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-blue-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                  <CheckCircle className="h-6 w-6 text-rose-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">My Deliveries</h3>
              <p className="text-sm text-muted-foreground">Delivery history</p>
            </Card>
          </Link>
        </div>

        {/* Main Stats - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                +8h
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Hours Volunteered</p>
            <p className="text-3xl font-bold mb-1">{hoursVolunteered}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Truck className="h-6 w-6 text-emerald-500" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                {activeDeliveries} active
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Deliveries</p>
            <p className="text-3xl font-bold mb-1">{completedDeliveries}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Star className="h-6 w-6 text-amber-500" />
              </div>
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                {avgRating} ⭐
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Rating</p>
            <p className="text-3xl font-bold mb-1">{avgRating}</p>
            <p className="text-xs text-muted-foreground">Out of 5.0</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-500/20">
                <Heart className="h-6 w-6 text-rose-500" />
              </div>
              <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30">
                Top 10%
              </Badge>
          </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Impact Points</p>
            <p className="text-3xl font-bold mb-1">{impactPoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total points</p>
          </Card>
        </div>

        {/* Recent Deliveries & Available Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Recent Deliveries</h2>
                  <p className="text-sm text-muted-foreground">Your latest activity</p>
                </div>
              </div>
              <Link href="/volunteer/deliveries">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            {deliveries && deliveries.length > 0 ? (
              <div className="space-y-4">
                {deliveries.slice(0, 5).map((delivery) => {
                  const date = new Date(delivery.created_at)
                  return (
                    <div 
                      key={delivery.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-blue-500/50 transition-all group"
                    >
                      <div className={cn(
                        "p-3 rounded-xl",
                        delivery.status === 'completed' ? "bg-emerald-500/10" :
                        "bg-blue-500/10"
                      )}>
                        <Truck className={cn(
                          "h-5 w-5",
                          delivery.status === 'completed' ? "text-emerald-500" :
                          "text-blue-500"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">
                            {delivery.pickup_location} → {delivery.delivery_location}
                          </p>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              delivery.status === 'completed' && "border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {delivery.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {delivery.distance_km?.toFixed(1)} km • {date.toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-500/10 rounded-full blur-xl"></div>
                  <Truck className="h-16 w-16 text-blue-500 relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No deliveries yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start making an impact by accepting tasks!
                </p>
                <Link href="/volunteer/tasks">
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                  Find Available Tasks
                </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Impact & Goals Card */}
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Award className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Impact & Goals</h2>
                <p className="text-sm text-muted-foreground">Your achievements</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Monthly Hours Goal</p>
                  <p className="text-sm font-bold text-blue-500">{hoursVolunteered}/200</p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                    style={{ width: `${Math.min((hoursVolunteered / 200) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Distance Covered</p>
                  <p className="text-sm font-bold text-blue-500">{Math.round(totalDistance)}/500 km</p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all"
                    style={{ width: `${Math.min((totalDistance / 500) * 100, 100)}%` }}
                  />
                </div>
              </div>
          </div>

            <div className="pt-6 border-t">
              <div className="text-center p-4 rounded-lg bg-blue-500/5">
                <Heart className="h-8 w-8 mx-auto mb-2 text-rose-500" />
                <p className="text-2xl font-bold mb-1">{impactPoints.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Impact Points</p>
                <p className="text-xs text-muted-foreground mt-2">
                  You've helped approximately {completedDeliveries * 10} people!
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Optimized Route Display */}
        {optimizedRoute && (
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Route className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">AI-Optimized Route</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground mb-1">Total Distance</p>
                    <p className="text-xl font-bold">{optimizedRoute.total_distance_km?.toFixed(1)} km</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground mb-1">Estimated Time</p>
                    <p className="text-xl font-bold">{optimizedRoute.total_time_hours?.toFixed(1)} hrs</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground mb-1">Efficiency</p>
                    <p className="text-xl font-bold">{optimizedRoute.route_efficiency?.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Route Sequence:</p>
                  {optimizedRoute.optimized_route?.slice(0, 5).map((stop: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-sm">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-500 text-xs">
                        {stop.sequence}
                      </div>
                      <span className="flex-1">{stop.location_name}</span>
                      <span className="text-muted-foreground">{stop.arrival_time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Available Tasks */}
        {availableTasks && availableTasks.length > 0 && (
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Package className="h-5 w-5 text-emerald-500" />
                </div>
        <div>
            <h2 className="text-xl font-bold">Available Tasks</h2>
                  <p className="text-sm text-muted-foreground">{availableTasks.length} tasks available</p>
                </div>
              </div>
              <Link href="/volunteer/tasks">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTasks.slice(0, 6).map((task) => (
                <Card key={task.id} className="p-4 hover:shadow-lg transition-all border-2 hover:border-emerald-500/50 bg-gradient-to-br from-card to-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold">{task.food_type}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {task.quantity_kg} kg
                  </p>
                  <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Pickup required
                  </p>
                  <Link href="/volunteer/tasks">
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700">
                    Accept Task
                  </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
