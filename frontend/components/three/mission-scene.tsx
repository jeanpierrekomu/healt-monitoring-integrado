"use client";

// Centro de misión: Tierra, Luna y estación Gateway con la tripulación como puntos de luz.
import { Line, OrbitControls, QuadraticBezierLine, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Status } from "@/lib/types";
import { STATUS_META } from "@/lib/utils";
import { Tracker } from "./tracker";

type LabelGetter = (k: "earth" | "moon" | "gateway") => HTMLElement | null;

export interface CrewDot {
  id: string;
  name: string;
  initials: string;
  status: Status;
}

const EARTH_POS = new THREE.Vector3(-6.2, -0.6, -3.5);
const MOON_POS = new THREE.Vector3(2.4, 0, 0);
const ORBIT_R = 2.0;

function noise(x: number, y: number, z: number) {
  return Math.sin(x * 1.9 + y * 0.4) * Math.cos(z * 1.4 - x * 0.8) + 0.5 * Math.sin(y * 3.1 + z * 1.2) + 0.25 * Math.cos(x * 4.3 - z * 2.7);
}

/** Planeta low-poly con colores por cara. */
function LowPolyPlanet({ radius, detail, palette }: { radius: number; detail: number; palette: (n: number, lat: number) => string }) {
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.attributes.position;
    const colors: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      c.set(palette(noise(x / radius * 2, y / radius * 2, z / radius * 2), y / radius));
      for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [radius, detail, palette]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors flatShading roughness={0.9} />
    </mesh>
  );
}

const earthPalette = (n: number, lat: number) => {
  if (Math.abs(lat) > 0.86) return "#e8f0ff";
  if (n > 0.55) return "#5f8f3e";
  if (n > 0.3) return "#3e7d4f";
  return n > -0.4 ? "#1f5bbd" : "#1a4ba0";
};
const moonPalette = (n: number) => (n > 0.6 ? "#c9ccd3" : n > 0 ? "#a6aab3" : n > -0.6 ? "#8b8f99" : "#6f737d");

function Earth({ spin, labelEl }: { spin: boolean; labelEl: LabelGetter }) {
  const ref = useRef<THREE.Group>(null);
  const anchor = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spin && ref.current) ref.current.rotation.y += dt * 0.08;
  });
  return (
    <group position={EARTH_POS}>
      <group ref={ref} rotation={[0.3, 0, 0.2]}>
        <LowPolyPlanet radius={2.6} detail={4} palette={earthPalette} />
      </group>
      <mesh scale={1.1}>
        <sphereGeometry args={[2.6, 32, 32]} />
        <meshBasicMaterial color="#4f8cff" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <group ref={anchor} position={[0, -3.2, 0]} />
      <Tracker getTarget={() => anchor.current} getEl={() => labelEl("earth")} />
    </group>
  );
}

function Gateway() {
  return (
    <group scale={0.9}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.55, 8]} />
        <meshStandardMaterial color="#e6ebf2" flatShading />
      </mesh>
      <mesh position={[0.1, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.3, 8]} />
        <meshStandardMaterial color="#d3dae4" flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, s * 0.46]}>
          <boxGeometry args={[0.18, 0.012, 0.62]} />
          <meshStandardMaterial color="#1d3f8f" metalness={0.6} roughness={0.3} emissive="#0d2a6b" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function CrewMember({
  crew,
  angle,
  onSelect,
  onHover,
  register,
}: {
  crew: CrewDot;
  angle: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  register: (id: string, o: THREE.Object3D | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  const color = STATUS_META[crew.status].hex;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const pulse = crew.status === "critico" ? 1 + 0.45 * Math.abs(Math.sin(t * 4)) : crew.status === "normal" ? 1 : 1 + 0.2 * Math.abs(Math.sin(t * 2));
    ref.current.scale.setScalar((hover ? 1.6 : 1) * pulse);
  });
  return (
    <group position={[Math.cos(angle) * 0.5, 0.12 * Math.sin(angle * 2), Math.sin(angle) * 0.5]}>
      <group
        ref={(o) => register(crew.id, o)}
        position={[0, 0.22, 0]}
      />
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(crew.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          onHover(crew.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          onHover(null);
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function MoonSystem({
  crew,
  onSelect,
  spin,
  labelEl,
  onHover,
  register,
}: {
  crew: CrewDot[];
  onSelect: (id: string) => void;
  spin: boolean;
  labelEl: LabelGetter;
  onHover: (id: string | null) => void;
  register: (id: string, o: THREE.Object3D | null) => void;
}) {
  const moonAnchor = useRef<THREE.Group>(null);
  const gwAnchor = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!spin) return;
    if (orbit.current) orbit.current.rotation.y += dt * 0.18;
    if (moon.current) moon.current.rotation.y += dt * 0.05;
    if (ring.current) ring.current.rotation.y += dt * 0.25;
  });
  const orbitPoints = useMemo(
    () => Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * ORBIT_R, 0, Math.sin((i / 128) * Math.PI * 2) * ORBIT_R)),
    [],
  );
  return (
    <group position={MOON_POS}>
      <group ref={moon}>
        <LowPolyPlanet radius={1.05} detail={3} palette={moonPalette} />
      </group>
      <group ref={moonAnchor} position={[0, -1.45, 0]} />
      <Tracker getTarget={() => moonAnchor.current} getEl={() => labelEl("moon")} />
      <group rotation={[0.38, 0, 0.12]}>
        <Line points={orbitPoints} color="#4f8cff" lineWidth={1.2} dashed dashSize={0.18} gapSize={0.12} transparent opacity={0.7} />
        <group ref={orbit}>
          <group position={[ORBIT_R, 0, 0]}>
            <Gateway />
            <group ref={ring}>
              {crew.map((c, i) => (
                <CrewMember key={c.id} crew={c} angle={(i / crew.length) * Math.PI * 2} onSelect={onSelect} onHover={onHover} register={register} />
              ))}
            </group>
            <group ref={gwAnchor} position={[0, 0.55, 0]} />
            <Tracker getTarget={() => gwAnchor.current} getEl={() => labelEl("gateway")} />
          </group>
        </group>
      </group>
    </group>
  );
}

