"use client";

// Holograma médico del astronauta, estilo panel de diagnóstico (HUD).
// - Cuerpo y órganos: Human Reference Atlas (NIH/HuBMAP, CC BY 4.0), hombre de referencia del Visible Human,
//   con tamaño y posición reales. Aligerados con Blender para la web.
// - Material del cuerpo: holográfico adaptado de ektogamat/threejs-holographic-material (MIT).
// - Los órganos ligados a un signo vital se conectan con líneas a tarjetas de datos a los lados.
import { ContactShadows, Environment, Lightformer, OrbitControls, Sparkles, Stars, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Brain, Droplet, Heart as HeartIcon, Thermometer, type LucideIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Status, VitalKey } from "@/lib/types";
import { STATUS_META } from "@/lib/utils";
import { createHologramMaterial } from "./holographic-material";
import { SpaceSuit, type SuitStage } from "./space-suit";
import { Tracker } from "./tracker";

export interface SensorReading {
  key: VitalKey;
  label: string;
  value: string;
  status: Status;
  bpm: number;
}

const MODEL_URL = "/models/body-organs.glb";
const HOLO = "#4fc3ff";
const XRAY = "#7fd4ff";

// Órganos del Human Reference Atlas (hombre de referencia del Visible Human): tamaño y posición reales.
// Medidas en milímetros (ancho × alto × profundidad) tomadas del propio atlas.
const ORGAN_INFO: Record<string, { label: string; color: string; mm: [number, number, number]; vital?: VitalKey }> = {
  brain: { label: "Cerebro", color: "#ff8fd6", mm: [136, 146, 167], vital: "hrv" },
  lungs: { label: "Pulmones", color: "#ff6f9a", mm: [259, 229, 190], vital: "spo2" },
  heart: { label: "Corazón", color: "#ff2f45", mm: [124, 105, 105], vital: "hr" },
  liver: { label: "Hígado", color: "#ff8a4c", mm: [191, 175, 202], vital: "temp" },
  spleen: { label: "Bazo", color: "#b98cff", mm: [110, 119, 89] },
  pancreas: { label: "Páncreas", color: "#ffd166", mm: [111, 72, 84] },
  kidney_l: { label: "Riñón izquierdo", color: "#ff7b7b", mm: [76, 107, 82] },
  kidney_r: { label: "Riñón derecho", color: "#ff7b7b", mm: [65, 113, 76] },
  small_intestine: { label: "Intestino delgado", color: "#2ee6d6", mm: [188, 265, 122] },
  large_intestine: { label: "Intestino grueso", color: "#35c7ff", mm: [259, 450, 225] },
};
const VITAL_ORGAN: Record<VitalKey, string> = { hrv: "brain", spo2: "lungs", hr: "heart", temp: "liver" };
const cm = (mm: [number, number, number]) => mm.map((v) => Math.round(v / 10)).join(" × ") + " cm";

// Cada signo vital se muestra en el órgano que mejor lo representa.
const ORGANS: Record<VitalKey, { title: string; sub: string; unit: string; icon: LucideIcon; side: "left" | "right"; top: string }> = {
  hrv: { title: "Cerebro", sub: "HRV · estrés y fatiga", unit: "ms", icon: Brain, side: "left", top: "13%" },
  spo2: { title: "Pulmones", sub: "Saturación de O₂", unit: "%", icon: Droplet, side: "left", top: "50%" },
  hr: { title: "Corazón", sub: "Frecuencia cardiaca", unit: "lpm", icon: HeartIcon, side: "right", top: "13%" },
  temp: { title: "Hígado · núcleo", sub: "Temperatura central", unit: "°C", icon: Thermometer, side: "right", top: "50%" },
};
const CAM_OFFSET: Record<VitalKey, THREE.Vector3> = {
  hr: new THREE.Vector3(0.15, 0.05, 0.75),
  hrv: new THREE.Vector3(0, 0.05, 0.7),
  spo2: new THREE.Vector3(-0.15, 0.05, 0.85),
  temp: new THREE.Vector3(-0.1, 0.05, 0.8),
};
const DEFAULT_CAM = new THREE.Vector3(0, 1.15, 4.4);
const DEFAULT_TARGET = new THREE.Vector3(0, 1.06, 0);

