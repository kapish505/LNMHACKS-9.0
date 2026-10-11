/**
 * Lightweight device-tier detection.
 * Returns 'low' if the device is likely constrained, 'high' otherwise.
 * Safe to call on server (returns 'high' as default).
 */
export type DeviceTier = 'low' | 'high'

export function getDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'high'

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { effectiveType?: string; saveData?: boolean }
  }

  // Less than 4 logical CPU cores → low-end
  if (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency < 4) return 'low'

  // Less than 4 GB RAM (deviceMemory is in GB, not available on Firefox/Safari but fine)
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return 'low'

  // User has requested reduced data / battery saving
  if (nav.connection?.saveData) return 'low'

  // Very slow network
  const et = nav.connection?.effectiveType
  if (et === '2g' || et === 'slow-2g') return 'low'

  return 'high'
}

/** Max device pixel ratio to use for WebGL canvases based on device tier */
export function maxDPR(tier: DeviceTier): number {
  return tier === 'low' ? 1 : 1.5
}

/** Target frame interval in ms */
export function frameInterval(tier: DeviceTier): number {
  return tier === 'low' ? 1000 / 30 : 0 // 30fps vs uncapped
}
