"use client";

// Personajes de la pantalla de selección de rol, sobre una plataforma como en un videojuego.
// - "space": el traje EMU real de la NASA (el mismo del holograma), flotando sobre la Tierra.
// - "ground": el cuerpo del atlas con uniforme médico y, encima, una bata hecha como una capa aparte
//   (con volumen, abierta al frente y con caída), cabello y estetoscopio, en una sala de control.
// Iluminación de estudio: luz principal con sombras, contraluz de color, reflejos y sombra de contacto.
import { ContactShadows, Environment, Lightformer, Sparkles, Stars, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type RoleKind = "ground" | "space";
const BODY_URL = "/models/body-organs.glb";
const SUIT_URL = "/models/emu-suit.glb";

// Utilidades compartidas por los materiales del doctor (posición y normal del modelo, sin transformar).
const V_HEAD = /* glsl */ `
varying vec3 vObj;
varying vec3 vNrm;
float band(float v, float a, float b, float s) { return smoothstep(a - s, a + s, v) * (1.0 - smoothstep(b - s, b + s, v)); }
float isHand(vec3 p) { return smoothstep(0.4, 0.44, abs(p.x)) * (1.0 - smoothstep(0.02, 0.08, p.y)); }
`;
const F_HEAD = /* glsl */ `
varying vec3 vObj;
varying vec3 vNrm;
float band(float v, float a, float b, float s) { return smoothstep(a - s, a + s, v) * (1.0 - smoothstep(b - s, b + s, v)); }
float isHand(vec3 p) { return smoothstep(0.4, 0.44, abs(p.x)) * (1.0 - smoothstep(0.02, 0.08, p.y)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

/** Material con sombreado propio inyectado en el material estándar de three.js. */
function patched(key: string, base: THREE.MeshStandardMaterialParameters, parts: { vertex: string; color: string }) {
  const m = new THREE.MeshStandardMaterial(base);
  // Sin una clave propia, three.js reutiliza el primer sombreado compilado para todos los materiales parecidos.
  m.customProgramCacheKey = () => `rol-${key}`;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${V_HEAD}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvObj = position;\nvNrm = normal;\n${parts.vertex}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${F_HEAD}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${parts.color}`);
  };
  return m;
}

// Cuerpo: uniforme médico, piel y zapatos.
const BODY = {
  vertex: /* glsl */ `
  {
    // Entrepierna lisa, como un maniquí.
    float y = position.y;
    float groin = smoothstep(-0.175, -0.145, y) * (1.0 - smoothstep(-0.045, -0.015, y)) * (1.0 - smoothstep(0.03, 0.07, abs(position.x)));
    transformed.z = mix(transformed.z, min(transformed.z, 0.082), groin);
  }`,
  color: /* glsl */ `
  {
    vec3 p = vObj;
    float ax = abs(p.x);
    float front = smoothstep(0.0, 0.4, vNrm.z);
    vec3 skin = vec3(0.86, 0.64, 0.52);
    vec3 scrubs = vec3(0.07, 0.42, 0.45);
    // Tela con un tejido apenas visible.
    float weave = 0.94 + 0.06 * hash(floor(p.xy * 900.0));
    vec3 col = scrubs * weave;
    col = mix(col, vec3(0.92, 0.93, 0.95), 1.0 - smoothstep(-0.885, -0.86, p.y)); // zapatillas
    col = mix(col, vec3(0.05, 0.3, 0.33), band(p.y, -0.08, -0.06, 0.004) * (1.0 - smoothstep(0.2, 0.26, ax))); // cintura
    // Cuello en V del uniforme: se ve la piel.
    float vneck = front * band(p.y, 0.5, 0.68, 0.006) * (1.0 - smoothstep((p.y - 0.5) * 0.42, (p.y - 0.5) * 0.42 + 0.008, ax));
    col = mix(col, skin, vneck);
    col = mix(col, skin, max(isHand(p), smoothstep(0.655, 0.675, p.y)));
    // Mejillas y labios con un poco más de color.
    float face = smoothstep(0.68, 0.7, p.y) * smoothstep(0.04, 0.1, p.z);
    col = mix(col, col * vec3(1.06, 0.93, 0.92), face * 0.5);
    diffuseColor.rgb = col;
  }`,
};