/** Chispas de actividad neuronal sobre la corteza (puntos que se encienden y apagan). */
function makeSynapses(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute("position");
  const n = 160;
  const pts = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * pos.count);
    // Un poco hacia afuera para que queden sobre la superficie.
    pts[i * 3] = pos.getX(j) * 1.015;
    pts[i * 3 + 1] = pos.getY(j) * 1.015;
    pts[i * 3 + 2] = pos.getZ(j) * 1.015;
    phase[i] = Math.random() * 10;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.userData.phase = phase;
  const m = new THREE.PointsMaterial({
    size: 0.006,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const p = new THREE.Points(g, m);
  p.renderOrder = 4;
  return p;
}

function animateSynapses(p: THREE.Points | undefined, t: number, calm: boolean) {
  if (!p?.isPoints) return;
  const col = p.geometry.getAttribute("color") as THREE.BufferAttribute;
  const phase = p.geometry.userData.phase as Float32Array;
  for (let i = 0; i < phase.length; i++) {
    // Destellos breves y desordenados, como impulsos eléctricos.
    const k = calm ? 0.4 : Math.pow(Math.max(0, Math.sin(t * 2.3 + phase[i] * 7.1)), 12);
    col.setXYZ(i, 0.55 * k + 0.05, 0.85 * k + 0.05, 1.2 * k + 0.08);
  }
  col.needsUpdate = true;
}

type Registry = Partial<Record<VitalKey, THREE.Object3D | null>>;

function HoloBody({
  sensors,
  selected,
  onSelect,
  register,
  onHover,
  calm,
  stage,
}: {
  sensors: SensorReading[];
  selected: VitalKey | null;
  onSelect: (k: VitalKey) => void;
  register: (k: VitalKey, o: THREE.Object3D | null) => void;
  onHover: (o: THREE.Object3D | null) => void;
  calm: boolean;
  stage: SuitStage;
}) {
  const { scene } = useGLTF(MODEL_URL);
  // La piel solo se ve en el modo rayos X, con un tono azulado de radiografía.
  const skinMat = useMemo(() => createHologramMaterial({ color: XRAY, brightness: 0.9, fresnelAmount: 0.7, opacity: 0 }), []);

  // Clona el modelo y centra cada órgano en su propio punto (para que lata/respire sobre sí mismo sin moverse de lugar).
  const { root, organs } = useMemo(() => {
    const r = new THREE.Group();
    const list: Record<string, { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }> = {};
    scene.traverse((o) => {
      const src = o as THREE.Mesh;
      if (!src.isMesh) return;
      const geo = src.geometry.clone();
      geo.computeBoundingBox();
      const c = geo.boundingBox!.getCenter(new THREE.Vector3());
      geo.translate(-c.x, -c.y, -c.z);
      const name = src.name.replace(/\.\d+$/, "");
      const info = ORGAN_INFO[name];
      let mat: THREE.Material;
      if (info) {
        const isBrain = name === "brain";
        mat = new THREE.MeshStandardMaterial({
          // El cerebro trae un color por lóbulo (frontal, parietal, temporal, occipital, cerebelo y tronco).
          color: isBrain ? "#ffffff" : info.color,
          vertexColors: isBrain && !!geo.getAttribute("color"),
          emissive: isBrain ? "#5b3f86" : info.color,
          emissiveIntensity: 0.35,
          roughness: 0.45,
          metalness: 0.1,
          transparent: true,
          opacity: 0.88,
        });
      } else {
        mat = skinMat;
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.position.copy(c);
      mesh.renderOrder = info ? 3 : 1;
      mesh.frustumCulled = false;
      r.add(mesh);
      if (name === "brain") mesh.add(makeSynapses(geo));
      if (info) list[name] = { mesh, mat: mat as THREE.MeshStandardMaterial };
    });
    return { root: r, organs: list };
  }, [scene, skinMat]);

  useEffect(() => {
    for (const [name, o] of Object.entries(organs)) {
      const v = ORGAN_INFO[name].vital;
      if (v) register(v, o.mesh);
    }
  }, [organs, register]);

  const floatRef = useRef<THREE.Group>(null);
  const anim = useRef({ start: -1, nextGlitch: 3, glitchUntil: 0, beat: 0, organs: 0, skin: 0 });
  const hr = sensors.find((s) => s.key === "hr");
  const hrBpm = hr?.bpm ?? 70;
  const critical = hr?.status === "critico";
  const live = useRef({ bpm: hrBpm, critical, selected, stage });
  useEffect(() => {
    live.current = { bpm: hrBpm, critical, selected, stage };
  }, [hrBpm, critical, selected, stage]);

  // El bucle de animación modifica objetos de three.js y refs a propósito (fuera del render de React).
  // eslint-disable-next-line react-hooks/immutability
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const st = anim.current;
    const { bpm, critical: crit, selected: sel, stage: stg } = live.current;
    if (st.start < 0) st.start = t;
    // Con el traje opaco los órganos no se ven; en rayos X aparece la piel como radiografía.
    const fade = 1 - Math.pow(0.03, dt);
    st.organs += ((stg === "suit" ? 0 : 1) - st.organs) * fade;
    st.skin += ((stg === "xray" ? 1 : 0) - st.skin) * fade;
    const xray = stg === "xray";

    // 1) Aparición: el holograma se "imprime" de los pies a la cabeza; luego aparecen los órganos.
    const r = calm ? 1 : Math.min(1, (t - st.start) / 1.9);
    const eased = 1 - Math.pow(1 - r, 3);
    const revealY = r >= 1 ? 10 : -0.05 + eased * 2.15;

    // 2) Latido, respiración y actividad de cada órgano.
    st.beat = (st.beat + (dt * bpm) / 60) % 1;
    const beat = Math.exp(-(((st.beat - 0.05) / 0.05) ** 2)) + 0.5 * Math.exp(-(((st.beat - 0.25) / 0.05) ** 2));
    const breath = calm ? 0 : Math.sin((t * (crit ? 24 : 15) * Math.PI * 2) / 60);
    const selName = sel ? VITAL_ORGAN[sel] : null;
    for (const [name, { mesh, mat }] of Object.entries(organs)) {
      mesh.visible = r > 0.75 && st.organs > 0.02;
      let s = 1;
      let glow = 0.35;
      if (name === "heart") {
        s = 1 + beat * 0.12;
        glow = 0.4 + beat * (crit ? 2.2 : 1.4);
      } else if (name === "lungs") {
        mesh.scale.set(1 + breath * 0.04, 1 + breath * 0.03, 1 + breath * 0.06);
      } else if (name === "brain") {
        glow = 0.3 + (calm ? 0 : 0.2 * Math.abs(Math.sin(t * 3.1) * Math.sin(t * 1.7)));
        animateSynapses(mesh.children[0] as THREE.Points, t, calm);
      } else if (name.includes("intestine")) {
        s = 1 + (calm ? 0 : Math.sin(t * 1.3 + (name === "small_intestine" ? 0 : 1.5)) * 0.015);
      }
      if (name !== "lungs") mesh.scale.setScalar(s * (name === selName ? 1.06 : 1));
      const isSel = name === selName;
      // En rayos X el órgano elegido brilla y el resto queda como sombra tenue.
      mat.emissiveIntensity = isSel ? glow + (xray ? 1.4 : 0.6) : xray ? 0.12 : glow;
      mat.opacity = st.organs * (selName && !isSel ? (xray ? 0.14 : 0.45) : isSel && xray ? 0.97 : 0.88);
    }

    // 3) Flotación + glitch de señal ocasional.
    if (!calm && t > st.nextGlitch) {
      st.glitchUntil = t + 0.14;
      st.nextGlitch = t + 4 + Math.random() * 6;
    }
    const glitching = t < st.glitchUntil;
    if (floatRef.current) {
      floatRef.current.position.set(glitching ? (Math.random() - 0.5) * 0.035 : 0, 0.98 + (calm ? 0 : Math.sin(t * 0.9) * 0.03), 0);
      floatRef.current.rotation.set(calm ? 0 : Math.sin(t * 0.6) * 0.012, 0, calm ? 0 : Math.sin(t * 0.45) * 0.018);
    }

    /* eslint-disable react-hooks/immutability -- uniforms de three.js actualizados en el bucle de render */
    skinMat.uniforms.time.value += dt;
    skinMat.uniforms.revealY.value = revealY;
    skinMat.uniforms.pulse.value = (calm ? 0 : beat * (crit ? 0.3 : 0.15)) + (glitching ? 0.9 : 0);
    skinMat.uniforms.hologramOpacity.value = 0.5 * st.skin;
    skinMat.visible = st.skin > 0.01;
    /* eslint-enable react-hooks/immutability */
  });

  return (
    <group ref={floatRef} position={[0, 0.98, 0]}>
      <primitive
        object={root}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          const v = ORGAN_INFO[e.object.name]?.vital;
          if (!v) return;
          e.stopPropagation();
          onSelect(v);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (!ORGAN_INFO[e.object.name]) return;
          e.stopPropagation();
          onHover(e.object);
          document.body.style.cursor = ORGAN_INFO[e.object.name].vital ? "pointer" : "help";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
      />
      <SpaceSuit stage={stage} calm={calm} />
    </group>
  );
}

