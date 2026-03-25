export interface MaterialSettings {
  metalness: number
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  iridescence: number
  iridescenceIOR: number
  reflectivity: number
}

export const DEFAULT_MATERIAL: MaterialSettings = {
  metalness: 0.1,
  roughness: 0.35,
  clearcoat: 0.8,
  clearcoatRoughness: 0.1,
  iridescence: 0,
  iridescenceIOR: 1.5,
  reflectivity: 0.5,
}

export interface MaterialPreset {
  name: string
  values: Partial<MaterialSettings>
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    name: 'Matte',
    values: { roughness: 0.8, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.1, iridescence: 0, iridescenceIOR: 1.5, reflectivity: 0.5 },
  },
  {
    name: 'Glossy',
    values: { roughness: 0.15, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.05, iridescence: 0, iridescenceIOR: 1.5, reflectivity: 0.5 },
  },
  {
    name: 'Metallic',
    values: { roughness: 0.25, metalness: 0.9, clearcoat: 0.5, clearcoatRoughness: 0.1, iridescence: 0, iridescenceIOR: 1.5, reflectivity: 0.8 },
  },
  {
    name: 'Holo',
    values: { roughness: 0.2, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1, iridescence: 1.0, iridescenceIOR: 1.5, reflectivity: 0.5 },
  },
  {
    name: 'Frosted',
    values: { roughness: 0.6, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, iridescence: 0, iridescenceIOR: 1.5, reflectivity: 0.3 },
  },
]
