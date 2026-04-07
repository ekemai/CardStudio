import { useState, useRef, useEffect, useCallback } from 'react'
import { Mockup, ScreenRegion } from '../types/mockup'
import { compositeMockup } from '../utils/perspectiveWarp'

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

const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'] as const
const CORNER_RADIUS = 8
const MIN_ZOOM = 0.5
const MAX_ZOOM = 5

const MockupEditor: React.FC<MockupEditorProps> = ({ mockup, onDownload }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [screenImage, setScreenImage] = useState<string | null>(null)
  const [mockupImg, setMockupImg] = useState<HTMLImageElement | null>(null)
  const [screenImg, setScreenImg] = useState<HTMLImageElement | null>(null)
  const [exporting, setExporting] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [corners, setCorners] = useState<ScreenRegion>(
    mockup.screenRegion || [[0.35, 0.1], [0.6, 0.15], [0.55, 0.75], [0.3, 0.7]],
  )
  const [dragging, setDragging] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<[number, number]>([0, 0])
  const [panning, setPanning] = useState(false)
  const panStart = useRef<[number, number]>([0, 0])
  const panOffset = useRef<[number, number]>([0, 0])

  // Load mockup image
  useEffect(() => {
    loadImage(mockup.thumbnail).then(setMockupImg)
  }, [mockup.thumbnail])

  // Reset corners and zoom when mockup changes
  useEffect(() => {
    setCorners(mockup.screenRegion || [[0.35, 0.1], [0.6, 0.15], [0.55, 0.75], [0.3, 0.7]])
    setZoom(1)
    setPan([0, 0])
  }, [mockup.id])

  // Load screen image when user uploads one
  useEffect(() => {
    if (!screenImage) {
      setScreenImg(null)
      return
    }
    loadImage(screenImage).then(setScreenImg)
  }, [screenImage])

  // Render composite whenever images or corners change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !mockupImg) return

    const ctx = canvas.getContext('2d')!
    canvas.width = mockupImg.naturalWidth
    canvas.height = mockupImg.naturalHeight

    if (screenImg) {
      const result = compositeMockup(mockupImg, screenImg, corners)
      ctx.drawImage(result, 0, 0)
    } else {
      ctx.drawImage(mockupImg, 0, 0)
    }
  }, [mockupImg, screenImg, corners])

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

      // Find closest corner
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

      setCorners(prev => {
        const next = [...prev] as unknown as ScreenRegion
        next[dragging] = pos
        return next
      })
    },
    [dragging, mouseToNormalized],
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
    setScreenImage(url)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setScreenImage(url)
  }, [])

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setExporting(true)

    canvas.toBlob(
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
  }, [mockup.id])

  const copyCorners = useCallback(() => {
    const json = JSON.stringify(corners.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]))
    navigator.clipboard.writeText(json)
  }, [corners])

  return (
    <main
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-app-viewport"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Fidelity note */}
      <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-black/60 px-4 py-2.5 text-center backdrop-blur-sm">
        <p className="text-xs text-zinc-300">
          For higher accuracy and control over shadows, lighting, and background colours, download the PSD file and make changes in Photoshop.
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
            {/* Lines connecting corners */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
              <polygon
                points={corners.map(([x, y]) => `${x},${y}`).join(' ')}
                fill="rgba(0,102,255,0.08)"
                stroke="rgba(0,102,255,0.6)"
                strokeWidth="0.002"
              />
            </svg>

            {/* Corner handles */}
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
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Calibrate toggle */}
          <button
            onClick={() => setCalibrating(c => !c)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              calibrating
                ? 'border-[#0066FF]/50 bg-[#0066FF]/10 text-[#0066FF]'
                : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            {calibrating ? 'Done Calibrating' : 'Calibrate Screen'}
          </button>

          {/* Copy corners JSON (only in calibration mode) */}
          {calibrating && (
            <button
              onClick={copyCorners}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy Coords
            </button>
          )}

          {/* Upload screenshot */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {screenImage ? 'Change Screenshot' : 'Add Screenshot'}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>

          {/* Clear screenshot */}
          {screenImage && (
            <button
              onClick={() => setScreenImage(null)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}

          {/* Export composite */}
          {screenImage && (
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

      {/* Drop zone overlay when no screenshot */}
      {!screenImage && !calibrating && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border-2 border-dashed border-white/10 bg-black/20 px-10 py-8 text-center backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-zinc-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-zinc-400">Drop a screenshot here or use the button below</p>
            <p className="mt-1 text-xs text-zinc-600">Your screen will be placed into the device mockup</p>
          </div>
        </div>
      )}
    </main>
  )
}

export default MockupEditor
