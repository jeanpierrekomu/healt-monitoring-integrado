// Material holográfico (fresnel + líneas de escaneo + parpadeo).
// Adaptado de "threejs-holographic-material" de Anderson Mancini (MIT License, 2023):
// https://github.com/ektogamat/threejs-holographic-material
// Cambios: versión TypeScript que devuelve una instancia lista para asignar a mallas (incluidas mallas con esqueleto).
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const vertex = /* glsl */ `
  #define STANDARD
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying vec4 vPos;
  varying vec3 vNormalW;
  varying vec3 vPositionW;

  #include <common>
  #include <uv_pars_vertex>
  #include <color_pars_vertex>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  #include <clipping_planes_pars_vertex>

  void main() {
    #include <uv_vertex>
    #include <color_vertex>
    #include <morphcolor_vertex>
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    #include <worldpos_vertex>

    vUv = uv;
    vPos = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    vPositionW = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPositionW;
  varying vec4 vPos;
  varying vec3 vNormalW;

  uniform float time;
  uniform float fresnelOpacity;
  uniform float scanlineSize;
  uniform float fresnelAmount;
  uniform float signalSpeed;
  uniform float hologramBrightness;
  uniform float hologramOpacity;
  uniform bool blinkFresnelOnly;
  uniform bool enableBlinking;
  uniform vec3 hologramColor;
  uniform float revealY;   // altura (mundo) hasta la que se ve el holograma: animación de aparición
  uniform float pulse;     // destello por latido / glitch
  uniform vec3 edgeColor;  // color del borde de "impresión"

  float flicker(float amt, float t) { return clamp(fract(cos(t) * 43758.5453123), amt, 1.0); }
  float random(in float a, in float b) { return fract((cos(dot(vec2(a, b), vec2(12.9898, 78.233))) * 43758.5453)); }

  void main() {
    if (vPositionW.y > revealY) discard;
    vec2 vCoords = vPos.xy / vPos.w;
    vCoords = vCoords * 0.5 + 0.5;
    vec2 myUV = fract(vCoords);

    vec4 holo = vec4(hologramColor, mix(hologramBrightness, vUv.y, 0.5));

    float scanlines = 10.;
    scanlines += 20. * sin(time * signalSpeed * 20.8 - myUV.y * 60. * scanlineSize);
    scanlines *= smoothstep(1.3 * cos(time * signalSpeed + myUV.y * scanlineSize), 0.78, 0.9);
    scanlines *= max(0.25, sin(time * signalSpeed) * 1.0);

    float r = random(vUv.x, vUv.y);
    float b = random(vUv.y * .9, vUv.y * .2);
    holo += vec4(r * scanlines, b * scanlines, r, 1.0) / 84.;
    vec4 scanlineMix = mix(vec4(0.0), holo, holo.a);

    vec3 viewDirectionW = normalize(cameraPosition - vPositionW);
    float fresnelEffect = dot(viewDirectionW, vNormalW) * (1.6 - fresnelOpacity / 2.);
    fresnelEffect = clamp(fresnelAmount - fresnelEffect, 0., fresnelOpacity);

    float blinkValue = enableBlinking ? 0.6 - signalSpeed : 1.0;
    float blink = flicker(blinkValue, time * signalSpeed * .02);

    vec3 finalColor = blinkFresnelOnly ? scanlineMix.rgb + fresnelEffect * blink : scanlineMix.rgb * blink + fresnelEffect;
    float edge = smoothstep(revealY - 0.07, revealY, vPositionW.y);
    finalColor = finalColor * (1.0 + pulse) + edgeColor * edge * 1.6;
    gl_FragColor = vec4(finalColor, hologramOpacity);
  }
`;

const HolographicShader = shaderMaterial(
  {
    time: 0,
    fresnelOpacity: 1,
    fresnelAmount: 0.45,
    scanlineSize: 8,
    hologramBrightness: 1.2,
    signalSpeed: 0.45,
    hologramColor: new THREE.Color("#51a4de"),
    enableBlinking: true,
    blinkFresnelOnly: true,
    hologramOpacity: 1,
    revealY: 10,
    pulse: 0,
    edgeColor: new THREE.Color("#bfeaff"),
  },
  vertex,
  fragment,
);

export interface HologramOptions {
  color?: string;
  opacity?: number;
  brightness?: number;
  fresnelAmount?: number;
  scanlineSize?: number;
  signalSpeed?: number;
}

export function createHologramMaterial(o: HologramOptions = {}) {
  const m = new HolographicShader() as unknown as THREE.ShaderMaterial;
  m.uniforms.hologramColor.value = new THREE.Color(o.color ?? "#51a4de");
  m.uniforms.hologramOpacity.value = o.opacity ?? 1;
  m.uniforms.hologramBrightness.value = o.brightness ?? 1.2;
  m.uniforms.fresnelAmount.value = o.fresnelAmount ?? 0.45;
  m.uniforms.scanlineSize.value = o.scanlineSize ?? 8;
  m.uniforms.signalSpeed.value = o.signalSpeed ?? 0.45;
  m.transparent = true;
  m.depthWrite = false;
  m.blending = THREE.AdditiveBlending;
  m.side = THREE.FrontSide;
  return m;
}
