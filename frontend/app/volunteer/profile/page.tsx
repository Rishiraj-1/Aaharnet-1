"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { User, Mail, Phone, MapPin, Award, Truck, Clock, Edit, Save, Star, TrendingUp, Target, Heart } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

export default function VolunteerProfilePage() {
  const navItems = [
    { label: "Dashboard", href: "/volunteer" },
    { label: "Map", href: "/map" },
    { label: "Available Tasks", href: "/volunteer/tasks" },
    { label: "My Deliveries", href: "/volunteer/deliveries" },
    { label: "Profile", href: "/volunteer/profile" },
  ]

  const { user, userData, loading: authLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: userData?.name || user?.displayName || "",
    email: user?.email || "",
    phone: userData?.phone || "",
    location: userData?.location || "",
    vehicleType: userData?.vehicleType || "Bike",
    availability: userData?.availability || "Full-time"
  })

  const stats = {
    totalDeliveries: 45,
    totalDistance: 125.5,
    totalHours: 156,
    impactPoints: 850,
    rating: 4.8
  }

  const handleSave = () => {
    // TODO: Save to Firestore
    setIsEditing(false)
  }

  return (
    <DashboardLayout title="Profile" navItems={navItems}>
      <div className="space-y-8">
        {/* Profile Header - Redesigned */}
        <Card className="p-8 shadow-lg border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {formData.name?.[0]?.toUpperCase() || 'V'}
                </div>
                <div className="absolute -bottom-1 -right-1 p-2 bg-background rounded-full border-4 border-background shadow-lg">
                  <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold">{formData.name || "Volunteer"}</h2>
                  <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    Active
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-3">{formData.email}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold">{stats.rating}</span>
                    <span className="text-sm text-muted-foreground">/ 5.0</span>
                  </div>
                  <div className="h-4 w-px bg-border"></div>
                  <div className="text-sm text-muted-foreground">
                    {stats.totalDeliveries} deliveries
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="shadow-sm"
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AnimatedMetricCard
            title="Total Deliveries"
            value={stats.totalDeliveries}
            icon={Truck}
            gradient="from-blue-500 to-cyan-500"
            bgGradient="from-blue-500/10 to-cyan-500/10"
          />
          <AnimatedMetricCard
            title="Total Distance"
            value={`${stats.totalDistance} km`}
            icon={MapPin}
            gradient="from-emerald-500 to-teal-500"
            bgGradient="from-emerald-500/10 to-teal-500/10"
          />
          <AnimatedMetricCard
            title="Total Hours"
            value={stats.totalHours}
            icon={Clock}
            gradient="from-amber-500 to-orange-500"
            bgGradient="from-amber-500/10 to-orange-500/10"
          />
          <AnimatedMetricCard
            title="Impact Points"
            value={stats.impactPoints}
            icon={Award}
            gradient="from-rose-500 to-pink-500"
            bgGradient="from-rose-500/10 to-pink-500/10"
          />
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <p className="text-sm text-muted-foreground">Your personal details</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1 p-3 rounded-lg bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.name || "Not set"}</span>
                  </div>
                )}
              </div>
              <div>
                <Label>Email</Label>
                <div className="flex items-center gap-2 mt-1 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{formData.email || "Not set"}</span>
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.phone || "Not set"}</span>
                  </div>
                )}
              </div>
              <div>
                <Label>Location</Label>
                {isEditing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.location || "Not set"}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Truck className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Volunteer Information</h3>
                <p className="text-sm text-muted-foreground">Your volunteer details</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Vehicle Type</Label>
                {isEditing ? (
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full p-2 border rounded-md mt-1"
                  >
                    <option>Bike</option>
                    <option>Car</option>
                    <option>Van</option>
                    <option>Other</option>
                  </select>
                ) : (
                  <div className="mt-1">
                    <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                      {formData.vehicleType}
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <Label>Availability</Label>
                {isEditing ? (
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full p-2 border rounded-md mt-1"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Weekends only</option>
                    <option>On-call</option>
                  </select>
                ) : (
                  <div className="mt-1">
                    <Badge variant="outline" className="border-primary/20">
                      {formData.availability}
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <Label>Rating</Label>
                <div className="flex items-center gap-3 mt-1 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-lg">{stats.rating}</span>
                    <span className="text-sm text-muted-foreground">/ 5.0</span>
                  </div>
                  <div className="h-4 w-px bg-border"></div>
                  <span className="text-sm text-muted-foreground">
                    Based on {stats.totalDeliveries} deliveries
                  </span>
                </div>
              </div>
              
              {/* Achievement Badges */}
              <div className="pt-4 border-t">
                <Label className="mb-3 block">Achievements</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    <Award className="h-3 w-3 mr-1" />
                    Top 10%
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    <Target className="h-3 w-3 mr-1" />
                    50+ Deliveries
                  </Badge>
                  <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                    <Heart className="h-3 w-3 mr-1" />
                    Impact Hero
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
