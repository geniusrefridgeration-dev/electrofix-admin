import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Save, Plus, Trash2, Crosshair, X, IndianRupee, Info, CheckCircle, Search, Bell, Volume2 } from 'lucide-react'
import { useT, useAppStore } from '@/store/appStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'

declare global { interface Window { google: any; [key: string]: any } }

interface Slab { minKm: number; maxKm: number; charge: number; label: string }

// ── Google Maps loader (singleton) ──────────────────────────────────────────
let _gmAdminPromise: Promise<void> | null = null
function loadGM(apiKey: string): Promise<void> {
  if (_gmAdminPromise) return _gmAdminPromise
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
    return (_gmAdminPromise = Promise.resolve())
  }
  _gmAdminPromise = new Promise((res, rej) => {
    const cb = `__gm_admin_${Date.now()}`
    ;(window as any)[cb] = () => { res(); delete (window as any)[cb] }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${cb}&language=en&region=IN`
    s.async = true; s.defer = true
    s.onerror = () => { _gmAdminPromise = null; rej() }
    document.head.appendChild(s)
  })
  return _gmAdminPromise
}

function parseGeoResult(r: any) {
  const get = (t: string) => r.address_components?.find((c: any) => c.types.includes(t))?.long_name || ''
  return {
    fullAddress: r.formatted_address || '',
    street:  [get('street_number'), get('route'), get('sublocality_level_2'), get('sublocality_level_1')].filter(Boolean).join(', ') || get('neighborhood'),
    city:    get('locality') || get('administrative_area_level_2'),
    state:   get('administrative_area_level_1'),
    pincode: get('postal_code'),
  }
}

// ─── Google Maps ShopMap ─────────────────────────────────────────────────────
function ShopMap({ initialLat, initialLng, onSelect, onDeselect }: {
  initialLat: number | null; initialLng: number | null
  onSelect: (lat: number, lng: number) => void; onDeselect: () => void
}) {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const searchRef   = useRef<HTMLInputElement>(null)
  const mapRef      = useRef<any>(null)
  const markerRef   = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const mountRef    = useRef(false)

  const [placed,    setPlaced]    = useState(!!initialLat)
  const [address,   setAddress]   = useState('')
  const [locating,  setLocating]  = useState(false)
  const [noKey,     setNoKey]     = useState(false)
  const [mapError,  setMapError]  = useState(false)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!geocoderRef.current) return
    geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: string) => {
      const g = (window as any).google
      if (status === g.maps.GeocoderStatus.OK && results?.[0]) {
        const a = parseGeoResult(results[0])
        setAddress(a.fullAddress)
        if (searchRef.current) searchRef.current.value = a.fullAddress
        onSelect(lat, lng)
      } else {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        onSelect(lat, lng)
      }
    })
  }, [onSelect])

  const svgPin = encodeURIComponent(`<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg"><defs><filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,.30)"/></filter></defs><path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.059 27.941 0 18 0z" fill="#E53935" filter="url(#ds)"/><circle cx="18" cy="18" r="9" fill="white" opacity=".92"/><circle cx="18" cy="18" r="5" fill="#E53935"/></svg>`)
  const pinIcon = { url: `data:image/svg+xml;charset=UTF-8,${svgPin}` }

  const placeAt = useCallback((lat: number, lng: number, pan = true) => {
    if (!mapRef.current) return
    const g = (window as any).google
    const pos = { lat, lng }
    if (markerRef.current) {
      markerRef.current.setPosition(pos)
    } else {
      const m = new g.maps.Marker({
        position: pos, map: mapRef.current, draggable: true,
        animation: g.maps.Animation.DROP,
        icon: { ...pinIcon, scaledSize: new g.maps.Size(36, 44), anchor: new g.maps.Point(18, 44) },
      })
      m.addListener('dragend', () => { const p = m.getPosition(); reverseGeocode(p.lat(), p.lng()) })
      markerRef.current = m
    }
    if (pan) {
      mapRef.current.panTo(pos)
      if (mapRef.current.getZoom() < 15) mapRef.current.setZoom(16)
    }
    setPlaced(true)
    reverseGeocode(lat, lng)
  }, [reverseGeocode])

  useEffect(() => {
    if (mountRef.current || typeof window === 'undefined') return
    if (!apiKey) { setNoKey(true); return }
    mountRef.current = true; let dead = false

    loadGM(apiKey).then(() => {
      if (dead || !mapDivRef.current) return
      const g = (window as any).google
      const map = new g.maps.Map(mapDivRef.current, {
        center: { lat: initialLat ?? 23.2599, lng: initialLng ?? 77.4126 },
        zoom: 13, mapTypeControl: false, fullscreenControl: false, streetViewControl: false,
        zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_BOTTOM },
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
      })
      mapRef.current    = map
      geocoderRef.current = new g.maps.Geocoder()
      map.addListener('click', (e: any) => placeAt(e.latLng.lat(), e.latLng.lng()))

      // Places Autocomplete
      if (searchRef.current) {
        const ac = new g.maps.places.Autocomplete(searchRef.current, {
          componentRestrictions: { country: 'IN' },
          fields: ['geometry', 'formatted_address', 'address_components'],
        })
        ac.addListener('place_changed', () => {
          const pl = ac.getPlace()
          if (!pl.geometry?.location) return
          const lat = pl.geometry.location.lat(), lng = pl.geometry.location.lng()
          // Always pan and zoom
          map.panTo({ lat, lng }); map.setZoom(17)
          // Move or create marker
          if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng })
          } else {
            const svgP = encodeURIComponent(`<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg"><path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.059 27.941 0 18 0z" fill="#E53935"/><circle cx="18" cy="18" r="9" fill="white" opacity=".92"/><circle cx="18" cy="18" r="5" fill="#E53935"/></svg>`)
            const m = new g.maps.Marker({
              position: { lat, lng }, map, draggable: true,
              animation: g.maps.Animation.DROP,
              icon: { url: `data:image/svg+xml;charset=UTF-8,${svgP}`, scaledSize: new g.maps.Size(36, 44), anchor: new g.maps.Point(18, 44) },
            })
            m.addListener('dragend', () => { const p = m.getPosition(); reverseGeocode(p.lat(), p.lng()) })
            markerRef.current = m
          }
          setPlaced(true)
          if (pl.formatted_address) {
            const a = parseGeoResult(pl)
            setAddress(a.fullAddress)
            if (searchRef.current) searchRef.current.value = a.fullAddress
            onSelect(lat, lng)
          } else reverseGeocode(lat, lng)
        })
      }

      if (initialLat && initialLng) placeAt(initialLat, initialLng, false)
    }).catch(() => { if (!dead) setMapError(true) })

    return () => { dead = true; mountRef.current = false }
  }, [apiKey])

  useEffect(() => {
    if (initialLat && initialLng && mapRef.current && !placed) {
      mapRef.current.setCenter({ lat: initialLat, lng: initialLng })
      mapRef.current.setZoom(15)
      placeAt(initialLat, initialLng, false)
    }
  }, [initialLat, initialLng])

  if (noKey || mapError) return (
    <div className="flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-900/20 border-2 border-dashed border-amber-300 rounded-xl p-6 text-center h-64">
      <MapPin size={28} className="text-amber-500 mb-2"/>
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
        {noKey ? 'Google Maps API Key Missing' : 'Map failed to load'}
      </p>
      {noKey && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Add <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to .env</p>}
    </div>
  )

  return (
    <div className="space-y-2">
      {/* Search with Places Autocomplete */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10"/>
        <input ref={searchRef} type="text" placeholder="Search shop address (e.g. Vijay Nagar, Indore)..."
          autoComplete="off" className="input-field pl-9 text-sm"/>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-[var(--border)]" style={{ height: '280px' }}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }}/>

        <button type="button" disabled={locating} onClick={() => {
          if (!navigator.geolocation) return; setLocating(true)
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => { setLocating(false); placeAt(coords.latitude, coords.longitude) },
            () => setLocating(false), { enableHighAccuracy: true }
          )
        }} className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-md px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-60">
          {locating ? <span className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/> : <Crosshair size={12} className="text-primary-500"/>}
          {locating ? 'Locating...' : 'My Location'}
        </button>

        {!placed && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 bg-black/65 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">📍 Click map or search above to set shop location</div>}
      </div>

      {placed && address && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-3 py-2">
          <CheckCircle size={13} className="text-green-500 flex-shrink-0"/>
          <p className="text-xs text-green-700 dark:text-green-300 flex-1 truncate">{address}</p>
          <button type="button" onClick={() => {
            markerRef.current?.setMap(null); markerRef.current = null
            if (searchRef.current) searchRef.current.value = ''
            setPlaced(false); setAddress(''); onDeselect()
          }} className="w-5 h-5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center">
            <X size={11}/>
          </button>
        </div>
      )}
    </div>
  )
}


