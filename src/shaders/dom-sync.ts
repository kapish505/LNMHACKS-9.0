export const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  // position is from a plane covering -1 to 1
  gl_Position = vec4(position, 1.0);
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
