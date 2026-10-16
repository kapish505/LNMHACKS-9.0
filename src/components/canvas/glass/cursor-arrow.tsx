'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { getPointerUV, isPointerInside } from '@/lib/pointer-bus'
import { createRingLightFollower } from './ring-light-follower'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'

// ─── Scroll Ranges (relative to arrow-section top, in vh) ───────────
const APPEAR_VH = -0.8
const APPEAR_END_VH = -0.3
const FADE_START_VH = 2.0
const FADE_END_VH = 2.5

// ─── Reverse Scroll Ranges (after the complete six-event timeline) ─────────
// The timeline now uses a longer, deliberate scroll window through 15.9 VH.
// Keeping this transition after that exit prevents the fullscreen pointer from
// cutting across event cards or the walking figure.
const REV_FADE_IN_START = 16.05
const REV_FADE_IN_END = 16.42
const REV_FADE_OUT_START = 16.84
const REV_FADE_OUT_END = 17.22

const BASE_SCALE = 0.85

const INITIAL_TILT_Z = -18 * (Math.PI / 180)
const INITIAL_TILT_X = 12 * (Math.PI / 180)

// ─── Easing ──────────────────────────────────────────────────────────
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ─── Cursor Arrow Geometry (clean pointer, no tail) ──────────────────
function createCursorGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, 1.1)
  shape.lineTo(0.58, -0.65)
  shape.lineTo(0.08, -0.20)
  shape.lineTo(0, -0.40)
  shape.lineTo(-0.08, -0.20)
  shape.lineTo(-0.58, -0.65)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.022,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 16,
  })
  geo.center()
  return geo
}

const cursorVertexShader = `
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocalNormal = normal;
  vLocalPosition = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const cursorFragmentShader = `
precision highp float;

