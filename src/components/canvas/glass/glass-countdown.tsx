'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FallingStickers } from './stickers'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { getPointerUV, isPointerInside } from '@/lib/pointer-bus'
import { createRingLightFollower } from './ring-light-follower'

// ─── Identical constants from GlassCenterpiece ──────────────────────
const LOAD_TARGET_SCALE = 1.37
const LOAD_SCALE_FROM = 0.685
const LOAD_DURATION = 2.5

const SCROLL_RISE_SPEED = 3.8
const SCROLL_SCALE_MIN = 0.38 * LOAD_TARGET_SCALE
const SCROLL_TILT_RIGHT_MAX = (80 * Math.PI) / 180

// Target date: January 22, 2027 00:00:00 IST
const TARGET_DATE = new Date('2027-01-22T00:00:00+05:30').getTime()

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

// ─── Identical glass shaders from GlassCenterpiece ──────────────────
const glassVertexShader = `
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocalNormal = normal;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const glassFragmentShader = `
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec3 uLightPos;
uniform float uLightIntensity;
uniform float uTime;
uniform vec3 uCameraPos;

varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;

void main() {
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPosition);
  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  
  float edgeFactor = clamp(length(vLocalNormal.xy) * 2.2, 0.0, 1.0);
  edgeFactor = smoothstep(0.12, 0.70, edgeFactor);
  
  vec2 uvOffset = vLocalNormal.xy * (0.014 * edgeFactor);
  
  vec2 dispR = uvOffset * 1.15;
  vec2 dispG = uvOffset;
  vec2 dispB = uvOffset * 0.85;
  
  float scatter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  vec2 frostJitter = vec2(cos(scatter * 6.28), sin(scatter * 6.28)) * 0.004;
  
  vec3 color = vec3(0.0);
  vec2 blur = vec2(0.006);
  
  vec2 offset1 = vec2( blur.x,  blur.y) + frostJitter;
  vec2 offset2 = vec2(-blur.x, -blur.y) + frostJitter;
  vec2 offset3 = vec2(-blur.x,  blur.y) + frostJitter;
  vec2 offset4 = vec2( blur.x, -blur.y) + frostJitter;

  color.r += texture2D(uTexture, clamp(screenUv + dispR + offset1, 0.001, 0.999)).r;
  color.g += texture2D(uTexture, clamp(screenUv + dispG + offset1, 0.001, 0.999)).g;
  color.b += texture2D(uTexture, clamp(screenUv + dispB + offset1, 0.001, 0.999)).b;

  color.r += texture2D(uTexture, clamp(screenUv + dispR + offset2, 0.001, 0.999)).r;
  color.g += texture2D(uTexture, clamp(screenUv + dispG + offset2, 0.001, 0.999)).g;
  color.b += texture2D(uTexture, clamp(screenUv + dispB + offset2, 0.001, 0.999)).b;

  color.r += texture2D(uTexture, clamp(screenUv + dispR + offset3, 0.001, 0.999)).r;
  color.g += texture2D(uTexture, clamp(screenUv + dispG + offset3, 0.001, 0.999)).g;
  color.b += texture2D(uTexture, clamp(screenUv + dispB + offset3, 0.001, 0.999)).b;

  color.r += texture2D(uTexture, clamp(screenUv + dispR + offset4, 0.001, 0.999)).r;
  color.g += texture2D(uTexture, clamp(screenUv + dispG + offset4, 0.001, 0.999)).g;
  color.b += texture2D(uTexture, clamp(screenUv + dispB + offset4, 0.001, 0.999)).b;
  
  color /= 4.0;
  
  float fresnel = pow(1.0 - NdotV, 3.0) * edgeFactor;
  vec3 fresnelTint = vec3(0.96, 0.98, 1.0);
  
  vec3 L = normalize(uLightPos - vWorldPosition);
  vec3 H = normalize(L + V);
  float NdotH = clamp(dot(N, H), 0.0, 1.0);
  float specular = pow(NdotH, 24.0) * edgeFactor * (uLightIntensity * 1.5);
  
  float rimGlint = pow(1.0 - NdotV, 2.0) * pow(clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), 2.5) * edgeFactor * (uLightIntensity * 1.8);
  
  vec3 finalGlass = color + fresnel * fresnelTint * 0.25 + (specular + rimGlint) * vec3(1.0);
  
  finalGlass = mix(finalGlass, vec3(0.95, 0.90, 0.92), 0.12);
  
  gl_FragColor = vec4(finalGlass, 1.0);
}
`

// ─── Helper: compute countdown parts ────────────────────────────────
interface CountdownParts {
  days: string
  hours: string
  minutes: string
  seconds: string
  key: string // unique key for change detection
}

function getCountdownParts(): CountdownParts {
  const now = Date.now()
  const diff = Math.max(0, TARGET_DATE - now)

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  const dd = String(days).padStart(3, '0')
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  return { days: dd, hours: hh, minutes: mm, seconds: ss, key: `${dd}${hh}${mm}${ss}` }
}

// ─── Helper: build centered 3D text geometry ─────────────────────────
function makeNumberCentered(
  text: string,
  font: Font,
  size: number,
  depth: number,
  bevelThickness = 0.012,
  bevelSize = 0.008
): THREE.BufferGeometry {
  const geo = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelOffset: 0,
    bevelSegments: 3,
  })
  geo.computeBoundingBox()
  const box = geo.boundingBox!
  const cx = (box.min.x + box.max.x) / 2
  const cy = (box.min.y + box.max.y) / 2
  geo.translate(-cx, -cy, -depth / 2)
  geo.computeBoundingBox()
  return geo
}

// ─── Helper: build label with wide tracking and subtle bevel ─────────
function makeLabelCentered(
  text: string,
  font: Font,
  size: number,
  depth: number,
  letterSpacing = 0.034
): THREE.BufferGeometry {
  const charGeos: THREE.BufferGeometry[] = []
  let cursorX = 0

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const charGeo = new TextGeometry(char, {
      font,
      size,
      depth,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.002,
      bevelOffset: 0,
      bevelSegments: 2,
    })
    charGeo.computeBoundingBox()
    const box = charGeo.boundingBox!
    // Shift so character starts at cursorX, preserving font baseline
    charGeo.translate(-box.min.x + cursorX, 0, -depth / 2)
    const charW = box.max.x - box.min.x
    cursorX += charW + letterSpacing
    charGeos.push(charGeo)
  }

  const merged = BufferGeometryUtils.mergeGeometries(charGeos, false)!
  merged.computeBoundingBox()
  const box = merged.boundingBox!
  const cx = (box.min.x + box.max.x) / 2
  const cy = (box.min.y + box.max.y) / 2
  merged.translate(-cx, -cy, 0)
  merged.computeBoundingBox()
  return merged
}

// ─── Build the full countdown geometry (2x2 grid) ────────────────────
function buildCountdownGeometry(parts: CountdownParts, font: Font): THREE.BufferGeometry {
  const numSize = 0.42
  const numDepth = 0.12
  const labelSize = 0.082
  const labelDepth = 0.03
  const labelSpacing = 0.034
  const colonSize = 0.32
  const rowGap = 0.82
  const labelOffsetY = 0.34
  const colonOffsetY = 0.03

  // Fixed column centers so text and labels never jump or jitter
  const col2X = 0.52 // center for 2-digit columns (hours, mins, secs)
  const col3X = 0.64 // center for 3-digit column (days)

  const geometries: THREE.BufferGeometry[] = []

  const topY = rowGap / 2
  const botY = -rowGap / 2

  // Colons at x = 0 (perfect vertical alignment)
  const cTop = makeNumberCentered(':', font, colonSize, numDepth * 0.6)
  cTop.translate(0, topY + colonOffsetY, 0)
  geometries.push(cTop)

  const cBot = makeNumberCentered(':', font, colonSize, numDepth * 0.6)
  cBot.translate(0, botY + colonOffsetY, 0)
  geometries.push(cBot)

  // Top row: DAYS & HRS
  const daysNum = makeNumberCentered(parts.days, font, numSize, numDepth)
  daysNum.translate(-col3X, topY, 0)
  geometries.push(daysNum)

  const daysLabel = makeLabelCentered('DAYS', font, labelSize, labelDepth, labelSpacing)
  daysLabel.translate(-col3X, topY - labelOffsetY, 0)
  geometries.push(daysLabel)

  const hoursNum = makeNumberCentered(parts.hours, font, numSize, numDepth)
  hoursNum.translate(+col2X, topY, 0)
  geometries.push(hoursNum)

  const hoursLabel = makeLabelCentered('HRS', font, labelSize, labelDepth, labelSpacing)
  hoursLabel.translate(+col2X, topY - labelOffsetY, 0)
  geometries.push(hoursLabel)

  // Bottom row: MIN & SEC
  const minsNum = makeNumberCentered(parts.minutes, font, numSize, numDepth)
  minsNum.translate(-col2X, botY, 0)
  geometries.push(minsNum)

  const minsLabel = makeLabelCentered('MIN', font, labelSize, labelDepth, labelSpacing)
  minsLabel.translate(-col2X, botY - labelOffsetY, 0)
  geometries.push(minsLabel)

  const secsNum = makeNumberCentered(parts.seconds, font, numSize, numDepth)
  secsNum.translate(+col2X, botY, 0)
  geometries.push(secsNum)

  const secsLabel = makeLabelCentered('SEC', font, labelSize, labelDepth, labelSpacing)
  secsLabel.translate(+col2X, botY - labelOffsetY, 0)
  geometries.push(secsLabel)

  const merged = BufferGeometryUtils.mergeGeometries(geometries, false)
  if (!merged) return cTop

  // Center Y and Z around the origin, keeping colons anchored at x = 0
  merged.computeBoundingBox()
  const box = merged.boundingBox!
  const center = new THREE.Vector3()
  box.getCenter(center)
  merged.translate(0, -center.y, -center.z)

  // Stable fixed scale normalization so size does not pulsate every second
  const targetScale = 1.05
  merged.scale(targetScale, targetScale, targetScale)

  return merged
}

export function GlassCountdown() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const ringFollower = useMemo(() => createRingLightFollower(), [])
  const loadElapsedRef = useRef(0)
  const lastTextRef = useRef('')
  const { size, gl, scene, camera } = useThree()

  const [font, setFont] = useState<Font | null>(null)

  // Load the font
  useEffect(() => {
    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', (loadedFont) => {
      setFont(loadedFont)
    })
  }, [])

  // FBO: identical to centerpiece
  const fbo = useMemo(() => {
    return new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    })
  }, [])

  const uniforms = useMemo(() => ({
    uTexture: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uLightPos: { value: new THREE.Vector3(0, 0, 1.5) },
    uLightIntensity: { value: 1.8 },
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3(0, 0, 5) },
  }), [])

  useFrame((state, delta) => {
    if (!groupRef.current || !materialRef.current || !meshRef.current || !font) return

    const clampedDelta = Math.min(delta, 0.1)
    loadElapsedRef.current += clampedDelta

    // Skip expensive FBO pass when scrolled well off-screen
    const earlyScroll = getLenisScrollSnapshot()
    const earlyScrollVH = earlyScroll.scrollTop / size.height
    if (earlyScrollVH > 2.0) {
      meshRef.current.visible = false
      return
    }

    // ── Update countdown text geometry every second ──
    const parts = getCountdownParts()
    if (parts.key !== lastTextRef.current) {
      lastTextRef.current = parts.key
      const newGeo = buildCountdownGeometry(parts, font)
      meshRef.current.geometry.dispose()
      meshRef.current.geometry = newGeo
    }

    // === LOAD ANIMATION: gentle scale-up from 50% to 100% ===
    const loadProgress = Math.min(1.0, loadElapsedRef.current / LOAD_DURATION)
    const easedLoad = easeOutQuart(loadProgress)
    const loadScale = THREE.MathUtils.lerp(LOAD_SCALE_FROM, LOAD_TARGET_SCALE, easedLoad)

    // === SCROLL: rises UP, shrinks, and tilts ===
    const scroll = getLenisScrollSnapshot()
    const scrollT = Math.min(scroll.scrollTop / size.height, 1.5)
    const t = state.clock.elapsedTime
    const idleFloat = Math.sin(t * 1.5) * 0.04

    const scrollY = scrollT * SCROLL_RISE_SPEED
    const finalY = scrollY + idleFloat
    groupRef.current.position.set(0, finalY, 0)

    const scrollScale = THREE.MathUtils.lerp(1.0, SCROLL_SCALE_MIN, Math.min(scrollT * 1.2, 1.0))
    const combinedScale = loadScale * scrollScale
    groupRef.current.scale.set(combinedScale, combinedScale, combinedScale)

    // === POINTER INTERACTIVITY ===
    const pointer = getPointerUV()
    const inside = isPointerInside()
    const mappedX = (pointer.x - 0.5) * 10
    const mappedY = (pointer.y - 0.5) * 6
    const lightCoords = ringFollower(mappedX, mappedY, inside, clampedDelta)

    // Sync FBO + uResolution
    const dbW = gl.domElement.width
    const dbH = gl.domElement.height
    if (fbo.width !== dbW || fbo.height !== dbH) {
      fbo.setSize(dbW, dbH)
    }
    materialRef.current.uniforms.uResolution.value.set(dbW, dbH)
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uLightPos.value.set(
      lightCoords.x,
      lightCoords.y + finalY,
      1.1
    )
    materialRef.current.uniforms.uCameraPos.value.copy(camera.position)

    // === TILT: mouse-responsive + scroll-driven tilt ===
    const mouseRotX = -(pointer.y - 0.5) * 0.20
    const mouseRotY = (pointer.x - 0.5) * 0.25

    const scrollFactor = Math.min(scrollT, 1.0)
    const scrollRotY = scrollFactor * SCROLL_TILT_RIGHT_MAX
    const scrollRotX = scrollFactor * -0.15

    const targetRotX = mouseRotX + scrollRotX
    const targetRotY = mouseRotY + scrollRotY
    const targetRotZ = 0

    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.08)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.08)
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, 0.08)

    // Capture scene (with stickers) into FBO
    meshRef.current.visible = false
    gl.setRenderTarget(fbo)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    meshRef.current.visible = true

    materialRef.current.uniforms.uTexture.value = fbo.texture
  })

  // Build initial geometry (or placeholder until font loads)
  const initialGeometry = useMemo(() => {
    if (!font) return new THREE.BufferGeometry()
    const parts = getCountdownParts()
    lastTextRef.current = parts.key
    return buildCountdownGeometry(parts, font)
  }, [font])

  return (
    <>
      <group
        ref={groupRef}
        position={[0, 0, 0]}
        scale={LOAD_SCALE_FROM}
      >
        {/* renderOrder=10 ensures glass always composites ON TOP of stickers (renderOrder=5) */}
        <mesh ref={meshRef} geometry={initialGeometry} renderOrder={10}>
          <shaderMaterial
            ref={materialRef}
            vertexShader={glassVertexShader}
            fragmentShader={glassFragmentShader}
            uniforms={uniforms}
            transparent={true}
            depthWrite={false}
          />
        </mesh>
      </group>
      <FallingStickers />
    </>
  )
}
