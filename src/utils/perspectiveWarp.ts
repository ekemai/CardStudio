import { ScreenRegion } from '../types/mockup'

/**
 * Draws a source image warped into a target quadrilateral on a canvas context.
 * Uses triangle-subdivision for a smooth perspective approximation.
 *
 * @param ctx       - destination canvas 2D context
 * @param img       - source image (screenshot)
 * @param region    - 4 corner points [tl, tr, br, bl] in pixel coordinates
 * @param divisions - grid subdivisions (higher = smoother warp, default 12)
 */
export function drawPerspectiveWarp(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  region: ScreenRegion,
  imgWidth: number,
  imgHeight: number,
  divisions = 20,
) {
  const [tl, tr, br, bl] = region

  for (let row = 0; row < divisions; row++) {
    for (let col = 0; col < divisions; col++) {
      const u0 = col / divisions
      const v0 = row / divisions
      const u1 = (col + 1) / divisions
      const v1 = (row + 1) / divisions

      // Bilinear interpolation to find destination points
      const p00 = bilinear(tl, tr, br, bl, u0, v0)
      const p10 = bilinear(tl, tr, br, bl, u1, v0)
      const p01 = bilinear(tl, tr, br, bl, u0, v1)
      const p11 = bilinear(tl, tr, br, bl, u1, v1)

      // Source rectangle in image coordinates
      const sx0 = u0 * imgWidth
      const sy0 = v0 * imgHeight
      const sx1 = u1 * imgWidth
      const sy1 = v1 * imgHeight

      // Draw two triangles per cell
      drawTriangle(ctx, img, sx0, sy0, sx1, sy0, sx0, sy1, p00, p10, p01)
      drawTriangle(ctx, img, sx1, sy0, sx1, sy1, sx0, sy1, p10, p11, p01)
    }
  }
}

/** Bilinear interpolation across a quad */
function bilinear(
  tl: [number, number],
  tr: [number, number],
  br: [number, number],
  bl: [number, number],
  u: number,
  v: number,
): [number, number] {
  const top: [number, number] = [
    tl[0] + (tr[0] - tl[0]) * u,
    tl[1] + (tr[1] - tl[1]) * u,
  ]
  const bot: [number, number] = [
    bl[0] + (br[0] - bl[0]) * u,
    bl[1] + (br[1] - bl[1]) * u,
  ]
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v]
}

/** Draw a textured triangle using affine transform */
function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  // Source triangle (image coords)
  sx0: number, sy0: number,
  sx1: number, sy1: number,
  sx2: number, sy2: number,
  // Destination triangle (canvas coords)
  d0: [number, number],
  d1: [number, number],
  d2: [number, number],
) {
  ctx.save()

  // Clip to destination triangle
  ctx.beginPath()
  ctx.moveTo(d0[0], d0[1])
  ctx.lineTo(d1[0], d1[1])
  ctx.lineTo(d2[0], d2[1])
  ctx.closePath()
  ctx.clip()

  // Compute affine transform from source triangle to destination triangle
  // We need: [a b tx; c d ty] such that:
  //   [d0] = M * [sx0, sy0, 1]
  //   [d1] = M * [sx1, sy1, 1]
  //   [d2] = M * [sx2, sy2, 1]
  const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1)
  if (Math.abs(denom) < 1e-10) {
    ctx.restore()
    return
  }

  const a =
    (d0[0] * (sy1 - sy2) + d1[0] * (sy2 - sy0) + d2[0] * (sy0 - sy1)) / denom
  const b =
    (d0[0] * (sx2 - sx1) + d1[0] * (sx0 - sx2) + d2[0] * (sx1 - sx0)) / denom
  const tx =
    (d0[0] * (sx1 * sy2 - sx2 * sy1) +
      d1[0] * (sx2 * sy0 - sx0 * sy2) +
      d2[0] * (sx0 * sy1 - sx1 * sy0)) /
    denom

  const c =
    (d0[1] * (sy1 - sy2) + d1[1] * (sy2 - sy0) + d2[1] * (sy0 - sy1)) / denom
  const d =
    (d0[1] * (sx2 - sx1) + d1[1] * (sx0 - sx2) + d2[1] * (sx1 - sx0)) / denom
  const ty =
    (d0[1] * (sx1 * sy2 - sx2 * sy1) +
      d1[1] * (sx2 * sy0 - sx0 * sy2) +
      d2[1] * (sx0 * sy1 - sx1 * sy0)) /
    denom

  ctx.setTransform(a, c, b, d, tx, ty)
  ctx.drawImage(img, 0, 0)

  ctx.restore()
}

/**
 * Create a rounded-corner version of the source image on an offscreen canvas.
 * The radius is relative to the shorter dimension of the image.
 */
function roundImage(
  img: HTMLImageElement,
  radiusFraction = 0.06,
): HTMLCanvasElement {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const r = Math.min(w, h) * radiusFraction

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!

  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(w - r, 0)
  ctx.quadraticCurveTo(w, 0, w, r)
  ctx.lineTo(w, h - r)
  ctx.quadraticCurveTo(w, h, w - r, h)
  ctx.lineTo(r, h)
  ctx.quadraticCurveTo(0, h, 0, h - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.clip()

  ctx.drawImage(img, 0, 0)
  return c
}

/**
 * Composite a screenshot onto a mockup image.
 * Returns a canvas with the final result.
 */
export function compositeMockup(
  mockupImg: HTMLImageElement,
  screenImg: HTMLImageElement,
  screenRegion: ScreenRegion,
  cornerRadius = 0.12,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = mockupImg.naturalWidth
  canvas.height = mockupImg.naturalHeight
  const ctx = canvas.getContext('2d')!

  // Draw the mockup background
  ctx.drawImage(mockupImg, 0, 0)

  // Round the screenshot corners before warping
  const rounded = roundImage(screenImg, cornerRadius)

  // Convert normalized screen region to pixel coordinates
  const pixelRegion: ScreenRegion = screenRegion.map(([x, y]) => [
    x * canvas.width,
    y * canvas.height,
  ]) as ScreenRegion

  // Warp the rounded screenshot into the screen area
  drawPerspectiveWarp(
    ctx,
    rounded,
    pixelRegion,
    rounded.width,
    rounded.height,
  )

  return canvas
}
