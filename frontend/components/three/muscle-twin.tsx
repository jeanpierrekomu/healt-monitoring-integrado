"use client";

// Gemelo muscular 3D. Usa el mismo cuerpo humano del holograma (el que va dentro del traje),
// pintado en rojo con fibras musculares dibujadas por programa (three.js):
// - Forma: el cuerpo se ajusta a las proporciones del escaneo (hombros, cintura, cadera, fondo y largo de piernas).
// - Carga: cada zona muscular se enciende según su nivel (óptimo = rojo natural, moderada = naranja, elevada = amarillo).
// Las fibras y los tendones son un dibujo sobre la superficie, no una disección anatómica real.
import { Line, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Joints, MuscleGroup, MuscleLevel, Proportions } from "@/services/muscle-scan";

const MODEL_URL = "/models/body-organs.glb";

// Medidas del modelo base (en sus propias unidades), para comparar con el escaneo.
const M = { hipY: -0.02, shoulderY: 0.6, ankleY: -0.86, shoulderW: 0.38, hipW: 0.25, chestD: 0.3, waistD: 0.28, pelvisD: 0.28 };
const TORSO = M.shoulderY - M.hipY;
const SIZE = 1.5; // tamaño con que se muestra en pantalla
const clamp = (v: number, a = 0.82, b = 1.25) => Math.min(b, Math.max(a, v));
const LEVEL_VALUE: Record<MuscleLevel, number> = { optimal: 0, moderate: 0.5, elevated: 1 };
const GROUP_ORDER: MuscleGroup[] = ["neck", "chest", "abs", "back", "glutes", "legs"];
const BONES: [string, string][] = [
  ["left_shoulder", "right_shoulder"], ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"], ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"], ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"], ["left_hip", "right_hip"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"], ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
];

/** Cuánto hay que estirar o encoger el modelo base para igualar las proporciones del escaneo. */
function fitScales(j: Joints, p: Proportions | undefined) {
  const d = (a: string, b: string) => Math.hypot((j[a]?.x ?? 0) - (j[b]?.x ?? 0), (j[a]?.y ?? 0) - (j[b]?.y ?? 0), (j[a]?.z ?? 0) - (j[b]?.z ?? 0));
  const mid = (a: string, b: string) => ((j[a]?.y ?? 0) + (j[b]?.y ?? 0)) / 2;
  const T = Math.max(0.5, mid("left_shoulder", "right_shoulder") - mid("left_hip", "right_hip")); // torso del escaneo
  const rel = (scan: number, model: number) => clamp(scan / T / (model / TORSO));
  const shoulder = rel(p?.widths?.biacromial_shoulder_width ?? d("left_shoulder", "right_shoulder"), M.shoulderW);
  const hip = rel(p?.widths?.biiliac_hip_width ? p.widths.biiliac_hip_width * 0.62 : d("left_hip", "right_hip"), M.hipW);
  const waist = p?.widths?.waist_width_estimated ? rel(p.widths.waist_width_estimated, 0.34) : (shoulder + hip) / 2;
  const leg = rel((d("left_hip", "left_knee") + d("left_knee", "left_ankle") + d("right_hip", "right_knee") + d("right_knee", "right_ankle")) / 2, M.hipY - M.ankleY);
  const z = p?.depths_z;
  return {
    shoulder, waist, hip, leg,
    chestZ: z?.chest_anteroposterior_depth ? rel(z.chest_anteroposterior_depth, M.chestD) : 1,
    waistZ: z?.waist_anteroposterior_depth ? rel(z.waist_anteroposterior_depth, M.waistD) : 1,
    hipZ: z?.pelvis_anteroposterior_depth ? rel(z.pelvis_anteroposterior_depth, M.pelvisD) : 1,
    torso: T,
  };
}

