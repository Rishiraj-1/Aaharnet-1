// Mock data for SmartFood Connect
export const donors = [
  {
    id: 1,
    name: "Fresh Market Downtown",
    type: "Supermarket",
    location: { lat: 40.7128, lng: -74.006 },
    foodAvailable: 450,
    lastDonation: "2 hours ago",
    rating: 4.8,
    donations: 156,
  },
  {
    id: 2,
    name: "Green Valley Farm",
    type: "Farm",
    location: { lat: 40.758, lng: -73.9855 },
    foodAvailable: 320,
    lastDonation: "5 hours ago",
    rating: 4.9,
    donations: 89,
  },
  {
    id: 3,
    name: "City Restaurant Group",
    type: "Restaurant",
    location: { lat: 40.7489, lng: -73.968 },
    foodAvailable: 180,
    lastDonation: "1 hour ago",
    rating: 4.7,
    donations: 234,
  },
]

export const ngos = [
  {
    id: 1,
    name: "Community Food Bank",
    location: { lat: 40.7505, lng: -73.9972 },
    beneficiaries: 2500,
    foodNeeded: 800,
    rating: 4.9,
    volunteers: 45,
  },
  {
    id: 2,
    name: "Hope for All",
    location: { lat: 40.7614, lng: -73.9776 },
    beneficiaries: 1800,
    foodNeeded: 600,
    rating: 4.8,
    volunteers: 32,
  },
]

export const volunteers = [
  {
    id: 1,
    name: "Sarah Johnson",
    hours: 156,
    deliveries: 45,
    rating: 4.9,
    status: "active",
  },
  {
    id: 2,
    name: "Michael Chen",
    hours: 98,
    deliveries: 28,
    rating: 4.8,
    status: "active",
  },
  {
    id: 3,
    name: "Emma Rodriguez",
    hours: 234,
    deliveries: 67,
    rating: 5.0,
    status: "active",
  },
]

export const stats = {
  totalDonations: 12450,
  foodRedistributed: 45230,
  volunteersActive: 156,
  beneficiariesServed: 8900,
  foodWastePrevented: 98.5,
}
