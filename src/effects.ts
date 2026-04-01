export interface EffectsSettings {
  dropShadow: boolean
  float: boolean
  shimmer: boolean
  edgeHighlight: boolean
  grain: number
}

export const DEFAULT_EFFECTS: EffectsSettings = {
  dropShadow: true,
  float: true,
  shimmer: true,
  edgeHighlight: true,
  grain: 0.15,
}
