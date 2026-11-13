import { useEffect, useId, useRef, useState } from 'react'

type MapLocation = {
  address?: string
  latitude: number
  longitude: number
}

type GoogleLocation = { lat: () => number, lng: () => number }
type GoogleListener = { remove: () => void }
type GoogleMap = { setCenter: (location: { lat: number, lng: number }) => void, setZoom: (zoom: number) => void }
type GoogleMarker = { setPosition: (location: { lat: number, lng: number }) => void, addListener: (event: string, callback: () => void) => GoogleListener, getPosition: () => GoogleLocation | undefined }
type GoogleAutocomplete = { addListener: (event: string, callback: () => void) => GoogleListener, getPlace: () => { formatted_address?: string, geometry?: { location?: GoogleLocation } } }
type GoogleMaps = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap
  Marker: new (options: Record<string, unknown>) => GoogleMarker
  places: { Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => GoogleAutocomplete }
}

const mapsForWindow = () => (window as Window & { google?: { maps?: GoogleMaps } }).google?.maps
const defaultLocation = { lat: 5.6037, lng: -0.1870 }

const parseCoordinate = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const loadGoogleMaps = (apiKey: string) => new Promise<void>((resolve, reject) => {
  if (mapsForWindow()?.places) {
    resolve()
    return
  }
  const existing = document.getElementById('siga-google-maps-script') as HTMLScriptElement | null
  if (existing) {
    existing.addEventListener('load', () => resolve(), { once: true })
    existing.addEventListener('error', () => reject(new Error('Google Maps could not be loaded.')), { once: true })
    return
  }
  const script = document.createElement('script')
  script.id = 'siga-google-maps-script'
  script.async = true
  script.defer = true
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`
  script.addEventListener('load', () => resolve(), { once: true })
  script.addEventListener('error', () => reject(new Error('Google Maps could not be loaded.')), { once: true })
  document.head.append(script)
})

export function GoogleMapLocationPicker({
  address,
  latitude,
  longitude,
  onLocationChange,
  onCoordinateInputChange,
}: {
  address: string
  latitude: string
  longitude: string
  onLocationChange: (location: MapLocation) => void
  onCoordinateInputChange: (field: 'latitude' | 'longitude', value: string) => void
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const searchId = useId()
  const mapElement = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const map = useRef<GoogleMap | undefined>(undefined)
  const marker = useRef<GoogleMarker | undefined>(undefined)
  const locationChange = useRef(onLocationChange)
  const currentCoordinates = useRef({ latitude, longitude })
  const [mapsStatus, setMapsStatus] = useState<'unconfigured' | 'loading' | 'ready' | 'unavailable'>(apiKey ? 'loading' : 'unconfigured')

  useEffect(() => {
    locationChange.current = onLocationChange
  }, [onLocationChange])

  useEffect(() => {
    currentCoordinates.current = { latitude, longitude }
  }, [latitude, longitude])

  useEffect(() => {
    if (!apiKey) return
    let mounted = true
    void loadGoogleMaps(apiKey)
      .then(() => { if (mounted && mapsForWindow()?.places) setMapsStatus('ready') })
      .catch(() => { if (mounted) setMapsStatus('unavailable') })
    return () => { mounted = false }
  }, [apiKey])

  useEffect(() => {
    if (mapsStatus !== 'ready' || !mapElement.current || !searchInput.current) return
    const maps = mapsForWindow()
    if (!maps) return
    const initial = {
      lat: parseCoordinate(currentCoordinates.current.latitude) ?? defaultLocation.lat,
      lng: parseCoordinate(currentCoordinates.current.longitude) ?? defaultLocation.lng,
    }
    const mapInstance = new maps.Map(mapElement.current, { center: initial, zoom: currentCoordinates.current.latitude && currentCoordinates.current.longitude ? 15 : 6, mapTypeControl: false, streetViewControl: false })
    const markerInstance = new maps.Marker({ map: mapInstance, position: initial, draggable: true, title: 'Entity location' })
    const updateCoordinates = (location: GoogleLocation, selectedAddress?: string) => {
      locationChange.current({ address: selectedAddress, latitude: location.lat(), longitude: location.lng() })
    }
    const dragListener = markerInstance.addListener('dragend', () => {
      const position = markerInstance.getPosition()
      if (position) updateCoordinates(position)
    })
    const autocomplete = new maps.places.Autocomplete(searchInput.current, { fields: ['formatted_address', 'geometry'], types: ['geocode'] })
    const placeListener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const placeLocation = place.geometry?.location
      if (!placeLocation) return
      const next = { lat: placeLocation.lat(), lng: placeLocation.lng() }
      markerInstance.setPosition(next)
      mapInstance.setCenter(next)
      mapInstance.setZoom(16)
      updateCoordinates(placeLocation, place.formatted_address)
    })
    map.current = mapInstance
    marker.current = markerInstance
    return () => {
      dragListener.remove()
      placeListener.remove()
      map.current = undefined
      marker.current = undefined
    }
  }, [mapsStatus])

  useEffect(() => {
    const lat = parseCoordinate(latitude)
    const lng = parseCoordinate(longitude)
    if (lat === undefined || lng === undefined || !map.current || !marker.current) return
    const next = { lat, lng }
    marker.current.setPosition(next)
    map.current.setCenter(next)
  }, [latitude, longitude])

  const mapLink = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
    : address.trim()
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
      : undefined

  return <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <label className="block text-sm font-bold text-slate-700" htmlFor={searchId}>Find a location</label>
    {mapsStatus === 'ready'
      ? <><input ref={searchInput} id={searchId} type="search" placeholder="Search Google Maps for an address or place" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none" /><p className="mt-2 text-xs leading-5 text-slate-500">Choose a suggestion, then drag the pin to refine the location.</p><div ref={mapElement} data-testid="google-map-location-picker" className="mt-4 h-64 overflow-hidden rounded-lg border border-slate-200 bg-slate-200" /></>
      : mapsStatus === 'loading'
        ? <p className="mt-2 text-sm text-slate-600" role="status">Loading Google Maps…</p>
        : <><p className="mt-2 text-sm leading-6 text-slate-600" data-testid="google-maps-fallback">Google Maps is not configured in this environment. Enter a physical address above and, if available, save coordinates. Add a browser-restricted Google Maps API key to enable place suggestions and pin adjustment.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-bold text-slate-700" htmlFor={`${searchId}-latitude`}>Latitude (optional)</label><input id={`${searchId}-latitude`} inputMode="decimal" value={latitude} onChange={(event) => onCoordinateInputChange('latitude', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none" /></div><div><label className="text-sm font-bold text-slate-700" htmlFor={`${searchId}-longitude`}>Longitude (optional)</label><input id={`${searchId}-longitude`} inputMode="decimal" value={longitude} onChange={(event) => onCoordinateInputChange('longitude', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none" /></div></div></>}
    {mapLink && <a href={mapLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-sm font-bold text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-600">Open this location in Google Maps <span className="ml-1" aria-hidden="true">↗</span></a>}
  </div>
}
