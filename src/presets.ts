const deg = (d: number) => (d * Math.PI) / 180

export interface ShotPreset {
  name: string
  desc: string
  rotation: [number, number, number]
  position: [number, number, number]
  stacked?: boolean
}

export const PRESETS: Record<string, ShotPreset> = {
  hero: {
    name: 'Hero',
    desc: 'Classic product shot',
    rotation: [deg(18), deg(-8), deg(2)],
    position: [0, 0, 0],
  },
  float: {
    name: 'Float',
    desc: 'Elevated with shadow',
    rotation: [deg(22), deg(12), deg(-3)],
    position: [0, 0.15, 0],
  },
  portrait: {
    name: 'Portrait',
    desc: 'Dramatic angle',
    rotation: [deg(65), deg(5), deg(-2)],
    position: [0, 0, 0],
  },
  drama: {
    name: 'Drama',
    desc: 'Low angle, looking up',
    rotation: [deg(-25), deg(15), deg(8)],
    position: [0, -0.1, 0],
  },
  overhead: {
    name: 'Overhead',
    desc: 'Top-down flat',
    rotation: [deg(85), 0, deg(3)],
    position: [0, 0, 0],
  },
  stack: {
    name: 'Stack',
    desc: 'Layered cards',
    rotation: [deg(18), deg(-10), deg(2)],
    position: [0.05, 0.03, 0],
    stacked: true,
  },
}

export const PRESET_KEYS = Object.keys(PRESETS)
export const DEFAULT_PRESET = 'hero'
