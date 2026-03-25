import { useCallback, useRef } from 'react'
import { MaterialSettings, MATERIAL_PRESETS } from '../materials'
import { LightingSettings } from '../lighting'
import { EffectsSettings } from '../effects'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step = 0.01, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">{label}</span>
        <span className="text-[11px] tabular-nums text-zinc-500">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
      />
    </div>
  )
}


function KeyDirectionPad({
  angle,
  height,
  onChange,
}: {
  angle: number
  height: number
  onChange: (angle: number, height: number) => void
}) {
  const padRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updateFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current
      if (!pad) return
      const rect = pad.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * 2 - 1
      const y = ((clientY - rect.top) / rect.height) * 2 - 1
      const newAngle = ((Math.atan2(-y, x) * 180) / Math.PI + 360) % 360
      const dist = Math.min(Math.sqrt(x * x + y * y), 1)
      const newHeight = (1 - dist) * 8
      onChange(Math.round(newAngle), parseFloat(newHeight.toFixed(1)))
    },
    [onChange],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      updateFromEvent(e.clientX, e.clientY)
    },
    [updateFromEvent],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      updateFromEvent(e.clientX, e.clientY)
    },
    [updateFromEvent],
  )

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // Convert angle/height to position on the pad
  const rad = (angle * Math.PI) / 180
  const dist = 1 - height / 8
  const dotX = ((Math.cos(rad) * dist + 1) / 2) * 100
  const dotY = ((-Math.sin(rad) * dist + 1) / 2) * 100

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] text-zinc-400">Key Direction</span>
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative mx-auto h-32 w-32 cursor-crosshair rounded-full border border-white/10 bg-white/[0.03]"
      >
        {/* Crosshair lines */}
        <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-px bg-white/5" />
        <div className="absolute top-1/2 left-2 right-2 h-px -translate-y-px bg-white/5" />
        {/* Center dot */}
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
        {/* Quadrant labels */}
        <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[8px] text-zinc-600">Back</span>
        <span className="absolute left-1/2 bottom-1 -translate-x-1/2 text-[8px] text-zinc-600">Front</span>
        <span className="absolute top-1/2 left-1.5 -translate-y-1/2 text-[8px] text-zinc-600">L</span>
        <span className="absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] text-zinc-600">R</span>
        {/* Light indicator */}
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
          style={{ left: `${dotX}%`, top: `${dotY}%` }}
        />
      </div>
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-400">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          value ? 'bg-indigo-500' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            value ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}


interface RightPanelProps {
  material: MaterialSettings
  onMaterial: (m: MaterialSettings) => void
  lighting: LightingSettings
  onLighting: (l: LightingSettings) => void
  effects: EffectsSettings
  onEffects: (e: EffectsSettings) => void
}

const RightPanel: React.FC<RightPanelProps> = ({
  material,
  onMaterial,
  lighting,
  onLighting,
  effects,
  onEffects,
}) => {
  const updateMat = useCallback(
    (key: keyof MaterialSettings, value: number) => {
      onMaterial({ ...material, [key]: value })
    },
    [material, onMaterial],
  )

  const applyPreset = useCallback(
    (values: Partial<MaterialSettings>) => {
      onMaterial({ ...material, ...values })
    },
    [material, onMaterial],
  )

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-6 border-l border-white/10 bg-app-sidebar p-6 overflow-y-auto">
      {/* Material */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Material
        </span>
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex gap-1.5">
            {MATERIAL_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => applyPreset(p.values)}
                className="flex-1 rounded-md border border-white/10 bg-white/[0.03] py-1.5 text-[10px] font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
              >
                {p.name}
              </button>
            ))}
          </div>

          <Slider label="Metalness" value={material.metalness} min={0} max={1} onChange={v => updateMat('metalness', v)} />
          <Slider label="Roughness" value={material.roughness} min={0} max={1} onChange={v => updateMat('roughness', v)} />
          <Slider label="Clearcoat" value={material.clearcoat} min={0} max={1} onChange={v => updateMat('clearcoat', v)} />
          <Slider label="Iridescence" value={material.iridescence} min={0} max={1} onChange={v => updateMat('iridescence', v)} />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Lighting */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Lighting
        </span>
        <div className="mt-3 flex flex-col gap-4">
          <KeyDirectionPad
            angle={lighting.key.angle}
            height={lighting.key.height}
            onChange={(a, h) => onLighting({ ...lighting, key: { ...lighting.key, angle: a, height: h } })}
          />

          <Slider
            label="Key Light"
            value={lighting.key.intensity}
            min={0}
            max={5}
            onChange={v => onLighting({ ...lighting, key: { ...lighting.key, intensity: v } })}
          />
          <Slider
            label="Fill Light"
            value={lighting.fill.intensity}
            min={0}
            max={3}
            onChange={v => onLighting({ ...lighting, fill: { ...lighting.fill, intensity: v } })}
          />
          <Slider
            label="Rim Light"
            value={lighting.rim.intensity}
            min={0}
            max={4}
            onChange={v => onLighting({ ...lighting, rim: { ...lighting.rim, intensity: v } })}
          />
          <Slider
            label="Ambient"
            value={lighting.ambientIntensity}
            min={0}
            max={1}
            onChange={v => onLighting({ ...lighting, ambientIntensity: v })}
          />

          <Toggle
            label="Environment Map"
            value={lighting.envMap}
            onChange={v => onLighting({ ...lighting, envMap: v })}
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Effects — simple toggles */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Effects
        </span>
        <div className="mt-3 flex flex-col gap-2">
          <Toggle label="Drop Shadow" value={effects.dropShadow} onChange={v => onEffects({ ...effects, dropShadow: v })} />
          <Toggle label="Float Animation" value={effects.float} onChange={v => onEffects({ ...effects, float: v })} />
          <Toggle label="Shimmer Sweep" value={effects.shimmer} onChange={v => onEffects({ ...effects, shimmer: v })} />
          <Toggle label="Metallic Edge" value={effects.edgeHighlight} onChange={v => onEffects({ ...effects, edgeHighlight: v })} />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Export */}
      <button
        onClick={() => {
          const canvas = document.querySelector('canvas')
          if (!canvas) return
          const link = document.createElement('a')
          link.download = 'xe-mockup.png'
          link.href = canvas.toDataURL('image/png')
          link.click()
        }}
        className="flex items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download PNG
      </button>
    </aside>
  )
}

export default RightPanel
