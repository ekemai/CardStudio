import { useCallback, useRef, useState } from 'react'
import { PRESETS, PRESET_KEYS } from '../presets'
import { BackgroundSettings, BgMode } from '../background'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface UploadZoneProps {
  label: string
  image: string | null
  onImage: (dataUrl: string | null) => void
}

function UploadZone({ label, image, onImage }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const processFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) return
      const reader = new FileReader()
      reader.onload = () => onImage(reader.result as string)
      reader.readAsDataURL(file)
    },
    [onImage],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      e.target.value = ''
    },
    [processFile],
  )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        {image && (
          <button
            onClick={() => onImage(null)}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors ${
          dragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-white/10 bg-white/[0.03] hover:border-white/20'
        }`}
      >
        {image ? (
          <img src={image} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-zinc-500">Drop image or click to upload</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}

// ── Card preset icons ────────────────────────────────────────────────

const PRESET_ICONS: Record<string, React.ReactNode> = {
  hero: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <rect x="4" y="7" width="16" height="10" rx="2" transform="rotate(-8 12 12)" />
    </svg>
  ),
  float: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <rect x="4" y="5" width="16" height="10" rx="2" transform="rotate(-10 12 10)" />
      <ellipse cx="12" cy="20" rx="6" ry="1.5" opacity={0.3} />
    </svg>
  ),
  portrait: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <rect x="7" y="2" width="10" height="20" rx="2" />
    </svg>
  ),
  drama: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <path d="M3 18 L10 6 L21 6 L14 18 Z" strokeLinejoin="round" />
    </svg>
  ),
  overhead: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <rect x="4" y="7" width="16" height="10" rx="2" />
      <circle cx="12" cy="3" r="1" fill="currentColor" />
      <path d="M12 4 L12 7" />
    </svg>
  ),
  stack: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <rect x="5" y="8" width="14" height="9" rx="1.5" opacity={0.3} />
      <rect x="4" y="6" width="14" height="9" rx="1.5" transform="rotate(-5 11 10.5)" />
    </svg>
  ),
}

function CardShotPresets({
  activePreset,
  onPreset,
}: {
  activePreset: string
  onPreset: (key: string) => void
}) {
  return (
    <div className="mt-8">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        Shot Presets
      </span>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {PRESET_KEYS.map(key => {
          const preset = PRESETS[key]
          const active = key === activePreset
          return (
            <button
              key={key}
              onClick={() => onPreset(key)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors ${
                active
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
            >
              <span className={active ? 'text-indigo-400' : 'text-zinc-500'}>
                {PRESET_ICONS[key]}
              </span>
              <div className="text-xs font-medium">{preset.name}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Background controls ──────────────────────────────────────────────

const BG_MODES: { key: BgMode; label: string }[] = [
  { key: 'solid', label: 'Solid' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'transparent', label: 'Transparent' },
]

function BgSlider({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">{label}</span>
        <span className="text-[11px] tabular-nums text-zinc-500">{value.toFixed(0)}{'\u00B0'}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
      />
    </div>
  )
}

function BgColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-400">{label}</span>
      <input
        type="color" value={value} onChange={e => onChange(e.target.value)}
        className="h-5 w-8 cursor-pointer rounded border border-white/10 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
      />
    </div>
  )
}

// ── Main sidebar ─────────────────────────────────────────────────────

interface SidebarProps {
  frontImage: string | null
  backImage: string | null
  onFrontImage: (img: string | null) => void
  onBackImage: (img: string | null) => void
  onSwap: () => void
  activePreset: string
  onPreset: (key: string) => void
  background: BackgroundSettings
  onBackground: (b: BackgroundSettings) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  frontImage,
  backImage,
  onFrontImage,
  onBackImage,
  onSwap,
  activePreset,
  onPreset,
  background,
  onBackground,
}) => {
  return (
    <div className="flex flex-col p-6 pt-2">
      <div className="mt-4 flex flex-col gap-3">
        <UploadZone label="Default Xe Card" image={frontImage} onImage={onFrontImage} />
        <button
          onClick={onSwap}
          disabled={!frontImage && !backImage}
          className="self-center rounded-md border border-white/10 px-3 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {'\u2195'} Swap
        </button>
        <UploadZone label="Custom Back Face" image={backImage} onImage={onBackImage} />
      </div>

      <CardShotPresets activePreset={activePreset} onPreset={onPreset} />

      {/* Background — always shown */}
      <div className="mt-8">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Background
        </span>

        <div className="mt-3 flex flex-col gap-4">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {BG_MODES.map(m => (
              <button
                key={m.key}
                onClick={() => onBackground({ ...background, mode: m.key })}
                className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
                  background.mode === m.key
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {background.mode === 'solid' && (
            <BgColorPicker
              label="Color"
              value={background.solidColor}
              onChange={v => onBackground({ ...background, solidColor: v })}
            />
          )}

          {background.mode === 'gradient' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={background.gradientStart}
                    onChange={e => onBackground({ ...background, gradientStart: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded border border-white/10 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                  />
                  <div
                    className="h-5 flex-1 rounded-md border border-white/10"
                    style={{
                      background: `linear-gradient(90deg, ${background.gradientStart} 0%, ${background.gradientStart} ${background.gradientMidpoint * 0.8}%, ${background.gradientEnd} ${background.gradientMidpoint * 1.2}%, ${background.gradientEnd} 100%)`
                    }}
                  />
                  <input
                    type="color"
                    value={background.gradientEnd}
                    onChange={e => onBackground({ ...background, gradientEnd: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded border border-white/10 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">Balance</span>
                    <span className="text-[11px] tabular-nums text-zinc-500">{background.gradientMidpoint}%</span>
                  </div>
                  <input
                    type="range" min={10} max={90} step={1}
                    value={background.gradientMidpoint}
                    onChange={e => onBackground({ ...background, gradientMidpoint: parseFloat(e.target.value) })}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
                  />
                </div>
              </div>
              <BgSlider
                label="Angle"
                value={background.gradientAngle}
                min={0}
                max={360}
                step={1}
                onChange={v => onBackground({ ...background, gradientAngle: v })}
              />
            </div>
          )}

          {background.mode === 'transparent' && (
            <span className="text-[10px] text-zinc-500">
              Checkerboard preview active. Export will have transparent background.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
