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
const ZOOM_START_VH = -0.2
const ZOOM_END_VH = 3.0
const ROT_END_VH = 3.0     // Rotation synced with zoom — both finish together
const FADE_START_VH = 2.5
const FADE_END_VH = 3.0

// ─── Reverse Scroll Ranges ───────────────────────────────────────────
const REV_FADE_IN_START = 14.5
const REV_FADE_IN_END = 15.0
const REV_ZOOM_START = 15.0
const REV_ZOOM_END = 18.2
const REV_ROT_START = 15.0  // Rotation synced with zoom — both start together
const REV_ROT_END = 18.2    // Rotation synced with zoom — both finish together
const REV_FADE_OUT_START = 18.3
const REV_FADE_OUT_END = 18.8

const NUM_Y_ROTATIONS = 2
const MAX_SCALE = 10.2      // 85% screen coverage — doesn't fully cover
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

void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocalNormal = normal;
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

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPosition);
  float NdotV = clamp(dot(N, V), 0.0, 1.0);

  float edgeFactor = clamp(length(vLocalNormal.xy) * 2.2, 0.0, 1.0);
  edgeFactor = smoothstep(0.12, 0.70, edgeFactor);

  // Pop pink colors
  vec3 baseColor = vec3(1.00, 0.15, 0.55); // vibrant pop pink
  vec3 darkColor = vec3(0.65, 0.05, 0.35); // deep magenta core
  float shade = 0.50 + 0.50 * NdotV;
  vec3 color = mix(darkColor, baseColor, shade);

  float fresnel = pow(1.0 - NdotV, 4.0);
  vec3 fresnelColor = vec3(1.0, 0.6, 0.8);
  color += fresnel * fresnelColor * 0.4; // Stronger fresnel for glass look

  vec3 L = normalize(uLightPos - vWorldPosition);
  vec3 H = normalize(L + V);
  float NdotH = clamp(dot(N, H), 0.0, 1.0);

  // Glossy, tight specular highlight
  float specRaw = pow(NdotH, 512.0) * uLightIntensity;
  float specular = specRaw * edgeFactor * 2.5;

  float rimGlint = pow(1.0 - NdotV, 3.0)
    * pow(clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), 4.0)
    * edgeFactor * edgeFactor
    * uLightIntensity * 1.5;

  vec3 finalColor = color + (specular + rimGlint) * vec3(1.0, 0.90, 0.95);

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

    const rawZoom1 = smoothstep(ZOOM_START_VH, ZOOM_END_VH, aVH)
    const zoomT1 = easeInOutCubic(rawZoom1)
    const rawZoom2 = smoothstep(REV_ZOOM_START, REV_ZOOM_END, aVH)
    const zoomT2 = easeInOutCubic(rawZoom2)
    
    const zoomT = zoomT1 - zoomT2
    const scale = BASE_SCALE + zoomT * (MAX_SCALE - BASE_SCALE)
    groupRef.current.scale.setScalar(scale)

    const rawRot1 = smoothstep(ZOOM_START_VH, ROT_END_VH, aVH)
    const rotT1 = easeInOutCubic(rawRot1)
    const rawRot2 = smoothstep(REV_ROT_START, REV_ROT_END, aVH)
    const rotT2 = easeInOutCubic(rawRot2)

    // Forward: 3 rotations, Reverse: 3 rotations (finishing early while arrow is still small)
    const rotT = rotT1 - rotT2
    groupRef.current.rotation.y = rotT * Math.PI * 2 * NUM_Y_ROTATIONS

    groupRef.current.rotation.z = INITIAL_TILT_Z
    groupRef.current.rotation.x = INITIAL_TILT_X

    const t = state.clock.elapsedTime
    const floatAmp = (1 - zoomT) * 0.06
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
