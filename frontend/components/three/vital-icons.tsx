"use client";

// Íconos 3D de cada signo vital:
// - HR: corazón anatómico real que late a la frecuencia medida.
// - HRV: corazón con brillo del color del estado.
// - SpO₂: gota de sangre cuyo rojo se apaga cuando baja la saturación, con burbujas de O₂.
// - Temperatura: la silueta humana completa, coloreada según el estado (verde, amarillo, naranja, rojo).
import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { VitalKey } from "@/lib/types";
import { AnatomicalHeart } from "./heart-scene";

const BODY_URL = "/models/body-organs.glb";

function Spin({ children, speed = 0.8, calm }: { children: React.ReactNode; speed?: number; calm: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current && !calm) ref.current.rotation.y += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
}

/** Gota de sangre: su color se oscurece cuando baja la saturación de oxígeno. */
function BloodDrop({ value, calm }: { value: number; calm: boolean }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const y = 1 - 2 * t; // de la punta (arriba) a la base
      const r = t < 0.45 ? Math.sin((t / 0.45) * (Math.PI / 2)) * 0.62 * Math.pow(t / 0.45, 0.6) : Math.sqrt(Math.max(0, 1 - ((t - 0.45) / 0.55) ** 2)) * 0.62;
      pts.push(new THREE.Vector2(Math.max(0.0001, r), y));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  const sat = Math.min(1, Math.max(0, (value - 85) / 15));
  const tone = new THREE.Color("#5a0b18").lerp(new THREE.Color("#ff2f4a"), sat);
  const bubbles = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!bubbles.current || calm) return;
    bubbles.current.children.forEach((b, i) => {
      const t = (clock.elapsedTime * 0.5 + i / 3) % 1;
      b.position.set(Math.sin(i * 2.1 + t * 6) * 0.25, -0.6 + t * 1.2, 0.35);
      (b as THREE.Mesh).scale.setScalar(0.6 + Math.sin(t * Math.PI) * 0.6);
    });
  });
  return (
    <group scale={0.95}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial color={tone} emissive={tone} emissiveIntensity={0.25} roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <group ref={bubbles}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#cfe6ff" transparent opacity={0.85} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Silueta humana (del Human Reference Atlas) coloreada según la temperatura. */
function BodyFigure({ color }: { color: string }) {
  const { scene } = useGLTF(BODY_URL);
  const geo = useMemo(() => {
    let g: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.name.startsWith("skin")) g = m.geometry;
    });
    return g as THREE.BufferGeometry | null;
  }, [scene]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} scale={1.15}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.5} />
    </mesh>
  );
}

export default function VitalIcon3D({ kind, value, color }: { kind: VitalKey; value: number; color: string }) {
  const calm = useReducedMotion() ?? false;
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, kind === "temp" ? 3.2 : 3.3], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 3, 4]} intensity={2.4} />
      <pointLight position={[-2, -1, 2]} intensity={8} color={color} />
      <Suspense fallback={null}>
        {kind === "hr" && (
          <Spin calm={calm} speed={0.6}>
            <AnatomicalHeart bpm={value} size={2.1} glow={color} />
          </Spin>
        )}
        {kind === "hrv" && (
          <Spin calm={calm} speed={0.6}>
            <AnatomicalHeart bpm={72} size={1.9} glow={color} />
          </Spin>
        )}
        {kind === "spo2" && (
          <Spin calm={calm} speed={0.5}>
            <BloodDrop value={value} calm={calm} />
          </Spin>
        )}
        {kind === "temp" && (
          <Spin calm={calm} speed={0.7}>
            <BodyFigure color={color} />
          </Spin>
        )}
      </Suspense>
    </Canvas>
  );
}
