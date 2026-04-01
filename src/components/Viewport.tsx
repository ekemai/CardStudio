import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { animated, useSpring } from '@react-spring/three'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, SMAA, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { PRESETS } from '../presets'
import { MaterialSettings } from '../materials'
import { LightingSettings } from '../lighting'
import { EffectsSettings } from '../effects'
import { BackgroundSettings } from '../background'

// Initialise RectAreaLight support
RectAreaLightUniformsLib.init()

const CARD_WIDTH = 1.586
const CARD_HEIGHT = 1
const CARD_DEPTH = 0.03
const CORNER_RADIUS = 0.04

// ── Procedural micro-texture normal map ──────────────────────────────
const normalMapTexture = (() => {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const nx = 128 + (Math.random() - 0.5) * 8
    const ny = 128 + (Math.random() - 0.5) * 8
    d[i] = nx
    d[i + 1] = ny
    d[i + 2] = 255
    d[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 4)
  return tex
})()

// ── Procedural bump map (fine grain) ─────────────────────────────────
const bumpMapTexture = (() => {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 30
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 4)
  return tex
})()

// ── Shadow texture — extremely diffused, no hard edges ───────────────
const shadowTexture = (() => {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const rx = size * 0.32
  const ry = rx / 1.586
  ctx.save()
  ctx.translate(cx, cx)
  ctx.scale(1, ry / rx)
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  grad.addColorStop(0, 'rgba(0,0,0,0.45)')
  grad.addColorStop(0.25, 'rgba(0,0,0,0.3)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0.15)')
  grad.addColorStop(0.75, 'rgba(0,0,0,0.05)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(-size, -size, size * 2, size * 2)
  ctx.restore()
  const tex = new THREE.CanvasTexture(canvas)
  return tex
})()

function useDataTexture(dataUrl: string | null) {
  const texture = useMemo(() => {
    if (!dataUrl) return null
    const tex = new THREE.TextureLoader().load(dataUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [dataUrl])

  useEffect(() => {
    return () => {
      texture?.dispose()
    }
  }, [texture])

  return texture
}

const backGradient = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#333333')
  grad.addColorStop(1, '#1a1a1a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
})()

function makeRoundedRectShape() {
  const w = CARD_WIDTH / 2
  const h = CARD_HEIGHT / 2
  const r = CORNER_RADIUS
  const shape = new THREE.Shape()
  shape.moveTo(-w + r, -h)
  shape.lineTo(w - r, -h)
  shape.quadraticCurveTo(w, -h, w, -h + r)
  shape.lineTo(w, h - r)
  shape.quadraticCurveTo(w, h, w - r, h)
  shape.lineTo(-w + r, h)
  shape.quadraticCurveTo(-w, h, -w, h - r)
  shape.lineTo(-w, -h + r)
  shape.quadraticCurveTo(-w, -h, -w + r, -h)
  return shape
}

// Build the card body geometry once
const cardBodyGeo = (() => {
  const shape = makeRoundedRectShape()
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: CARD_DEPTH,
    bevelEnabled: false,
    curveSegments: 8,
  })
  geo.translate(0, 0, -CARD_DEPTH / 2)
  return geo
})()

// Build a flat rounded-rect shape geometry for texture faces
const cardFaceGeo = (() => {
  const shape = makeRoundedRectShape()
  const geo = new THREE.ShapeGeometry(shape, 8)
  const uv = geo.attributes.uv
  const pos = geo.attributes.position
  for (let i = 0; i < uv.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    uv.setXY(i, (x + CARD_WIDTH / 2) / CARD_WIDTH, (y + CARD_HEIGHT / 2) / CARD_HEIGHT)
  }
  uv.needsUpdate = true
  return geo
})()

interface CreditCardProps {
  frontImage: string | null
  backImage: string | null
  activePreset: string
  material: MaterialSettings
  effects: EffectsSettings
  paused: boolean
  transparent: boolean
}

const FACE_Z = CARD_DEPTH / 2 + 0.0001

