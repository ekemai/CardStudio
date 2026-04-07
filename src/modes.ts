export type DeviceMode = 'card' | 'phone'

export const DEVICE_MODES: { key: DeviceMode; label: string }[] = [
  { key: 'card', label: 'Card' },
  { key: 'phone', label: 'Phone' },
]

export interface MockupConfig {
  id: string
  name: string
  src: string
  imgWidth: number
  imgHeight: number
  // Screen quad corners as proportions of image size: [TL, TR, BR, BL]
  screenQuad: [Point2D, Point2D, Point2D, Point2D]
}

export interface Point2D {
  x: number
  y: number
}

export const MOCKUPS: MockupConfig[] = [
  {
    id: 'angled',
    name: 'Angled',
    src: '/mockups/device1.png',
    imgWidth: 866,
    imgHeight: 1196,
    screenQuad: [
      { x: 0.121, y: 0.054 }, // TL
      { x: 0.831, y: 0.021 }, // TR
      { x: 0.901, y: 0.878 }, // BR
      { x: 0.121, y: 0.920 }, // BL
    ],
  },
  {
    id: 'flat',
    name: 'Flat',
    src: '/mockups/device2.png',
    imgWidth: 1158,
    imgHeight: 1346,
    screenQuad: [
      { x: 0.108, y: 0.053 }, // TL
      { x: 0.838, y: 0.013 }, // TR
      { x: 0.922, y: 0.854 }, // BR
      { x: 0.108, y: 0.899 }, // BL
    ],
  },
]
