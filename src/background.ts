export type BgMode = 'solid' | 'gradient' | 'transparent'

export interface BackgroundSettings {
  mode: BgMode
  solidColor: string
  gradientStart: string
  gradientEnd: string
  gradientAngle: number
  gradientMidpoint: number // 0-100, where the transition point sits
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  mode: 'solid',
  solidColor: '#111118',
  gradientStart: '#1a1a2e',
  gradientEnd: '#16213e',
  gradientAngle: 180,
  gradientMidpoint: 50,
}
