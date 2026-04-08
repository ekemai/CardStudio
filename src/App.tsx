import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Viewport from './components/Viewport'
import RightPanel from './components/RightPanel'
import MockupSidebar from './components/MockupSidebar'
import MockupViewport from './components/MockupViewport'
import MockupEditor from './components/MockupEditor'
import Toast from './components/Toast'
import { DEFAULT_PRESET } from './presets'
import { DEFAULT_MATERIAL, MaterialSettings } from './materials'
import { DEFAULT_LIGHTING, LightingSettings } from './lighting'
import { DEFAULT_EFFECTS, EffectsSettings } from './effects'
import { DEFAULT_BACKGROUND, BackgroundSettings } from './background'
import { AppMode, Mockup } from './types/mockup'
import { useMockups } from './hooks/useMockups'

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('card')

  // Card mode state
  const [frontImage, setFrontImage] = useState<string | null>('/default-front.png')
  const [backImage, setBackImage] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState(DEFAULT_PRESET)
  const [material, setMaterial] = useState<MaterialSettings>({ ...DEFAULT_MATERIAL })
  const [lighting, setLighting] = useState<LightingSettings>({ ...DEFAULT_LIGHTING })
  const [effects, setEffects] = useState<EffectsSettings>({ ...DEFAULT_EFFECTS })
  const [background, setBackground] = useState<BackgroundSettings>({ ...DEFAULT_BACKGROUND })

  // Mockup mode state
  const { mockups, loading, error } = useMockups()
  const [selectedMockup, setSelectedMockup] = useState<Mockup | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)

  const handleSwap = useCallback(() => {
    setFrontImage(prev => {
      setBackImage(() => prev)
      return backImage
    })
  }, [backImage])

  const handleDownload = useCallback(async (mockup: Mockup) => {
    setToast(`Downloading ${mockup.name}...`)
    setDownloadProgress(0)

    try {
      const response = await fetch(mockup.psd)
      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      if (!response.body) {
        // Fallback: no streaming support
        const blob = await response.blob()
        triggerDownload(blob, mockup.id)
        setDownloadProgress(100)
        setToast(`${mockup.name} downloaded!`)
        return
      }

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        if (total > 0) {
          setDownloadProgress(Math.round((received / total) * 100))
        }
      }

      const blob = new Blob(chunks)
      triggerDownload(blob, mockup.id)
      setDownloadProgress(100)
      setToast(`${mockup.name} downloaded!`)
    } catch {
      setDownloadProgress(null)
      setToast(`Failed to download ${mockup.name}`)
    }
  }, [])

  const triggerDownload = (blob: Blob, id: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${id}.psd`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg">
      {/* Mode toggle — rendered above sidebar content */}
      {mode === 'card' ? (
        <>
          <div className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-app-sidebar overflow-y-auto">
            <div className="p-6 pb-0">
              <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
                <img src="/xe_logo.svg" alt="Xe" className="h-6 w-auto" />
                Mockup Studio
              </h1>
              <ModeToggle mode={mode} onMode={setMode} />
            </div>
            <Sidebar
              frontImage={frontImage}
              backImage={backImage}
              onFrontImage={setFrontImage}
              onBackImage={setBackImage}
              onSwap={handleSwap}
              activePreset={activePreset}
              onPreset={setActivePreset}
              background={background}
              onBackground={setBackground}
            />
          </div>

          <Viewport
            frontImage={frontImage}
            backImage={backImage}
            activePreset={activePreset}
            material={material}
            lighting={lighting}
            effects={effects}
            background={background}
          />

          <RightPanel
            material={material}
            onMaterial={setMaterial}
            lighting={lighting}
            onLighting={setLighting}
            effects={effects}
            onEffects={setEffects}
            activePreset={activePreset}
          />
        </>
      ) : (
        <>
          <div className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-app-sidebar overflow-y-auto">
            <div className="p-6 pb-0">
              <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
                <img src="/xe_logo.svg" alt="Xe" className="h-6 w-auto" />
                Mockup Studio
              </h1>
              <ModeToggle mode={mode} onMode={setMode} />
            </div>
            <MockupSidebar
              mockups={mockups}
              loading={loading}
              error={error}
              onSelect={setSelectedMockup}
              onDownload={handleDownload}
            />
          </div>

          {selectedMockup ? (
            <MockupEditor key={selectedMockup.id} mockup={selectedMockup} onDownload={handleDownload} />
          ) : (
            <MockupViewport mockup={null} onDownload={handleDownload} />
          )}
        </>
      )}

      {/* Toast */}
      {toast && <Toast message={toast} progress={downloadProgress} onDone={() => { setToast(null); setDownloadProgress(null) }} />}
    </div>
  )
}

// ── Mode toggle pill ────────────────────────────────────────────────

function ModeToggle({ mode, onMode }: { mode: AppMode; onMode: (m: AppMode) => void }) {
  return (
    <div className="mt-4 mb-2 flex rounded-lg border border-white/10 overflow-hidden">
      <button
        onClick={() => onMode('card')}
        className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
          mode === 'card'
            ? 'bg-white text-black'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Card Engine
      </button>
      <button
        onClick={() => onMode('mockups')}
        className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
          mode === 'mockups'
            ? 'bg-white text-black'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Device Library
      </button>
    </div>
  )
}

export default App