// Bata corta de laboratorio: capa aparte, más holgada que el cuerpo, abierta al frente y con vuelo en el borde.
const COAT = {
  vertex: /* glsl */ `
  {
    float hand = isHand(position);
    float flare = 1.0 - smoothstep(-0.11, 0.02, position.y);
    transformed += normal * (0.02 + 0.022 * flare) * (1.0 - hand);
  }`,
  color: /* glsl */ `
  {
    vec3 p = vObj;
    float ax = abs(p.x);
    float front = step(0.0, p.z);
    // Solo existe entre el cuello y la cadera, sin las manos.
    if (p.y > 0.655 || p.y < -0.1 || isHand(p) > 0.5) discard;
    // Abertura delantera: en V arriba (solapas) y una línea fina hacia abajo.
    float open = 0.011 + max(0.0, p.y - 0.3) * 0.36;
    if (front > 0.5 && ax < open) discard;
    // Abajo la bata se abre un poco más (evita un pliegue suelto en el centro).
    if (front > 0.5 && p.y < -0.02 && ax < 0.012 + (-0.02 - p.y) * 0.75) discard;
    vec3 white = vec3(0.95, 0.96, 0.98);
    float weave = 0.965 + 0.035 * hash(floor(p.xy * 700.0));
    vec3 col = white * weave;
    if (!gl_FrontFacing) col *= 0.78; // interior de la bata
    // Borde de la abertura, puños, bolsillos, costura del borde y botones.
    float edge = front * band(ax, open, open + 0.016, 0.003);
    float cuff = smoothstep(0.34, 0.36, ax) * band(p.y, 0.05, 0.075, 0.004);
    float hem = band(p.y, -0.092, -0.082, 0.003) * (1.0 - smoothstep(0.3, 0.34, ax));
    float pocket = front * (band(p.y, -0.012, -0.004, 0.003) * band(ax, 0.08, 0.18, 0.003) + band(p.y, -0.082, -0.004, 0.003) * (band(ax, 0.078, 0.083, 0.002) + band(ax, 0.177, 0.182, 0.002)));
    float chestPocket = front * step(0.0, p.x) * (band(p.y, 0.43, 0.437, 0.002) * band(p.x, 0.085, 0.155, 0.002));
    col = mix(col, vec3(0.74, 0.78, 0.85), clamp(edge * 0.7 + cuff * 0.6 + hem * 0.5 + pocket + chestPocket, 0.0, 1.0));
    float buttons = 0.0;
    for (int i = 0; i < 3; i++) buttons += 1.0 - smoothstep(0.007, 0.011, distance(p.xy, vec2(0.035, 0.23 - float(i) * 0.1)));
    col = mix(col, vec3(0.55, 0.6, 0.7), clamp(buttons, 0.0, 1.0) * front);
    // Credencial.
    float badge = front * band(p.x, 0.09, 0.15, 0.002) * band(p.y, 0.345, 0.425, 0.002);
    col = mix(col, vec3(0.2, 0.47, 0.98), badge);
    col = mix(col, vec3(0.95), badge * band(p.y, 0.395, 0.415, 0.002) * band(p.x, 0.1, 0.14, 0.002));
    diffuseColor.rgb = col;
  }`,
};

// Cabello: otra capa, solo en la parte alta y trasera de la cabeza.
const HAIR = {
  vertex: /* glsl */ `transformed += normal * 0.013;`,
  color: /* glsl */ `
  {
    vec3 p = vObj;
    float hair = smoothstep(0.795, 0.805, p.y + (0.04 - p.z) * 0.9);
    if (p.y < 0.68 || hair < 0.5) discard;
    float strands = 0.8 + 0.2 * sin((p.x * 3.0 + p.z) * 260.0);
    diffuseColor.rgb = vec3(0.16, 0.11, 0.08) * strands;
  }`,
};

function GroundDoctor() {
  const { scene } = useGLTF(BODY_URL);
  const geometry = useMemo(() => {
    let g: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.name.startsWith("skin")) g = m.geometry;
    });
    return g as THREE.BufferGeometry | null;
  }, [scene]);
  const mats = useMemo(
    () => ({
      body: patched("cuerpo", { roughness: 0.72, metalness: 0 }, BODY),
      coat: patched("bata", { roughness: 0.82, metalness: 0, side: THREE.DoubleSide }, COAT),
      hair: patched("cabello", { roughness: 0.55, metalness: 0.05 }, HAIR),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  if (!geometry) return null;
  return (
    <group scale={1.12} position={[0, 0.02, 0]}>
      <mesh geometry={geometry} material={mats.body} castShadow receiveShadow />
      <mesh geometry={geometry} material={mats.coat} castShadow receiveShadow />
      <mesh geometry={geometry} material={mats.hair} castShadow />
      {/* Estetoscopio: tubo al cuello y campana metálica sobre el pecho. */}
      <mesh position={[0, 0.585, 0.03]} rotation={[1.15, 0, 0]} castShadow>
        <torusGeometry args={[0.105, 0.0075, 12, 48]} />
        <meshStandardMaterial color="#111827" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.47, 0.142]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.024, 0.012, 32]} />
        <meshStandardMaterial color="#d7dee8" metalness={1} roughness={0.18} />
      </mesh>
    </group>
  );
}

