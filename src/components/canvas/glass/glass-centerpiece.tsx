'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FallingStickers } from './stickers'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { getPointerUV, isPointerInside } from '@/lib/pointer-bus'
import { createRingLightFollower } from './ring-light-follower'
import { useGLTF } from '@react-three/drei'

// Load animation: gentle scale-up from 50% to 100% (target scale 1.22)
const LOAD_TARGET_SCALE = 1.37 // reduced 25% (was 1.83)
const LOAD_SCALE_FROM = 0.685  // 50% of target scale
const LOAD_DURATION = 2.5      // seconds

// Scroll behavior: centerpiece rises UP, shrinks, and tilts to its right up to 80 degrees
const SCROLL_RISE_SPEED = 3.8
const SCROLL_SCALE_MIN = 0.38 * LOAD_TARGET_SCALE
const SCROLL_TILT_RIGHT_MAX = (80 * Math.PI) / 180 // 80 degrees (~1.396 rad)

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

const glassVertexShader = `
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocalNormal = normal; // Object-space normal for invariant bevel detection
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
  
  // Object-space bevel factor: 0.0 on flat front face, 1.0 on curved bevels (invariant to model tilt!)
  float edgeFactor = clamp(length(vLocalNormal.xy) * 2.2, 0.0, 1.0);
  edgeFactor = smoothstep(0.12, 0.70, edgeFactor);
  
  // Refraction offset: purely on bevels, leaving the flat front face 100% 1:1 pixel-exact
  vec2 uvOffset = vLocalNormal.xy * (0.014 * edgeFactor);
  
  // Prismatic chromatic dispersion on bevels
  vec2 dispR = uvOffset * 1.15;
  vec2 dispG = uvOffset;
  vec2 dispB = uvOffset * 0.85;
  
  // Frosted Glass: High-frequency noise for scattering
  float scatter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  vec2 frostJitter = vec2(cos(scatter * 6.28), sin(scatter * 6.28)) * 0.004;
  
  // Fast 4-tap frosted blur
  vec3 color = vec3(0.0);
  vec2 blur = vec2(0.006); // Blur spread
  
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
  
  // 1. Fresnel edge reflection (luminous perimeter glow on bevels)
  float fresnel = pow(1.0 - NdotV, 3.0) * edgeFactor;
  vec3 fresnelTint = vec3(0.96, 0.98, 1.0);
  
  // 2. Bevel Specular Rim Glint (STRICTLY on curved bevel edges, ZERO blob on flat front)
  vec3 L = normalize(uLightPos - vWorldPosition);
  vec3 H = normalize(L + V);
  float NdotH = clamp(dot(N, H), 0.0, 1.0);
  float specular = pow(NdotH, 24.0) * edgeFactor * (uLightIntensity * 1.5);
  
  // Grazing bevel rim streak
  float rimGlint = pow(1.0 - NdotV, 2.0) * pow(clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), 2.5) * edgeFactor * (uLightIntensity * 1.8);
  
  // Final composite: frosted background + edge fresnel + specular rim glints
  vec3 finalGlass = color + fresnel * fresnelTint * 0.25 + (specular + rimGlint) * vec3(1.0);
  
  // Add a subtle milky frosted tint to the entire surface
  finalGlass = mix(finalGlass, vec3(0.95, 0.90, 0.92), 0.12);
  
  gl_FragColor = vec4(finalGlass, 1.0);
}
`

