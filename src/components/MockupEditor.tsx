import { useState, useRef, useEffect, useCallback } from 'react'
import { Mockup, ScreenRegion } from '../types/mockup'
import { compositeMultiMockup } from '../utils/perspectiveWarp'

interface MockupEditorProps {
  mockup: Mockup
  onDownload: (mockup: Mockup) => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

const DEFAULT_REGION: ScreenRegion = [[0.35, 0.1], [0.6, 0.15], [0.55, 0.75], [0.3, 0.7]]
const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'] as const
const CORNER_RADIUS = 8
const MIN_ZOOM = 0.5
const MAX_ZOOM = 5

function getInitialRegions(mockup: Mockup): ScreenRegion[] {
  if (mockup.screenRegions) return mockup.screenRegions
  if (mockup.screenRegion) return [mockup.screenRegion]
  return [DEFAULT_REGION]
}

const MockupEditor: React.FC<MockupEditorProps> = ({ mockup, onDownload }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const initialRegions = getInitialRegions(mockup)
  const screenCount = initialRegions.length

  const [activeScreen, setActiveScreen] = useState(0)
  const [screenImages, setScreenImages] = useState<(string | null)[]>(() => Array(screenCount).fill(null))
  const [mockupImg, setMockupImg] = useState<HTMLImageElement | null>(null)
  const [screenImgs, setScreenImgs] = useState<(HTMLImageElement | null)[]>(() => Array(screenCount).fill(null))
  const [exporting, setExporting] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [cornerRadius, setCornerRadius] = useState(mockup.cornerRadius ?? 0.12)
  const [allCorners, setAllCorners] = useState<ScreenRegion[]>(() => initialRegions)
  const [copiedTooltip, setCopiedTooltip] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<[number, number]>([0, 0])
  const [panning, setPanning] = useState(false)
  const panStart = useRef<[number, number]>([0, 0])
  const panOffset = useRef<[number, number]>([0, 0])

  const corners = allCorners[activeScreen]

  // Load mockup image
  useEffect(() => {
    loadImage(mockup.thumbnail).then(setMockupImg)
  }, [mockup.thumbnail])

  // Reset state when mockup changes
  useEffect(() => {
    const regions = getInitialRegions(mockup)
    const count = regions.length
    setAllCorners(regions)
    setActiveScreen(0)
    setScreenImages(Array(count).fill(null))
    setScreenImgs(Array(count).fill(null))
    setCornerRadius(mockup.cornerRadius ?? 0.12)
    setZoom(1)
    setPan([0, 0])
  }, [mockup.id])

  // Load screen images when user uploads
  useEffect(() => {
    Promise.all(
      screenImages.map(url => url ? loadImage(url) : Promise.resolve(null)),
    ).then(setScreenImgs)
  }, [screenImages])

  // Render composite whenever images or corners change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !mockupImg) return

    const ctx = canvas.getContext('2d')!
    canvas.width = mockupImg.naturalWidth
    canvas.height = mockupImg.naturalHeight

    const hasAny = screenImgs.some(img => img !== null)
    if (hasAny) {
      const result = compositeMultiMockup(mockupImg, screenImgs, allCorners, cornerRadius)
      ctx.drawImage(result, 0, 0)
    } else {
      ctx.drawImage(mockupImg, 0, 0)
    }
  }, [mockupImg, screenImgs, allCorners, cornerRadius])

  // Convert mouse position to normalized coordinates relative to the canvas display
  const mouseToNormalized = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = (clientX - rect.left) / rect.width
      const y = (clientY - rect.top) / rect.height
      return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]
    },
    [],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!calibrating) return
      const pos = mouseToNormalized(e.clientX, e.clientY)
      if (!pos) return

      // Find closest corner on active screen
      let closest = 0
      let minDist = Infinity
      corners.forEach(([cx, cy], i) => {
        const dist = Math.hypot(pos[0] - cx, pos[1] - cy)
        if (dist < minDist) {
          minDist = dist
          closest = i
        }
      })

      if (minDist < 0.08) {
        setDragging(closest)
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      }
    },
    [calibrating, corners, mouseToNormalized],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null) return
      const pos = mouseToNormalized(e.clientX, e.clientY)
      if (!pos) return

      setAllCorners(prev => {
        const next = [...prev]
        const region = [...next[activeScreen]] as unknown as ScreenRegion
        region[dragging] = pos
        next[activeScreen] = region
        return next
      })
    },
    [dragging, activeScreen, mouseToNormalized],
  )

  const handlePointerUp = useCallback(() => {
    setDragging(null)
  }, [])

  // Scroll wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev - e.deltaY * 0.002)))
  }, [])

  // Pan: middle-click drag or right-click drag
  const handlePanDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault()
      setPanning(true)
      panStart.current = [e.clientX, e.clientY]
      panOffset.current = pan
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }, [pan])

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    if (!panning) return
    setPan([
      panOffset.current[0] + (e.clientX - panStart.current[0]),
      panOffset.current[1] + (e.clientY - panStart.current[1]),
    ])
  }, [panning])

  const handlePanUp = useCallback(() => {
    setPanning(false)
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan([0, 0])
  }, [])

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setScreenImages(prev => {
      const next = [...prev]
      next[activeScreen] = url
      return next
    })
  }, [activeScreen])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setScreenImages(prev => {
      const next = [...prev]
      next[activeScreen] = url
      return next
    })
  }, [activeScreen])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      // Load high-res source if available, otherwise fall back to thumbnail
      const sourceImg = mockup.source
        ? await loadImage(mockup.source).catch(() => mockupImg)
        : mockupImg
      if (!sourceImg) return

      const result = compositeMultiMockup(sourceImg, screenImgs, allCorners, cornerRadius)

      result.toBlob(
        blob => {
          if (!blob) return
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${mockup.id}-composite.png`
          link.click()
          URL.revokeObjectURL(url)
          setExporting(false)
        },
        'image/png',
      )
    } catch {
      setExporting(false)
    }
  }, [mockup.id, mockup.source, mockupImg, screenImgs, allCorners, cornerRadius])

  const copyCorners = useCallback(() => {
    if (screenCount > 1) {
      const json = JSON.stringify(
        allCorners.map(region => region.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)])),
      )
      navigator.clipboard.writeText(json)
    } else {
      const json = JSON.stringify(corners.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]))
      navigator.clipboard.writeText(json)
    }
    setCopiedTooltip(true)
    setTimeout(() => setCopiedTooltip(false), 1500)
  }, [corners, allCorners, screenCount])

  const handleClearScreen = useCallback(() => {
    setScreenImages(prev => {
      const next = [...prev]
      next[activeScreen] = null
      return next
    })
  }, [activeScreen])

  const hasAnyScreenImage = screenImages.some(s => s !== null)
  const currentScreenImage = screenImages[activeScreen]

  return (
    <main
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-app-viewport"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Fidelity note */}
      <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-black/60 px-4 py-2.5 text-center backdrop-blur-sm">
        <p className="text-xs text-zinc-300">
          Preview is shown at reduced quality. All exports will download at full resolution (6000 x 4500px).
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          For full control over shadows, lighting, and backgrounds, download the PSD and edit in Photoshop.
        </p>
      </div>

      {/* Zoomable container */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onPointerDown={handlePanDown}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanUp}
        onContextMenu={e => e.preventDefault()}
        style={{ cursor: panning ? 'grabbing' : undefined }}
      >
      <div
        className="relative"
        style={{
          transform: `translate(${pan[0]}px, ${pan[1]}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: panning || dragging !== null ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        <canvas
          ref={canvasRef}
          className="max-h-[75vh] max-w-full object-contain"
        />

        {/* Calibration overlay — draggable corners */}
        {calibrating && (
          <div
            ref={overlayRef}
            className="absolute inset-0"
            style={{ cursor: dragging !== null ? 'grabbing' : 'default' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Show all screen regions — active highlighted, others dimmed */}
            {allCorners.map((region, screenIdx) => (
              <svg key={screenIdx} className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
                <polygon
                  points={region.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill={screenIdx === activeScreen ? 'rgba(0,102,255,0.08)' : 'rgba(255,255,255,0.03)'}
                  stroke={screenIdx === activeScreen ? 'rgba(0,102,255,0.6)' : 'rgba(255,255,255,0.2)'}
                  strokeWidth="0.002"
                />
              </svg>
            ))}

            {/* Corner handles — only for active screen */}
            {corners.map(([x, y], i) => (
              <div
                key={i}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: CORNER_RADIUS * 2 + 8,
                  height: CORNER_RADIUS * 2 + 8,
                  cursor: 'grab',
                }}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0066FF] bg-white shadow-lg">
                  <span className="text-[7px] font-bold text-[#0066FF]">{CORNER_LABELS[i]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute left-6 top-6 flex items-center gap-2">
          <span className="rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={resetView}
            className="rounded-md bg-black/50 px-2.5 py-1 text-xs text-zinc-300 backdrop-blur-sm transition-colors hover:text-white"
          >
            Reset
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/40 to-transparent p-6 pt-20">
        <div>
          <h2 className="text-lg font-semibold text-white">{mockup.name}</h2>
          <p className="mt-0.5 text-sm text-zinc-300">{mockup.description}</p>

          {/* Screen selector for multi-screen mockups */}
          {screenCount > 1 && (
            <div className="mt-2 flex gap-2">
              {Array.from({ length: screenCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveScreen(i)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    i === activeScreen
                      ? 'bg-[#0066FF] text-white'
                      : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                  }`}
                >
                  Screen {i + 1}
                  {screenImages[i] ? ' \u2713' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Corner radius slider */}
          {hasAnyScreenImage && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-zinc-400">Corner Radius</span>
              <input
                type="range"
                min="0"
                max="0.25"
                step="0.005"
                value={cornerRadius}
                onChange={e => setCornerRadius(parseFloat(e.target.value))}
                className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#0066FF] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066FF]"
              />
              <span className="w-8 text-xs tabular-nums text-zinc-500">{Math.round(cornerRadius * 100)}%</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Calibrate toggle */}
          <button
            onClick={() => hasAnyScreenImage && setCalibrating(c => !c)}
            disabled={!hasAnyScreenImage}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              !hasAnyScreenImage
                ? 'border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed'
                : calibrating
                  ? 'border-[#0066FF]/50 bg-[#0066FF]/10 text-[#0066FF]'
                  : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            {calibrating ? 'Done Calibrating' : 'Calibrate Screen'}
          </button>

          {/* Copy corners JSON */}
          <div className="relative">
            <button
              onClick={() => hasAnyScreenImage && copyCorners()}
              disabled={!hasAnyScreenImage}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                !hasAnyScreenImage
                  ? 'border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed'
                  : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy Coords
            </button>
            {copiedTooltip && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-black shadow-lg">
                Copied!
              </div>
            )}
          </div>

          {/* Upload screenshot */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {currentScreenImage
              ? (screenCount > 1 ? `Change Screen ${activeScreen + 1}` : 'Change Screenshot')
              : (screenCount > 1 ? `Add Screen ${activeScreen + 1}` : 'Add Screenshot')
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>

          {/* Clear screenshot */}
          {currentScreenImage && (
            <button
              onClick={handleClearScreen}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}

          {/* Export composite */}
          {hasAnyScreenImage && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-[#0066FF] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0055DD] disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Exporting...' : 'Export PNG'}
            </button>
          )}

          {/* Download PSD */}
          <button
            onClick={() => onDownload(mockup)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PSD
          </button>
        </div>
      </div>

      {/* Drop zone overlay when no screenshot for active screen */}
      {!currentScreenImage && !calibrating && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border-2 border-dashed border-white/10 bg-black/20 px-10 py-8 text-center backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-zinc-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-zinc-400">
              {screenCount > 1
                ? `Drop a screenshot for Screen ${activeScreen + 1} or use the button below`
                : 'Drop a screenshot here or use the button below'
              }
            </p>
            <p className="mt-1 text-xs text-zinc-600">Your screen will be placed into the device mockup</p>
          </div>
        </div>
      )}
    </main>
  )
}

export default MockupEditor