function SpaceDoctor() {
  const { scene } = useGLTF(SUIT_URL);
  const suit = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const fix = (src: THREE.Material) => {
        const mat = (src as THREE.MeshStandardMaterial).clone();
        const c = mat.color;
        const visor = c.r > 0.55 && c.g > 0.35 && c.b < 0.3 && c.r - c.b > 0.35; // visor dorado
        mat.metalness = visor ? 1 : 0.04;
        mat.roughness = visor ? 0.12 : 0.86;
        mat.envMapIntensity = visor ? 2.4 : 0.45;
        if (!visor && c.r > 0.85 && c.g > 0.85 && c.b > 0.85) mat.color = c.clone().multiplyScalar(0.8); // blanco sin quemarse
        if (visor) {
          mat.emissive = c.clone();
          mat.emissiveIntensity = 0.22;
        }
        mat.side = THREE.DoubleSide;
        return mat;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material);
    });
    return copy;
  }, [scene]);
  return <primitive object={suit} scale={0.98} position={[0.04, -0.14, 0.11]} />;
}

/** Dibuja el contenido de una pantalla de la sala de control (curvas y barras de datos). */
function screenTexture(kind: number, color: string) {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 240;
  const g = c.getContext("2d")!;
  g.fillStyle = "#06101f";
  g.fillRect(0, 0, 384, 240);
  g.strokeStyle = "rgba(255,255,255,0.07)";
  for (let x = 0; x < 384; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 240); g.stroke(); }
  for (let y = 0; y < 240; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(384, y); g.stroke(); }
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 3;
  g.shadowColor = color;
  g.shadowBlur = 12;
  if (kind === 0) {
    // Latidos
    g.beginPath();
    for (let x = 0; x <= 384; x += 2) {
      const ph = (x % 96) / 96;
      const y = 130 - (ph > 0.42 && ph < 0.46 ? 70 : ph > 0.46 && ph < 0.5 ? -35 : ph > 0.2 && ph < 0.28 ? 10 : 0);
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  } else if (kind === 1) {
    for (let i = 0; i < 9; i++) g.fillRect(24 + i * 38, 200 - (40 + ((i * 53) % 120)), 22, 40 + ((i * 53) % 120));
  } else if (kind === 2) {
    g.beginPath();
    for (let x = 0; x <= 384; x += 4) { const y = 120 + Math.sin(x / 26) * 38 + Math.sin(x / 9) * 9; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  } else {
    g.lineWidth = 10;
    g.beginPath(); g.arc(110, 125, 62, -Math.PI / 2, Math.PI * 0.95); g.stroke();
    for (let i = 0; i < 4; i++) g.fillRect(215, 70 + i * 34, 60 + ((i * 47) % 90), 14);
  }
  g.shadowBlur = 0;
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.fillRect(16, 14, 90, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sala de control en Tierra: pantallas de datos flotando detrás del doctor. */
function Lab() {
  const screens = useMemo(
    () =>
      (
        [
          [-1.45, 0.5, -1.25, "#38bdf8"], [-0.5, 0.78, -1.6, "#22c55e"], [0.5, 0.78, -1.6, "#4f8cff"], [1.45, 0.5, -1.25, "#f59e0b"],
        ] as [number, number, number, string][]
      ).map(([x, y, z, color], i) => ({ x, y, z, color, map: screenTexture(i, color) })),
    [],
  );
  useEffect(() => () => screens.forEach((s) => s.map.dispose()), [screens]);
  return (
    <group>
      {screens.map((s) => (
        <group key={s.color} position={[s.x, s.y, s.z]} rotation={[0, -s.x * 0.32, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.86, 0.56, 0.04]} />
            <meshStandardMaterial color="#05080f" roughness={0.35} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[0.8, 0.5]} />
            <meshBasicMaterial map={s.map} toneMapped={false} />
          </mesh>
          <pointLight color={s.color} intensity={1.6} distance={2.2} position={[0, 0, 0.5]} />
        </group>
      ))}
    </group>
  );
}

/** Curva de la Tierra bajo el astronauta. */
function EarthLimb() {
  return (
    <group position={[0, -10.9, -7]}>
      <mesh renderOrder={-2}>
        <sphereGeometry args={[8, 64, 64]} />
        <meshStandardMaterial color="#123a7a" emissive="#0b2a66" emissiveIntensity={0.6} roughness={0.9} />
      </mesh>
      <mesh scale={1.03} renderOrder={-1}>
        <sphereGeometry args={[8, 64, 64]} />
        <meshBasicMaterial color="#5aa8ff" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Stage({ kind, active }: { kind: RoleKind; active: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const color = kind === "ground" ? "#22c55e" : "#4f8cff";
  useFrame((state, dt) => {
    const g = spin.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    // Siempre de frente: el elegido se balancea más amplio y vivo; el otro, apenas.
    const target = active ? Math.sin(t * 0.9) * 0.55 : Math.sin(t * 0.5) * 0.18;
    g.rotation.y += (target - g.rotation.y) * Math.min(1, dt * 4);
    g.position.y = (kind === "space" ? Math.sin(t * 1.1) * 0.05 + 0.05 : 0) + (active ? 0.03 : 0);
    if (ring.current) ring.current.opacity = active ? 0.75 + Math.sin(t * 4) * 0.2 : 0.3;
    if (beam.current) beam.current.opacity += ((active ? 0.07 : 0.02) - beam.current.opacity) * Math.min(1, dt * 5);
  });
  return (
    <>
      <group ref={spin}>{kind === "ground" ? <GroundDoctor /> : <SpaceDoctor />}</group>
      {/* Plataforma metálica con aro de luz */}
      <mesh position={[0, -1.07, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.82, 0.92, 0.12, 96]} />
        <meshStandardMaterial color="#141d30" roughness={0.28} metalness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.008, 0]}>
        <ringGeometry args={[0.7, 0.8, 96]} />
        <meshBasicMaterial ref={ring} color={color} transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.007, 0]}>
        <circleGeometry args={[0.68, 64]} />
        <meshStandardMaterial color="#0a101d" roughness={0.2} metalness={0.95} />
      </mesh>
      {/* Haz de luz del foco */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.28, 0.95, 3.2, 48, 1, true]} />
        <meshBasicMaterial ref={beam} color={color} transparent opacity={0.03} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <ContactShadows position={[0, -1.004, 0]} scale={2.4} resolution={512} blur={2.4} far={2.2} opacity={0.8} color="#000510" />
    </>
  );
}

