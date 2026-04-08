/** Normalized [x, y] coordinates (0–1) for the four corners of the phone screen */
export type ScreenCorner = [number, number]

/** Four corners in order: top-left, top-right, bottom-right, bottom-left */
export type ScreenRegion = [ScreenCorner, ScreenCorner, ScreenCorner, ScreenCorner]

export interface Mockup {
  id: string
  name: string
  description: string
  screens: number
  tags: string[]
  thumbnail: string
  psd: string
  fileSize: string
  featured: boolean
  screenRegion?: ScreenRegion
  screenRegions?: ScreenRegion[]
  cornerRadius?: number
  source?: string
}

export interface MockupsData {
  mockups: Mockup[]
}

export type AppMode = 'card' | 'mockups'

export const DEVICE_TAGS = ['iPhone', 'Android'] as const
export const STYLE_TAGS = ['Minimal', 'Artistic'] as const
export const LAYOUT_TAGS = ['Single', 'Double', 'With Hand'] as const
export const ALL_FILTER_TAGS = [...DEVICE_TAGS, ...STYLE_TAGS, ...LAYOUT_TAGS] as const
export type FilterTag = (typeof ALL_FILTER_TAGS)[number]

export type SortOption = 'featured' | 'az' | 'newest'