/** Base de proyector + anillos de escaneo horizontales (como un escáner médico). */
function Projector({ calm }: { calm: boolean }) {
  const base = useRef<THREE.Group>(null);
  const stack = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (calm) return;
    if (base.current) base.current.rotation.z += dt * 0.4;
    stack.current?.children.forEach((c, i) => (c.rotation.z += dt * (i % 2 ? -0.35 : 0.25)));
    if (scan.current) {
      const p = (clock.elapsedTime / 3.2) % 1;
      scan.current.position.y = 1.9 - p * 1.9;
      const mat = (scan.current.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * Math.sin(p * Math.PI);
    }
  });
  const ringMat = (opacity: number) => (
    <meshBasicMaterial color={HOLO} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
  );
  return (
    <group>
      <group ref={base} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {[0.42, 0.55, 0.7].map((r, i) => (
          <mesh key={r}>
            <ringGeometry args={[r, r + (i === 1 ? 0.012 : 0.006), 64, 1, 0, i === 1 ? Math.PI * 1.6 : Math.PI * 2]} />
            {ringMat(0.6 - i * 0.15)}
          </mesh>
        ))}
        <mesh>
          <circleGeometry args={[0.42, 48]} />
          {ringMat(0.08)}
        </mesh>
      </group>
      {/* Anillos horizontales fijos a la altura de rodillas, cadera y pecho */}
      <group ref={stack}>
        {[
          [0.45, 0.36],
          [0.98, 0.34],
          [1.42, 0.38],
        ].map(([y, r]) => (
          <group key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[r, r + 0.006, 96, 1, 0, Math.PI * 1.35]} />
              {ringMat(0.5)}
            </mesh>
            <mesh rotation={[0, 0, Math.PI * 1.45]}>
              <ringGeometry args={[r + 0.02, r + 0.03, 96, 1, 0, Math.PI * 0.4]} />
              {ringMat(0.35)}
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.5, 0.42, 2, 48, 1, true]} />
        {ringMat(0.035)}
      </mesh>
      <group ref={scan}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.4, 64]} />
          <meshBasicMaterial color="#9fe0ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Une cada tarjeta HUD con su órgano mediante una línea quebrada (se recalcula en cada cuadro). */
