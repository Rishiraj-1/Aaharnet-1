"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Users, Plus, UserCheck, Heart, MapPin, Calendar, ToggleLeft, ToggleRight } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

// Mock data
const mockBeneficiaries = [
  {
    id: "1",
    name: "Rajesh Kumar",
    age: 45,
    familySize: 4,
    location: "Indore Sector 1",
    lastServed: "2024-01-15",
    totalServed: 12,
    status: "active",
    category: "Family"
  },
  {
    id: "2",
    name: "Priya Sharma",
    age: 32,
    familySize: 3,
    location: "Indore Sector 2",
    lastServed: "2024-01-14",
    totalServed: 8,
    status: "active",
    category: "Family"
  },
  {
    id: "3",
    name: "Community Kitchen",
    age: null,
    familySize: 50,
    location: "Indore Sector 3",
    lastServed: "2024-01-13",
    totalServed: 45,
    status: "active",
    category: "Organization"
  }
]

export default function NGOBeneficiariesPage() {
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
  const { data: realBeneficiaries, loading: beneficiariesLoading } = useFirestoreCollection<{
    id: string
    ngoId: string
    ngo_id: string
    name: string
    age?: number
    familySize: number
    family_size: number
    location: string
    lastServed: string
    last_served: string
    totalServed: number
    total_served: number
    status: string
    category: string
  }>('beneficiaries', {
    whereFilter: user?.uid ? {
      field: 'ngoId',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'lastServed',
    orderByDirection: 'desc',
    limitCount: 100
  })

  const beneficiaries = useMockData ? mockBeneficiaries : (realBeneficiaries || [])
  const loading = useMockData ? false : beneficiariesLoading

  const stats = {
    total: beneficiaries.length,
    active: beneficiaries.filter(b => b.status === 'active').length,
    families: beneficiaries.filter(b => b.category === 'Family' || !b.category).length,
    organizations: beneficiaries.filter(b => b.category === 'Organization').length,
    totalPeople: beneficiaries.reduce((sum, b) => sum + (b.familySize || b.family_size || 1), 0)
  }

  return (
    <DashboardLayout title="Beneficiaries" navItems={navItems}>
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
                <p className="text-sm text-muted-foreground">Total Beneficiaries</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total People</p>
                <p className="text-2xl font-bold">{stats.totalPeople}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Organizations</p>
                <p className="text-2xl font-bold">{stats.organizations}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Beneficiary
          </Button>
        </div>

        {/* Beneficiaries List */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">All Beneficiaries</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading beneficiaries...</p>
              </div>
            ) : beneficiaries.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No beneficiaries found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or add a beneficiary."
                    : "You haven't added any beneficiaries yet."}
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Beneficiary
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {beneficiaries.map((beneficiary) => (
                  <Card key={beneficiary.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{beneficiary.name}</h3>
                          <Badge className="mt-1">
                            {beneficiary.category || 'Family'}
                          </Badge>
                        </div>
                        <Badge className={beneficiary.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                          {beneficiary.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        {beneficiary.age && (
                          <div>
                            <span className="text-muted-foreground">Age: </span>
                            <span className="font-medium">{beneficiary.age} years</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Family Size: </span>
                          <span className="font-medium">
                            {beneficiary.familySize || beneficiary.family_size || 1} people
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{beneficiary.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Last served: {new Date(beneficiary.lastServed || beneficiary.last_served || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total served: </span>
                          <span className="font-medium">
                            {beneficiary.totalServed || beneficiary.total_served || 0} times
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          Edit
                        </Button>
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

