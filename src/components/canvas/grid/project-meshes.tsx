'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { createCurlStrengthSampler } from './curl-strength'
import { vertexShader, fragmentShader } from '@/shaders/dom-sync'
import { domRegistry } from '@/lib/dom-registry'
import { PROJECTS } from '@/components/dom/project-grid'

function ProjectMesh({ project, index = 0 }: { project: any, index?: number }) {
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
      map1.anisotropy = 16
      map1.needsUpdate = true
    }
    if (map2) {
      map2.colorSpace = THREE.SRGBColorSpace
      map2.generateMipmaps = true
      map2.minFilter = THREE.LinearMipmapLinearFilter
      map2.magFilter = THREE.LinearFilter
      map2.anisotropy = 16
      map2.needsUpdate = true
    }
  }, [map1, map2])
  
  const hoverSpring = useRef(0)
  const polaritySpring = useRef(1.0)
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

  const isIntersectingRef = useRef(false)
  useEffect(() => {
    const unsub = domRegistry.subscribe(() => {
      const entry = domRegistry.getEntry(project.id)
      if (entry && entry.el && !ioRef.current) {
        const io = new IntersectionObserver(([e]) => {
          isIntersectingRef.current = e.isIntersecting
        }, { rootMargin: '200px' })
        io.observe(entry.el)
        ioRef.current = io
      }
    })
    const ioRef = { current: null as IntersectionObserver | null }
    const initialEntry = domRegistry.getEntry(project.id)
    if (initialEntry && initialEntry.el) {
      const io = new IntersectionObserver(([e]) => {
        isIntersectingRef.current = e.isIntersecting
      }, { rootMargin: '200px' })
      io.observe(initialEntry.el)
      ioRef.current = io
    }
    return () => {
      unsub()
      ioRef.current?.disconnect()
    }
  }, [project.id])

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return
    const entry = domRegistry.getEntry(project.id)
    if (!entry || !entry.el || !isIntersectingRef.current) {
      meshRef.current.visible = false
      return
    }

    const rect = entry.el.getBoundingClientRect()
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

    const targetHover = entry.hovered ? 1 : 0
    hoverSpring.current += (targetHover - hoverSpring.current) * (1 - Math.exp(-clampedDelta * 8))
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
  return (
    <group>
      {PROJECTS.map((p, i) => (
        <ProjectMesh key={p.id} project={p} index={i} />
      ))}
    </group>
  )
}