function Callouts({
  registry,
  container,
  cards,
  paths,
  dots,
}: {
  registry: React.RefObject<Registry>;
  container: React.RefObject<HTMLDivElement | null>;
  cards: React.RefObject<Partial<Record<VitalKey, HTMLElement | null>>>;
  paths: React.RefObject<Partial<Record<VitalKey, SVGPolylineElement | null>>>;
  dots: React.RefObject<Partial<Record<VitalKey, SVGCircleElement | null>>>;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    for (const k of Object.keys(ORGANS) as VitalKey[]) {
      const line = { path: paths.current?.[k], dot: dots.current?.[k] };
      const card = cards.current?.[k];
      const target = registry.current?.[k];
      if (!line.path || !line.dot || !card) continue;
      let visible = !!target;
      for (let n: THREE.Object3D | null | undefined = target; n; n = n.parent) if (!n.visible) visible = false;
      if (!visible || !target) {
        line.path.style.opacity = "0";
        line.dot.style.opacity = "0";
        continue;
      }
      target.getWorldPosition(v).project(camera);
      const ox = (v.x * 0.5 + 0.5) * size.width;
      const oy = (-v.y * 0.5 + 0.5) * size.height;
      const c = card.getBoundingClientRect();
      const left = ORGANS[k].side === "left";
      const cx = (left ? c.right : c.left) - box.left;
      const cy = c.top + c.height / 2 - box.top;
      const ex = cx + (left ? 24 : -24);
      line.path.setAttribute("points", `${cx},${cy} ${ex},${cy} ${ox},${oy}`);
      line.dot.setAttribute("cx", String(ox));
      line.dot.setAttribute("cy", String(oy));
      line.path.style.opacity = "1";
      line.dot.style.opacity = "1";
    }
  });
  return null;
}