uniform vec3 uLightPos;
uniform float uLightIntensity;
uniform vec3 uCameraPos;
uniform float uOpacity;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPosition);
  float NdotV = clamp(dot(N, V), 0.0, 1.0);

  float edgeFactor = clamp(length(vLocalNormal.xy) * 2.2, 0.0, 1.0);
  edgeFactor = smoothstep(0.12, 0.70, edgeFactor);

  // Gradient inspired by LNMHACKS logo colors:
  // Wings / Base: Deep Electric Blue (0.12, 0.38, 1.0)
  // Mid / Body: Electric Sky Cyan (0.00, 0.88, 0.98)
  // Tip: Vivid Neon Red / Coral Pink (1.00, 0.20, 0.40)
  // Arrow geometry centered Y is roughly -0.875 to +0.875
  float tGrad = clamp((vLocalPosition.y + 0.875) / 1.75, 0.0, 1.0);

  vec3 colBlue = vec3(0.12, 0.38, 1.00); // Deep electric blue
  vec3 colCyan = vec3(0.00, 0.88, 0.98); // Bright electric cyan
  vec3 colPink = vec3(1.00, 0.20, 0.40); // Vivid logo neon red/pink

  vec3 gradColor;
  if (tGrad < 0.45) {
    gradColor = mix(colBlue, colCyan, tGrad / 0.45);
  } else {
    gradColor = mix(colCyan, colPink, (tGrad - 0.45) / 0.55);
  }

  // Core shading & three-dimensional depth
  vec3 darkCore = gradColor * 0.42;
  float shade = 0.45 + 0.55 * NdotV;
  vec3 color = mix(darkCore, gradColor, shade);

  // Fresnel edge glass glow with subtle cyan-white glint
  float fresnel = pow(1.0 - NdotV, 3.5);
  vec3 fresnelColor = mix(colCyan, vec3(1.0), 0.5);
  color += fresnel * fresnelColor * 0.55;

  // Tight, glossy specular highlight from ring light
  vec3 L = normalize(uLightPos - vWorldPosition);
  vec3 H = normalize(L + V);
  float NdotH = clamp(dot(N, H), 0.0, 1.0);

  float specRaw = pow(NdotH, 512.0) * uLightIntensity;
  float specular = specRaw * edgeFactor * 2.5;

  float rimGlint = pow(1.0 - NdotV, 3.0)
    * pow(clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), 4.0)
    * edgeFactor * edgeFactor
    * uLightIntensity * 1.5;

  vec3 finalColor = color + (specular + rimGlint) * vec3(1.0, 0.95, 1.0);

  gl_FragColor = vec4(finalColor, uOpacity);
}
`

export function CursorArrow() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const ringFollower = useMemo(() => createRingLightFollower(), [])
  const { camera } = useThree()

  const geometry = useMemo(() => createCursorGeometry(), [])

  const uniforms = useMemo(
    () => ({
      uLightPos: { value: new THREE.Vector3(0, 0, 1.5) },
      uLightIntensity: { value: 1.8 },
      uCameraPos: { value: new THREE.Vector3(0, 0, 5) },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current || !materialRef.current) return

    const aVH = getArrowSectionVH()

    const fadeIn1 = smoothstep(APPEAR_VH, APPEAR_END_VH, aVH)
    const fadeOut1 = 1.0 - smoothstep(FADE_START_VH, FADE_END_VH, aVH)
    const opacity1 = fadeIn1 * fadeOut1

    const fadeIn2 = smoothstep(REV_FADE_IN_START, REV_FADE_IN_END, aVH)
    const fadeOut2 = 1.0 - smoothstep(REV_FADE_OUT_START, REV_FADE_OUT_END, aVH)
    const opacity2 = fadeIn2 * fadeOut2

    const opacity = Math.max(opacity1, opacity2)

    if (opacity < 0.001) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.visible = true

    const STAGE1_SCALE = BASE_SCALE * 1.10 // Initial 10% size increase
    const SCALE_90 = 10.5                  // 90% screen coverage
    const SCALE_100 = 13.5                 // 100% full screen coverage

    let scale = BASE_SCALE
    let rotY = 0

    // The two arrow phases sit before and after the timeline window.
    if (aVH < 15.5) {
      // ── Forward Arrow Phase Timeline ──
      // 1. Initial phase (aVH: -0.2 to 0.4): increase size by 10% normally with 0 rotation
      // 2. Main phase (aVH: 0.4 to 1.8): complete full 180° rotation while growing to 90% screen coverage
      // 3. Final phase (aVH: 1.8 to 2.3): gradually increase from 90% to 100% screen coverage (holding 180°)
      if (aVH <= -0.2) {
        scale = BASE_SCALE
        rotY = 0
      } else if (aVH < 0.4) {
        const p1 = easeInOutCubic(smoothstep(-0.2, 0.4, aVH))
        scale = BASE_SCALE + p1 * (STAGE1_SCALE - BASE_SCALE)
        rotY = 0
      } else if (aVH < 1.8) {
        const p2 = easeInOutCubic(smoothstep(0.4, 1.8, aVH))
        scale = STAGE1_SCALE + p2 * (SCALE_90 - STAGE1_SCALE)
        rotY = p2 * Math.PI // Total rotation = 180 degrees (half turn)
      } else {
        const p3 = easeInOutCubic(smoothstep(1.8, 2.3, aVH))
        scale = SCALE_90 + p3 * (SCALE_100 - SCALE_90)
        rotY = Math.PI // Holds at 180 degrees
      }
    } else {
      // ── Backward Arrow Phase Timeline (Exact Mirror Reverse) ──
      // 1. Enters at 100% coverage at 180°, shrinks to 90%.
      // 2. Shrinks from 90% to stage 1 while rotating back to 0°.
      // 3. Settles to base scale, then shrinks away.
      if (aVH <= REV_FADE_IN_START) {
        scale = SCALE_100
        rotY = Math.PI
      } else if (aVH < REV_FADE_IN_END) {
        const p3 = easeInOutCubic(smoothstep(REV_FADE_IN_START, REV_FADE_IN_END, aVH))
        scale = SCALE_100 - p3 * (SCALE_100 - SCALE_90)
        rotY = Math.PI
      } else if (aVH < REV_FADE_OUT_START) {
        const p2 = easeInOutCubic(smoothstep(REV_FADE_IN_END, REV_FADE_OUT_START, aVH))
        scale = SCALE_90 - p2 * (SCALE_90 - STAGE1_SCALE)
        rotY = (1.0 - p2) * Math.PI
      } else if (aVH < 17.02) {
        const p1 = easeInOutCubic(smoothstep(REV_FADE_OUT_START, 17.02, aVH))
        scale = STAGE1_SCALE - p1 * (STAGE1_SCALE - BASE_SCALE)
        rotY = 0
      } else {
        const pShrink = easeInOutCubic(smoothstep(17.02, REV_FADE_OUT_END, aVH))
        scale = Math.max(0, BASE_SCALE * (1.0 - pShrink))
        rotY = 0
      }
    }

    groupRef.current.scale.setScalar(scale)
    groupRef.current.rotation.y = rotY

    // Ease out initial tilts as scale approaches fullscreen for clean screen coverage
    const tiltFade = 1.0 - smoothstep(STAGE1_SCALE, SCALE_90, scale) * 0.75
    groupRef.current.rotation.z = INITIAL_TILT_Z * tiltFade
    groupRef.current.rotation.x = INITIAL_TILT_X * tiltFade

    const t = state.clock.elapsedTime
    const floatAmp = scale > BASE_SCALE * 1.5 ? 0 : 0.05
    groupRef.current.position.y = Math.sin(t * 1.5) * floatAmp

    const pointer = getPointerUV()
    const inside = isPointerInside()
    const mappedX = (pointer.x - 0.5) * 10
    const mappedY = (pointer.y - 0.5) * 6
    const clampedDelta = Math.min(delta, 0.1)
    const lightCoords = ringFollower(mappedX, mappedY, inside, clampedDelta)

    materialRef.current.uniforms.uLightPos.value.set(lightCoords.x, lightCoords.y, 1.5)
    materialRef.current.uniforms.uCameraPos.value.copy(camera.position)
    materialRef.current.uniforms.uOpacity.value = opacity
    materialRef.current.uniforms.uTime.value = t
  })

  return (
    <group ref={groupRef} scale={BASE_SCALE}>
      <mesh ref={meshRef} geometry={geometry} renderOrder={15}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={cursorVertexShader}
          fragmentShader={cursorFragmentShader}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
