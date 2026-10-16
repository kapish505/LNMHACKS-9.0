'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { SkeletonUtils, RoundedBoxGeometry } from 'three-stdlib'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'

type StageLayout = {
  isNarrow: boolean
  pavementTopY: number
}

const MILESTONE_COUNT = 6

const TIMELINE_START = 2.6
const TIMELINE_END = 15.2
const TIMELINE_EXIT = 15.9

// Logo colors matching public/logo.png: Pink (L), Cyan (N), Royal Blue (M)
const LOGO_COLORS = ['#fb3377', '#38bdf8', '#1e60ff', '#090e18'] as const

// Chunky, tangible Tetris cube parameters — perfectly matched with zero gaps and silky chamfers
const CUBE_PITCH = 0.22
const CUBE_SIZE = 0.22 // Perfectly matched to pitch: 0 gap!
const TAPER_RADIUS = 0.024

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function getStageLayout(width: number): StageLayout {
  const isNarrow = width < 4.8
  return {
    isNarrow,
    pavementTopY: isNarrow ? -1.22 : -1.18,
  }
}

function setGroupOpacity(group: THREE.Group, opacity: number) {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      const mat = material as THREE.Material & { userData: Record<string, number> }
      if (mat.userData.timelineBaseOpacity === undefined) {
        mat.userData.timelineBaseOpacity = 'opacity' in mat ? mat.opacity : 1
      }
      mat.transparent = true
      mat.depthWrite = opacity > 0.995
      if ('opacity' in mat) mat.opacity = mat.userData.timelineBaseOpacity * opacity
    }
  })
}

