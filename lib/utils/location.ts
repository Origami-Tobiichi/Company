const AIRPORT = { lat: -8.7489, lng: 115.1668 }
const RADIUS = 100 // meter

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function isWithinAirport(lat: number, lng: number) {
  return haversine(lat, lng, AIRPORT.lat, AIRPORT.lng) <= RADIUS
}

export function getLocationError(lat: number, lng: number) {
  if (!isWithinAirport(lat, lng)) {
    const dist = Math.round(haversine(lat, lng, AIRPORT.lat, AIRPORT.lng))
    return `Lokasi berjarak ${dist}m dari bandara (maks ${RADIUS}m)`
  }
  return null
}
