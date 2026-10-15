'use client'

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ──────────────────────────────────────────────────────────────────────────
   GLINT-ONLY SHADER — renders ring-light specular glints on transparent bg.
   Composited on top of a native <img> via mix-blend-mode: screen.
   ────────────────────────────────────────────────────────────────────────── */

const glintVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const glintFragmentShader = `
precision highp float;

uniform sampler2D uTexture;
uniform vec3 uLightPos;
uniform float uLightIntensity;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  if (tex.a < 0.02) discard;

  vec2 texel = vec2(1.0 / 1031.0, 1.0 / 1149.0);

  float aL = texture2D(uTexture, vUv - vec2(texel.x * 2.0, 0.0)).a;
  float aR = texture2D(uTexture, vUv + vec2(texel.x * 2.0, 0.0)).a;
  float aD = texture2D(uTexture, vUv - vec2(0.0, texel.y * 2.0)).a;
  float aU = texture2D(uTexture, vUv + vec2(0.0, texel.y * 2.0)).a;

  float lumL = dot(texture2D(uTexture, vUv - vec2(texel.x * 1.5, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float lumR = dot(texture2D(uTexture, vUv + vec2(texel.x * 1.5, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float lumD = dot(texture2D(uTexture, vUv - vec2(0.0, texel.y * 1.5)).rgb, vec3(0.299, 0.587, 0.114));
  float lumU = dot(texture2D(uTexture, vUv + vec2(0.0, texel.y * 1.5)).rgb, vec3(0.299, 0.587, 0.114));

  float dX = (aR - aL) * 3.6 + (lumR - lumL) * 1.2;
  float dY = (aU - aD) * 3.6 + (lumU - lumD) * 1.2;

  vec3 N = normalize(vec3(-dX, -dY, 1.0));
  vec3 V = normalize(uCameraPos - vWorldPosition);
  float NdotV = clamp(dot(N, V), 0.0, 1.0);

  float edgeFactor = clamp(length(vec2(dX, dY)) * 2.2, 0.0, 1.0);
  edgeFactor = smoothstep(0.06, 0.60, edgeFactor);

  vec3 L = normalize(uLightPos - vWorldPosition);
  vec3 H = normalize(L + V);
  float NdotH = clamp(dot(N, H), 0.0, 1.0);

  float specRaw = pow(NdotH, 64.0) * uLightIntensity;
  float specular = specRaw * (0.15 + edgeFactor * 2.4);

  float rimGlint = pow(1.0 - NdotV, 2.5)
    * pow(clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), 3.0)
    * edgeFactor
    * uLightIntensity * 1.4;

  float totalGlint = specular + rimGlint;
  gl_FragColor = vec4(vec3(1.0), totalGlint * tex.a);
}
`

const LOGO_ASPECT = 1031 / 1149

/** Shared mutable pointer state, written by the parent section without re-rendering. */
export interface RingPointerState {
  angle: number
  tracking: boolean
}

function GlintOverlay({
  sweepRef,
  pointerState,
}: {
  sweepRef: React.MutableRefObject<number>
  pointerState?: React.MutableRefObject<RingPointerState>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const currentAngleRef = useRef(Math.PI * 0.35)
  const { camera } = useThree()

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const tex = loader.load('/logo.png')
    tex.colorSpace = THREE.SRGBColorSpace
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    // The logo quad is screen-aligned and sampled near 1:1, so anisotropic
    // filtering cannot pick a different texel set than trilinear does.
    tex.anisotropy = 4
    return tex
  }, [])

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uLightPos: { value: new THREE.Vector3(0, 0, 1.4) },
      uLightIntensity: { value: 2.4 },
      uCameraPos: { value: new THREE.Vector3(0, 0, 5) },
    }),
    [texture]
  )

  const meshHeight = 4.0
  const meshWidth = meshHeight * LOGO_ASPECT
  const radiusX = 1.95
  const radiusY = 2.15

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return
    materialRef.current.uniforms.uCameraPos.value.copy(camera.position)
    meshRef.current.rotation.set(0, 0, 0)

    const sweepProgress = sweepRef.current

    if (sweepProgress > 0 && sweepProgress < 1) {
      // 360° sweep animation
      const angle = -Math.PI / 2 + sweepProgress * Math.PI * 2
      materialRef.current.uniforms.uLightPos.value.set(
        radiusX * Math.cos(angle),
        radiusY * Math.sin(angle),
        1.35
      )
      materialRef.current.uniforms.uLightIntensity.value = 3.8
    } else {
      // Follow pointer angle from anywhere in the about section
      const isTracking = pointerState?.current.tracking ?? false
      const mouseAngle = pointerState?.current.angle ?? Math.PI * 0.35
      const targetAngle = isTracking ? mouseAngle : Math.PI * 0.35

      const shortest = Math.atan2(
        Math.sin(targetAngle - currentAngleRef.current),
        Math.cos(targetAngle - currentAngleRef.current)
      )
      const clampedDelta = Math.min(delta, 0.1)
      currentAngleRef.current += shortest * (1 - Math.exp(-6.5 * clampedDelta))

      materialRef.current.uniforms.uLightPos.value.set(
        radiusX * Math.cos(currentAngleRef.current),
        radiusY * Math.sin(currentAngleRef.current),
        1.35
      )
      materialRef.current.uniforms.uLightIntensity.value = isTracking ? 3.0 : 2.2
    }
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[meshWidth, meshHeight]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={glintVertexShader}
        fragmentShader={glintFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  )
}