export function GlassCenterpiece() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const ringFollower = useMemo(() => createRingLightFollower(), [])
  const loadElapsedRef = useRef(0)
  const { size, gl, scene, camera } = useThree()

  // FBO: create at a reasonable initial size; we'll sync it every frame
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

  const { scene: gltfScene } = useGLTF('/hacks.glb') as any

  const geometry = useMemo(() => {
    if (!gltfScene) return new THREE.BufferGeometry()

    const geometries: THREE.BufferGeometry[] = []
    gltfScene.updateMatrixWorld(true)

    gltfScene.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        const geo = child.geometry.clone()
        geo.applyMatrix4(child.matrixWorld)
        // Stand it up vertically
        geo.rotateX(Math.PI / 2)
        geometries.push(geo)
      }
    })

    if (geometries.length === 0) return new THREE.BufferGeometry()

    // Fix the "9.0" offset by aligning its bottom to the main text's bottom
    // NOTE: Commented out because the user uploaded a new custom hacks.glb
    /*
    if (geometries.length >= 2) {
      geometries[0].computeBoundingBox()
      geometries[1].computeBoundingBox()
      
      let mainGeo = geometries[0]
      let numGeo = geometries[1]
      
      if (geometries[0].boundingBox!.min.x > geometries[1].boundingBox!.min.x) {
        mainGeo = geometries[1]
        numGeo = geometries[0]
      }
      
      const mainMinY = mainGeo.boundingBox!.min.y
      const numMinY = numGeo.boundingBox!.min.y
      numGeo.translate(0, mainMinY - numMinY, 0)
    }
    */

    const merged = BufferGeometryUtils.mergeGeometries(geometries, false)
    if (!merged) return geometries[0]

    merged.computeBoundingBox()
    const box = merged.boundingBox!
    const center = new THREE.Vector3()
    box.getCenter(center)
    merged.translate(-center.x, -center.y, -center.z)

    // Normalize scale so it fits nicely
    const sizeVec = new THREE.Vector3()
    box.getSize(sizeVec)
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z)
    if (maxDim > 0) {
      const scale = 2.5 / maxDim // target size around 2.5 units
      merged.scale(scale, scale, scale)
    }

    return merged
  }, [gltfScene])

  useFrame((state, delta) => {
    if (!groupRef.current || !materialRef.current || !meshRef.current) return

    const clampedDelta = Math.min(delta, 0.1)
    loadElapsedRef.current += clampedDelta

    // Skip expensive FBO pass when centerpiece is scrolled well off-screen
    const earlyScroll = getLenisScrollSnapshot()
    const earlyScrollVH = earlyScroll.scrollTop / size.height
    if (earlyScrollVH > 2.0) {
      meshRef.current.visible = false
      return
    }

    // === LOAD ANIMATION: gentle scale-up from 50% to 100% (+16% larger base size) ===
    const loadProgress = Math.min(1.0, loadElapsedRef.current / LOAD_DURATION)
    const easedLoad = easeOutQuart(loadProgress)
    const loadScale = THREE.MathUtils.lerp(LOAD_SCALE_FROM, LOAD_TARGET_SCALE, easedLoad)

    // === SCROLL: centerpiece rises UP, shrinks, and tilts ===
    const scroll = getLenisScrollSnapshot()
    const scrollT = Math.min(scroll.scrollTop / size.height, 1.5) // 0 at top, ~1 at 1vh scroll
    const t = state.clock.elapsedTime
    const idleFloat = Math.sin(t * 1.5) * 0.04

    // Position: rises UPWARD as you scroll down
    const scrollY = scrollT * SCROLL_RISE_SPEED
    const finalY = scrollY + idleFloat
    groupRef.current.position.set(0, finalY, 0)

    // Scale: shrinks as you scroll, combined with load animation
    const scrollScale = THREE.MathUtils.lerp(1.0, SCROLL_SCALE_MIN, Math.min(scrollT * 1.2, 1.0))
    const combinedScale = loadScale * scrollScale
    groupRef.current.scale.set(combinedScale, combinedScale, combinedScale)

    // === POINTER INTERACTIVITY ===
    const pointer = getPointerUV()
    const inside = isPointerInside()
    const mappedX = (pointer.x - 0.5) * 10
    const mappedY = (pointer.y - 0.5) * 6
    const lightCoords = ringFollower(mappedX, mappedY, inside, clampedDelta)

    // Sync FBO + uResolution to ACTUAL drawing buffer pixels
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

    // === TILT: mouse-responsive + scroll-driven tilt to its right up to 80 degrees ===
    const mouseRotX = -(pointer.y - 0.5) * 0.20
    const mouseRotY = (pointer.x - 0.5) * 0.25

    // Tilt to its right up to 80 degrees as user scrolls down
    const scrollFactor = Math.min(scrollT, 1.0)
    const scrollRotY = scrollFactor * SCROLL_TILT_RIGHT_MAX
    const scrollRotX = scrollFactor * -0.15 // subtle 3D pitch depth

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

  return (
    <>
      <group
        ref={groupRef}
        position={[0, 0, 0]}
        scale={LOAD_SCALE_FROM}
      >
        {/* renderOrder=10 ensures glass always composites ON TOP of stickers (renderOrder=5) */}
        <mesh ref={meshRef} geometry={geometry} renderOrder={10}>
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

useGLTF.preload('/hacks.glb')
