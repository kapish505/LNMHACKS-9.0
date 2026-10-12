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
uniform float uIsMobile;
uniform vec2  uResolution;

varying vec2 vUv;

#define PI  3.14159265359
#define TAU 6.28318530718

// Fast vector hash without sine — single dot product generates 4 pseudo-random numbers
vec4 hash41(float p) {
  vec4 p4 = fract(vec4(p) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p4 += dot(p4, p4.wzxy + 33.33);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// ── Single starburst layer with early-exit ──────────────────────────
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

  vec4 h = hash41(slotIdx);
  float threshold = mix(0.85, 0.30, density);

  // Early-exit: slot has no line, skip all math!
  if (h.x < threshold) return 0.0;

  float h2 = h.y;
  float h3 = h.z;
  float h4 = h.w;
  float h5 = fract(h.x * 13.37 + h.w * 31.41);

  // Line properties — chunky streaks
  float thickness = 0.20 + h2 * 0.40;
  float lineLen = 0.15 + h3 * 0.35;

  float innerR = 0.10;
  float lineStart = innerR + h4 * 0.8;

  // Scroll-driven rush: lines stream outward
  float speed = 0.25 + h5 * 0.75;
  float rush = scroll * speed * 1.2;

  float animStart = mod(lineStart + rush, 2.0);
  animStart = max(animStart, innerR);
  float animEnd = animStart + lineLen;

  // Angular mask — line body
  float angleMask = smoothstep(thickness, thickness * 0.25, abs(slotFrac - 0.5) * 2.0);

  // Radial mask
  float distMask = smoothstep(animStart, animStart + 0.02, dist)
                 * (1.0 - smoothstep(animEnd - 0.02, animEnd, dist));

  return angleMask * distMask;
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float dist  = length(uv);
  if (dist > 2.2) {
    gl_FragColor = vec4(0.012, 0.010, 0.018, uOpacity);
    return;
  }

  float angle = atan(uv.y, uv.x);

  // ── Layers: on mobile 2 lean layers, on desktop 3 rich layers ──
  float slots1 = uIsMobile > 0.5 ? 75.0 : 110.0;
  float slots2 = uIsMobile > 0.5 ? 45.0 : 80.0;
  float layer1 = starburstLayer(uv, dist, angle, slots1, 0.0, uDensity, uScroll, uTime);
  float layer2 = starburstLayer(uv, dist, angle + 0.015, slots2, 1.0, uDensity * 0.85, uScroll * 1.1, uTime);
  float layer3 = 0.0;
  if (uIsMobile < 0.5) {
    layer3 = starburstLayer(uv, dist, angle - 0.01, 55.0, 2.0, uDensity * 0.6, uScroll * 0.9, uTime);
  }

  // ── Premium dark background with subtle atmospheric breathing ──
  float breath = sin(uTime * 0.4) * 0.5 + 0.5;
  float radialGlow = exp(-dist * 3.5) * 0.08 * breath;

  vec3 bgDeep     = vec3(0.012, 0.010, 0.018);
  vec3 bgAmbient  = vec3(0.035, 0.025, 0.045);
  vec3 bgColor    = bgDeep + bgAmbient * radialGlow * uOpacity;

  // ── Color palette: lavender, rose-gold, champagne, blush ──
  float cs = fract(angle * 2.7 + dist * 3.1);

  vec3 lavender    = vec3(0.72, 0.62, 0.88);
  vec3 roseGold    = vec3(0.90, 0.72, 0.65);
  vec3 champagne   = vec3(0.95, 0.88, 0.78);
  vec3 blushPink   = vec3(0.85, 0.65, 0.72);
  vec3 silverMist  = vec3(0.82, 0.80, 0.88);

  vec3 color1 = mix(lavender, roseGold, smoothstep(0.15, 0.35, cs));
  color1 = mix(color1, champagne, smoothstep(0.50, 0.70, cs));
  color1 = mix(color1, blushPink, smoothstep(0.75, 0.90, cs));

  float cs2 = fract(cs + 0.33);
  vec3 color2 = mix(roseGold, lavender, smoothstep(0.2, 0.4, cs2));
  color2 = mix(color2, silverMist, smoothstep(0.5, 0.7, cs2));
  color2 = mix(color2, champagne, smoothstep(0.85, 0.95, cs2));

  float cs3 = fract(cs + 0.66);
  vec3 color3 = mix(lavender, blushPink, smoothstep(0.3, 0.6, cs3));
  color3 = mix(color3, roseGold, smoothstep(0.7, 0.9, cs3));

  // ── Combine layers with refined intensity ──
  vec3 lineContrib = color1 * layer1 * 0.95
                   + color2 * layer2 * 0.60
                   + color3 * layer3 * 0.35;

  // ── Gentle vignette ──
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
      uIsMobile: { value: typeof window !== 'undefined' && window.innerWidth < 768 ? 1.0 : 0.0 },
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
    materialRef.current.uniforms.uIsMobile.value = window.innerWidth < 768 ? 1.0 : 0.0
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
