"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Package, Plus, Clock, CheckCircle, XCircle, AlertCircle, ToggleLeft, ToggleRight, MapPin } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"

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
        return 'bg-green-500'
      case 'active':
      case 'pending':
        return 'bg-yellow-500'
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
        return 'bg-yellow-500'
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
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fulfilled</p>
                <p className="text-2xl font-bold">{stats.fulfilled}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{stats.totalQuantity}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Request
          </Button>
        </div>

        {/* Requests List */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">All Requests</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No requests found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or create a request."
                    : "You haven't created any requests yet."}
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                          <Badge className={getPriorityColor(request.priority)}>
                            {request.priority} priority
                          </Badge>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">
                            {request.quantityKg || request.quantity_kg} kg
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {(request.foodTypes || request.food_types || []).join(", ")}
                          </p>
                        </div>
                        {request.description && (
                          <p className="text-sm">{request.description}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{request.location}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Beneficiaries: </span>
                            <span className="font-medium">
                              {request.beneficiaries || request.beneficiaries_served || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created: </span>
                            <span className="font-medium">
                              {new Date(request.createdAt || request.created_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {(request.status === 'pending' || request.status === 'active') && (
                          <>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive">
                              Cancel
                            </Button>
                          </>
                        )}
                        {request.status === 'fulfilled' && (
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