const VERT_HEAD = /* glsl */ `
uniform vec3 uX; // ancho: cadera, cintura, hombros
uniform vec3 uZ; // fondo: cadera, cintura, pecho
uniform float uLeg;
varying vec3 vObj;
varying vec3 vNrm;
float band2(float v, float a, float b) { return smoothstep(a - 0.015, a + 0.015, v) * (1.0 - smoothstep(b - 0.015, b + 0.015, v)); }
`;
const VERT_BODY = /* glsl */ `
vObj = position;
vNrm = normal;
{
  float y = transformed.y;
  float torso = smoothstep(-0.14, -0.02, y) * (1.0 - smoothstep(0.62, 0.72, y)); // 1 en el tronco
  float up = smoothstep(0.12, 0.5, y);    // de la cintura a los hombros
  float low = smoothstep(-0.05, 0.2, y);  // de la cadera a la cintura
  float sx = mix(mix(uX.x, uX.y, low), uX.z, up);
  float sz = mix(mix(uZ.x, uZ.y, low), uZ.z, up);
  transformed.x *= mix(mix(uX.x, 1.0, smoothstep(0.62, 0.72, y)), sx, torso);
  transformed.z *= mix(1.0, sz, torso);
  if (y < -0.08) transformed.y = -0.08 + (y + 0.08) * uLeg; // largo de piernas
  // Entrepierna lisa, como un maniquí anatómico.
  float groin = band2(y, -0.16, -0.03) * (1.0 - smoothstep(0.03, 0.07, abs(position.x)));
  transformed.z = mix(transformed.z, min(transformed.z, 0.085), groin);
}
`;
const FRAG_HEAD = /* glsl */ `
uniform float uLoad[6]; // cuello, pecho, abdomen, espalda, glúteos, piernas (0 óptimo · 0.5 moderada · 1 elevada)
uniform float uHeat;
uniform float uTime;
varying vec3 vObj;
varying vec3 vNrm;
float band(float v, float a, float b, float soft) { return smoothstep(a - soft, a + soft, v) * (1.0 - smoothstep(b - soft, b + soft, v)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;
const FRAG_COLOR = /* glsl */ `
{
  vec3 p = vObj;
  float ax = abs(p.x);
  float front = smoothstep(-0.15, 0.35, vNrm.z);
  float back = 1.0 - front;
  float arm = smoothstep(0.2, 0.26, ax + max(0.0, 0.33 - p.y) * 0.25) * (1.0 - smoothstep(0.5, 0.62, p.y));

  // Zonas musculares.
  float gNeck = band(p.y, 0.6, 0.72, 0.02) + back * band(p.y, 0.5, 0.62, 0.03) * (1.0 - smoothstep(0.1, 0.2, ax));
  float gDelt = band(p.y, 0.5, 0.66, 0.02) * smoothstep(0.17, 0.21, ax);
  float gChest = clamp(front * band(p.y, 0.4, 0.6, 0.02) * (1.0 - arm) + gDelt, 0.0, 1.0);
  float gAbs = front * band(p.y, -0.06, 0.4, 0.02) * (1.0 - arm);
  float gBack = back * band(p.y, 0.02, 0.5, 0.03) * (1.0 - arm);
  float gGlute = back * band(p.y, -0.15, 0.02, 0.02) * (1.0 - arm);
  float gLegs = (1.0 - smoothstep(-0.14, -0.09, p.y)) * smoothstep(-0.9, -0.86, p.y);
  gNeck = clamp(gNeck, 0.0, 1.0);

  // Fibras: a lo largo en brazos, piernas y abdomen; en abanico en el pecho; en diagonal en la espalda.
  float along = sin((p.x * 1.0 + p.z * 0.7) * 260.0 + hash(floor(p.xy * 40.0)) * 1.5);
  float fan = sin((p.y * 0.8 - ax * 0.9) * 240.0);
  float diag = sin((p.y * 0.7 + ax * 0.8) * 230.0);
  float fib = mix(along, fan, gChest * (1.0 - gDelt));
  fib = mix(fib, diag, gBack * smoothstep(0.2, 0.5, p.y));
  fib = fib * 0.5 + 0.5;

  // Separaciones y tendones (más claros): línea media, cuadros del abdomen, rodillas, codos y tobillos.
  float lineMid = front * band(p.y, -0.04, 0.58, 0.02) * (1.0 - smoothstep(0.003, 0.009, ax));
  float rows = fract((p.y - 0.045) / 0.078);
  float absGrid = gAbs * (1.0 - smoothstep(0.075, 0.095, ax)) * (1.0 - smoothstep(0.0, 0.045, rows) * (1.0 - smoothstep(0.955, 1.0, rows)));
  float absEdge = gAbs * band(ax, 0.086, 0.094, 0.004) * band(p.y, 0.04, 0.37, 0.02);
  float knee = band(p.y, -0.5, -0.44, 0.02);
  float ankle = band(p.y, -0.88, -0.82, 0.015);
  float pecLine = front * band(p.y, 0.392, 0.404, 0.006) * (1.0 - smoothstep(0.17, 0.2, ax));
  float tendon = clamp(lineMid * 0.7 + absGrid * 0.4 + absEdge * 0.35 + knee * front * 0.35 + ankle * 0.3 + pecLine * 0.5, 0.0, 1.0);

  vec3 deep = vec3(0.36, 0.035, 0.04);
  vec3 red = vec3(0.78, 0.11, 0.1);
  vec3 col = mix(deep, red, 0.35 + 0.65 * fib);
  col = mix(col, vec3(0.9, 0.72, 0.66), tendon * 0.7);
  // Manos, pies y cara: sin fibras marcadas.
  float plain = max(1.0 - smoothstep(-0.92, -0.87, p.y), smoothstep(0.72, 0.76, p.y) * front);
  col = mix(col, vec3(0.62, 0.16, 0.15), plain * 0.7);

  // Carga muscular: naranja (moderada) → amarillo brillante (elevada), con un pulso suave.
  float load = gNeck * uLoad[0];
  load = max(load, gChest * uLoad[1]);
  load = max(load, gAbs * uLoad[2]);
  load = max(load, gBack * uLoad[3]);
  load = max(load, gGlute * uLoad[4]);
  load = max(load, gLegs * uLoad[5]);
  load *= uHeat;
  vec3 hot = mix(vec3(1.0, 0.55, 0.1), vec3(1.0, 0.9, 0.3), smoothstep(0.5, 1.0, load));
  float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
  col = mix(col, hot * (0.75 + 0.25 * fib), smoothstep(0.0, 0.5, load) * 0.8 * pulse);
  vLoadGlow = hot * smoothstep(0.2, 1.0, load) * 0.5 * pulse;
  diffuseColor.rgb = col;
}
`;

function Body({ joints, proportions, levels, heat }: {
  joints: Joints; proportions?: Proportions; levels: Partial<Record<MuscleGroup, MuscleLevel>>; heat: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const geometry = useMemo(() => {
    let g: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.name.startsWith("skin")) g = m.geometry;
    });
    return g as THREE.BufferGeometry | null;
  }, [scene]);

  const uniforms = useMemo(
    () => ({
      uX: { value: new THREE.Vector3(1, 1, 1) },
      uZ: { value: new THREE.Vector3(1, 1, 1) },
      uLeg: { value: 1 },
      uLoad: { value: [0, 0, 0, 0, 0, 0] },
      uHeat: { value: 1 },
      uTime: { value: 0 },
    }),
    [],
  );
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#c41f1a", roughness: 0.42, metalness: 0.05 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${VERT_HEAD}`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERT_BODY}`);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${FRAG_HEAD}\nvec3 vLoadGlow = vec3(0.0);`)
        .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAG_COLOR}`)
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vLoadGlow;");
    };
    return m;
  }, [uniforms]);
  useEffect(() => () => material.dispose(), [material]);

  const fit = useMemo(() => fitScales(joints, proportions), [joints, proportions]);
  /* eslint-disable react-hooks/immutability -- three.js: los uniformes del material se actualizan por mutación */
  useEffect(() => {
    uniforms.uX.value.set(fit.hip, fit.waist, fit.shoulder);
    uniforms.uZ.value.set(fit.hipZ, fit.waistZ, fit.chestZ);
    uniforms.uLeg.value = fit.leg;
    uniforms.uLoad.value = GROUP_ORDER.map((g) => (levels[g] ? LEVEL_VALUE[levels[g]!] : 0));
    uniforms.uHeat.value = heat ? 1 : 0;
  }, [uniforms, fit, levels, heat]);
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });
  /* eslint-enable react-hooks/immutability */

  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} />;
}

/** Esqueleto que midió la cámara, dibujado sobre el modelo (misma escala del torso). */
function ScannedSkeleton({ joints }: { joints: Joints }) {
  const pts = useMemo(() => {
    const hipY = ((joints.left_hip?.y ?? 0) + (joints.right_hip?.y ?? 0)) / 2;
    const shY = ((joints.left_shoulder?.y ?? 1) + (joints.right_shoulder?.y ?? 1)) / 2;
    const s = TORSO / Math.max(0.5, shY - hipY);
    return Object.fromEntries(
      Object.entries(joints).map(([k, p]) => [k, [p.x * s, M.hipY + (p.y - hipY) * s, p.z * s] as [number, number, number]]),
    );
  }, [joints]);
  return (
    <group>
      {BONES.filter(([a, b]) => pts[a] && pts[b]).map(([a, b]) => (
        <Line key={`${a}-${b}`} points={[pts[a], pts[b]]} color="#7dd3fc" lineWidth={2} transparent opacity={0.85} depthTest={false} />
      ))}
      {Object.entries(pts).map(([k, p]) => (
        <mesh key={k} position={p}>
          <sphereGeometry args={[0.014, 12, 12]} />
          <meshBasicMaterial color="#e0f2fe" depthTest={false} transparent />
        </mesh>
      ))}
    </group>
  );
}

export default function MuscleTwin({ joints, proportions, levels, heat, showJoints, spin }: {
  joints: Joints; proportions?: Proportions; levels: Partial<Record<MuscleGroup, MuscleLevel>>; heat: boolean; showJoints: boolean; spin: boolean;
}) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.05, 4.9], fov: 34 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <directionalLight position={[-4, 2, -4]} intensity={1.4} color="#8fb6ff" />
      <pointLight position={[0, -1.5, 3]} intensity={5} color="#ffd9c7" />
      <Suspense fallback={null}>
        <group scale={SIZE}>
          <Body joints={joints} proportions={proportions} levels={levels} heat={heat} />
          {showJoints && <ScannedSkeleton joints={joints} />}
        </group>
      </Suspense>
      {/* Aro de referencia bajo los pies */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.93 * SIZE, 0]}>
        <ringGeometry args={[0.62, 0.65, 64]} />
        <meshBasicMaterial color="#4f8cff" transparent opacity={0.5} />
      </mesh>
      <OrbitControls enablePan={false} minDistance={2} maxDistance={8.5} autoRotate={spin} autoRotateSpeed={1.1} target={[0, 0, 0]} />
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
