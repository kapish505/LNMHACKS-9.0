'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'

// ─── Speed lines: appear AS arrow fades (no gap) ────────────────────
const FADE_IN_START = 2.5
const FADE_IN_END = 3.5
const FADE_OUT_START = 14.5
const FADE_OUT_END = 15.0
const HIDE_VH = 15.5

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.998, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform float uScroll;
uniform float uOpacity;
uniform float uDensity;
uniform vec2  uResolution;

varying vec2 vUv;

#define PI  3.14159265359
#define TAU 6.28318530718

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

// ── Single starburst layer ──────────────────────────────────────────
float starburstLayer(
  vec2 uv, float dist, float angle,
  float numSlots, float seed, float density,
  float scroll, float time
) {
  // Fluid wave distortion along radial lines
  float waveDistort = sin(dist * 14.0 - time * 1.5 + seed * 3.14) * 0.035;
  float slotNorm = (angle + waveDistort + PI) / TAU;
  float slotFloat = slotNorm * numSlots;
  float slotIdx = floor(slotFloat) + seed * 1000.0;
  float slotFrac = fract(slotFloat);

  float h1 = hash(slotIdx * 1.17);
  float h2 = hash(slotIdx * 2.31);
  float h3 = hash(slotIdx * 3.47);
  float h4 = hash(slotIdx * 4.63);
  float h5 = hash(slotIdx * 5.79);

  // Density threshold controls how many lines are visible
  float threshold = mix(0.85, 0.30, density);
  float hasLine = step(threshold, h1);

  // Line properties — chunky streaks (thickness is fraction of slot width)
  float thickness = 0.20 + h2 * 0.40;
  float lineLen = 0.15 + h3 * 0.35;

  // Staggered start points (leaves center empty, lines appear at various depths)
  float innerR = 0.10;
  float lineStart = innerR + h4 * 0.8;

  // Scroll-driven rush: lines stream outward (no idle drift)
  float speed = 0.25 + h5 * 0.75;
  float rush = scroll * speed * 1.2;
  float drift = 0.0;

  float animStart = mod(lineStart + rush + drift, 2.0);
  animStart = max(animStart, innerR);
  float animEnd = animStart + lineLen;

  // Angular mask — line body
  float angleMask = smoothstep(thickness, thickness * 0.25, abs(slotFrac - 0.5) * 2.0) * hasLine;

  // Radial mask
  float distMask = smoothstep(animStart, animStart + 0.02, dist)
                 * (1.0 - smoothstep(animEnd - 0.02, animEnd, dist));

  return angleMask * distMask;
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float angle = atan(uv.y, uv.x);
  float dist  = length(uv);

  // ── Layer 1: primary thick lines (120 slots) ──
  float layer1 = starburstLayer(uv, dist, angle, 120.0, 0.0, uDensity, uScroll, uTime);

  // ── Layer 2: secondary thinner lines, offset rotation (90 slots) ──
  float layer2 = starburstLayer(uv, dist, angle + 0.015, 90.0, 1.0, uDensity * 0.85, uScroll * 1.1, uTime);

  // ── Layer 3: fine detail lines (70 slots) ──
  float layer3 = starburstLayer(uv, dist, angle - 0.01, 70.0, 2.0, uDensity * 0.6, uScroll * 0.9, uTime);

  // ── Premium dark background with subtle atmospheric breathing ──
  float breath = sin(uTime * 0.4) * 0.5 + 0.5;
  float radialGlow = exp(-dist * 3.5) * 0.08 * breath;

  vec3 bgDeep     = vec3(0.012, 0.010, 0.018);  // Near-black with a hint of deep violet
  vec3 bgAmbient  = vec3(0.035, 0.025, 0.045);  // Very subtle warm dark purple
  vec3 bgColor    = bgDeep + bgAmbient * radialGlow * uOpacity;

  // ── Color palette: lavender, rose-gold, champagne, blush ──
  float cs = fract(angle * 2.7 + dist * 3.1);

  vec3 lavender    = vec3(0.72, 0.62, 0.88);  // Soft pastel lavender
  vec3 roseGold    = vec3(0.90, 0.72, 0.65);  // Warm rose-gold
  vec3 champagne   = vec3(0.95, 0.88, 0.78);  // Champagne highlight
  vec3 blushPink   = vec3(0.85, 0.65, 0.72);  // Muted blush
  vec3 silverMist  = vec3(0.82, 0.80, 0.88);  // Cool silver mist

  vec3 color1 = mix(lavender, roseGold, smoothstep(0.15, 0.35, cs));
  color1 = mix(color1, champagne, smoothstep(0.50, 0.70, cs));
  color1 = mix(color1, blushPink, smoothstep(0.75, 0.90, cs));

  // Layer 2: shifted palette with silver highlights
  float cs2 = fract(cs + 0.33);
  vec3 color2 = mix(roseGold, lavender, smoothstep(0.2, 0.4, cs2));
  color2 = mix(color2, silverMist, smoothstep(0.5, 0.7, cs2));
  color2 = mix(color2, champagne, smoothstep(0.85, 0.95, cs2));

  // Layer 3: delicate lavender and blush
  float cs3 = fract(cs + 0.66);
  vec3 color3 = mix(lavender, blushPink, smoothstep(0.3, 0.6, cs3));
  color3 = mix(color3, roseGold, smoothstep(0.7, 0.9, cs3));

  // ── Combine layers with refined intensity ──
  vec3 lineContrib = color1 * layer1 * 0.85
                   + color2 * layer2 * 0.55
                   + color3 * layer3 * 0.35;

  // Subtle soft glow on primary layer
  float glowMask = starburstLayer(uv, dist, angle, 120.0, 0.0, min(uDensity + 0.15, 1.0), uScroll, uTime);
  lineContrib += color1 * glowMask * 0.10;

  // ── Gentle vignette — let lines breathe toward edges ──
  float vignette = 1.0 - smoothstep(0.9, 2.2, dist);

  vec3 finalColor = bgColor + lineContrib * vignette;

  gl_FragColor = vec4(finalColor, uOpacity);
}
`

export function RadialSpeedLines() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { size } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uOpacity: { value: 0 },
      uDensity: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    [size],
  )

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return

    const aVH = getArrowSectionVH()

    const fadeIn = Math.max(0, Math.min(1, (aVH - FADE_IN_START) / (FADE_IN_END - FADE_IN_START)))
    const fadeOut = 1.0 - Math.max(0, Math.min(1, (aVH - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START)))
    const opacity = fadeIn * fadeOut

    if (opacity < 0.001) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.visible = true

    // Density ramps from 0 → 1 over 4vh
    const density = Math.max(0, Math.min(1, (aVH - FADE_IN_END) / 4.0))

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uScroll.value = Math.max(0, aVH - FADE_IN_START)
    materialRef.current.uniforms.uOpacity.value = opacity
    materialRef.current.uniforms.uDensity.value = density
    materialRef.current.uniforms.uResolution.value.set(size.width, size.height)
  })

  return (
    <mesh ref={meshRef} renderOrder={0} visible={false}>
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
