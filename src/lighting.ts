export interface LightConfig {
  intensity: number
  color: string
  angle: number
  height: number
}

export interface LightingSettings {
  key: LightConfig
  fill: LightConfig
  rim: LightConfig
  ambientIntensity: number
  envMap: boolean
}

export const DEFAULT_LIGHTING: LightingSettings = {
  key: { intensity: 2.5, color: '#fff5e6', angle: 45, height: 4 },
  fill: { intensity: 1.0, color: '#e6f0ff', angle: 200, height: 2 },
  rim: { intensity: 1.5, color: '#ffffff', angle: 180, height: 3 },
  ambientIntensity: 0.3,
  envMap: false,
}