// Deterministic hash for procedural pavement generation
function hash2D(x: number, y: number) {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// Canonical 4-cube Tetromino definitions for floating shapes
const TETROMINO_SHAPES = {
  O: [[-0.5, -0.5, 0], [0.5, -0.5, 0], [-0.5, 0.5, 0], [0.5, 0.5, 0]],
  I: [[-1.5, 0, 0], [-0.5, 0, 0], [0.5, 0, 0], [1.5, 0, 0]],
  T: [[-1, 0, 0], [0, 0, 0], [1, 0, 0], [0, 1, 0]],
  L: [[-1, -0.5, 0], [0, -0.5, 0], [1, -0.5, 0], [1, 0.5, 0]],
} as const

type TetrominoType = keyof typeof TETROMINO_SHAPES

/**
 * Masterpiece Tetris Bedrock — Deeply Optimized:
 * - Grid reduced from ±22 to ±14 world units (camera never sees the extremes)
 * - RoundedBoxGeometry subdivisions 4→2 (75% vertex reduction per cube)
 * - Cliff layers reduced from 8→5 max depth
 * - Floating tetrominoes merged into a single instanced mesh (24 draw calls → 1)
 * - Point lights reduced from 3→1, directional lights reduced from 3→2
 * - frustumCulled=false on instanced meshes to skip per-instance bound checks
 * - All useFrame callbacks bail early when invisible
 */
function TetrisPavement({
  fadeRef,
  layout,
}: {
  fadeRef: MutableRefObject<number>
  layout: StageLayout
}) {
  const groupRef = useRef<THREE.Group>(null)
  const pinkMeshRef = useRef<THREE.InstancedMesh>(null)
  const cyanMeshRef = useRef<THREE.InstancedMesh>(null)
  const blueMeshRef = useRef<THREE.InstancedMesh>(null)
  const obsidianMeshRef = useRef<THREE.InstancedMesh>(null)
  const floatingMeshRef = useRef<THREE.InstancedMesh>(null)

  const { pavementTopY } = layout
  const baseY = pavementTopY - CUBE_SIZE * 0.5

  // 2-segment beveled chamfers (reduced from 4 for massive vertex savings)
  const taperedBoxGeom = useMemo(
    () => new RoundedBoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE, 2, TAPER_RADIUS),
    []
  )

  // Pre-create shared materials once
  const materials = useMemo(() => ({
    pink: new THREE.MeshStandardMaterial({
      color: '#fb3377',
      emissive: new THREE.Color('#fb3377'),
      emissiveIntensity: 0.28,
      roughness: 0.18,
      metalness: 0.08,
    }),
    cyan: new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 0.22,
      roughness: 0.18,
      metalness: 0.08,
    }),
    blue: new THREE.MeshStandardMaterial({
      color: '#1e60ff',
      emissive: new THREE.Color('#1e60ff'),
      emissiveIntensity: 0.25,
      roughness: 0.18,
      metalness: 0.10,
    }),
    obsidian: new THREE.MeshStandardMaterial({
      color: '#0d1525',
      roughness: 0.22,
      metalness: 0.35,
    }),
  }), [])

  // Procedural tessellation of authentic 4-cell Tetrominoes
  const { pinkMatrices, cyanMatrices, blueMatrices, obsidianMatrices, floatingData } = useMemo(() => {
    const pinks: THREE.Matrix4[] = []
    const cyans: THREE.Matrix4[] = []
    const blues: THREE.Matrix4[] = []
    const obsidians: THREE.Matrix4[] = []

    // Reduced from ±22 to ±14 — the camera viewport never sees beyond ~±10
    const xMin = -14.0
    const xMax = 14.0
    const nCols = Math.round((xMax - xMin) / CUBE_PITCH)
    const nRows = 7 // z: -0.66 (row 0) to +0.66 (row 6)
    const zStart = -0.66

    const tempMat = new THREE.Matrix4()
    const tempPos = new THREE.Vector3()
    const tempQuat = new THREE.Quaternion()
    const tempScale = new THREE.Vector3(1, 1, 1)

    const pushCube = (x: number, y: number, z: number, colorIdx: number) => {
      tempPos.set(x, y, z)
      tempMat.compose(tempPos, tempQuat, tempScale)
      if (colorIdx === 0) pinks.push(tempMat.clone())
      else if (colorIdx === 1) cyans.push(tempMat.clone())
      else if (colorIdx === 2) blues.push(tempMat.clone())
      else obsidians.push(tempMat.clone())
    }

    // Tessellate grid into authentic 4-cell Tetrominoes using 4x2 chunks
    for (let cChunk = 0; cChunk < Math.ceil(nCols / 4); cChunk++) {
      for (let rChunk = 0; rChunk < Math.ceil(nRows / 2); rChunk++) {
        const chunkHash = hash2D(cChunk, rChunk)
        const layoutType = Math.floor(chunkHash * 10) % 4

        // Assign 2 distinct colors to the 2 tetrominoes in this 4x2 block
        const color1 = Math.floor(chunkHash * 4) % 4
        const color2 = (color1 + 1 + Math.floor(hash2D(cChunk + 3, rChunk + 7) * 3)) % 4

        // 4x2 cell coordinates: (colRel 0..3, rowRel 0..1)
        for (let lc = 0; lc < 4; lc++) {
          const col = cChunk * 4 + lc
          if (col >= nCols) continue
          const x = xMin + col * CUBE_PITCH

          for (let lr = 0; lr < 2; lr++) {
            const row = rChunk * 2 + lr
            if (row >= nRows) continue
            const z = zStart + row * CUBE_PITCH

            // Determine which tetromino this cell belongs to
            let isPiece1 = true
            if (layoutType === 0) {
              isPiece1 = lc < 2
            } else if (layoutType === 1) {
              isPiece1 = lr === 0
            } else if (layoutType === 2) {
              isPiece1 = (lc < 3 && lr === 0) || (lc === 0 && lr === 1)
            } else {
              isPiece1 = (lc === 0 && lr === 0) || (lr === 1 && lc < 3)
            }

            const pieceColor = isPiece1 ? color1 : color2

            // 1. Base surface ground cube (flat, seamless pavement)
            pushCube(x, baseY, z, pieceColor)

            // 2. Background architectural Tetris towers (rows 0 and 1)
            if (row <= 1) {
              const towerHash = hash2D(cChunk * 5 + (isPiece1 ? 0 : 1), rChunk)
              if (towerHash > 0.40) {
                pushCube(x, baseY + CUBE_PITCH, z, pieceColor)
              }
              if (towerHash > 0.75 && row === 0) {
                pushCube(x, baseY + CUBE_PITCH * 2, z, pieceColor)
              }
            }

            // 3. Cascading bedrock cliff (reduced depth for performance)
            let maxDownLayers = 0
            if (row === 6) {
              maxDownLayers = 5 // Reduced from 8
            } else if (row === 5) {
              maxDownLayers = 3 // Reduced from 4
            } else if (row === 4) {
              maxDownLayers = 1 // Reduced from 2
            } else {
              maxDownLayers = 1 // Support layer
            }

            for (let down = 1; down <= maxDownLayers; down++) {
              const downY = baseY - down * CUBE_PITCH
              const downHash = hash2D(col, row + down * 7)
              const downColor = downHash > 0.40 ? 3 : pieceColor
              pushCube(x, downY, z, downColor)
            }
          }
        }
      }
    }

    // 4 Authentic 3D Floating Tetrominoes — merged into single instanced mesh
    const shapes: TetrominoType[] = ['T', 'I', 'L', 'O']
    const floatXs = [-9.0, -3.0, 3.0, 9.0]
    const floatingMatrices: THREE.Matrix4[] = []
    const floatingColors: THREE.Color[] = []
    const floaterMeta: {
      startIdx: number
      count: number
      baseX: number
      baseY: number
      baseZ: number
      speed: number
      rotSpeed: number
    }[] = []

    shapes.forEach((shape, i) => {
      const offsets = TETROMINO_SHAPES[shape]
      const startIdx = floatingMatrices.length
      const bx = floatXs[i] + (hash2D(i, 2) - 0.5) * 1.5
      const by = -0.45 + hash2D(i, 3) * 0.7
      const bz = -0.85 - hash2D(i, 4) * 0.4
      const color = new THREE.Color(LOGO_COLORS[i % 3])

      offsets.forEach((offset) => {
        tempPos.set(
          bx + offset[0] * CUBE_PITCH * 0.92,
          by + offset[1] * CUBE_PITCH * 0.92,
          bz + offset[2] * CUBE_PITCH * 0.92
        )
        tempScale.set(0.92, 0.92, 0.92)
        tempMat.compose(tempPos, tempQuat, tempScale)
        floatingMatrices.push(tempMat.clone())
        floatingColors.push(color.clone())
      })

      floaterMeta.push({
        startIdx,
        count: offsets.length,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        speed: 0.7 + hash2D(i, 5) * 0.5,
        rotSpeed: 0.35 + hash2D(i, 6) * 0.45,
      })
    })

    return {
      pinkMatrices: pinks,
      cyanMatrices: cyans,
      blueMatrices: blues,
      obsidianMatrices: obsidians,
      floatingData: { matrices: floatingMatrices, colors: floatingColors, meta: floaterMeta },
    }
  }, [baseY])

  // Populate instanced matrices
  useEffect(() => {
    if (pinkMeshRef.current) {
      pinkMatrices.forEach((mat, i) => pinkMeshRef.current!.setMatrixAt(i, mat))
      pinkMeshRef.current.instanceMatrix.needsUpdate = true
    }
    if (cyanMeshRef.current) {
      cyanMatrices.forEach((mat, i) => cyanMeshRef.current!.setMatrixAt(i, mat))
      cyanMeshRef.current.instanceMatrix.needsUpdate = true
    }
    if (blueMeshRef.current) {
      blueMatrices.forEach((mat, i) => blueMeshRef.current!.setMatrixAt(i, mat))
      blueMeshRef.current.instanceMatrix.needsUpdate = true
    }
    if (obsidianMeshRef.current) {
      obsidianMatrices.forEach((mat, i) => obsidianMeshRef.current!.setMatrixAt(i, mat))
      obsidianMeshRef.current.instanceMatrix.needsUpdate = true
    }
    // Floating tetromino instances + per-instance colors
    if (floatingMeshRef.current) {
      floatingData.matrices.forEach((mat, i) => floatingMeshRef.current!.setMatrixAt(i, mat))
      floatingData.colors.forEach((col, i) => floatingMeshRef.current!.setColorAt(i, col))
      floatingMeshRef.current.instanceMatrix.needsUpdate = true
      if (floatingMeshRef.current.instanceColor) floatingMeshRef.current.instanceColor.needsUpdate = true
    }
  }, [pinkMatrices, cyanMatrices, blueMatrices, obsidianMatrices, floatingData])

  // Reusable temp objects for useFrame (allocated once, never GC'd)
  const _tempMat = useMemo(() => new THREE.Matrix4(), [])
  const _tempPos = useMemo(() => new THREE.Vector3(), [])
  const _tempQuat = useMemo(() => new THREE.Quaternion(), [])
  const _tempScale = useMemo(() => new THREE.Vector3(0.92, 0.92, 0.92), [])
  const _tempEuler = useMemo(() => new THREE.Euler(), [])

  useFrame((state) => {
    // Early-exit when section is invisible — zero GPU/CPU cost
    if (fadeRef.current <= 0.005) {
      if (groupRef.current?.visible) groupRef.current.visible = false
      return
    }

    if (groupRef.current) {
      groupRef.current.visible = true
      groupRef.current.position.y = (1 - fadeRef.current) * -0.22
    }

    // Animate floating tetrominoes via instanced matrix updates (single draw call)
    if (floatingMeshRef.current) {
      const t = state.clock.getElapsedTime()
      for (const item of floatingData.meta) {
        const bobY = Math.sin(t * item.speed + item.startIdx * 1.5) * 0.05
        const rotY = t * item.rotSpeed
        const rotX = Math.sin(t * item.speed * 0.6 + item.startIdx) * 0.25
        const rotZ = Math.cos(t * item.speed * 0.5 + item.startIdx) * 0.2
        _tempEuler.set(rotX, rotY, rotZ)
        _tempQuat.setFromEuler(_tempEuler)

        const offsets = Object.values(TETROMINO_SHAPES)[
          floatingData.meta.indexOf(item)
        ]

        for (let c = 0; c < item.count; c++) {
          const offset = offsets[c]
          // Rotate offset around tetromino center
          _tempPos.set(
            offset[0] * CUBE_PITCH * 0.92,
            offset[1] * CUBE_PITCH * 0.92,
            offset[2] * CUBE_PITCH * 0.92
          ).applyQuaternion(_tempQuat)
          _tempPos.x += item.baseX
          _tempPos.y += item.baseY + bobY
          _tempPos.z += item.baseZ
          _tempScale.set(0.92, 0.92, 0.92)
          _tempMat.compose(_tempPos, _tempQuat, _tempScale)
          floatingMeshRef.current!.setMatrixAt(item.startIdx + c, _tempMat)
        }
      }
      floatingMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group ref={groupRef}>
      {/* 4 Vibrant Instanced Meshes — Standard PBR for High Performance */}
      <instancedMesh
        ref={pinkMeshRef}
        args={[taperedBoxGeom, materials.pink, pinkMatrices.length]}
        frustumCulled={false}
      />

      <instancedMesh
        ref={cyanMeshRef}
        args={[taperedBoxGeom, materials.cyan, cyanMatrices.length]}
        frustumCulled={false}
      />

      <instancedMesh
        ref={blueMeshRef}
        args={[taperedBoxGeom, materials.blue, blueMatrices.length]}
        frustumCulled={false}
      />

      <instancedMesh
        ref={obsidianMeshRef}
        args={[taperedBoxGeom, materials.obsidian, obsidianMatrices.length]}
        frustumCulled={false}
      />

      {/* Floating Tetrominoes — single instanced draw call with per-instance color */}
      <instancedMesh
        ref={floatingMeshRef}
        args={[taperedBoxGeom, undefined, floatingData.matrices.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.18}
          metalness={0.08}
        />
      </instancedMesh>

      {/* Solid foundation pedestal beneath the deepest cubes sealing any remaining void */}
      <mesh position={[0, baseY - 1.6, 0.1]}>
        <boxGeometry args={[32.0, 2.0, 2.8]} />
        <meshStandardMaterial color="#03060d" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  )
}

type BoneState = { bone: THREE.Bone; rotation: THREE.Euler }

/**
 * 3D Rigged mascot that walks smoothly across the horizontally scrolling Tetris cubes
 * bedrock, entering from offscreen left and exiting offscreen right.
 * Optimized: opacity traverse only on significant changes (>0.03 delta).
 */
function RiggedMascot({
  fadeRef,
  easedNormRef,
  stageRef,
  width,
}: {
  fadeRef: MutableRefObject<number>
  easedNormRef: MutableRefObject<number>
  stageRef: MutableRefObject<THREE.Group | null>
  width: number
}) {
  const root = useRef<THREE.Group>(null)
  const lastOpacity = useRef(-1)
  const lastNormalizedRef = useRef(0)
  const walkPhaseRef = useRef(0)
  const walkWeightRef = useRef(0)

  const currentLocalXRef = useRef(0)
  const isInitializedRef = useRef(false)
  const idleTimerRef = useRef(0)
  const { scene } = useGLTF('/models/chibi-rigged-model.glb')
  const isNarrow = width < 4.8
  const layout = getStageLayout(width)
  const pavementSurfaceY = layout.pavementTopY

  // Offscreen start (left) and exit (right) boundaries in world coordinates
  const startX = -width * 0.5 - 0.95
  const endX = width * 0.5 + 0.95

  const rig = useMemo(() => {
    const clone = SkeletonUtils.clone(scene)
    clone.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = 0.88 / Math.max(size.y, 0.001)
    clone.scale.setScalar(scale)
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
    clone.traverse((object) => {
      if (!(object instanceof THREE.SkinnedMesh)) return
      object.castShadow = false
      object.receiveShadow = false
      object.frustumCulled = false
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        material.roughness = 0.48
        material.metalness = 0.05
        material.needsUpdate = true
      })
    })
    return clone
  }, [scene])

  const bones = useMemo(() => {
    const next: Record<string, BoneState> = {}
    rig.traverse((object) => {
      if (object instanceof THREE.Bone) next[object.name] = { bone: object, rotation: object.rotation.clone() }
    })
    return next
  }, [rig])

  useFrame((state, delta) => {
    const figure = root.current
    if (!figure) return

    // Early-exit when timeline section is invisible
    if (fadeRef.current <= 0.005) {
      if (figure.visible) {
        figure.visible = false
      }
      return
    }

    const normalized = easedNormRef.current
    const stageX = stageRef.current ? stageRef.current.position.x : 0

    // Mascot enters from offscreen left and walks across screen to exit offscreen right
    const mascotWorldX = THREE.MathUtils.lerp(startX, endX, normalized)
    const mascotLocalX = mascotWorldX - stageX

    // Cap delta time to prevent large jumps on frame hitching
    const dt = Math.min(Math.max(delta, 0.001), 0.05)

    // Motion displacement
    const dNorm = normalized - lastNormalizedRef.current
    lastNormalizedRef.current = normalized

    // Any scroll displacement (even the slowest trackpad nudge) drives active steps
    const hasDisplacement = Math.abs(dNorm) > 0.000015

    if (hasDisplacement) {
      idleTimerRef.current = 0
      // Full stride weight while scrolling — strictly distance based, zero gliding at slow speeds
      walkWeightRef.current = 1.0
    } else {
      idleTimerRef.current += dt
      // Only when completely stopped for > 0.25s, smoothly ease into standing rest pose
      if (idleTimerRef.current > 0.25) {
        walkWeightRef.current = THREE.MathUtils.damp(
          walkWeightRef.current,
          0.0,
          4.5,
          dt
        )
      }
    }
    const weight = walkWeightRef.current

    // Walk phase is strictly ground-distance locked: 1 unit of scroll = exact step angle
    // (95.0 rad over full track = ~30 distinct steps matching the bedrock pavement)
    walkPhaseRef.current += dNorm * 95.0
    const phase = walkPhaseRef.current

    // Springy vertical bob per step (two smooth crests per gait cycle)
    const bob = (0.5 - 0.5 * Math.cos(phase * 2.0)) * 0.034 * weight

    // Full, clear stride amplitude
    const stride = Math.sin(phase) * weight

    // Pronounced knee flexion during swing phase to lift foot cleanly off ground (prevents gliding)
    const leftKnee = Math.pow(Math.max(0, -stride), 1.1) * 0.72
    const rightKnee = Math.pow(Math.max(0, stride), 1.1) * 0.72

    // Natural ankle pitch (toes lift on swing, plant on step)
    const leftAnkle = -stride * 0.22 * weight
    const rightAnkle = stride * 0.22 * weight

    // Energetic arm swings and elbow flex opposite to leg strides
    const leftArm = -stride * 0.44
    const rightArm = stride * 0.44
    const leftElbow = Math.max(0, stride) * 0.28 * weight
    const rightElbow = Math.max(0, -stride) * 0.28 * weight

    // Cute chibi pelvis roll / waddle
    const bodyRoll = Math.sin(phase) * 0.035 * weight

    // Only traverse and update opacity when change is significant (>0.03 delta)
    const opacityDelta = Math.abs(fadeRef.current - lastOpacity.current)
    if (opacityDelta > 0.03 || (lastOpacity.current < 0)) {
      lastOpacity.current = fadeRef.current
      figure.visible = fadeRef.current > 0.005
      setGroupOpacity(figure, fadeRef.current)
    }

    const rotate = (name: string | string[], rx = 0, ry = 0, rz = 0) => {
      const candidates = Array.isArray(name) ? name : [name]
      for (const k of candidates) {
        const entry = bones[k]
        if (entry) {
          entry.bone.rotation.set(entry.rotation.x + rx, entry.rotation.y + ry, entry.rotation.z + rz)
          return
        }
      }
    }

    // Pelvis roll
    rotate('Hips', 0, 0, bodyRoll)

    // Natural walk kinematics across the pavement
    rotate(['LeftUpLeg', 'L_UpperLeg'], stride * 0.58, 0, -0.025)
    rotate(['RightUpLeg', 'R_UpperLeg'], -stride * 0.58, 0, 0.025)
    rotate(['LeftLeg', 'L_LowerLeg'], leftKnee)
    rotate(['RightLeg', 'R_LowerLeg'], rightKnee)
    rotate(['LeftFoot', 'L_Foot'], leftAnkle)
    rotate(['RightFoot', 'R_Foot'], rightAnkle)

    rotate(['LeftArm', 'L_UpperArm'], leftArm, 0, -0.055)
    rotate(['RightArm', 'R_UpperArm'], rightArm, 0, 0.055)
    rotate(['LeftForeArm', 'L_LowerArm'], leftElbow)
    rotate(['RightForeArm', 'R_LowerArm'], rightElbow)

    // Subtle idle breathing
    const idleTime = state.clock.getElapsedTime()
    const breath = Math.sin(idleTime * 2.2) * 0.012 * (1 - weight * 0.7)
    rotate('Spine', breath * 0.5, 0, -bodyRoll * 0.5)
    rotate(['Spine1', 'Spine2', 'Chest'], breath, 0, -bodyRoll * 0.35)

    // Body faces right (direction of travel); head/neck counter-stabilizes to face camera
    rotate('Neck', 0, -0.86, bodyRoll * 0.25)
    rotate('Head', breath * 0.4, -0.16, -bodyRoll * 0.15)

    // Smooth horizontal position damping to eliminate scroll micro-jitter
    if (!isInitializedRef.current) {
      currentLocalXRef.current = mascotLocalX
      isInitializedRef.current = true
    } else {
      currentLocalXRef.current = THREE.MathUtils.damp(
        currentLocalXRef.current,
        mascotLocalX,
        14.0,
        dt
      )
    }

    figure.position.set(currentLocalXRef.current, pavementSurfaceY + bob, 0.08)
  })

  return (
    <group ref={root} position={[startX, pavementSurfaceY, 0.08]} scale={isNarrow ? 0.88 : 1}>
      <group rotation={[0, Math.PI * 0.5, 0]}>
        <primitive object={rig} />
      </group>
      {/* Soft ground contact shadow */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.42, 0.26]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.38} depthWrite={false} />
      </mesh>
    </group>
  )
}