export default function RoleAvatar({ kind, active }: { kind: RoleKind; active: boolean }) {
  const tint = kind === "ground" ? "#7ff0c0" : "#8fb6ff";
  return (
    <Canvas
      shadows
      dpr={[1.5, 2.5]}
      camera={{ position: [0, -0.32, 5.4], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <ambientLight intensity={0.18} />
      {/* Luz principal con sombras suaves */}
      <directionalLight position={[2.6, 4.2, 3.6]} intensity={kind === "space" ? 2 : 2.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}>
        <orthographicCamera attach="shadow-camera" args={[-2, 2, 2.4, -2, 0.1, 14]} />
      </directionalLight>
      {/* Contraluz de color y relleno */}
      <directionalLight position={[-3, 2.2, -3.2]} intensity={2.4} color={tint} />
      <directionalLight position={[-2.5, 0.5, 3]} intensity={0.5} color="#bcd4ff" />
      <spotLight position={[0, 4.5, 1.2]} angle={0.42} penumbra={0.9} intensity={active ? 55 : 18} color="#ffffff" />
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2} color="#ffffff" position={[3, 4, 4]} scale={[5, 5, 1]} />
          <Lightformer form="rect" intensity={0.9} color={tint} position={[-5, 1, 1]} scale={[4, 6, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#9fd0ff" position={[0, 3, -6]} scale={[8, 3, 1]} />
          <Lightformer form="circle" intensity={0.7} color={kind === "ground" ? "#22c55e" : "#4f8cff"} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={6} />
        </Environment>
        <Stage kind={kind} active={active} />
        {kind === "ground" ? (
          <Lab />
        ) : (
          <>
            <EarthLimb />
            <Stars radius={30} depth={20} count={1800} factor={2.6} fade speed={0.6} />
          </>
        )}
        {active && <Sparkles count={30} scale={[2, 2.4, 2]} size={2.4} speed={0.5} color={kind === "ground" ? "#86efac" : "#93c5fd"} />}
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(BODY_URL);
useGLTF.preload(SUIT_URL);
