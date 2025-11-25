"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Package, Plus, Clock, CheckCircle, XCircle, AlertCircle, ToggleLeft, ToggleRight, MapPin, Sparkles, Users } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

// Mock data
const mockRequests = [
  {
    id: "1",
    foodTypes: ["Vegetarian", "Fruits"],
    quantityKg: 150,
    priority: "high",
    status: "pending",
    createdAt: "2024-01-15T10:00:00Z",
    location: "Community Center, Indore",
    beneficiaries: 50,
    description: "Urgent need for fresh vegetables and fruits for community kitchen"
  },
  {
    id: "2",
    foodTypes: ["Non-Vegetarian", "Dairy"],
    quantityKg: 200,
    priority: "medium",
    status: "fulfilled",
    createdAt: "2024-01-14T14:30:00Z",
    location: "Shelter Home, Indore",
    beneficiaries: 75,
    description: "Regular weekly requirement"
  },
  {
    id: "3",
    foodTypes: ["Vegetarian", "Grains"],
    quantityKg: 300,
    priority: "low",
    status: "active",
    createdAt: "2024-01-13T09:00:00Z",
    location: "Food Bank, Indore",
    beneficiaries: 100,
    description: "Monthly bulk requirement"
  }
]

export default function NGORequestsPage() {
  const navItems = [
    { label: "Dashboard", href: "/ngo" },
    { label: "Map", href: "/map" },
    { label: "Requests", href: "/ngo/requests" },
    { label: "Beneficiaries", href: "/ngo/beneficiaries" },
    { label: "Reports", href: "/ngo/reports" },
  ]

  const { user, loading: authLoading } = useAuth()
  const [useMockData, setUseMockData] = useState(true)

  // Real data from Firestore
  const { data: realRequests, loading: requestsLoading } = useFirestoreCollection<{
    id: string
    ngoId: string
    ngo_id: string
    foodTypes: string[]
    food_types: string[]
    quantityKg: number
    quantity_kg: number
    priority: string
    status: string
    createdAt: any
    created_at: string
    location: string
    beneficiaries: number
    beneficiaries_served: number
    description: string
  }>('requests', {
    whereFilter: user?.uid ? {
      field: 'ngoId',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'createdAt',
    orderByDirection: 'desc',
    limitCount: 50
  })

  const requests = useMockData ? mockRequests : (realRequests || [])
  const loading = useMockData ? false : requestsLoading

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'fulfilled':
      case 'completed':
        return 'bg-emerald-500'
      case 'active':
      case 'pending':
        return 'bg-amber-500'
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-amber-500'
      case 'low':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'active').length,
    fulfilled: requests.filter(r => r.status === 'fulfilled' || r.status === 'completed').length,
    totalQuantity: requests.reduce((sum, r) => sum + (r.quantityKg || r.quantity_kg || 0), 0)
  }

  return (
    <DashboardLayout title="Food Requests" navItems={navItems}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Food Requests</h1>
            <p className="text-muted-foreground mt-1">Manage your food requests and requirements</p>
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
              Create New Request
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AnimatedMetricCard
            title="Total Requests"
            value={stats.total}
            icon={Package}
            gradient="from-blue-500 to-cyan-500"
            bgGradient="from-blue-500/10 to-cyan-500/10"
          />
          <AnimatedMetricCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            gradient="from-amber-500 to-orange-500"
            bgGradient="from-amber-500/10 to-orange-500/10"
          />
          <AnimatedMetricCard
            title="Fulfilled"
            value={stats.fulfilled}
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

        {/* Requests List */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">All Requests</h2>
                  <p className="text-sm text-muted-foreground">{requests.length} total requests</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl"></div>
                  <Package className="h-16 w-16 text-primary relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No requests found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or create a request."
                    : "You haven't created any requests yet."}
                </p>
                <Button className="bg-gradient-to-r from-primary to-primary/80">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card 
                    key={request.id} 
                    className={cn(
                      "p-5 border-0 shadow-md hover:shadow-lg transition-all duration-300",
                      "bg-gradient-to-br from-card to-muted/30",
                      request.status === 'fulfilled' && "opacity-75"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={cn(getStatusColor(request.status), "text-white shadow-sm")}>
                            {request.status}
                          </Badge>
                          <Badge className={cn(getPriorityColor(request.priority), "text-white shadow-sm")}>
                            {request.priority} priority
                          </Badge>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            {request.quantityKg || request.quantity_kg} kg
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(request.foodTypes || request.food_types || []).map((type, idx) => (
                              <Badge key={idx} variant="outline" className="border-primary/20">
                                {type}
                              </Badge>
                            ))}
                          </div>
                          {request.description && (
                            <p className="text-sm text-muted-foreground mb-4">{request.description}</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="font-semibold truncate">{request.location}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Beneficiaries</p>
                              <p className="font-semibold">
                                {request.beneficiaries || request.beneficiaries_served || 0}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Created</p>
                              <p className="font-semibold">
                                {new Date(request.createdAt || request.created_at || Date.now()).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {(request.status === 'pending' || request.status === 'active') && (
                          <>
                            <Button variant="outline" size="sm" className="shadow-sm">
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive shadow-sm">
                              Cancel
                            </Button>
                          </>
                        )}
                        {request.status === 'fulfilled' && (
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
