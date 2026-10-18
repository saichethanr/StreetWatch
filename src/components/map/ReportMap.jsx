import L from 'leaflet'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { CATEGORIES } from '../../constants/categories'

// Initial view: India. Replace with the launch city or the user's location.
const DEFAULT_CENTER = [22.5, 79]
const DEFAULT_ZOOM = 5

// Leaflet markers take an HTML string. Render with the client renderer the app
// already ships instead of react-dom/server, which would add ~500 KB.
function toHtml(element) {
  const container = document.createElement('div')
  const root = createRoot(container)
  flushSync(() => root.render(element))
  const html = container.innerHTML
  root.unmount()
  return html
}

// One Leaflet icon per category, built once: a coloured pin with the Lucide icon.
const markerIcons = Object.fromEntries(
  Object.entries(CATEGORIES).map(([key, { Icon, color }]) => [
    key,
    L.divIcon({
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      html: toHtml(
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-md"
          style={{ backgroundColor: color }}
        >
          <Icon size={18} strokeWidth={2.25} />
        </div>,
      ),
    }),
  ]),
)

export default function ReportMap({ reports, selectedId, onSelect }) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} zoomControl={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={markerIcons[report.category]}
          zIndexOffset={report.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(report.id) }}
        />
      ))}
    </MapContainer>
  )
}
