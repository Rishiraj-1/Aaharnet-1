"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useRole } from "@/hooks/useRole"
import { getActiveAlerts, createEmergencyAlert } from "@/utils/api"
import { AlertTriangle, Plus, Bell, MapPin, Clock, Users, Package, ToggleLeft, ToggleRight, Shield } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

// Mock emergency alerts
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
  const [realAlerts, setRealAlerts] = useState<any[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  useEffect(() => {
    if (!useMockData && admin) {
      loadAlerts()
    }
  }, [useMockData, admin])

  const loadAlerts = async () => {
    setLoadingAlerts(true)
    try {
      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 8000)
      )
      
      const alerts = await Promise.race([
        getActiveAlerts(),
        timeoutPromise
      ]) as any
      
      setRealAlerts(alerts?.alerts || [])
    } catch (error: any) {
      console.error('Error loading alerts:', error)
      // Don't show error toast if it's just a timeout - user can use mock data
      if (!error.message?.includes('timed out')) {
        toast.error('Failed to load emergency alerts. Using mock data.')
      }
      // Fallback to empty array so page still works
      setRealAlerts([])
    } finally {
      setLoadingAlerts(false)
    }
  }

  const alerts = useMockData ? mockAlerts : realAlerts
  const loading = useMockData ? false : loadingAlerts

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const stats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    totalAffected: alerts.reduce((sum, a) => sum + (a.affectedPeople || 0), 0),
    totalFoodNeeded: alerts.reduce((sum, a) => sum + (a.foodNeeded || 0), 0)
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

  return (
    <DashboardLayout title="Emergency Management" navItems={navItems}>
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
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Affected People</p>
                <p className="text-2xl font-bold">{stats.totalAffected}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Food Needed</p>
                <p className="text-2xl font-bold">{stats.totalFoodNeeded}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Emergency Alert
          </Button>
        </div>

        {/* Alerts List */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Emergency Alerts</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No emergency alerts</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or create an alert."
                    : "No active emergency alerts at the moment."}
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Card key={alert.id} className="p-4 border-l-4 border-l-red-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity} severity
                          </Badge>
                          <Badge variant="outline">{alert.type}</Badge>
                          <Badge className={alert.status === 'active' ? 'bg-red-500' : 'bg-green-500'}>
                            {alert.status}
                          </Badge>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{alert.title}</h3>
                          {alert.description && (
                            <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{alert.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{alert.affectedPeople} people affected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{alert.foodNeeded} kg needed</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Created: {new Date(alert.createdAt || Date.now()).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {alert.status === 'active' && (
                          <>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                            <Button size="sm">
                              Resolve
                            </Button>
                          </>
                        )}
                        {alert.status === 'resolved' && (
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