function CardMesh({
  frontTex,
  backTex,
  mat,
  edgeHighlight,
}: {
  frontTex: THREE.Texture | null
  backTex: THREE.Texture | null
  mat: MaterialSettings
  edgeHighlight?: { intensity: number; color: string }
}) {
  const bodyRef = useRef<THREE.Mesh>(null)
  const frontRef = useRef<THREE.Mesh>(null)
  const backRef = useRef<THREE.Mesh>(null)

  // Dispose materials on unmount
  useEffect(() => {
    return () => {
      if (bodyRef.current) (bodyRef.current.material as THREE.Material).dispose()
      if (frontRef.current) (frontRef.current.material as THREE.Material).dispose()
      if (backRef.current) (backRef.current.material as THREE.Material).dispose()
    }
  }, [])

  return (
    <group>
      {/* Card body / edges — higher metalness for realistic edge reflections */}
      <mesh ref={bodyRef} geometry={cardBodyGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          {...mat}
          color={edgeHighlight ? edgeHighlight.color : '#888888'}
          emissive={edgeHighlight ? edgeHighlight.color : '#000000'}
          emissiveIntensity={edgeHighlight ? edgeHighlight.intensity * 0.3 : 0}
          metalness={Math.min((edgeHighlight ? mat.metalness + edgeHighlight.intensity * 0.3 : mat.metalness) + 0.15, 1)}
          roughness={edgeHighlight ? Math.max(mat.roughness - edgeHighlight.intensity * 0.2, 0) : mat.roughness * 0.8}
          normalMap={normalMapTexture}
          normalScale={new THREE.Vector2(0.08, 0.08)}
          bumpMap={bumpMapTexture}
          bumpScale={0.003}
          envMapIntensity={1.2}
          anisotropy={4}
        />
      </mesh>

      {/* Front face */}
      <mesh ref={frontRef} geometry={cardFaceGeo} position={[0, 0, FACE_Z]} castShadow>
        <meshPhysicalMaterial
          {...mat}
          map={frontTex}
          color={frontTex ? '#ffffff' : '#888888'}
          normalMap={normalMapTexture}
          normalScale={new THREE.Vector2(0.04, 0.04)}
          bumpMap={bumpMapTexture}
          bumpScale={0.002}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Back face */}
      <mesh ref={backRef} geometry={cardFaceGeo} position={[0, 0, -FACE_Z]} rotation={[0, Math.PI, 0]} castShadow>
        <meshPhysicalMaterial
          {...mat}
          map={backTex ?? backGradient}
          color={backTex ? '#ffffff' : '#888888'}
          normalMap={normalMapTexture}
          normalScale={new THREE.Vector2(0.04, 0.04)}
          bumpMap={bumpMapTexture}
          bumpScale={0.002}
          envMapIntensity={1.2}
        />
      </mesh>
    </group>
  )
}

// Shared pausable clock — accumulates time only when not paused
function usePausableClock(paused: boolean) {
  const elapsed = useRef(0)
  const lastReal = useRef(performance.now())

  useFrame(() => {
    const now = performance.now()
    if (!paused) {
      elapsed.current += (now - lastReal.current) * 0.001
    }
    lastReal.current = now
  })

  return elapsed
}

function ShimmerLight({ paused }: { paused: boolean }) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const clock = usePausableClock(paused)

  useFrame(() => {
    if (!lightRef.current) return
    const time = clock.current * 0.7
    const angleRad = (25 * Math.PI) / 180
    const sweep = Math.sin(time)

    const x = Math.cos(angleRad) * sweep * 3
    const y = Math.sin(angleRad) * sweep * 3
    lightRef.current.position.set(x, y + 2, 3)

    const brightness = 0.6 + 0.4 * Math.cos(time)
    lightRef.current.intensity = 1.0 * brightness
  })

  return <directionalLight ref={lightRef} color="#ffffff" intensity={1.0} />
}

