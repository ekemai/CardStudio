import { useCallback, useEffect, useRef, useState } from 'react'
import { MockupConfig, Point2D } from '../modes'
import { BackgroundSettings } from '../background'

interface PhoneViewportProps {
  mockup: MockupConfig
  screenshotImage: string | null
  background: BackgroundSettings
  grain: number
  glassReflection: boolean
  screenGlow: boolean
}

// ── Load an image from a URL or data URL ─────────────────────────────

function useImage(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) { setImg(null); return }
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => setImg(el)
    el.src = src
    return () => { el.onload = null }
  }, [src])
  return img
}

// ── Create a "frame-only" version of the phone PNG ───────────────────
// Makes the screen area transparent so the screenshot shows through.

function useFrameImage(phoneImg: HTMLImageElement | null, mockup: MockupConfig): HTMLCanvasElement | null {
  const [frame, setFrame] = useState<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!phoneImg) { setFrame(null); return }

    const c = document.createElement('canvas')
    c.width = phoneImg.naturalWidth
    c.height = phoneImg.naturalHeight
    const ctx = c.getContext('2d')!

    // Draw phone
    ctx.drawImage(phoneImg, 0, 0)

    // Cut out screen area
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    const q = mockup.screenQuad.map(p => ({
      x: p.x * c.width,
      y: p.y * c.height,
    }))
    ctx.moveTo(q[0].x, q[0].y)
    ctx.lineTo(q[1].x, q[1].y)
    ctx.lineTo(q[2].x, q[2].y)
    ctx.lineTo(q[3].x, q[3].y)
    ctx.closePath()
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    setFrame(c)
  }, [phoneImg, mockup])

  return frame
}

// ── Perspective-correct quad drawing via two-triangle split ──────────

function drawImageInQuad(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  quad: Point2D[], // absolute pixel coords: TL, TR, BR, BL
) {
  const sw = img.naturalWidth
  const sh = img.naturalHeight

  // Source corners: TL(0,0), TR(sw,0), BR(sw,sh), BL(0,sh)
  // Triangle 1: TL→TR→BL  maps src (0,0)→(sw,0)→(0,sh)
  drawTriangle(ctx, img,
    0, 0, sw, 0, 0, sh,
    quad[0].x, quad[0].y, quad[1].x, quad[1].y, quad[3].x, quad[3].y,
  )
  // Triangle 2: TR→BR→BL  maps src (sw,0)→(sw,sh)→(0,sh)
  drawTriangle(ctx, img,
    sw, 0, sw, sh, 0, sh,
    quad[1].x, quad[1].y, quad[2].x, quad[2].y, quad[3].x, quad[3].y,
  )
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  // Source triangle
  sx0: number, sy0: number,
  sx1: number, sy1: number,
  sx2: number, sy2: number,
  // Destination triangle
  dx0: number, dy0: number,
  dx1: number, dy1: number,
  dx2: number, dy2: number,
) {
  ctx.save()

  // Clip to destination triangle
  ctx.beginPath()
  ctx.moveTo(dx0, dy0)
  ctx.lineTo(dx1, dy1)
  ctx.lineTo(dx2, dy2)
  ctx.closePath()
  ctx.clip()

  // Compute affine transform: src→dst
  // [sx0 sy0 1] [a c e]   [dx0 dy0]
  // [sx1 sy1 1] [b d f] = [dx1 dy1]
  // [sx2 sy2 1]            [dx2 dy2]
  const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1)
  if (Math.abs(denom) < 1e-10) { ctx.restore(); return }

  const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom
  const b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom
  const c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom
  const d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom
  const e = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / denom
  const f = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / denom

  ctx.setTransform(a, b, c, d, e, f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

// ── Draw background ──────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: BackgroundSettings,
) {
  if (bg.mode === 'transparent') {
    ctx.clearRect(0, 0, w, h)
    return
  }

  if (bg.mode === 'solid') {
    ctx.fillStyle = bg.solidColor
    ctx.fillRect(0, 0, w, h)
    return
  }

  // Gradient
  const rad = (bg.gradientAngle * Math.PI) / 180
  const cx = w / 2
  const cy = h / 2
  const len = Math.max(w, h) * 0.7
  const x0 = cx - Math.cos(rad) * len
  const y0 = cy - Math.sin(rad) * len
  const x1 = cx + Math.cos(rad) * len
  const y1 = cy + Math.sin(rad) * len
  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  const mid = bg.gradientMidpoint / 100
  grad.addColorStop(0, bg.gradientStart)
  grad.addColorStop(mid, bg.gradientStart)
  grad.addColorStop(mid + (1 - mid) * 0.4, bg.gradientEnd)
  grad.addColorStop(1, bg.gradientEnd)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

// ── Glass reflection overlay ─────────────────────────────────────────

function drawGlassReflection(
  ctx: CanvasRenderingContext2D,
  quad: Point2D[],
) {
  ctx.save()

  // Clip to screen quad
  ctx.beginPath()
  ctx.moveTo(quad[0].x, quad[0].y)
  ctx.lineTo(quad[1].x, quad[1].y)
  ctx.lineTo(quad[2].x, quad[2].y)
  ctx.lineTo(quad[3].x, quad[3].y)
  ctx.closePath()
  ctx.clip()

  // Diagonal gradient from top-left to center
  const grad = ctx.createLinearGradient(
    quad[0].x, quad[0].y,
    (quad[2].x + quad[3].x) / 2,
    (quad[2].y + quad[3].y) / 2,
  )
  grad.addColorStop(0, 'rgba(255,255,255,0.12)')
  grad.addColorStop(0.3, 'rgba(255,255,255,0.04)')
  grad.addColorStop(0.6, 'rgba(255,255,255,0)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.restore()
}

// ── Screen glow ──────────────────────────────────────────────────────

function drawScreenGlow(
  ctx: CanvasRenderingContext2D,
  quad: Point2D[],
) {
  ctx.save()

  // Compute bounding center and size
  const cx = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4
  const cy = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4
  const rx = Math.max(
    Math.abs(quad[1].x - quad[0].x),
    Math.abs(quad[2].x - quad[3].x),
  ) / 2 * 1.15
  const ry = Math.max(
    Math.abs(quad[3].y - quad[0].y),
    Math.abs(quad[2].y - quad[1].y),
  ) / 2 * 1.15

  // Draw soft glow behind screen
  ctx.globalCompositeOperation = 'screen'
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry))
  grad.addColorStop(0, 'rgba(100,130,255,0.06)')
  grad.addColorStop(0.7, 'rgba(100,130,255,0.02)')
  grad.addColorStop(1, 'rgba(100,130,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.restore()
}

// ── Grain overlay ────────────────────────────────────────────────────

function drawGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
) {
  if (intensity <= 0) return

  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  const amount = intensity * 50

  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount
    d[i] = Math.max(0, Math.min(255, d[i] + noise))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise))
  }
  ctx.putImageData(imageData, 0, 0)
}