function TransferArc({ spin }: { spin: boolean }) {
  const ref = useRef<{ material: { dashOffset: number } } | null>(null);
  useFrame((_, dt) => {
    if (spin && ref.current) ref.current.material.dashOffset -= dt * 0.6;
  });
  return (
    <QuadraticBezierLine
      ref={ref as never}
      start={EARTH_POS.clone().add(new THREE.Vector3(2.2, 0.8, 1.2))}
      end={MOON_POS.clone().add(new THREE.Vector3(-1.1, 0.2, 0))}
      mid={[-2.2, 3.2, -1.2]}
      color="#8ab4ff"
      lineWidth={1}
      dashed
      dashSize={0.25}
      gapSize={0.2}
      transparent
      opacity={0.5}
    />
  );
}

export default function MissionScene({ crew, onSelect }: { crew: CrewDot[]; onSelect: (id: string) => void }) {
  const reduced = useReducedMotion() ?? false;
  const spin = !reduced;
  const labels = useRef<Record<string, HTMLElement | null>>({});
  const anchors = useRef<Record<string, THREE.Object3D | null>>({});
  const tooltip = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const onHover = (id: string | null) => {
    hoveredRef.current = id;
    setHovered(id);
  };
  const labelEl: LabelGetter = (k) => labels.current[k] ?? null;
  const register = (id: string, o: THREE.Object3D | null) => {
    anchors.current[id] = o;
  };
  const h = crew.find((c) => c.id === hovered);
  const tag = "absolute top-0 left-0 rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap backdrop-blur";
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, 2]} camera={{ position: [1.5, 3.4, 9.5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[-8, 4, 6]} intensity={2.6} color="#fff6e8" />
        <pointLight position={[3, 2, 3]} intensity={18} color="#4f8cff" />
        <Stars radius={70} depth={40} count={3000} factor={3} fade speed={spin ? 0.5 : 0} />
        <Earth spin={spin} labelEl={labelEl} />
        <TransferArc spin={spin} />
        <MoonSystem crew={crew} onSelect={onSelect} spin={spin} labelEl={labelEl} onHover={onHover} register={register} />
        <Tracker getTarget={() => (hoveredRef.current ? anchors.current[hoveredRef.current] : null)} getEl={() => tooltip.current} />
        <OrbitControls enablePan={false} enableZoom={false} target={[-2.4, 0.4, -1]} autoRotate={spin} autoRotateSpeed={0.25} minPolarAngle={0.7} maxPolarAngle={1.7} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span ref={(el) => { labels.current.earth = el; }} className={`${tag} bg-surface/70 text-muted`} style={{ visibility: "hidden" }}>Tierra</span>
        <span ref={(el) => { labels.current.moon = el; }} className={`${tag} bg-surface/70 text-muted`} style={{ visibility: "hidden" }}>Luna</span>
        <span ref={(el) => { labels.current.gateway = el; }} className={`${tag} bg-primary/25 text-primary`} style={{ visibility: "hidden" }}>Gateway · Artemis-H</span>
        <div ref={tooltip} className="absolute top-0 left-0 rounded-lg border border-border bg-surface/95 px-2.5 py-1.5 text-center whitespace-nowrap shadow-xl" style={{ visibility: "hidden" }}>
          {h && (
            <>
              <p className="text-xs font-semibold text-fg">{h.name}</p>
              <p className="text-[11px] font-semibold" style={{ color: STATUS_META[h.status].hex }}>{STATUS_META[h.status].label}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
