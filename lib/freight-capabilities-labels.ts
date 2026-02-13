/** Labels for freight location capability values (aligned with backend option values). */

const LOADING_EQUIPMENT: Record<string, string> = {
  forklift: 'Forklift',
  pallet_jack: 'Pallet jack',
  dock_plate: 'Dock plate',
  loading_ramp: 'Loading ramp',
  dock_leveler: 'Dock leveler',
  crane: 'Crane',
  conveyor: 'Conveyor',
  manual_loading: 'Manual loading',
  other: 'Other',
}

const REQUIRED_TRUCK_EQUIPMENT: Record<string, string> = {
  lift_gate: 'Lift gate',
  pallet_jack: 'Pallet jack',
  straps: 'Straps / tie-downs',
  load_bars: 'Load bars',
  blankets: 'Blankets',
  wheel_chocks: 'Wheel chocks',
  other: 'Other',
}

const LOADING_DOCK_STYLE: Record<string, string> = {
  platform_dock_height: 'Platform (dock height)',
  box_truck_accessible: 'Box truck accessible',
  truck_trailer_accessible: 'Truck trailer accessible (full semi)',
  flatbed_only: 'Flatbed only',
  no_dock_curbside_only: 'No dock (curbside only)',
  other: 'Other',
}

export function formatEquipmentList(values: string[] | undefined, labels: Record<string, string>): string {
  if (!Array.isArray(values) || values.length === 0) return ''
  return values.map((v) => labels[v] || v).join(', ')
}

export function formatLoadingEquipment(values: string[] | undefined): string {
  return formatEquipmentList(values, LOADING_EQUIPMENT)
}

export function formatRequiredTruckEquipment(values: string[] | undefined): string {
  return formatEquipmentList(values, REQUIRED_TRUCK_EQUIPMENT)
}

export function formatLoadingDockStyle(value: string | undefined): string {
  return (value && LOADING_DOCK_STYLE[value]) || value || ''
}

/** Format dock style(s) for display. Accepts array or legacy single string. */
export function formatLoadingDockStyles(values: string | string[] | undefined): string {
  if (Array.isArray(values) && values.length > 0) return values.map((v) => LOADING_DOCK_STYLE[v] || v).join(', ')
  if (typeof values === 'string' && values.trim()) return LOADING_DOCK_STYLE[values] || values
  return ''
}

export interface CapabilitiesSummary {
  canReceiveTruckTrailers?: boolean
  maxTrailerLengthFt?: number
  loadingEquipment?: string[]
  unloadingEquipment?: string[]
  /** Call-ahead notice in hours (number only). */
  callAheadHours?: number
  requiredEquipmentInTruck?: string[]
  loadingDockStyles?: string[]
  /** @deprecated use loadingDockStyles */
  loadingDockStyle?: string
}

export function hasAnyCapability(caps: CapabilitiesSummary | undefined): boolean {
  if (!caps || typeof caps !== 'object') return false
  return (
    caps.canReceiveTruckTrailers !== undefined ||
    (caps.maxTrailerLengthFt != null && caps.maxTrailerLengthFt > 0) ||
    (Array.isArray(caps.loadingEquipment) && caps.loadingEquipment.length > 0) ||
    (Array.isArray(caps.unloadingEquipment) && caps.unloadingEquipment.length > 0) ||
    (typeof caps.callAheadHours === 'number' && Number.isFinite(caps.callAheadHours) && caps.callAheadHours >= 0) ||
    (typeof (caps as any).callAheadTimeWindow === 'string' && (caps as any).callAheadTimeWindow.trim().length > 0) ||
    (Array.isArray(caps.requiredEquipmentInTruck) && caps.requiredEquipmentInTruck.length > 0) ||
    (Array.isArray(caps.loadingDockStyles) && caps.loadingDockStyles.length > 0) ||
    (typeof caps.loadingDockStyle === 'string' && caps.loadingDockStyle.trim().length > 0)
  )
}

export function formatCallAheadHours(hours: number | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return ''
  return hours === 1 ? '1 hour' : `${hours} hours`
}
