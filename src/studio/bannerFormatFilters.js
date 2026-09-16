import { bannerFormats } from '../../shared/bannerFormats.js'

// Quick-selection groups for existing placement presets, not platform validation.
const categories = ratio => bannerFormats.find(format => format.id === ratio.id)?.categories ?? []
export const channelFilters = [
  { id: 'meta', label: 'Meta', matches: ratio => categories(ratio).includes('social') },
  { id: 'google', label: 'Google', matches: ratio => categories(ratio).includes('google-ads') },
  { id: 'tiktok', label: 'TikTok', matches: ratio => ratio.id === 'story' },
]
export const mediaFilters = [
  { id: 'static', label: 'Static', matches: () => true },
  { id: 'video', label: 'Video', matches: ratio => categories(ratio).includes('video') },
]
