"use client";

import { useEffect, useRef } from "react";
import { subscribeThemeChange } from "@/lib/theme-context";

// ---------------------------------------------------------------------------
// deterministic 2-octave value noise — house field, no deps
// ---------------------------------------------------------------------------
function hash2(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function noise2(x: number, y: number) {
  return 0.65 * vnoise(x, y) + 0.35 * vnoise(x * 2.1 + 19.7, y * 2.1 + 7.3);
}

// ---------------------------------------------------------------------------
// VaporCountdown — live countdown where every digit change is a phase
// transition: the outgoing digit sublimates into monochrome grains drifting up
// on curl-noise wind while the incoming digit condenses from the same cloud,
// grains spring‑seeking their new glyph homes. Canvas 2D over a real <time>
// element (screen‑reader truth). Direct‑DOM rAF loop, no React state on the
// hot path; hour/minute columns sleep between their rare transitions.
// ---------------------------------------------------------------------------

const FLOATS = 6; // grains: x, y, vx, vy, hx, hy · vapor: x, y, vx, vy, age, life
const MAX_GRAINS = 2800; // per digit — balanced particle count for distinct airy grains
const SAMPLE_STRIDE = 2; // px between alpha samples — clean particle separation, distinct grains
const SPRING_K = 90; // s⁻² — hero‑gravity‑well constants exactly
const ZETA = 0.55; // damping ratio; < 1 gives a soft condensation overshoot
const DRAG = 0.92; // per‑frame velocity drag
const DT_MAX = 0.032; // s — clamp tab‑switch jumps
const FIELD_SCALE = 0.008; // px → noise units for the wind field
const CURL_EPS = 0.75; // noise‑space finite‑difference step for curl
const PAD_X = 60; // canvas overdraw so vapor is not clipped at the digits' box
const PAD_TOP = 170;
const PAD_BOTTOM = 30;

const DEFAULT_LABELS = ["DAYS", "HOURS", "MINUTES", "SECONDS"] as const;

type Slot = {
  g: Float32Array; // incoming/settled grains
  v: Float32Array; // sublimating vapor grains
  gc: number;
  vc: number;
  active: boolean;
};

export function VaporCountdown({
  targetDate,
  labels = DEFAULT_LABELS,
  className = "",
}: {
  /** countdown target — Date, ISO string, or epoch ms; defaults to 24h from mount */
  targetDate?: Date | string | number;
  /** mono labels under the HH / MM / SS groups; null hides the row */
  labels?: readonly [string, string, string, string] | null;
  /** extra classes merged onto the rendered root element */
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<HTMLTimeElement>(null);

  // stable primitive for the deps array (Date identity churns per render)
  const targetKey =
    targetDate instanceof Date ? targetDate.getTime() : targetDate;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const timeEl = timeRef.current;
    if (!root || !canvas || !timeEl) return;
    const digitEls = Array.from(
      root.querySelectorAll<HTMLSpanElement>("[data-vc-digit]"),
    );
    if (digitEls.length !== 8) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const targetMs =
      targetKey == null
        ? new Date("2027-01-22T00:00:00+05:30").getTime()
        : typeof targetKey === "number"
          ? targetKey
          : new Date(targetKey).getTime();

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let digits = "00000000";

    const remaining = () => Math.max(0, targetMs - Date.now());
    const toDigits = () => {
      const rem = Math.round(remaining() / 1000);
      const d = Math.floor(rem / 86400);
      const h = Math.floor((rem % 86400) / 3600);
      const m = Math.floor((rem % 3600) / 60);
      const s = rem % 60;
      return (
        String(d).padStart(2, "0") +
        String(h).padStart(2, "0") +
        String(m).padStart(2, "0") +
        String(s).padStart(2, "0")
      );
    };
    const applyDateTime = () => {
      const d = digits.slice(0, 2);
      const h = digits.slice(2, 4);
      const m = digits.slice(4, 6);
      const s = digits.slice(6, 8);
      timeEl.setAttribute(
        "datetime",
        `P${parseInt(d, 10)}DT${parseInt(h, 10)}H${parseInt(m, 10)}M${parseInt(s, 10)}S`,
      );
    };

    // ---- canvas / particle state (unused under reduced motion) -------------
    const ctx = canvas.getContext("2d");

    let grainColor = "#ffffff";
    const updateGrainColor = () => {
      grainColor = "#ffffff";
    };
    updateGrainColor();

    const slots: Slot[] = Array.from({ length: 8 }, () => ({
      g: new Float32Array(MAX_GRAINS * FLOATS),
      v: new Float32Array(MAX_GRAINS * FLOATS),
      gc: 0,
      vc: 0,
      active: false,
    }));
    let glyphs: Float32Array[] | null = null; // cell‑relative homes per digit 0‑9
    let cells: { x: number; y: number }[] = [];
    let cw = 0;
    let ch = 0;
    let lastW = 0;
    let lastH = 0;
    let raf = 0;
    let last = 0;
    let dpr = 1;
    const dampC = 2 * ZETA * Math.sqrt(SPRING_K); // s⁻¹

    // ---- settled-slot cache --------------------------------------------------
    // Only the seconds column transitions on a typical frame; the other seven
    // slots are pixel-identical frame to frame. They were still being redrawn
    // in full every frame (~2000 fillRect calls per slot, so ~16k calls/frame
    // for one animating digit). Bake the sleeping slots into an offscreen
    // layer and blit it instead — same pixels, one drawImage.
    let sleepCanvas: HTMLCanvasElement | null = null;
    let sleepCtx: CanvasRenderingContext2D | null = null;
    let sleepDirty = true;

    const markSleepDirty = () => {
      sleepDirty = true;
    };

    const rebuildSleepLayer = () => {
      if (!sleepCanvas) {
        sleepCanvas = document.createElement("canvas");
        sleepCtx = sleepCanvas.getContext("2d");
      }
      if (!sleepCtx) return;
      if (sleepCanvas.width !== canvas.width || sleepCanvas.height !== canvas.height) {
        sleepCanvas.width = canvas.width;
        sleepCanvas.height = canvas.height;
      }

      sleepCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sleepCtx.clearRect(0, 0, cw, ch);
      sleepCtx.fillStyle = grainColor;
      // Same constant alpha the inline path used for settled grains, so the
      // baked pixels match exactly.
      sleepCtx.globalAlpha = 0.98;
      for (let s = 0; s < slots.length; s++) {
        const slot = slots[s];
        if (slot.active) continue;
        const g = slot.g;
        for (let i = 0; i < slot.gc; i++) {
          const o = i * FLOATS;
          sleepCtx.fillRect(g[o] - 0.9, g[o + 1] - 0.9, 1.8, 1.8);
        }
      }
      sleepCtx.globalAlpha = 1;
      sleepDirty = false;
    };

    let inView = true;
    const loop = (now: number) => {
      if (!ctx || !inView || document.hidden) {
        raf = 0;
        return;
      }
      const dt = Math.min(Math.max((now - last) / 1000, 0), DT_MAX);
      last = now;
      ctx.clearRect(0, 0, cw, ch);

      if (sleepDirty) rebuildSleepLayer();
      if (sleepCanvas && sleepCanvas.width > 0) {
        ctx.drawImage(sleepCanvas, 0, 0, cw, ch);
      }

      ctx.fillStyle = grainColor;
      let anyActive = false;
      let lastAlpha = -1;

      for (let s = 0; s < digitEls.length; s++) {
        const slot = slots[s];
        const g = slot.g;
        const v = slot.v;

        // Asleep: already present in the blitted sleep layer.
        if (!slot.active) continue;

        anyActive = true;
        let settled = true;

        // incoming grains: underdamped spring toward glyph homes
        for (let i = 0; i < slot.gc; i++) {
          const o = i * FLOATS;
          let x = g[o];
          let y = g[o + 1];
          let vx = g[o + 2];
          let vy = g[o + 3];
          const hx = g[o + 4];
          const hy = g[o + 5];

          vx = (vx + (SPRING_K * (hx - x) - dampC * vx) * dt) * DRAG;
          vy = (vy + (SPRING_K * (hy - y) - dampC * vy) * dt) * DRAG;
          x += vx * dt;
          y += vy * dt;

          g[o] = x;
          g[o + 1] = y;
          g[o + 2] = vx;
          g[o + 3] = vy;

          if (
            Math.abs(x - hx) > 0.5 ||
            Math.abs(y - hy) > 0.5 ||
            Math.abs(vx) > 2 ||
            Math.abs(vy) > 2
          ) {
            settled = false;
          }

          const speed = Math.hypot(vx, vy);
          const a = 0.88 + 0.12 * Math.min(1, speed / 500);
          if (a !== lastAlpha) {
            ctx.globalAlpha = a;
            lastAlpha = a;
          }
          ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
        }

        // vapor grains: curl‑noise wind, biased upward, alpha fade over life
        let j = 0;
        while (j < slot.vc) {
          const o = j * FLOATS;
          const age = v[o + 4] + dt * 1000;
          const life = v[o + 5];
          if (age >= life) {
            // swap‑remove with the last live vapor grain
            const lo = (slot.vc - 1) * FLOATS;
            for (let k = 0; k < FLOATS; k++) v[o + k] = v[lo + k];
            slot.vc--;
            continue;
          }
          v[o + 4] = age;
          let x = v[o];
          let y = v[o + 1];
          let vx = v[o + 2];
          let vy = v[o + 3];

          // wind = curl of the noise field: (∂n/∂y, -∂n/∂x) — divergence‑free
          const nx = x * FIELD_SCALE;
          const ny = y * FIELD_SCALE;
          const dndx = noise2(nx + CURL_EPS, ny) - noise2(nx - CURL_EPS, ny);
          const dndy = noise2(nx, ny + CURL_EPS) - noise2(nx, ny - CURL_EPS);
          let wx = dndy;
          let wy = -dndx;
          const cl = Math.hypot(wx, wy) || 1;
          const sp = 40 + 50 * hash2(j * 1.31, s * 7.7); // 40‑90 px/s per grain
          wx = (wx / cl) * sp * 0.6;
          wy = (wy / cl) * sp * 0.6 - sp * 0.8; // upward bias
          const mix = Math.min(1, dt * 5);
          vx += (wx - vx) * mix;
          vy += (wy - vy) * mix;
          x += vx * dt;
          y += vy * dt;

          v[o] = x;
          v[o + 1] = y;
          v[o + 2] = vx;
          v[o + 3] = vy;

          const speed = Math.hypot(vx, vy);
          const a = (1 - age / life) * (0.75 + 0.25 * Math.min(1, speed / 500));
          if (a !== lastAlpha) {
            ctx.globalAlpha = a;
            lastAlpha = a;
          }
          ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
          j++;
        }
        if (slot.vc > 0) settled = false;

        if (settled) {
          // snap to homes and let the column sleep
          for (let i = 0; i < slot.gc; i++) {
            const o = i * FLOATS;
            g[o] = g[o + 4];
            g[o + 1] = g[o + 5];
            g[o + 2] = 0;
            g[o + 3] = 0;
          }
          slot.active = false;
          markSleepDirty();
        }
      }
      ctx.globalAlpha = 1;
      raf = anyActive ? requestAnimationFrame(loop) : 0;
    };

    const wake = () => {
      if (!raf && ctx) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    const transition = (s: number, d: number) => {
      if (!glyphs) return;
      const slot = slots[s];
      const g = slot.g;
      const v = slot.v;

      // outgoing digit sublimates: grains move to the vapor pool
      let vc = 0;
      for (let i = 0; i < slot.gc && vc < MAX_GRAINS; i++) {
        const o = i * FLOATS;
        const vo = vc * FLOATS;
        v[vo] = g[o];
        v[vo + 1] = g[o + 1];
        v[vo + 2] = g[o + 2] * 0.4;
        v[vo + 3] = g[o + 3] * 0.4 - 12; // small upward kick at release
        v[vo + 4] = 0;
        v[vo + 5] = 600 + Math.random() * 300; // ms lifespan
        vc++;
      }
      slot.vc = vc;

      // incoming digit condenses out of the departing cloud region
      const homes = glyphs[d];
      const cell = cells[s];
      const n = homes.length / 2;
      slot.gc = n;
      for (let i = 0; i < n; i++) {
        const o = i * FLOATS;
        const hx = cell.x + homes[i * 2];
        const hy = cell.y + homes[i * 2 + 1];
        if (vc > 0) {
          const src = ((Math.random() * vc) | 0) * FLOATS;
          g[o] = v[src] + (Math.random() - 0.5) * 10;
          g[o + 1] = v[src + 1] + (Math.random() - 0.5) * 10;
          g[o + 2] = (Math.random() - 0.5) * 40;
          g[o + 3] = -20 - Math.random() * 40;
        } else {
          g[o] = hx;
          g[o + 1] = hy;
          g[o + 2] = 0;
          g[o + 3] = 0;
        }
        g[o + 4] = hx;
        g[o + 5] = hy;
      }
      slot.active = true;
      // This slot is now animated inline, so it must leave the baked layer.
      markSleepDirty();
    };

    const init = () => {
      if (!ctx) return;
      const rootRect = root.getBoundingClientRect();
      const w = Math.round(rootRect.width);
      const h = Math.round(rootRect.height);
      if (w < 2 || h < 2) return;
      lastW = w;
      lastH = h;
      cw = w + PAD_X * 2;
      ch = h + PAD_TOP + PAD_BOTTOM;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      markSleepDirty();

      cells = digitEls.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - rootRect.left + PAD_X,
          y: r.top - rootRect.top + PAD_TOP,
        };
      });

      // rasterize glyphs 0‑9 once — tabular figures make every cell identical
      const cellRect = digitEls[0].getBoundingClientRect();
      const gw = Math.max(2, Math.ceil(cellRect.width));
      const gh = Math.max(2, Math.ceil(cellRect.height));
      const off = document.createElement("canvas");
      off.width = gw;
      off.height = gh;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      const cs = getComputedStyle(digitEls[0]);
      // Use bold, clear 900 weight with system/Inter display fonts for crisp glyph contours
      octx.font = `900 ${cs.fontSize} ${cs.fontFamily}`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillStyle = "#ffffff";
      glyphs = [];
      const stride = gw > 70 ? 3 : 2;
      for (let d = 0; d < 10; d++) {
        octx.clearRect(0, 0, gw, gh);
        octx.fillText(String(d), gw / 2, gh / 2);
        const alpha = octx.getImageData(0, 0, gw, gh).data;
        const pts: number[] = [];
        for (let y = 1; y < gh; y += stride) {
          const row = y * gw;
          for (let x = 1; x < gw; x += stride) {
            // Alpha > 60 captures antialiased curved boundaries (0, 8, 5, 3, etc.) cleanly
            if (alpha[(row + x) * 4 + 3] > 60) pts.push(x, y);
          }
        }
        const total = pts.length / 2;
        const keepEvery = Math.max(1, Math.ceil(total / MAX_GRAINS));
        const homes = new Float32Array(Math.ceil(total / keepEvery) * 2);
        let n = 0;
        for (let i = 0; i < total; i += keepEvery) {
          homes[n * 2] = pts[i * 2];
          homes[n * 2 + 1] = pts[i * 2 + 1];
          n++;
        }
        glyphs.push(homes.subarray(0, n * 2));
      }

      // seat every slot on its current digit, settled — calm first paint
      for (let s = 0; s < digitEls.length; s++) {
        const slot = slots[s];
        const homes = glyphs[Number(digits.charAt(s))];
        const cell = cells[s];
        const n = homes.length / 2;
        slot.gc = n;
        slot.vc = 0;
        slot.active = false;
        for (let i = 0; i < n; i++) {
          const o = i * FLOATS;
          const hx = cell.x + homes[i * 2];
          const hy = cell.y + homes[i * 2 + 1];
          slot.g[o] = hx;
          slot.g[o + 1] = hy;
          slot.g[o + 2] = 0;
          slot.g[o + 3] = 0;
          slot.g[o + 4] = hx;
          slot.g[o + 5] = hy;
        }
      }
      wake(); // one paint, then the loop sleeps until the next tick
    };

    // ---- clock: rAF wakes on each second boundary --------------------------
    const schedule = () => {
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 15);
    };
    const tick = () => {
      const next = toDigits();
      if (next !== digits) {
        for (let s = 0; s < digitEls.length; s++) {
          if (next.charAt(s) !== digits.charAt(s)) {
            digitEls[s].textContent = next.charAt(s);
            if (!reduced) transition(s, Number(next.charAt(s)));
          }
        }
        digits = next;
        applyDateTime();
        if (!reduced) wake();
      }
      if (remaining() > 0) schedule();
    };

    digits = toDigits();
    for (let s = 0; s < digitEls.length; s++) digitEls[s].textContent = digits.charAt(s);
    applyDateTime();
    if (remaining() > 0) schedule();

    if (reduced || !ctx) {
      // reduced motion: canvas stays hidden (CSS), the real <time> is visible
      return () => {
        disposed = true;
        if (timer) clearTimeout(timer);
      };
    }

    let ro: ResizeObserver | undefined;
    // raster only after Geist has loaded — a fallback‑font raster is wrong
    document.fonts.ready.then(() => {
      if (disposed) return;
      init();
      ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w !== lastW || h !== lastH) init();
      });
      ro.observe(root);
    });

    // re‑derive grain color on theme toggle — class/data‑theme flips on
    // documentElement, and OS‑level scheme changes fire through matchMedia.
    const onThemeChange = () => {
      updateGrainColor();
      markSleepDirty();
      wake();
    };
    const mo = new MutationObserver(onThemeChange);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    // Pause canvas animation when scrolled offscreen
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) wake();
    }, { threshold: 0.02 });
    io.observe(root);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      ro?.disconnect();
      mo.disconnect();
      colorScheme.removeEventListener("change", onThemeChange);
    };
  }, [targetKey]);

  return (
    <div
      ref={rootRef}
      className={`relative inline-grid select-none max-w-[96vw] mx-auto ${className}`}
      style={{
        gridTemplateColumns: "repeat(4, auto)",
        columnGap: "clamp(0.45rem, 2.5vw, 0.55em)",
        rowGap: "clamp(0.35rem, 1.5vw, 0.75rem)",
        fontSize: "clamp(2.75rem, 11.8vw, 12.5rem)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {/* real element: screen‑reader truth; visible static under reduced motion */}
      <time ref={timeRef} aria-live="off" style={{ display: "contents" }}>
        {/* Days: 2 digits */}
        <span
          key="group-days"
          className="flex justify-center font-black leading-none tracking-tight text-white opacity-0 tabular-nums motion-reduce:opacity-100"
        >
          <span data-vc-digit>0</span>
          <span data-vc-digit>0</span>
        </span>
        {/* Hours, Minutes, Seconds: 2 digits each */}
        {[1, 2, 3].map((group) => (
          <span
            key={group}
            className="flex justify-center font-black leading-none tracking-tight text-white opacity-0 tabular-nums motion-reduce:opacity-100"
          >
            <span data-vc-digit>0</span>
            <span data-vc-digit>0</span>
          </span>
        ))}
      </time>
      {labels &&
        labels.map((label) => (
          <span
            key={label}
            className="text-center font-mono text-[10px] xs:text-[11px] sm:text-xs md:text-sm tracking-[0.14em] sm:tracking-[0.25em] text-white/95 font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
          >
            {label}
          </span>
        ))}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute motion-reduce:hidden"
        style={{
          left: -PAD_X,
          top: -PAD_TOP,
          width: `calc(100% + ${PAD_X * 2}px)`,
          height: `calc(100% + ${PAD_TOP + PAD_BOTTOM}px)`,
          filter: "drop-shadow(0 4px 16px rgba(0, 0, 0, 0.45)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5))",
        }}
      />
    </div>
  );
}
