export const vertexShader = `
uniform vec4 uRect;          // card rect in 0..1 screen space (x, y from bottom, w, h)
uniform vec2 uViewportPx;
uniform float uCurlStrength;

varying vec2 vUv;

/**
 * The quad used to be a full-screen triangle pair, with the card's rectangle
 * cut out in the fragment shader via early-return + discard. That rasterised
 * the entire viewport once per card (ten cards => ~32M fragment invocations
 * per frame to produce ~1.5M useful pixels) and defeated early-Z.
 *
 * Here the quad is fitted to the card's on-screen footprint instead. vUv is
 * still the screen UV, so every line of the fragment shader below behaves
 * exactly as before and the rendered result is pixel-identical.
 */
void main() {
  // Degenerate rect (before the first useFrame has measured the card):
  // push the whole primitive outside the clip volume so nothing rasterises.
  if (uRect.z <= 0.0 || uRect.w <= 0.0) {
    vUv = vec2(0.0);
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  // A few pixels of slack so rounded-corner antialiasing has room.
  vec2 margin = vec2(3.0) / max(uViewportPx, vec2(1.0));
  float x0 = uRect.x - margin.x;
  float x1 = uRect.x + uRect.z + margin.x;
  float y0 = uRect.y - margin.y;
  float y1 = uRect.y + uRect.w + margin.y;

  // The fragment shader samples through applyCurl(), which pulls x toward 0.5
  // by up to uCurlStrength. Inverting that pushes the on-screen footprint away
  // from 0.5, so cover the union of the un-curled and fully-curled extents.
  // This is a conservative bound, so no interpolation error can clip the card.
  float invMax = 1.0 / max(1.0 - uCurlStrength, 1e-3);
  float e0 = (x0 - 0.5) * invMax + 0.5;
  float e1 = (x1 - 0.5) * invMax + 0.5;

  float left  = min(min(x0, x1), min(e0, e1));
  float right = max(max(x0, x1), max(e0, e1));

  // applyCurl() leaves y untouched, so the vertical extent is exact.
  vUv = vec2(mix(left, right, uv.x), mix(y0, y1, uv.y));
  gl_Position = vec4(vUv * 2.0 - 1.0, 0.0, 1.0);
}
`

export const fragmentShader = `
uniform sampler2D map;
uniform sampler2D mapHover;
uniform vec4 uRect;
uniform float uHoverRevealProgress;
uniform float uDotPixelSize;
uniform vec2 uViewportPx;
uniform float uPolarityPositive;
uniform float uCurlStrength;

varying vec2 vUv;

vec2 applyCurl(vec2 screenUv) {
  float centered = 2.0 * screenUv.y - 1.0;
  float profile = 1.0 - sqrt(max(0.0, 1.0 - centered * centered)); // semicircular profile
  float uvScale = 1.0 - profile * uCurlStrength;
  float distortedX = (screenUv.x - 0.5) * uvScale + 0.5;
  return vec2(distortedX, screenUv.y);
}

vec3 applyPolarity(vec3 rgb) {
  float t = clamp(uPolarityPositive, 0.0, 1.0);
  return mix(1.0 - rgb, rgb, t);
}

vec4 revealHoverImage(vec2 screenUv) {
  vec2 localUv = (screenUv - uRect.xy) / uRect.zw;

  // Early discard: skip all pixels outside card rectangle immediately
  if (localUv.x < -0.005 || localUv.x > 1.005 || localUv.y < -0.005 || localUv.y > 1.005) {
    return vec4(0.0);
  }

  float rectWidthPx  = max(uRect.z * uViewportPx.x, 1.0);
  float rectHeightPx = max(uRect.w * uViewportPx.y, 1.0);

  // Anti-aliased rounded rectangle corner clipping (24px corner radius)
  vec2 halfSizePx = vec2(rectWidthPx, rectHeightPx) * 0.5;
  vec2 posPx = (localUv - 0.5) * vec2(rectWidthPx, rectHeightPx);
  float radiusPx = min(24.0, min(halfSizePx.x, halfSizePx.y));
  vec2 q = abs(posPx) - halfSizePx + radiusPx;
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radiusPx;
  float cornerMask = 1.0 - smoothstep(-1.0, 1.0, dist);
  if (cornerMask <= 0.005) {
    return vec4(0.0);
  }

  vec4 baseColor = texture2D(map, clamp(localUv, 0.0, 1.0));
  vec4 color = baseColor;

  float progress = clamp(uHoverRevealProgress, 0.0, 1.0);
  if (progress > 0.001) {
    float rectAspect = rectWidthPx / rectHeightPx;
    vec2 centered = localUv * 2.0 - 1.0;
    centered.x *= rectAspect;
    float distToCenter = length(centered);
    float maxRadius = length(vec2(rectAspect, 1.0));

    float radius = progress * (maxRadius + 0.15);
    float grow = 1.0 - smoothstep(radius - 0.15, radius + 0.15, distToCenter);

    if (grow >= 0.999) {
      color = texture2D(mapHover, clamp(localUv, 0.0, 1.0));
    } else if (grow > 0.001) {
      vec4 hoverColor = texture2D(mapHover, clamp(localUv, 0.0, 1.0));
      vec2 viewportPx = max(uViewportPx, vec2(1.0));
      vec2 cellSizeUv = vec2(max(2.0, uDotPixelSize)) / viewportPx;
      vec2 cellUv = fract(screenUv / cellSizeUv);
      float squareDist = max(abs(cellUv.x - 0.5), abs(cellUv.y - 0.5));
      float squareExtent = grow * 0.5;
      float squareAa = max(fwidth(squareDist), 0.001);
      float squareMask = 1.0 - smoothstep(squareExtent - squareAa, squareExtent + squareAa, squareDist);
      color = mix(baseColor, hoverColor, clamp(squareMask, 0.0, 1.0));
    }
  }

  color.a *= cornerMask;

  // Subtle 3D sticky note shading when curled
  float curlShade = (localUv.x - 0.5) * uCurlStrength * 3.0;
  color.rgb += vec3(curlShade * 0.12);

  return color;
}

void main() {
  vec2 curledUv = applyCurl(vUv);
  vec4 color = revealHoverImage(curledUv);

  if (color.a < 0.01) discard;

  color.rgb = applyPolarity(color.rgb);
  gl_FragColor = color;
}
`
