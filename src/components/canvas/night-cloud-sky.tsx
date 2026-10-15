// Night Cloud Sky — LNMHACKS 9.0
// Nighttime atmospheric sky with moonlit clouds, optimized WebGL shaders,
// and twinkling stars that start blinking 3 seconds after switching to dark mode.

"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/lib/theme-context"

const MAX_DPR = 1.0 // Capped for fill-rate reduction and buttery performance

const PUFF_UP = 0.34
const PUFF_DOWN = 0.19
const ERODE = 0.7
const SHADOW_STEP = 0.085
const NEAR_CELL = 1.05
const FAR_CELL = 2.15
const FAR_MIX = 0.55
const NEAR_DRIFT = 0.055
const FAR_DRIFT = 0.026
const CIRRUS_DRIFT = 0.014

const PUFF_WMAX = 2.15
const SHADE_BLEND = 12.0

const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uNearX, uFarX, uCirrusX;
uniform float uCoverage, uSize, uSoftness, uShadow, uCirrus;
uniform vec3 uZenith, uHorizon, uCloud;
uniform vec4 uGlow;
uniform vec2 uSun;
uniform vec2 uParallax;

vec2 hash22(vec2 p){
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float hash12(vec2 p){
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 x){
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}

// 3-octave FBM for optimized performance
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++){
    s += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

vec2 blobs(vec2 uv, float seed){
  vec2 id = floor(uv), f = fract(uv);

  float best = -1e4;
  float wsum = 0.0, ysum = 0.0;
  float wMax = min(${PUFF_WMAX.toFixed(3)}, 0.72 * uSize);
  float reach = min(2.0, ceil(wMax + 0.85) - 1.0);
  for (int j = -2; j <= 2; j++){
    for (int i = -2; i <= 2; i++){
      vec2 o = vec2(float(i), float(j));
      if (max(abs(o.x), abs(o.y)) > reach) continue;
      vec2 h = hash22(id + o + seed);

      if (fract(h.x * 37.1) > uCoverage) continue;
      vec2 c = o + 0.15 + h * 0.7;
      float w = min(${PUFF_WMAX.toFixed(3)}, (0.30 + 0.42 * fract(h.y * 19.7)) * uSize);
      vec2 d = f - c;

      float ry = (d.y > 0.0 ? ${PUFF_UP.toFixed(3)} : ${PUFF_DOWN.toFixed(3)}) * uSize * (0.8 + 0.5 * fract(h.y * 7.3));
      float e = length(vec2(d.x / max(w, 1e-3), d.y / max(ry, 1e-3)));
      float val = 1.0 - e;
      float yN = d.y / max(ry, 1e-3);
      if (val > best){
        float k = exp(${SHADE_BLEND.toFixed(1)} * (best - val));
        wsum = wsum * k + 1.0;
        ysum = ysum * k + yN;
        best = val;
      } else {
        float g = exp(${SHADE_BLEND.toFixed(1)} * (val - best));
        wsum += g;
        ysum += g * yN;
      }
    }
  }
  return vec2(best, ysum / max(wsum, 1e-4));
}

vec2 cloudField(vec2 uv, float seed, float detailScale){
  vec2 b = blobs(uv, seed);

  float n = fbm(uv * detailScale + seed * 3.1) * 0.72
          + fbm(uv * detailScale * 3.3 + seed * 7.7) * 0.28;
  return vec2(b.x - (1.0 - n) * ${ERODE.toFixed(3)}, b.y);
}

vec3 shadeCloud(float dyNorm, vec3 sky){
  float t = smoothstep(-0.95, 0.25, dyNorm);
  vec3 base = mix(uCloud * 0.48, sky, 0.38);
  return mix(mix(uCloud, base, uShadow), uCloud, t);
}

void main(){
  vec2 frag = gl_FragCoord.xy / max(uRes.y, 1.0);
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(frag.x, frag.y);

  // Atmospheric nighttime vertical gradient
  vec3 sky = mix(uHorizon, uZenith, smoothstep(-0.15, 1.05, p.y));
  vec2 sunP = vec2(uSun.x * aspect, uSun.y);
  float sd = length(p - sunP);

  // Soft lunar moon glow
  sky += uGlow.rgb * uGlow.a * exp(-sd * 3.2) * 0.32;

  vec3 col = sky;

  // Clearance mask for the countdown & navbar
  float distToCenter = abs(p.y - 0.50);
  float countdownClearance = smoothstep(0.06, 0.15, distToCenter);
  float navbarClearance = smoothstep(0.97, 0.88, p.y);
  float cloudMask = countdownClearance * navbarClearance;

  if (cloudMask > 0.005) {
    if (uCirrus > 0.0) {
      vec2 cuv = vec2(p.x * 1.4 + uCirrusX, p.y * 5.5);
      float veil = fbm(cuv) * fbm(cuv * 2.3 + 9.0);
      veil = smoothstep(0.24, 0.55, veil);
      col = mix(col, uCloud, veil * uCirrus * 0.5 * cloudMask);
    }

    vec2 fuv = vec2(p.x + uFarX, p.y) * ${FAR_CELL.toFixed(3)} + uParallax * 0.4;
    vec2 fd = cloudField(fuv, 17.0, 11.0);
    float fa = clamp(fd.x * uSoftness, 0.0, 1.0) * cloudMask;
    if (fa > 0.0) {
      vec3 lit = shadeCloud(fd.y, sky);
      col = mix(col, mix(lit, sky, ${FAR_MIX.toFixed(3)}), fa);
    }

    // Near night clouds
    vec2 nuv = vec2(p.x + uNearX, p.y) * ${NEAR_CELL.toFixed(3)} + uParallax;
    vec2 nd = cloudField(nuv, 3.0, 8.5);
    float na_main = clamp(nd.x * uSoftness, 0.0, 1.0);

    // Dedicated lower night cloud stream passing below countdown
    vec2 nuv_low = vec2(p.x * 1.15 + uNearX * 0.88 + 7.3, (p.y - 0.20) * 1.7) + uParallax * 0.7;
    vec2 nd_low = cloudField(nuv_low, 11.0, 7.5);
    float na_low = clamp(nd_low.x * uSoftness, 0.0, 1.0) * smoothstep(0.44, 0.32, p.y);

    float na = max(na_main, na_low) * cloudMask;
    if (na > 0.0) {
      float dy = (na_low > na_main) ? nd_low.y : nd.y;
      vec3 lit = shadeCloud(dy, sky);

      float above = clamp(cloudField(nuv + vec2(0.0, ${SHADOW_STEP.toFixed(3)}), 3.0, 8.5).x * uSoftness, 0.0, 1.0);
      lit *= 1.0 - 0.20 * uShadow * above;

      lit += uGlow.rgb * uGlow.a * 0.25 * exp(-length(p - sunP) * 1.6);
      col = mix(col, lit, na);
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("NightCloudSky shader:", gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

type RGBA = [number, number, number, number]

function parseColor(input: string | undefined, fb: RGBA): RGBA {
  if (!input) return fb
  const str = String(input).trim()
  if (str.charAt(0) === "#") {
    let hex = str.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + (hex.length === 4 ? hex[3] + hex[3] : "")
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255, a]
    }
    return fb
  }
  const m = str.match(/[\d.]+/g)
  if (m && m.length >= 3) {
    return [
      Math.min(255, parseFloat(m[0])) / 255,
      Math.min(255, parseFloat(m[1])) / 255,
      Math.min(255, parseFloat(m[2])) / 255,
      m.length >= 4 ? Math.min(1, parseFloat(m[3])) : 1,
    ]
  }
  return fb
}

function num(v: unknown, fb: number): number {
  return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

// ── Twinkling Stars Canvas Component ─────────────────────────────────────────
interface Star {
  x: number // 0 to 1
  y: number // 0 to 1
  radius: number
  color: string
  twinkleSpeed: number
  twinklePhase: number
  baseAlpha: number
  hasSpikes?: boolean
}

function generateStars(count = 95): Star[] {
  const stars: Star[] = []
  const colors = [
    "255, 255, 255", // pure brilliant white
    "224, 238, 255", // cool blue-white
    "199, 219, 254", // pale celestial sapphire
    "254, 243, 199", // faint warm champagne
  ]

  let seed = 42
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let i = 0; i < count; i++) {
    const x = rand()
    let y = rand()

    // Bias stars towards the top half of the sky, with some in lower band,
    // avoiding the exact center where the countdown digits are
    if (y > 0.40 && y < 0.60) {
      if (rand() > 0.25) {
        y = y < 0.50 ? y * 0.78 : 0.62 + y * 0.35
      }
    }

    const sizeTier = rand()
    let radius = 0.75 + rand() * 0.95
    let hasSpikes = false
    if (sizeTier > 0.88) {
      radius = 1.9 + rand() * 0.7
      hasSpikes = true
    }

    stars.push({
      x,
      y,
      radius,
      color: colors[Math.floor(rand() * colors.length)],
      twinkleSpeed: 1.2 + rand() * 2.8,
      twinklePhase: rand() * Math.PI * 2,
      baseAlpha: 0.25 + rand() * 0.45,
      hasSpikes,
    })
  }
  return stars
}

export function TwinklingStars({ active, immediate = false }: { active: boolean; immediate?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const [starsStarted, setStarsStarted] = useState(immediate && active)
  const fadeRef = useRef({ alpha: immediate && active ? 1 : 0, target: immediate && active ? 1 : 0 })

  // Trigger stars blinking (immediately or 3 seconds after dark mode becomes active)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (active) {
      if (immediate) {
        setStarsStarted(true)
        fadeRef.current.target = 1.0
      } else {
        timer = setTimeout(() => {
          setStarsStarted(true)
        }, 3000)
      }
    } else {
      setStarsStarted(false)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [active, immediate])

  useEffect(() => {
    if (!starsRef.current.length) {
      starsRef.current = generateStars(100)
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      const w = canvas.clientWidth || window.innerWidth
      const h = canvas.clientHeight || window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      // Smoothly ramp overall star field alpha in or out
      const targetAlpha = (active && starsStarted) ? 1.0 : 0.0
      fadeRef.current.target = targetAlpha
      const k = 1 - Math.exp(-2.2 * dt)
      fadeRef.current.alpha += (targetAlpha - fadeRef.current.alpha) * k

      const currentGlobalAlpha = fadeRef.current.alpha
      const w = canvas.clientWidth || window.innerWidth
      const h = canvas.clientHeight || window.innerHeight

      ctx.clearRect(0, 0, w, h)

      if (currentGlobalAlpha > 0.01) {
        const timeSec = now * 0.001
        const stars = starsRef.current

        for (let i = 0; i < stars.length; i++) {
          const s = stars[i]
          const px = s.x * w
          const py = s.y * h

          // Oscillating brightness with sine wave
          const wave = Math.sin(timeSec * s.twinkleSpeed + s.twinklePhase)
          // Sharp twinkle curve: peaks sharply, lingers softly
          const twinkle = (wave + 1) * 0.5
          const starAlpha = Math.max(0, Math.min(1, (s.baseAlpha + twinkle * 0.55) * currentGlobalAlpha))

          if (starAlpha <= 0.02) continue

          // Draw pinpoint star core
          ctx.beginPath()
          ctx.arc(px, py, s.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${s.color}, ${starAlpha})`
          ctx.fill()

          // Draw soft radial glow for prominent stars
          if (s.hasSpikes && starAlpha > 0.3) {
            const glowR = s.radius * 3.5
            const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR)
            grad.addColorStop(0, `rgba(${s.color}, ${starAlpha * 0.45})`)
            grad.addColorStop(1, `rgba(${s.color}, 0)`)
            ctx.beginPath()
            ctx.arc(px, py, glowR, 0, Math.PI * 2)
            ctx.fillStyle = grad
            ctx.fill()

            // Subtle 4-point cross diffraction spikes
            const spikeLen = s.radius * 4.2 * (0.8 + 0.4 * twinkle)
            ctx.strokeStyle = `rgba(${s.color}, ${starAlpha * 0.35})`
            ctx.lineWidth = 0.75

            ctx.beginPath()
            ctx.moveTo(px - spikeLen, py)
            ctx.lineTo(px + spikeLen, py)
            ctx.moveTo(px, py - spikeLen)
            ctx.lineTo(px, py + spikeLen)
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [active, starsStarted])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1, willChange: "opacity" }}
      aria-hidden="true"
    />
  )
}

// ── Night Cloud Sky Main Component ──────────────────────────────────────────
export function NightCloudSky({
  className = "",
  style,
  active = true,
}: {
  className?: string
  style?: React.CSSProperties
  active?: boolean
}) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vRef = useRef<Record<string, number | string>>({})
  const activeRef = useRef(active)
  activeRef.current = active
  const wakeUpRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (active) {
      wakeUpRef.current()
    }
  }, [active])

  // Reconsidered night sky colors: deep cosmic midnight, subtle twilight indigo horizon,
  // moonlit slate clouds, soft cool lunar glow.
  // Less density (26), slower speed (26), size (63), cirrus (100), shadow (70), softness (200).
  // No parallax effect: wind = 0, parallax = 0.
  vRef.current = {
    zenith: "#020409", // Deep midnight space black/navy
    horizon: "#0c182a", // Subtle atmospheric midnight horizon
    cloud: "#33435c", // Moonlit silvery-slate clouds
    glow: "rgba(186, 215, 255, 0.38)", // Cool moon radiance
    coverage: 0.26, // Less density (26%) as requested
    speed: 0.52, // Slower speed (26 on 0..50 scale = 0.52)
    size: 0.63, // Cloud size 63%
    softness: 4.5 / 2.0, // Softness 200%
    shadow: 0.70, // Shadow 70%
    cirrus: 1.0, // Cirrus 100%
    sunX: 0.88, // Moon position X
    sunY: 0.92, // Moon position Y
    parallax: 0.0, // NO parallax effect as requested
    wind: 0.0,
    damping: 50,
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })
    if (!gl) {
      console.error("NightCloudSky: WebGL unavailable")
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vs || !fs) return
    const prog = gl.createProgram()
    if (!prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("NightCloudSky link:", gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, "a_pos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const locs: Record<string, WebGLUniformLocation | null> = {}
    const u = (name: string) => {
      if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
      return locs[name]
    }

    let raf = 0
    let last = performance.now()
    let paused = false

    // Low-end / mobile: cap to 30 fps; desktop: uncapped
    const isMobile =
      typeof window !== "undefined" &&
      (window.innerWidth < 768 || "ontouchstart" in window || /Mobi|Android|iPhone/i.test(navigator.userAgent))
    const minFrameMs = isMobile ? 1000 / 30 : 0
    const effectiveMaxDPR = 1.0

    let nearX = 0
    let farX = 0
    let cirrusX = 0

    const render = (now: number) => {
      if (paused || !activeRef.current) {
        raf = 0
        return
      }
      const elapsed = now - last
      if (minFrameMs > 0 && elapsed < minFrameMs) {
        raf = requestAnimationFrame(render)
        return
      }
      const dt = Math.min(0.05, elapsed / 1000)
      last = now
      const v = vRef.current

      // Continuous drifting rate
      const rate = v.speed as number
      nearX = (nearX - NEAR_DRIFT * rate * dt) % 1000
      farX = (farX - FAR_DRIFT * rate * dt) % 1000
      cirrusX = (cirrusX - CIRRUS_DRIFT * rate * dt) % 1000

      const dpr = Math.min(window.devicePixelRatio || 1, effectiveMaxDPR)
      const cw = canvas.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1200)
      const ch = canvas.clientHeight || (typeof window !== "undefined" ? window.innerHeight : 800)
      const bw = Math.max(1, Math.round(cw * dpr))
      const bh = Math.max(1, Math.round(ch * dpr))
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw
        canvas.height = bh
      }
      gl.viewport(0, 0, bw, bh)

      const zen = parseColor(v.zenith as string, [0.01, 0.02, 0.04, 1])
      const hor = parseColor(v.horizon as string, [0.05, 0.10, 0.17, 1])
      const cld = parseColor(v.cloud as string, [0.20, 0.26, 0.36, 1])
      const glow = parseColor(v.glow as string, [0.73, 0.84, 1.0, 0.38])

      gl.uniform2f(u("uRes"), bw, bh)
      gl.uniform1f(u("uNearX"), nearX)
      gl.uniform1f(u("uFarX"), farX)
      gl.uniform1f(u("uCirrusX"), cirrusX)
      gl.uniform1f(u("uCoverage"), v.coverage as number)
      gl.uniform1f(u("uSize"), v.size as number)
      gl.uniform1f(u("uSoftness"), v.softness as number)
      gl.uniform1f(u("uShadow"), v.shadow as number)
      gl.uniform1f(u("uCirrus"), v.cirrus as number)
      gl.uniform2f(u("uSun"), v.sunX as number, v.sunY as number)
      gl.uniform2f(u("uParallax"), 0, 0) // No parallax
      gl.uniform3f(u("uZenith"), zen[0], zen[1], zen[2])
      gl.uniform3f(u("uHorizon"), hor[0], hor[1], hor[2])
      gl.uniform3f(u("uCloud"), cld[0], cld[1], cld[2])
      gl.uniform4f(u("uGlow"), glow[0], glow[1], glow[2], glow[3])

      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(render)
    }

    const wakeUp = () => {
      if (!paused && activeRef.current && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(render)
      }
    }
    wakeUpRef.current = wakeUp

    // Optimization: Pause when tab is hidden or hero is scrolled out of view
    let inView = true
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        paused = !inView || document.hidden
        if (!paused) wakeUp()
      },
      { threshold: 0.02 }
    )
    const target = canvas.closest("#hero") || canvas.parentElement || canvas
    io.observe(target)

    const onVisibility = () => {
      paused = !inView || document.hidden
      if (!paused) wakeUp()
    }
    document.addEventListener("visibilitychange", onVisibility)

    if (activeRef.current) {
      raf = requestAnimationFrame(render)
    }

    return () => {
      wakeUpRef.current = () => {}
      cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <div
      className={`absolute inset-0 w-full h-full overflow-hidden select-none ${className}`}
      style={{
        background: "#020409",
        isolation: "isolate",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      {/* Twinkling stars overlay — blinks after 3 seconds of switching to dark mode */}
      <TwinklingStars active={isDark} />
    </div>
  )
}

