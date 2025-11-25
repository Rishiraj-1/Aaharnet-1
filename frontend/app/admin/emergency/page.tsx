"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { useRole } from "@/hooks/useRole"
import { getActiveAlerts, createEmergencyAlert } from "@/utils/api"
import { AlertTriangle, Plus, Bell, MapPin, Clock, Users, Package, ToggleLeft, ToggleRight, Shield, Zap, ArrowRight, Activity } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

const mockAlerts = [
  {
    id: "1",
    title: "Flood Emergency - Indore Sector 5",
    type: "Natural Disaster",
    severity: "high",
    location: "Indore Sector 5",
    affectedPeople: 500,
    foodNeeded: 2000,
    status: "active",
    createdAt: "2024-01-15T10:00:00Z",
    description: "Severe flooding in Sector 5, urgent need for food supplies"
  },
  {
    id: "2",
    title: "Fire Emergency - Community Center",
    type: "Fire",
    severity: "medium",
    location: "Community Center, Indore",
    affectedPeople: 150,
    foodNeeded: 750,
    status: "active",
    createdAt: "2024-01-14T14:30:00Z",
    description: "Fire at community center, families displaced"
  },
  {
    id: "3",
    title: "Pandemic Relief - Indore",
    type: "Health Emergency",
    severity: "high",
    location: "Indore City",
    affectedPeople: 1000,
    foodNeeded: 5000,
    status: "resolved",
    createdAt: "2024-01-10T09:00:00Z",
    description: "COVID-19 relief efforts"
  }
]

