'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { getPointerUV, isPointerInside } from '@/lib/pointer-bus'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { createCurlStrengthSampler } from './curl-strength'
import { vertexShader, fragmentShader } from '@/shaders/dom-sync'
import { domRegistry } from '@/lib/dom-registry'
import { PROJECTS } from '@/components/dom/project-grid'

// These quads are axis-aligned in screen space and sampled at close to 1:1, so
// anisotropic filtering never contributes a different sample than trilinear
// does. 16x was costing texel fetches for an identical result.
const ANISOTROPY = 4

function ProjectMesh({ project, index = 0, parentInView = true }: { project: any, index?: number, parentInView?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { size } = useThree()

  const [map1, map2] = useTexture([project.img1, project.img2])

  // Apply sRGB correctly & maximum texture sharpness
  useMemo(() => {
    if (map1) {
      map1.colorSpace = THREE.SRGBColorSpace
      map1.generateMipmaps = true
      map1.minFilter = THREE.LinearMipmapLinearFilter
      map1.magFilter = THREE.LinearFilter
      map1.anisotropy = ANISOTROPY
      map1.needsUpdate = true
    }
    if (map2) {
      map2.colorSpace = THREE.SRGBColorSpace
      map2.generateMipmaps = true
      map2.minFilter = THREE.LinearMipmapLinearFilter
      map2.magFilter = THREE.LinearFilter
      map2.anisotropy = ANISOTROPY
      map2.needsUpdate = true
    }
  }, [map1, map2])

  const hoverSpring = useRef(0)
  const curlSamplerRef = useRef(createCurlStrengthSampler())

  const uniforms = useMemo(() => ({
    map: { value: map1 },
    mapHover: { value: map2 },
    uRect: { value: new THREE.Vector4(0, 0, 0, 0) },
    uHoverRevealProgress: { value: 0 },
    uDotPixelSize: { value: 8.0 },
    uViewportPx: { value: new THREE.Vector2(size.width, size.height) },
    uPolarityPositive: { value: 1.0 },
    uCurlStrength: { value: 0 }
  }), [map1, map2, size])

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return
    if (!parentInView) {
      if (meshRef.current.visible) meshRef.current.visible = false
      return
    }

    const entry = domRegistry.getEntry(project.id)
    if (!entry || !entry.el) {
      meshRef.current.visible = false
      return
    }

    const rect = entry.el.getBoundingClientRect()
    // Robust viewport culling: only render when anywhere near the screen
    const isVisible =
      rect.bottom >= -200 &&
      rect.top <= size.height + 200 &&
      rect.width > 0 &&
      rect.height > 0

    if (!isVisible) {
      meshRef.current.visible = false
      return
    }

    meshRef.current.visible = true

    const clampedDelta = Math.min(delta, 0.1)
    const scroll = getLenisScrollSnapshot()
    const curl = curlSamplerRef.current(scroll.scrollTop, clampedDelta)

    const x = rect.left / size.width
    const y = 1.0 - (rect.top + rect.height) / size.height
    const w = rect.width / size.width
    const h = rect.height / size.height

    const mat = materialRef.current
    mat.uniforms.uRect.value.set(x, y, w, h)
    mat.uniforms.uViewportPx.value.set(size.width, size.height)
    mat.uniforms.uCurlStrength.value = curl

    // Dual-guarantee hover detection: DOM event OR direct cursor hit-testing
    const pointer = getPointerUV()
    const pointerInside = isPointerInside()
    const mouseX = pointer.x * size.width
    const mouseY = (1.0 - pointer.y) * size.height
    const isDirectlyOver =
      pointerInside &&
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom

    const isHovered = Boolean(entry.hovered || isDirectlyOver)
    const targetHover = isHovered ? 1.0 : 0.0

    hoverSpring.current += (targetHover - hoverSpring.current) * (1 - Math.exp(-clampedDelta * 12))
    if (hoverSpring.current < 0.0005 && targetHover === 0.0) {
      hoverSpring.current = 0.0
    }

    mat.uniforms.uHoverRevealProgress.value = hoverSpring.current
    mat.uniforms.uPolarityPositive.value = 1.0
  })

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={2 + index}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

export function ProjectMeshes() {
  const active = useMemo(() => PROJECTS.filter((p: any) => p.useWebgl), [])
  const [inView, setInView] = useState(false)
  // Sticky: once the sponsors section is within loading range we keep the
  // meshes mounted, so their textures are fetched and decoded exactly once.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const el = document.getElementById('sponsors')
    if (!el) return

    // Two ranges on purpose. `loadIo` fires well before the section is on
    // screen so textures are already decoded by the time it scrolls in;
    // `viewIo` is the tight range that actually lets the meshes draw.
    // Previously every texture was requested during the hero, putting ~7MB of
    // sponsor PNGs on the critical path for a section five screens down.
    const loadIo = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setMounted(true)
        loadIo.disconnect()
      }
    }, { rootMargin: '1800px 0px' })

    const viewIo = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
    }, { rootMargin: '400px 0px' })

    loadIo.observe(el)
    viewIo.observe(el)
    return () => {
      loadIo.disconnect()
      viewIo.disconnect()
    }
  }, [])

  if (!mounted || active.length === 0) return null

  return (
    <group>
      {active.map((p, i) => (
        <ProjectMesh key={p.id} project={p} index={i} parentInView={inView} />
      ))}
    </group>
  )
}
