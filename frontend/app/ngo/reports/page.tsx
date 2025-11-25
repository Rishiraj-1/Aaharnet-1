"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { FileText, Download, Calendar, BarChart3, TrendingUp, Users, Package, ToggleLeft, ToggleRight, ArrowRight, Sparkles, CheckCircle } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const mockReports = [
  {
    id: "1",
    title: "Monthly Distribution Report - January 2024",
    type: "Monthly",
    period: "January 2024",
    totalDistributions: 45,
    totalQuantity: 1250,
    beneficiariesServed: 320,
    status: "completed",
    generatedAt: "2024-02-01T10:00:00Z"
  },
  {
    id: "2",
    title: "Weekly Activity Report - Week 3",
    type: "Weekly",
    period: "Week 3, January 2024",
    totalDistributions: 12,
    totalQuantity: 340,
    beneficiariesServed: 85,
    status: "completed",
    generatedAt: "2024-01-25T14:30:00Z"
  }
]

export default function NGOReportsPage() {
  const navItems = [
    { label: "Dashboard", href: "/ngo" },
    { label: "Map", href: "/map" },
    { label: "Requests", href: "/ngo/requests" },
    { label: "Beneficiaries", href: "/ngo/beneficiaries" },
    { label: "Reports", href: "/ngo/reports" },
  ]

  const { user, loading: authLoading } = useAuth()
  const [useMockData, setUseMockData] = useState(true)

  const { data: realReports, loading: reportsLoading } = useFirestoreCollection<{
    id: string
    ngo_id: string
    title: string
    type: string
    period: string
    total_distributions: number
    total_quantity: number
    beneficiaries_served: number
    status: string
    generated_at: string
  }>('reports', {
    whereFilter: user?.uid ? {
      field: 'ngo_id',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'generated_at',
    orderByDirection: 'desc',
    limitCount: 50
  })

  const reports = useMockData ? mockReports : (realReports || [])
  const loading = useMockData ? false : reportsLoading

  const stats = useMemo(() => {
    return {
      total: reports.length,
      completed: reports.filter(r => r.status === 'completed').length,
      totalDistributions: reports.reduce((sum, r) => sum + (r.totalDistributions || r.total_distributions || 0), 0),
      totalBeneficiaries: reports.reduce((sum, r) => sum + (r.beneficiariesServed || r.beneficiaries_served || 0), 0)
    }
  }, [reports])

  return (
    <DashboardLayout title="Reports" navItems={navItems}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1">View and download your distribution reports</p>
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
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-teal-500/20">
                <FileText className="h-6 w-6 text-teal-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Reports</p>
            <p className="text-3xl font-bold mb-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Completed</p>
            <p className="text-3xl font-bold mb-1">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Ready to download</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Distributions</p>
            <p className="text-3xl font-bold mb-1">{stats.totalDistributions}</p>
            <p className="text-xs text-muted-foreground">Across all reports</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-500/20">
                <Users className="h-6 w-6 text-rose-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Beneficiaries</p>
            <p className="text-3xl font-bold mb-1">{stats.totalBeneficiaries}</p>
            <p className="text-xs text-muted-foreground">Total served</p>
          </Card>
        </div>

        {/* Reports List */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <FileText className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">All Reports</h2>
                  <p className="text-sm text-muted-foreground">{reports.length} total reports</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-teal-500/10 rounded-full blur-xl"></div>
                  <FileText className="h-16 w-16 text-teal-500 relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No reports found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or generate a report."
                    : "You haven't generated any reports yet."}
                </p>
                <Button className="bg-gradient-to-r from-teal-500 to-teal-600">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Your First Report
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => {
                  const generatedDate = new Date(report.generatedAt || report.generated_at || Date.now())
                  return (
                    <Card 
                      key={report.id} 
                      className="p-5 border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-muted/30 border-2 hover:border-teal-500/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30">
                              {report.type}
                            </Badge>
                            <Badge className={cn(
                              "shadow-sm",
                              report.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                            )}>
                              {report.status}
                            </Badge>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                              <FileText className="h-5 w-5 text-teal-500" />
                              {report.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">{report.period}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-blue-500/10">
                                <Package className="h-4 w-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Distributions</p>
                                <p className="font-semibold">{report.totalDistributions || report.total_distributions || 0}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-emerald-500/10">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Total Quantity</p>
                                <p className="font-semibold">{report.totalQuantity || report.total_quantity || 0} kg</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-lg bg-rose-500/10">
                                <Users className="h-4 w-4 text-rose-500" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Beneficiaries</p>
                                <p className="font-semibold">{report.beneficiariesServed || report.beneficiaries_served || 0}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Generated: {generatedDate.toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {report.status === 'completed' && (
                            <Button variant="outline" size="sm" className="shadow-sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
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