export interface AboutRingLogoProps {
  className?: string
  /** Shared pointer state written by the parent section, read in useFrame. */
  pointerState?: React.MutableRefObject<RingPointerState>
}

export function AboutRingLogo({ className = '', pointerState }: AboutRingLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)
  // The WebGL context, shader program and logo texture used to be created on
  // mount — during the hero, five screens before this is visible. Defer the
  // whole canvas until the section is approached, then keep it alive.
  const [mounted, setMounted] = useState(false)
  // Driven by rAF. This was React state, so a 1.6s sweep meant 96 renders of
  // this component (and its Canvas) back to back.
  const sweepRef = useRef(0)
  const isAnimatingRef = useRef(false)
  const wasVisibleRef = useRef(false)

  // Trigger 360° sweep — can be called multiple times
  const triggerCircleSweep = useCallback(() => {
    if (isAnimatingRef.current) return
    isAnimatingRef.current = true

    const startTime = performance.now()
    const duration = 1600

    const animate = (now: number) => {
      const elapsed = now - startTime
      const raw = Math.min(1, elapsed / duration)
      sweepRef.current = 1 - Math.pow(1 - raw, 3)

      if (raw < 1) {
        requestAnimationFrame(animate)
      } else {
        sweepRef.current = 1
        isAnimatingRef.current = false
      }
    }

    requestAnimationFrame(animate)
  }, [])

  // IntersectionObserver — controls frameloop and triggers sweep on visible
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setMounted(true)
          setIsInView(entry.isIntersecting)
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            // Fire sweep every time it becomes visible
            if (!wasVisibleRef.current) {
              wasVisibleRef.current = true
              triggerCircleSweep()
            }
          } else if (entry.intersectionRatio < 0.05) {
            // Re-arm as soon as it's mostly out of view
            wasVisibleRef.current = false
          }
        })
      },
      { threshold: [0, 0.05, 0.2, 0.5], rootMargin: '400px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [triggerCircleSweep])

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[1031/1149] select-none ${className}`}
    >
      {/* Layer 1: Pixel-perfect native <img> */}
      <img
        src="/logo.png"
        alt="LNMHACKS Logo"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Layer 2: Transparent WebGL glint overlay — sleeps when scrolled out of view */}
      <div className="absolute inset-0" style={{ mixBlendMode: 'screen' }}>
        {mounted && (
          <Canvas
            frameloop={isInView ? 'always' : 'never'}
            camera={{ position: [0, 0, 5], fov: 45 }}
            /*
             * antialias was on, which allocated an MSAA buffer and ran a
             * resolve pass every frame. The only geometry is one screen-aligned
             * quad with no geometric edges to sample — every visible edge comes
             * from the texture's alpha, which MSAA does not touch. Disabling it
             * is pixel-identical here.
             */
            gl={{ alpha: true, antialias: false, powerPreference: 'high-performance', premultipliedAlpha: false }}
            dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.25) : 1}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          >
            <GlintOverlay sweepRef={sweepRef} pointerState={pointerState} />
          </Canvas>
        )}
      </div>
    </div>
  )
}