function FloatWrapper({
  children,
  paused,
}: {
  children: React.ReactNode
  paused: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const clock = usePausableClock(paused)

  useFrame(() => {
    if (!groupRef.current) return
    const time = clock.current * 0.8
    groupRef.current.position.y = Math.sin(time) * 0.03
    groupRef.current.rotation.z = Math.sin(time * 0.7) * 0.006
  })

  return <group ref={groupRef}>{children}</group>
}

function CreditCard({ frontImage, backImage, activePreset, material, effects, paused, transparent }: CreditCardProps) {
  const frontTex = useDataTexture(frontImage)
  const backTex = useDataTexture(backImage)

  const preset = PRESETS[activePreset]

  const spring = useSpring({
    rotation: preset.rotation,
    position: preset.position,
    config: { mass: 1, tension: 170, friction: 26 },
  })

  const edgeHighlight = effects.edgeHighlight ? { intensity: 0.6, color: '#ffffff' } : undefined

  const cardContent = (
    <>
      <CardMesh frontTex={frontTex} backTex={backTex} mat={material} edgeHighlight={edgeHighlight} />
      {effects.shimmer && <ShimmerLight paused={paused} />}

      {effects.dropShadow && !transparent && (
        <mesh position={[0.02, -0.45, -0.01]} rotation={[-0.3, 0, 0]}>
          <planeGeometry args={[CARD_WIDTH * 3, CARD_HEIGHT * 3]} />
          <meshBasicMaterial
            map={shadowTexture}
            transparent
            opacity={0.7}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {preset.stacked && (
        <group position={[-0.15, -0.1, -0.08]} rotation={[0, 0, -0.05]}>
          <CardMesh frontTex={frontTex} backTex={backTex} mat={material} edgeHighlight={edgeHighlight} />
        </group>
      )}
    </>
  )

  return (
    <animated.group
      rotation={spring.rotation as unknown as THREE.Euler}
      position={spring.position as unknown as THREE.Vector3}
    >
      {effects.float ? (
        <FloatWrapper paused={paused}>{cardContent}</FloatWrapper>
      ) : (
        cardContent
      )}
    </animated.group>
  )
}

// ── Studio Lighting with RectAreaLights ──────────────────────────────

function StudioLighting({ settings }: { settings: LightingSettings }) {
  const keyRef = useRef<THREE.RectAreaLight>(null)
  const fillRef = useRef<THREE.RectAreaLight>(null)
  const rimRef = useRef<THREE.RectAreaLight>(null)
  const spotRef = useRef<THREE.SpotLight>(null)

  // Dispose lights on unmount
  useEffect(() => {
    return () => {
      keyRef.current?.dispose()
      fillRef.current?.dispose()
      rimRef.current?.dispose()
      spotRef.current?.dispose()
    }
  }, [])

  return (
    <>
      <ambientLight intensity={settings.ambientIntensity * 0.5} />

      {/* Main studio panel — large soft key light above and in front */}
      <rectAreaLight
        ref={keyRef}
        color={settings.key.color}
        intensity={settings.key.intensity * 3}
        width={4}
        height={3}
        position={[1, settings.key.height, 4]}
        rotation={[-0.3, 0.2, 0]}
      />

      {/* Fill panel — smaller, from the left */}
      <rectAreaLight
        ref={fillRef}
        color={settings.fill.color}
        intensity={settings.fill.intensity * 2}
        width={2}
        height={2}
        position={[-3, settings.fill.height, 2]}
        rotation={[0, 0.8, 0]}
      />

      {/* Rim / edge separation — thin panel behind */}
      <rectAreaLight
        ref={rimRef}
        color={settings.rim.color}
        intensity={settings.rim.intensity * 2}
        width={5}
        height={0.5}
        position={[0, settings.rim.height, -3]}
        rotation={[0, Math.PI, 0]}
      />

      {/* SpotLight for sharp contact shadows */}
      <spotLight
        ref={spotRef}
        color="#ffffff"
        intensity={1.5}
        position={[1, 5, 3]}
        angle={0.4}
        penumbra={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
        shadow-radius={4}
      />

      {/* Environment map for reflections */}
      {settings.envMap && <Environment preset="studio" background={false} />}
    </>
  )
}

// ── Shadow-catching ground plane ─────────────────────────────────────

function ShadowCatcher({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <shadowMaterial opacity={0.15} />
    </mesh>
  )
}

// ── Post-processing effects ──────────────────────────────────────────

const chromaticOffset = new THREE.Vector2(0.0005, 0.0005)

function PostEffects({ grain }: { grain: number }) {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <Vignette
        offset={0.3}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        offset={chromaticOffset}
        radialModulation={false}
        modulationOffset={0.0}
      />
      <Noise
        premultiply
        blendFunction={BlendFunction.MULTIPLY}
        opacity={grain}
      />
    </EffectComposer>
  )
}

// ── Renderer configuration ───────────────────────────────────────────

function RendererConfig() {
  const { gl } = useThree()
  useEffect(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
    gl.toneMappingExposure = 1.2
  }, [gl])
  return null
}

// ── Background ───────────────────────────────────────────────────────

function useGradientTexture(start: string, end: string, angle: number, midpoint: number) {
  return useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const rad = (angle * Math.PI) / 180
    const cx = size / 2
    const cy = size / 2
    const len = size * 0.7
    const x0 = cx - Math.cos(rad) * len
    const y0 = cy - Math.sin(rad) * len
    const x1 = cx + Math.cos(rad) * len
    const y1 = cy + Math.sin(rad) * len
    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    const mid = midpoint / 100
    grad.addColorStop(0, start)
    grad.addColorStop(mid, start)
    grad.addColorStop(mid + (1 - mid) * 0.4, end)
    grad.addColorStop(1, end)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [start, end, angle, midpoint])
}

function SceneBackground({ settings }: { settings: BackgroundSettings }) {
  const gradTex = useGradientTexture(settings.gradientStart, settings.gradientEnd, settings.gradientAngle, settings.gradientMidpoint)

  if (settings.mode === 'transparent') return null

  if (settings.mode === 'gradient') {
    return (
      <mesh position={[0, 0, -10]} renderOrder={-1}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial map={gradTex} depthWrite={false} toneMapped={false} />
      </mesh>
    )
  }

  return (
    <mesh position={[0, 0, -10]} renderOrder={-1}>
      <planeGeometry args={[50, 50]} />
      <meshBasicMaterial color={settings.solidColor} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function SceneColorManager({ settings }: { settings: BackgroundSettings }) {
  useFrame(({ gl, scene }) => {
    scene.background = null
    gl.setClearAlpha(settings.mode === 'transparent' ? 0 : 1)
  })
  return null
}

function ResetPlane({ onReset }: { onReset: () => void }) {
  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onReset()
    },
    [onReset],
  )

  return (
    <mesh onDoubleClick={handleDoubleClick} visible={false}>
      <planeGeometry args={[100, 100]} />
    </mesh>
  )
}

// ── Main Viewport component ──────────────────────────────────────────

interface ViewportProps {
  frontImage: string | null
  backImage: string | null
  activePreset: string
  material: MaterialSettings
  lighting: LightingSettings
  effects: EffectsSettings
  background: BackgroundSettings
}

const Viewport: React.FC<ViewportProps> = ({ frontImage, backImage, activePreset, material, lighting, effects, background }) => {
  const [resetKey, setResetKey] = useState(0)
  const [paused, setPaused] = useState(false)

  const handleReset = useCallback(() => {
    setResetKey(k => k + 1)
  }, [])

  const isTransparent = background.mode === 'transparent'

  return (
    <main
      className="relative flex-1 bg-app-viewport"
      style={isTransparent ? {
        backgroundImage: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)',
        backgroundSize: '20px 20px',
      } : undefined}
    >
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-sm font-medium tracking-wide text-white/40">Loading…</span>
          </div>
        }
      >
        <Canvas
          gl={{
            toneMapping: THREE.ACESFilmicToneMapping,
            alpha: true,
            preserveDrawingBuffer: true,
          }}
          shadows
          camera={{ position: [0, 0, 3], fov: 40 }}
        >
          <RendererConfig />
          <SceneColorManager settings={background} />
          <SceneBackground settings={background} />
          <StudioLighting settings={lighting} />
          <CreditCard
            frontImage={frontImage}
            backImage={backImage}
            activePreset={activePreset}
            material={material}
            effects={effects}
            paused={paused}
            transparent={isTransparent}
          />
          <ShadowCatcher visible={!isTransparent} />
          <ResetPlane onReset={handleReset} />
          <OrbitControls key={resetKey} enablePan={false} />
          <PostEffects grain={effects.grain} />
        </Canvas>
      </Suspense>

      {/* Viewport controls overlay */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
        <button
          onClick={() => setPaused(p => !p)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
          title={paused ? 'Play' : 'Pause'}
        >
          {paused ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          )}
        </button>
        <button
          onClick={handleReset}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
          title="Reset position"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
            <path strokeLinecap="round" d="M20.49 9A9 9 0 005.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 014.51 15" />
          </svg>
        </button>
      </div>
    </main>
  )
}

export default Viewport