// ── Main render function ─────────────────────────────────────────────

function renderPhone(
  ctx: CanvasRenderingContext2D,
  mockup: MockupConfig,
  frameImage: HTMLCanvasElement,
  screenshotImg: HTMLImageElement | null,
  background: BackgroundSettings,
  grain: number,
  glassReflection: boolean,
  screenGlow: boolean,
  scale: number,
) {
  const w = mockup.imgWidth * scale
  const h = mockup.imgHeight * scale

  ctx.canvas.width = w
  ctx.canvas.height = h

  // Absolute screen quad coords
  const quad = mockup.screenQuad.map(p => ({
    x: p.x * w,
    y: p.y * h,
  }))

  // 1. Background
  drawBackground(ctx, w, h, background)

  // 2. Screen glow (behind screenshot)
  if (screenGlow) {
    drawScreenGlow(ctx, quad)
  }

  // 3. Screenshot in screen quad
  if (screenshotImg) {
    drawImageInQuad(ctx, screenshotImg, quad)
  } else {
    // Dark placeholder
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(quad[0].x, quad[0].y)
    ctx.lineTo(quad[1].x, quad[1].y)
    ctx.lineTo(quad[2].x, quad[2].y)
    ctx.lineTo(quad[3].x, quad[3].y)
    ctx.closePath()
    ctx.clip()
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(0.5, '#0f0f1a')
    grad.addColorStop(1, '#0a0a14')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  // 4. Phone frame overlay (screen area is transparent)
  ctx.drawImage(frameImage, 0, 0, w, h)

  // 5. Glass reflection
  if (glassReflection) {
    drawGlassReflection(ctx, quad)
  }

  // 6. Grain (applied last)
  drawGrain(ctx, w, h, grain)
}

// ── Component ────────────────────────────────────────────────────────

const PhoneViewport: React.FC<PhoneViewportProps> = ({
  mockup,
  screenshotImage,
  background,
  grain,
  glassReflection,
  screenGlow,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phoneImg = useImage(mockup.src)
  const frameImage = useFrameImage(phoneImg, mockup)
  const screenshotImg = useImage(screenshotImage)
  const rafRef = useRef(0)

  const isTransparent = background.mode === 'transparent'

  // Render loop (animates grain)
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !frameImage) return

    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    renderPhone(
      ctx, mockup, frameImage,
      screenshotImg, background,
      grain, glassReflection, screenGlow,
      dpr,
    )

    // Animate grain
    if (grain > 0) {
      rafRef.current = requestAnimationFrame(render)
    }
  }, [mockup, frameImage, screenshotImg, background, grain, glassReflection, screenGlow])

  useEffect(() => {
    render()
    return () => { cancelAnimationFrame(rafRef.current) }
  }, [render])

  // Export function stored on canvas for RightPanel to access
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    ;(canvas as HTMLCanvasElement & { __exportPhone: (scale: number) => void }).__exportPhone = (scale: number) => {
      if (!frameImage) return
      const offscreen = document.createElement('canvas')
      const ctx = offscreen.getContext('2d')!
      renderPhone(ctx, mockup, frameImage, screenshotImg, background, grain, glassReflection, screenGlow, scale)
      const link = document.createElement('a')
      link.download = `cardshot-phone-${mockup.id}-${scale}x.png`
      link.href = offscreen.toDataURL('image/png')
      link.click()
    }
  }, [mockup, frameImage, screenshotImg, background, grain, glassReflection, screenGlow])

  return (
    <main
      className="relative flex-1 flex items-center justify-center bg-app-viewport overflow-hidden"
      style={isTransparent ? {
        backgroundImage: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)',
        backgroundSize: '20px 20px',
      } : undefined}
    >
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full object-contain"
        style={{
          width: mockup.imgWidth,
          height: mockup.imgHeight,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      />

      {!frameImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium tracking-wide text-white/40">Loading mockup…</span>
        </div>
      )}
    </main>
  )
}

export default PhoneViewport