useGLTF.preload('/models/chibi-rigged-model.glb')

/**
 * Canvas EventTimeline — Deeply Optimized:
 * - Lights reduced from 6 to 4 (1 ambient + 2 directional + 1 point)
 * - useFrame early-exits when section is not visible at all
 * - Stage pan uses damp for smoothness without per-frame layout reads
 */
export function EventTimeline() {
  const sceneRef = useRef<THREE.Group>(null)
  const stageRef = useRef<THREE.Group>(null)
  const fadeRef = useRef(0)
  const easedNormRef = useRef(0)
  const { viewport } = useThree()
  const isNarrow = viewport.width < 4.8
  const layout = getStageLayout(viewport.width)

  // Distance between checkpoints matching the horizontal timeline flow
  const spacing = isNarrow ? 1.8 : 2.6
  const firstCheckpointX = -spacing * (MILESTONE_COUNT - 1) * 0.5
  const totalPan = spacing * (MILESTONE_COUNT - 1)

  useFrame((_, delta) => {
    // Skip 3D horizontal timeline on mobile phones (where mobile vertical timeline is active)
    if (viewport.width < 4.8) {
      fadeRef.current = 0
      if (sceneRef.current?.visible) sceneRef.current.visible = false
      return
    }

    const aVH = getArrowSectionVH()

    // Fast visibility check — skip all work when nowhere near the timeline
    const visible = aVH > TIMELINE_START - 0.4 && aVH < TIMELINE_EXIT + 0.15
    if (!visible) {
      fadeRef.current = 0
      if (sceneRef.current?.visible) sceneRef.current.visible = false
      return
    }

    const fadeIn = smoothstep(TIMELINE_START - 0.18, TIMELINE_START + 0.26, aVH)
    const fadeOut = 1 - smoothstep(TIMELINE_END + 0.25, TIMELINE_EXIT, aVH)
    const fade = fadeIn * fadeOut
    fadeRef.current = fade

    const targetNorm = clamp01((aVH - TIMELINE_START) / (TIMELINE_END - TIMELINE_START))
    const dt = Math.min(delta, 0.05)
    easedNormRef.current = THREE.MathUtils.damp(easedNormRef.current, targetNorm, 7.5, dt)

    if (sceneRef.current) {
      sceneRef.current.visible = true
      sceneRef.current.scale.setScalar(0.975 + fade * 0.025)
      sceneRef.current.position.y = -0.05 * (1 - fade)
    }

    if (stageRef.current) {
      // Horizontal pan of the 3D canvas stage synchronized with the horizontal timeline scroll
      const targetPan = -firstCheckpointX - easedNormRef.current * totalPan
      stageRef.current.position.x = THREE.MathUtils.damp(stageRef.current.position.x, targetPan, 14.0, dt)
    }
  })

  return (
    <group ref={sceneRef}>
      {/* Balanced ambient fill — lifts shadows without washing out specular */}
      <ambientLight intensity={0.6} color="#dde8ff" />

      {/* Top-back grazing rim — razor specular edges on every chamfer */}
      <directionalLight position={[3, 8, -4]} intensity={3.2} color="#ffffff" />

      {/* Front key light — illuminate face of the pavement toward camera */}
      <directionalLight position={[-3, 6, 6]} intensity={2.4} color="#f0f4ff" />

      {/* Single branded accent point light — merged from 3 to 1 */}
      <pointLight position={[0, 0.8, 3.5]} intensity={14} distance={14} decay={2} color="#7b9fff" />

      {/* Horizontally scrolling 3D stage with seamlessly joined Tetris bedrock */}
      <group ref={stageRef}>
        <TetrisPavement
          fadeRef={fadeRef}
          layout={layout}
        />

        <RiggedMascot
          fadeRef={fadeRef}
          easedNormRef={easedNormRef}
          stageRef={stageRef}
          width={viewport.width}
        />
      </group>
    </group>
  )
}
