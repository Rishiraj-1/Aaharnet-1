"use client"

import { Card } from "@/components/ui/card"
import { Info } from "lucide-react"
import { useMarkerIconFactory } from "@/hooks/useMarkerIconFactory"
import { useMemo } from "react"

export function MapLegend() {
  const { getIcon } = useMarkerIconFactory()

  const legendItems = useMemo(() => [
    {
      title: "Donations",
      items: [
        { label: "Available Donation", role: 'donor' as const, status: 'available' as const, color: '#10B981' },
        { label: "Your Donation", role: 'donor-own' as const, status: 'available' as const, color: '#FF8C42' },
        { label: "Assigned", role: 'donor' as const, status: 'assigned' as const, color: '#F59E0B' },
        { label: "Picked Up", role: 'donor' as const, status: 'picked' as const, color: '#3B82F6' },
        { label: "Delivered", role: 'donor' as const, status: 'delivered' as const, color: '#6B7280' },
      ]
    },
    {
      title: "NGO Requests",
      items: [
        { label: "Food Request", role: 'ngo' as const, status: 'active' as const, color: '#00A991' },
      ]
    },
    {
      title: "Volunteers",
      items: [
        { label: "Active Volunteer", role: 'volunteer' as const, status: 'active' as const, color: '#0066CC' },
      ]
    }
  ], [])

  return (
    <Card className="absolute top-4 right-4 z-[1000] w-64 bg-background/95 backdrop-blur-sm border p-4 max-h-[80vh] overflow-y-auto">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Map Legend</h3>
        </div>
        
        {legendItems.map((section, idx) => (
          <div key={idx} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {section.title}
            </h4>
            <div className="space-y-1.5">
              {section.items.map((item, itemIdx) => {
                const icon = getIcon({ role: item.role, status: item.status, size: 'small' })
                return (
                  <div key={itemIdx} className="flex items-center gap-2 text-xs">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                      {icon && (
                        <img 
                          src={icon.options.iconUrl} 
                          alt={item.label}
                          className="w-6 h-6 object-contain"
                        />
                      )}
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

