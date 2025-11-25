"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { Users, Plus, UserCheck, Heart, MapPin, Calendar, ToggleLeft, ToggleRight, ArrowRight, Building2, Target, Award } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Beneficiaries</h1>
            <p className="text-muted-foreground mt-1">Manage your beneficiaries and recipients</p>
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
            <Button className="shadow-lg bg-gradient-to-r from-teal-500 to-teal-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Beneficiary
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AnimatedMetricCard
            title="Total Beneficiaries"
            value={stats.total}
            icon={Users}
            gradient="from-teal-500 to-cyan-500"
            bgGradient="from-teal-500/10 to-cyan-500/10"
          />
          <AnimatedMetricCard
            title="Active"
            value={stats.active}
            icon={UserCheck}
            gradient="from-emerald-500 to-teal-500"
            bgGradient="from-emerald-500/10 to-teal-500/10"
          />
          <AnimatedMetricCard
            title="Total People"
            value={stats.totalPeople}
            icon={Heart}
            gradient="from-rose-500 to-pink-500"
            bgGradient="from-rose-500/10 to-pink-500/10"
          />
          <AnimatedMetricCard
            title="Organizations"
            value={stats.organizations}
            icon={Building2}
            gradient="from-amber-500 to-orange-500"
            bgGradient="from-amber-500/10 to-orange-500/10"
          />
        </div>

        {/* Beneficiaries Grid */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <Users className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">All Beneficiaries</h2>
                  <p className="text-sm text-muted-foreground">{beneficiaries.length} total beneficiaries</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading beneficiaries...</p>
              </div>
            ) : beneficiaries.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-teal-500/10 rounded-full blur-xl"></div>
                  <Users className="h-16 w-16 text-teal-500 relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No beneficiaries found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or add a beneficiary."
                    : "You haven't added any beneficiaries yet."}
                </p>
                <Button className="bg-gradient-to-r from-teal-500 to-teal-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Beneficiary
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {beneficiaries.map((beneficiary) => (
                  <Card 
                    key={beneficiary.id} 
                    className="p-5 border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-muted/30 border-2 hover:border-teal-500/50"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{beneficiary.name}</h3>
                          <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30">
                            {beneficiary.category || 'Family'}
                          </Badge>
                        </div>
                        <Badge className={cn(
                          "shadow-sm",
                          beneficiary.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'
                        )}>
                          {beneficiary.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {beneficiary.age && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Age: </span>
                            <span className="font-medium">{beneficiary.age} years</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Family Size: </span>
                          <span className="font-medium">
                            {beneficiary.familySize || beneficiary.family_size || 1} people
                          </span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{beneficiary.location}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Last served: {new Date(beneficiary.lastServed || beneficiary.last_served || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Total served: </span>
                          <span className="font-medium">
                            {beneficiary.totalServed || beneficiary.total_served || 0} times
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" className="flex-1 shadow-sm">
                          <ArrowRight className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 shadow-sm">
                          <UserCheck className="h-3 w-3 mr-1" />
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
