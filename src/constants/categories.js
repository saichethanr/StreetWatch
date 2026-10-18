import {
  Cable,
  CircleDot,
  CircleHelp,
  Construction,
  Droplets,
  Footprints,
  Lightbulb,
  Store,
  Trash2,
  Truck,
  Waves,
} from 'lucide-react'

// Keys must match the public.report_category enum in the database.
export const CATEGORIES = {
  garbage: { label: 'Garbage pile', Icon: Trash2, color: '#16a34a' },
  pothole: { label: 'Pothole', Icon: Construction, color: '#ea580c' },
  footpath: { label: 'Broken footpath', Icon: Footprints, color: '#a16207' },
  streetlight: { label: 'Streetlight out', Icon: Lightbulb, color: '#ca8a04' },
  waterlogging: { label: 'Waterlogging', Icon: Waves, color: '#0284c7' },
  encroachment: { label: 'Encroachment', Icon: Store, color: '#7c3aed' },
  open_manhole: { label: 'Open manhole', Icon: CircleDot, color: '#dc2626' },
  debris_dumping: { label: 'Debris dumping', Icon: Truck, color: '#57534e' },
  pipeline_leak: { label: 'Pipeline leak', Icon: Droplets, color: '#0891b2' },
  hanging_wires: { label: 'Hanging wires', Icon: Cable, color: '#db2777' },
  other: { label: 'Other', Icon: CircleHelp, color: '#475569' },
}
