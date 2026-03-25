import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Viewport from './components/Viewport'
import RightPanel from './components/RightPanel'
import { DEFAULT_PRESET } from './presets'
import { DEFAULT_MATERIAL, MaterialSettings } from './materials'
import { DEFAULT_LIGHTING, LightingSettings } from './lighting'
import { DEFAULT_EFFECTS, EffectsSettings } from './effects'
import { DEFAULT_BACKGROUND, BackgroundSettings } from './background'

const App: React.FC = () => {
  const [frontImage, setFrontImage] = useState<string | null>('/default-front.png')
  const [backImage, setBackImage] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState(DEFAULT_PRESET)
  const [material, setMaterial] = useState<MaterialSettings>({ ...DEFAULT_MATERIAL })
  const [lighting, setLighting] = useState<LightingSettings>({ ...DEFAULT_LIGHTING })
  const [effects, setEffects] = useState<EffectsSettings>({ ...DEFAULT_EFFECTS })
  const [background, setBackground] = useState<BackgroundSettings>({ ...DEFAULT_BACKGROUND })

  const handleSwap = useCallback(() => {
    setFrontImage(prev => {
      setBackImage(() => prev)
      return backImage
    })
  }, [backImage])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg">
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
      />
    </div>
  )
}

export default App
