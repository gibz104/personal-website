// Composite — ported from vgpu's nextjs-flare example.
//
// The 48-step walk toward the light samples the *rim* texture, not an occlusion
// mask: it gathers the light already sitting on the mark and smears it back
// along the view ray, which is why the beams appear to come off the letterforms
// rather than past them. Decay and step density are driven by `extension`, and
// the accumulation is normalised by its own weight sum so changing reach does
// not change total energy.
//
// Two departures from the original: the character matrix is composited beneath
// the flare, and the blue-noise texture the reference ships is replaced by an
// R2 low-discrepancy dither, which stratifies about as well with no asset.

struct Params {
  light: vec2f,
  aspect: vec2f,
  logoCenter: vec2f,
  flareColor: vec3f,
  rimIntensity: f32,
  extension: f32,
  beamIntensity: f32,
  filmGrain: f32,
  smoothness: f32,
  logoOpacity: f32,
  frameIndex: u32,
  spotFocus: f32,
  scatter: f32,
  rimFill: f32,
  verticalEdgeFade: f32,
  /// How completely the mark blacks out the matrix behind it.
  markDarkness: f32,
  fade: f32,
}

@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var sceneTexture: texture_2d<f32>;
@group(0) @binding(2) var rimTexture: texture_2d<f32>;
@group(0) @binding(3) var rimBlurTexture: texture_2d<f32>;
@group(0) @binding(4) var plateTexture: texture_2d<f32>;
@group(0) @binding(5) var<uniform> params: Params;

fn resolveDarkColor(radiance: vec3f) -> vec3f {
  return max(vec3f(0.0), vec3f(1.0) - exp(-radiance * 1.3));
}

/// R2 low-discrepancy dither — the plus-form generalised golden ratio. Stands
/// in for the reference's blue-noise texture.
fn r2Dither(pixel: vec2u, frameIndex: u32) -> f32 {
  let base = fract(0.7548776662 * f32(pixel.x) + 0.5698402909 * f32(pixel.y));
  return fract(base + f32(frameIndex) * 0.61803398875);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let markSample = textureSampleLevel(sceneTexture, linearSampler, uv, 0.0);
  // Red is the contour, which is what the flare lights. Green is the body,
  // which only ever subtracts.
  let scene = markSample.r;
  let rimSample = textureSampleLevel(rimTexture, linearSampler, uv, 0.0).r;
  let rimBlur = textureSampleLevel(rimBlurTexture, linearSampler, uv, 0.0).r;

  let direction = uv - params.light;
  let decay = mix(0.85, 0.975, params.extension);
  let density = mix(0.35, 1.15, params.extension);
  let delta = direction * (density / 48.0);

  let dimensions = textureDimensions(rimTexture);
  let pixel = vec2u(clamp(uv * vec2f(dimensions), vec2f(0.0), vec2f(dimensions) - vec2f(1.0)));
  let jitter = r2Dither(pixel, params.frameIndex);

  var coordinate = uv - delta * jitter * params.smoothness;
  var illumination = 1.0;
  var illuminationSum = 0.0;
  var rimRays = 0.0;
  for (var i = 0; i < 48; i = i + 1) {
    coordinate = coordinate - delta;
    let sharpRay = textureSampleLevel(rimTexture, linearSampler, coordinate, 0.0).r;
    let blurredRay = textureSampleLevel(rimBlurTexture, linearSampler, coordinate, 0.0).r;
    rimRays = rimRays + mix(sharpRay, blurredRay, params.smoothness) * illumination;
    illuminationSum = illuminationSum + illumination;
    illumination = illumination * decay;
  }
  // Preserve the extension=1 energy while allowing extension to control reach.
  rimRays = rimRays / max(illuminationSum, 0.001) * 4.102966;

  let haloDelta = (uv - params.light) * params.aspect;
  let haloRadius = mix(0.05, 0.6, params.spotFocus);
  let halo = exp(-dot(haloDelta, haloDelta) / (haloRadius * haloRadius));
  let lineCoverage = max(scene, rimBlur * 0.65);
  let haloLine = halo * lineCoverage * params.rimIntensity * 1.1;
  let spot = max(rimSample, rimBlur * 0.85 * params.rimFill) * (1.0 + halo * 1.5);
  let scatterSignal = rimRays * params.beamIntensity * params.scatter;

  var radiance = params.flareColor * haloLine;
  radiance = radiance + vec3f(scene) * params.logoOpacity * 0.22;
  radiance = radiance + mix(vec3f(1.0), params.flareColor, 0.5) * spot * params.rimIntensity;
  radiance = radiance + params.flareColor * spot * 0.4 * params.rimIntensity;
  radiance = radiance + params.flareColor * scatterSignal;

  let radialMask = smoothstep(1.35, 0.25, length((uv - params.logoCenter) * params.aspect));
  let color = resolveDarkColor(radiance * radialMask);
  let beamSignal = scatterSignal * radialMask;

  let verticalFadeWidth = max(params.verticalEdgeFade, 0.0001);
  let horizontalFadeWidth = verticalFadeWidth * params.aspect.y / max(params.aspect.x, 0.0001);
  let verticalEdgeMask = smoothstep(0.0, verticalFadeWidth, uv.y)
    * smoothstep(0.0, verticalFadeWidth, 1.0 - uv.y);
  let horizontalEdgeMask = smoothstep(0.0, horizontalFadeWidth, uv.x)
    * smoothstep(0.0, horizontalFadeWidth, 1.0 - uv.x);
  let edgeMask = verticalEdgeMask * horizontalEdgeMask;
  let composed = mix(vec3f(0.0), color, edgeMask);

  // The character matrix, with the mark punched out of it. The body darkens the
  // flare as well as the plate — otherwise the beams cross the letters and the
  // silhouette stops being a silhouette.
  //
  // The stroke is centred on the contour, so the body mask covers its inner
  // half exactly. Darkening by it leaves the outer half lit, which is the whole
  // effect: the outside shines and the inside stays black.
  let plate = textureSampleLevel(plateTexture, linearSampler, uv, 0.0).rgb;
  let body = smoothstep(0.35, 0.65, markSample.g);
  let opened = 1.0 - body * params.markDarkness;
  var out = plate * opened + composed * opened;

  // A decorrelated dither layer masks sparse ray-march structure only in dim
  // and mid scattering, leaving the mark and flat background untouched.
  let grain = (r2Dither(pixel * vec2u(3u, 5u) + vec2u(53u, 17u), params.frameIndex + 7u) - 0.5) * 2.0;
  let beamGate = smoothstep(0.003, 0.05, beamSignal) * (1.0 - smoothstep(0.4, 1.0, beamSignal));
  let logoCoverage = max(scene, max(rimSample, rimBlur));
  let grainMask = beamGate * (1.0 - smoothstep(0.02, 0.3, logoCoverage)) * edgeMask;
  out = clamp(out + vec3f(grain * params.filmGrain * grainMask), vec3f(0.0), vec3f(1.0));

  return vec4f(out * params.fade, 1.0);
}
