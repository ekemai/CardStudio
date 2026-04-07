import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Viewport from './components/Viewport'
import PhoneViewport from './components/PhoneViewport'
import RightPanel from './components/RightPanel'
import { DEFAULT_PRESET } from './presets'
import { DEFAULT_MATERIAL, MaterialSettings } from './materials'
import { DEFAULT_LIGHTING, LightingSettings } from './lighting'
import { DEFAULT_EFFECTS, EffectsSettings } from './effects'
import { DEFAULT_BACKGROUND, BackgroundSettings } from './background'
import { DeviceMode, MOCKUPS } from './modes'

const App: React.FC = () => {
  const [mode, setMode] = useState<DeviceMode>('card')
  const [frontImage, setFrontImage] = useState<string | null>('/default-front.png')
  const [backImage, setBackImage] = useState<string | null>(null)
  const [screenshotImage, setScreenshotImage] = useState<string | null>(null)
  const [activeMockup, setActiveMockup] = useState(MOCKUPS[0].id)
  const [activePreset, setActivePreset] = useState(DEFAULT_PRESET)
  const [material, setMaterial] = useState<MaterialSettings>({ ...DEFAULT_MATERIAL })
  const [lighting, setLighting] = useState<LightingSettings>({ ...DEFAULT_LIGHTING })
  const [effects, setEffects] = useState<EffectsSettings>({ ...DEFAULT_EFFECTS })
  const [background, setBackground] = useState<BackgroundSettings>({ ...DEFAULT_BACKGROUND })

  // Phone-specific effects
  const [glassReflection, setGlassReflection] = useState(true)
  const [screenGlow, setScreenGlow] = useState(true)

  const handleSwap = useCallback(() => {
    setFrontImage(prev => {
      setBackImage(() => prev)
      return backImage
    })
  }, [backImage])

  const handleModeChange = useCallback((newMode: DeviceMode) => {
    setMode(newMode)
    if (newMode === 'card') setActivePreset('hero')
  }, [])

  const mockup = MOCKUPS.find(m => m.id === activeMockup) ?? MOCKUPS[0]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg">
      <Sidebar
        mode={mode}
        onMode={handleModeChange}
        frontImage={frontImage}
        backImage={backImage}
        onFrontImage={setFrontImage}
        onBackImage={setBackImage}
        onSwap={handleSwap}
        screenshotImage={screenshotImage}
        onScreenshotImage={setScreenshotImage}
        activeMockup={activeMockup}
        onMockup={setActiveMockup}
        activePreset={activePreset}
        onPreset={setActivePreset}
        background={background}
        onBackground={setBackground}
      />

      {mode === 'card' ? (
        <Viewport
          frontImage={frontImage}
          backImage={backImage}
          activePreset={activePreset}
          material={material}
          lighting={lighting}
          effects={effects}
          background={background}
        />
      ) : (
        <PhoneViewport
          mockup={mockup}
          screenshotImage={screenshotImage}
          background={background}
          grain={effects.grain}
          glassReflection={glassReflection}
          screenGlow={screenGlow}
        />
      )}

      <RightPanel
        mode={mode}
        material={material}
        onMaterial={setMaterial}
        lighting={lighting}
        onLighting={setLighting}
        effects={effects}
        onEffects={setEffects}
        activePreset={activePreset}
        activeMockup={activeMockup}
        glassReflection={glassReflection}
        onGlassReflection={setGlassReflection}
        screenGlow={screenGlow}
        onScreenGlow={setScreenGlow}
      />
    </div>
  )
}

export default App