export default function AdminEmergencyPage() {
  const navItems = [
    { label: "Overview", href: "/admin" },
    { label: "Map", href: "/map" },
    { label: "Users", href: "/admin/users" },
    { label: "Analytics", href: "/admin/analytics" },
    { label: "Emergency", href: "/admin/emergency" },
    { label: "Reports", href: "/admin/reports" },
  ]

  const { user, loading: authLoading } = useAuth()
  const { admin, loading: roleLoading } = useRole()
  const [useMockData, setUseMockData] = useState(true)
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newAlert, setNewAlert] = useState({
    title: '',
    type: 'food_shortage',
    severity: 'high',
    location: '',
    description: '',
    affectedPeople: '',
    foodNeeded: ''
  })

  useEffect(() => {
    if (useMockData) {
      setEmergencyAlerts(mockAlerts)
      setLoadingAlerts(false)
      return
    }

    const fetchAlerts = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 8000)
        )
        const alerts = await Promise.race([
          getActiveAlerts(),
          timeoutPromise
        ]) as any
        setEmergencyAlerts(alerts?.alerts || alerts || [])
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
        setEmergencyAlerts([])
      } finally {
        setLoadingAlerts(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [useMockData])

  const handleCreateAlert = async () => {
    try {
      await createEmergencyAlert({
        location: { lat: 0, lng: 0 },
        alert_type: newAlert.type,
        severity: newAlert.severity,
        description: newAlert.description || newAlert.title
      })
      toast.success('Emergency alert created!')
      setIsDialogOpen(false)
      setNewAlert({
        title: '',
        type: 'food_shortage',
        severity: 'high',
        location: '',
        description: '',
        affectedPeople: '',
        foodNeeded: ''
      })
      if (!useMockData) {
        const alerts = await getActiveAlerts()
        setEmergencyAlerts(alerts?.alerts || alerts || [])
      }
    } catch (error) {
      toast.error('Failed to create emergency alert')
    }
  }

  if (!authLoading && !roleLoading && !admin) {
    return (
      <DashboardLayout title="Access Denied" navItems={navItems}>
        <Card className="p-6">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </Card>
      </DashboardLayout>
    )
  }

  const stats = {
    total: emergencyAlerts.length,
    active: emergencyAlerts.filter(a => a.status === 'active').length,
    resolved: emergencyAlerts.filter(a => a.status === 'resolved').length,
    highPriority: emergencyAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length
  }

  return (
    <DashboardLayout title="Emergency Management" navItems={navItems}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Emergency Management</h1>
            <p className="text-muted-foreground mt-1">Monitor and manage emergency alerts</p>
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg bg-gradient-to-r from-red-500 to-red-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Emergency Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Emergency Alert</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Alert Title</Label>
                    <Input
                      value={newAlert.title}
                      onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                      placeholder="Emergency alert title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Alert Type</Label>
                      <Select value={newAlert.type} onValueChange={(value) => setNewAlert({ ...newAlert, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="food_shortage">Food Shortage</SelectItem>
                          <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                          <SelectItem value="fire">Fire</SelectItem>
                          <SelectItem value="health_emergency">Health Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select value={newAlert.severity} onValueChange={(value) => setNewAlert({ ...newAlert, severity: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={newAlert.location}
                      onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
                      placeholder="Location of emergency"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newAlert.description}
                      onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                      placeholder="Detailed description of the emergency"
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleCreateAlert} className="w-full bg-gradient-to-r from-red-500 to-red-600">
                    Create Alert
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AnimatedMetricCard
            title="Total Alerts"
            value={stats.total}
            icon={Bell}
            gradient="from-red-500 to-rose-500"
            bgGradient="from-red-500/10 to-rose-500/10"
          />
          <AnimatedMetricCard
            title="Active Alerts"
            value={stats.active}
            icon={AlertTriangle}
            gradient="from-orange-500 to-amber-500"
            bgGradient="from-orange-500/10 to-amber-500/10"
          />
          <AnimatedMetricCard
            title="Resolved"
            value={stats.resolved}
            icon={Activity}
            gradient="from-emerald-500 to-teal-500"
            bgGradient="from-emerald-500/10 to-teal-500/10"
          />
          <AnimatedMetricCard
            title="High Priority"
            value={stats.highPriority}
            icon={Zap}
            gradient="from-purple-500 to-indigo-500"
            bgGradient="from-purple-500/10 to-indigo-500/10"
          />
        </div>

        {/* Emergency Alerts List */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Emergency Alerts</h2>
                  <p className="text-sm text-muted-foreground">{emergencyAlerts.length} total alerts</p>
                </div>
              </div>
            </div>

            {loadingAlerts ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading alerts...</p>
              </div>
            ) : emergencyAlerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-500/10 rounded-full blur-xl"></div>
                  <Shield className="h-16 w-16 text-red-500 relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No emergency alerts</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or create an alert."
                    : "No active emergency alerts at the moment."}
                </p>
                <Button 
                  className="bg-gradient-to-r from-red-500 to-red-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Alert
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {emergencyAlerts.map((alert) => {
                  const createdDate = new Date(alert.createdAt || Date.now())
                  return (
                    <Card 
                      key={alert.id} 
                      className={cn(
                        "p-5 border-0 shadow-md hover:shadow-lg transition-all duration-300",
                        "bg-gradient-to-br from-card to-muted/30",
                        alert.severity === 'critical' && "border-2 border-red-500/50",
                        alert.severity === 'high' && "border-2 border-orange-500/50",
                        alert.status === 'resolved' && "opacity-75"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={cn(
                              "shadow-sm text-white",
                              alert.severity === 'critical' && "bg-red-500",
                              alert.severity === 'high' && "bg-orange-500",
                              alert.severity === 'medium' && "bg-amber-500",
                              "bg-gray-500"
                            )}>
                              {alert.severity} priority
                            </Badge>
                            <Badge className={cn(
                              "shadow-sm",
                              alert.status === 'active' ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"
                            )}>
                              {alert.status}
                            </Badge>
                            <Badge variant="outline" className="border-primary/20">
                              {alert.type || alert.alert_type}
                            </Badge>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                              {alert.title || alert.alert_type || 'Emergency Alert'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">{alert.description}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-red-500/10">
                                <MapPin className="h-4 w-4 text-red-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Location</p>
                                <p className="font-semibold truncate">{alert.location || 'Not specified'}</p>
                              </div>
                            </div>
                            
                            {alert.affectedPeople && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                  <Users className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Affected People</p>
                                  <p className="font-semibold">{alert.affectedPeople}</p>
                                </div>
                              </div>
                            )}
                            
                            {alert.foodNeeded && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                  <Package className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Food Needed</p>
                                  <p className="font-semibold">{alert.foodNeeded} kg</p>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-purple-500/10">
                                <Clock className="h-4 w-4 text-purple-500" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Created</p>
                                <p className="font-semibold">{createdDate.toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {alert.status === 'active' && (
                            <Button variant="outline" size="sm" className="shadow-sm">
                              <Activity className="h-4 w-4 mr-2" />
                              Resolve
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="shadow-sm">
                            <ArrowRight className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
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