function CameraRig({ selected, registry }: { selected: VitalKey | null; registry: React.RefObject<Registry> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const animating = useRef(0);
  const target = useMemo(() => new THREE.Vector3(), []);
  const cam = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    animating.current = 1.5;
  }, [selected]);
  useFrame((_, dt) => {
    if (animating.current <= 0 || !controls) return;
    animating.current -= dt;
    const obj = selected ? registry.current?.[selected] : null;
    if (obj) {
      obj.getWorldPosition(target);
      cam.copy(target).add(CAM_OFFSET[selected!]);
    } else {
      target.copy(DEFAULT_TARGET);
      cam.copy(DEFAULT_CAM);
    }
    const k = 1 - Math.pow(0.002, dt);
    camera.position.lerp(cam, k);
    controls.target.lerp(target, k);
    controls.update();
  });
  return null;
}

export default function HologramScene({
  sensors,
  selected,
  onSelect,
}: {
  sensors: SensorReading[];
  selected: VitalKey | null;
  onSelect: (k: VitalKey | null) => void;
  /** Se mantiene por compatibilidad; el cuerpo del atlas no tiene esqueleto para la postura de cansancio. */
  fatigue?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  // Etapas: traje opaco (por defecto) · traje de vidrio con los órganos a la vista · rayos X al elegir un órgano.
  // El traje se mantiene puesto; solo cambia si se elige un órgano o se pulsa "Ver interior".
  const [revealed, setRevealed] = useState(false);
  const stage: SuitStage = selected ? "xray" : revealed ? "glass" : "suit";
  const registry = useRef<Registry>({});
  const container = useRef<HTMLDivElement>(null);
  const cards = useRef<Partial<Record<VitalKey, HTMLElement | null>>>({});
  const paths = useRef<Partial<Record<VitalKey, SVGPolylineElement | null>>>({});
  const dots = useRef<Partial<Record<VitalKey, SVGCircleElement | null>>>({});
  const register = useCallback((k: VitalKey, o: THREE.Object3D | null) => {
    registry.current[k] = o;
  }, []);
  const hovered = useRef<THREE.Object3D | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [hoverName, setHoverName] = useState<string | null>(null);
  const onHover = useCallback((o: THREE.Object3D | null) => {
    hovered.current = o;
    setHoverName(o?.name ?? null);
  }, []);
  const byKey = (k: VitalKey) => sensors.find((s) => s.key === k);

  return (
    <div ref={container} className="relative size-full">
      <Canvas shadows dpr={[1, 2]} camera={{ position: DEFAULT_CAM.toArray(), fov: 38 }} gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          // Necesario para el plano de corte con el que se "imprime" el traje.
          gl.localClippingEnabled = true;
          // Mapeo de tonos "Neutral" de Khronos: conserva el blanco y el contraste (ACES los aplana).
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1;
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <ambientLight intensity={0.3} />
        {/* Luz principal con sombras (como el Sol en una caminata espacial), relleno frío y luz de contorno */}
        <directionalLight
          position={[2.6, 3.6, 3.2]}
          intensity={2.3}
          color="#fff4e6"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
          shadow-camera-left={-1.4}
          shadow-camera-right={1.4}
          shadow-camera-top={2.6}
          shadow-camera-bottom={-0.4}
          shadow-camera-near={0.5}
          shadow-camera-far={12}
        />
        <directionalLight position={[-3, 1.5, 2]} intensity={0.5} color="#8fb8ff" />
        <directionalLight position={[-2, 2.5, -4]} intensity={1.6} color="#9fd0ff" />
        {/* Entorno de estudio generado en local (sin descargas): da reflejos al visor y volumen a la tela */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[3, 4, 4]} scale={[5, 5, 1]} />
          <Lightformer form="rect" intensity={0.6} color="#7fb0ff" position={[-5, 1, 1]} scale={[4, 6, 1]} />
          <Lightformer form="rect" intensity={1.5} color="#9fd0ff" position={[0, 3, -6]} scale={[8, 3, 1]} />
          <Lightformer form="circle" intensity={0.6} color="#4f8cff" position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={6} />
        </Environment>
        <ContactShadows position={[0, 0.012, 0]} scale={3.2} resolution={512} blur={2.6} far={2.4} opacity={0.75} color="#000814" />
        <Stars radius={40} depth={20} count={800} factor={2} fade speed={reduced ? 0 : 0.5} />
        <Sparkles count={40} scale={[1.6, 2.1, 1.6]} position={[0, 1, 0]} size={2} speed={reduced ? 0 : 0.35} color="#7cc4ff" opacity={0.5} />
        <Suspense fallback={null}>
          <HoloBody sensors={sensors} selected={selected} onSelect={onSelect} register={register} onHover={onHover} calm={reduced} stage={stage} />
        </Suspense>
        <Projector calm={reduced} />
        <Callouts registry={registry} container={container} cards={cards} paths={paths} dots={dots} />
        <Tracker getTarget={() => hovered.current} getEl={() => tip.current} offset={[0, -34]} />
        <OrbitControls makeDefault enablePan={false} enableZoom={false} target={DEFAULT_TARGET.toArray()} autoRotate={!selected && !reduced} autoRotateSpeed={0.6} minPolarAngle={0.9} maxPolarAngle={1.9} />
        <CameraRig selected={selected} registry={registry} />
      </Canvas>

      {/* Líneas HUD */}
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
        {(Object.keys(ORGANS) as VitalKey[]).map((k) => {
          const s = byKey(k);
          const color = s ? STATUS_META[s.status].hex : HOLO;
          return (
            <g key={k}>
              <polyline
                ref={(el) => {
                  paths.current[k] = el;
                }}
                fill="none"
                stroke={color}
                strokeWidth={selected === k ? 1.8 : 1.1}
                strokeOpacity={0.85}
                style={{ opacity: 0, transition: "opacity .3s", filter: `drop-shadow(0 0 4px ${color})` }}
              />
              <circle
                ref={(el) => {
                  dots.current[k] = el;
                }}
                r={3.5}
                fill={color}
                style={{ opacity: 0, filter: `drop-shadow(0 0 6px ${color})` }}
              />
            </g>
          );
        })}
      </svg>

      {/* Etapa actual y botón para volver a ver el traje */}
      <div className="absolute right-3 bottom-3 z-10 flex items-center gap-2">
        <span className="rounded-full border border-border bg-[#081220]/80 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase backdrop-blur">
          {stage === "xray" ? "Rayos X" : stage === "glass" ? "Traje transparente" : "Traje EMU"}
        </span>
        {!selected && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="rounded-full border border-primary/50 bg-[#081220]/80 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur transition-colors hover:bg-primary/15"
          >
            {revealed ? "Ver traje" : "Ver interior"}
          </button>
        )}
      </div>

      {/* Nombre y medidas reales del órgano bajo el mouse */}
      <div
        ref={tip}
        className="pointer-events-none absolute top-0 left-0 z-20 rounded-lg border border-border bg-[#081220]/90 px-2.5 py-1.5 text-center whitespace-nowrap shadow-xl backdrop-blur"
        style={{ visibility: "hidden" }}
      >
        {hoverName && ORGAN_INFO[hoverName] && (
          <>
            <p className="text-xs font-semibold" style={{ color: ORGAN_INFO[hoverName].color }}>
              {ORGAN_INFO[hoverName].label}
            </p>
            <p className="text-[10px] text-muted">≈ {cm(ORGAN_INFO[hoverName].mm)}</p>
          </>
        )}
      </div>

      {/* Tarjetas HUD de cada órgano */}
      {(Object.keys(ORGANS) as VitalKey[]).map((k) => {
        const o = ORGANS[k];
        const s = byKey(k);
        if (!s) return null;
        const color = STATUS_META[s.status].hex;
        const Icon = o.icon;
        const active = selected === k;
        return (
          <button
            key={k}
            ref={(el) => {
              cards.current[k] = el;
            }}
            onClick={() => onSelect(active ? null : k)}
            className="absolute z-10 flex w-[196px] items-center gap-2.5 rounded-xl border bg-[#081220]/80 px-2.5 py-2 text-left backdrop-blur-md transition-all hover:scale-[1.03] max-sm:w-[128px]"
            style={{
              top: o.top,
              [o.side]: 12,
              borderColor: active ? color : `${color}66`,
              boxShadow: active ? `0 0 0 1px ${color}, 0 0 24px -4px ${color}` : `0 0 18px -10px ${color}`,
            }}
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}22`, boxShadow: `inset 0 0 0 1.5px ${color}` }}>
              <Icon className="size-4" style={{ color }} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-semibold tracking-wide text-muted uppercase" title={o.sub}>{o.title}</span>
              <span className="block text-[17px] leading-tight font-bold tabular-nums">
                {s.value}
                <span className="ml-1 text-[10px] font-medium text-muted">{o.unit}</span>
              </span>
              <span className="block truncate text-[10px] font-semibold" style={{ color }}>
                {STATUS_META[s.status].label}
              </span>
              <span className="block truncate text-[10px] text-muted">≈ {cm(ORGAN_INFO[VITAL_ORGAN[k]].mm)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

useGLTF.preload(MODEL_URL);