// ─── Settings Page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { notifSound, setNotifSound } = useAppStore()
  const t = useT()
  const [shopLat, setShopLat] = useState<number | null>(null)
  const [shopLng, setShopLng] = useState<number | null>(null)
  const [slabs, setSlabs]         = useState<Slab[]>([])
  const [defaultCharge, setDefaultCharge] = useState(500)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/admin/home-visit-config'),
      api.get('/admin/shop-location'),
    ]).then(([cfgRes, locRes]) => {
      setSlabs(cfgRes.data.config?.slabs ?? [])
      setDefaultCharge(cfgRes.data.config?.defaultCharge ?? 500)
      if (locRes.data.lat) {
        setShopLat(locRes.data.lat)
        setShopLng(locRes.data.lng)
      }
    }).catch(() => toast.error('Failed to load settings'))
     .finally(() => setLoading(false))
  }, [])

  const addSlab = () => {
    const last = slabs[slabs.length - 1]
    setSlabs([...slabs, {
      minKm:  last ? last.maxKm : 0,
      maxKm:  last ? last.maxKm + 5 : 5,
      charge: 200,
      label:  '',
    }])
  }

  const updateSlab = (i: number, field: keyof Slab, val: string | number) => {
    const next = [...slabs]
    next[i] = { ...next[i], [field]: field === 'label' ? val : Number(val) }
    setSlabs(next)
  }

  const removeSlab = (i: number) => setSlabs(slabs.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!shopLat || !shopLng) { toast.error('Please set your shop location on the map first'); return }
    setSaving(true); setSaved(false)
    try {
      await Promise.all([
        api.put('/admin/home-visit-config', { slabs, defaultCharge }),
        api.put('/admin/shop-location', { lat: shopLat, lng: shopLng }),
      ])
      setSaved(true)
      toast.success('Settings saved!')
      setTimeout(() => setSaved(false), 3000)
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Shop location & home visit charges</p>
      </div>

      {/* ── Shop Location ─────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <MapPin size={17} className="text-primary-500" />
          </div>
          <div>
            <h2 className="font-display font-bold text-[var(--text)]">Shop Location</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Set exact shop coordinates — used to calculate distance to customer's house
            </p>
          </div>
        </div>

        <ShopMap
          initialLat={shopLat}
          initialLng={shopLng}
          onSelect={(lat, lng) => { setShopLat(lat); setShopLng(lng) }}
          onDeselect={() => { setShopLat(null); setShopLng(null) }}
        />

        {shopLat && shopLng ? (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
            <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-green-700 dark:text-green-300">Location set</p>
              <p className="text-xs font-mono text-green-600 dark:text-green-400">
                {shopLat.toFixed(6)}, {shopLng.toFixed(6)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
            <Info size={14} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">Click on the map to set your shop location</p>
          </div>
        )}
      </div>

      {/* ── Home Visit Charge Slabs ───────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <IndianRupee size={16} className="text-blue-500" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[var(--text)]">Home Visit Charges</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Distance-based pricing slabs</p>
            </div>
          </div>
          <button onClick={addSlab} className="btn-secondary py-1.5 px-3 text-xs">
            <Plus size={13} /> Add Slab
          </button>
        </div>

        {/* Slabs table */}
        {slabs.length > 0 && (
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-0 bg-[var(--bg)] px-3 py-2 border-b border-[var(--border)]">
              {['From km', 'To km', '₹ Charge', 'Label', ''].map((h, i) => (
                <div key={i} className={`text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                  i === 0 ? 'col-span-2' : i === 1 ? 'col-span-2' : i === 2 ? 'col-span-2' : i === 3 ? 'col-span-5' : 'col-span-1'
                }`}>{h}</div>
              ))}
            </div>
            {slabs.map((slab, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition-colors">
                <div className="col-span-2">
                  <input type="number" min="0"
                    className="input-field text-xs py-1.5 px-2 text-center"
                    value={slab.minKm}
                    onChange={e => updateSlab(i, 'minKm', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <input type="number" min="0"
                    className="input-field text-xs py-1.5 px-2 text-center"
                    value={slab.maxKm}
                    onChange={e => updateSlab(i, 'maxKm', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <input type="number" min="0"
                    className="input-field text-xs py-1.5 px-2 text-center"
                    value={slab.charge}
                    onChange={e => updateSlab(i, 'charge', e.target.value)} />
                </div>
                <div className="col-span-5">
                  <input
                    className="input-field text-xs py-1.5 px-2"
                    value={slab.label}
                    placeholder={`${slab.minKm}–${slab.maxKm} km`}
                    onChange={e => updateSlab(i, 'label', e.target.value)} />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => removeSlab(i)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {slabs.length === 0 && (
          <div className="text-center py-6 text-[var(--text-muted)] text-sm border-2 border-dashed border-[var(--border)] rounded-xl">
            No slabs yet. Click "Add Slab" to create distance-based pricing.
          </div>
        )}

        {/* Default charge */}
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5 flex-1">
            <Info size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Default charge (beyond all slabs)</span>
          </div>
          <div className="relative w-28">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">₹</span>
            <input type="number" min="0"
              className="input-field text-xs py-2 pl-6 pr-2 text-right"
              value={defaultCharge}
              onChange={e => setDefaultCharge(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* ── Save Button ───────────────────────────────────────────────────── */}
      <button onClick={handleSave} disabled={saving || !shopLat}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'btn-primary'
        } disabled:opacity-50 disabled:cursor-not-allowed`}>
        {saving ? (
          <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
        ) : saved ? (
          <><CheckCircle size={16} /> Saved!</>
        ) : (
          <><Save size={16} /> Save Settings</>
        )}
      </button>

      {!shopLat && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          ⚠️ Set shop location on the map before saving
        </p>
      )}
      {/* ── Notification Sound ─────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={18} className="text-primary-500" />
          <h2 className="font-display font-bold text-[var(--text)] text-lg">Notification Sound</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">Naya booking aane par kaunsa sound bajaye</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { value: 'chime', label: 'Chime 🎵', desc: 'Soft melody' },
            { value: 'bell',  label: 'Bell 🔔',  desc: 'Classic bell' },
            { value: 'ping',  label: 'Ping 🔊',  desc: 'Short ping'  },
            { value: 'none',  label: 'None 🔇',  desc: 'Silent'      },
          ] as const).map(s => (
            <button key={s.value} onClick={() => setNotifSound(s.value)}
              className={`flex flex-col items-start px-4 py-3 rounded-xl border text-sm transition-all ${
                notifSound === s.value
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-primary-300 hover:text-[var(--text)]'
              }`}>
              <span className="font-semibold">{s.label}</span>
              <span className="text-xs opacity-70 mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
