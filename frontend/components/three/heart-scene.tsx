"use client";

// Corazón 3D que late al ritmo real (HR) con doble golpe "lub-dub".
import { Sparkles, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const g = (p: number, c: number, w: number) => Math.exp(-(((p - c) / w) ** 2));

/**
 * Fuerza del latido según la frecuencia: con la HR alta el corazón se contrae más fuerte y brilla más;
 * con la HR baja late suave. 72 lpm = 1 (reposo normal).
 */
export function beatStrength(bpm: number) {
  return Math.min(1.7, Math.max(0.55, 1 + (bpm - 72) / 85));
}

export function Heart({ bpm, color }: { bpm: number; color: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const phase = useRef(0);
  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.5, 0.5);
    s.bezierCurveTo(0.5, 0.5, 0.4, 0, 0, 0);
    s.bezierCurveTo(-0.6, 0, -0.6, 0.7, -0.6, 0.7);
    s.bezierCurveTo(-0.6, 1.1, -0.3, 1.54, 0.5, 1.9);
    s.bezierCurveTo(1.2, 1.54, 1.6, 1.1, 1.6, 0.7);
    s.bezierCurveTo(1.6, 0.7, 1.6, 0, 1.0, 0);
    s.bezierCurveTo(0.7, 0, 0.5, 0.5, 0.5, 0.5);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.22, bevelThickness: 0.22, curveSegments: 18 });
    geo.center();
    return geo;
  }, []);

  useFrame(({ clock }, dt) => {
    phase.current = (phase.current + (dt * bpmRef.current) / 60) % 1;
    const p = phase.current;
    const beat = 0.15 * g(p, 0.06, 0.045) + 0.08 * g(p, 0.26, 0.05);
    if (mesh.current) {
      mesh.current.scale.setScalar(0.9 * (1 + beat));
      mesh.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.45;
    }
    if (mat.current) mat.current.emissiveIntensity = 0.35 + beat * 6;
  });

  return (
    <mesh ref={mesh} geometry={geometry} rotation={[0, 0, Math.PI]} renderOrder={8}>
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={0.4} roughness={0.35} metalness={0.15} />
    </mesh>
  );
}


const HEART_URL = "/models/heart.glb";

/**
 * Corazón anatómico real (NIH 3D, dominio público) listo para colocar en cualquier escena:
 * late a la HR real y brilla en cada pulso. `size` es la altura aproximada en unidades de la escena.
 */
export function AnatomicalHeart({ bpm, size = 1, glow = "#ff2a3a" }: { bpm: number; size?: number; glow?: string }) {
  const group = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  const { scene } = useGLTF(HEART_URL);
  const { model, mats } = useMemo(() => {
    const m = scene.clone(true);
    const list: THREE.MeshStandardMaterial[] = [];
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.emissive = new THREE.Color(glow);
      mat.emissiveIntensity = 0;
      mesh.material = mat;
      mesh.renderOrder = 6;
      list.push(mat);
    });
    const box = new THREE.Box3().setFromObject(m);
    m.position.sub(box.getCenter(new THREE.Vector3()));
    return { model: m, mats: list };
  }, [scene, glow]);

  // eslint-disable-next-line react-hooks/immutability
  useFrame((_, dt) => {
    phase.current = (phase.current + (dt * bpmRef.current) / 60) % 1;
    const p = phase.current;
    const beat = (0.14 * g(p, 0.06, 0.045) + 0.07 * g(p, 0.26, 0.05)) * beatStrength(bpmRef.current);
    group.current?.scale.setScalar(size * (1 + beat));
    /* eslint-disable react-hooks/immutability -- materiales de three.js mutados en el bucle de render */
    for (const m of mats) m.emissiveIntensity = 0.25 + beat * 3.2;
    /* eslint-enable react-hooks/immutability */
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

/** Corazón anatómico que late a la HR real. */
function RealisticHeart({ bpm, pulse }: { bpm: number; pulse?: React.RefObject<{ phase: number }> }) {
  const group = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const live = useRef({ bpm });
  useEffect(() => {
    live.current = { bpm };
  }, [bpm]);

  // Corazón anatómico real: modelo "Human Heart 3d Model" de NIH 3D (dominio público), aligerado para la web.
  const { scene } = useGLTF(HEART_URL);
  const { model, mats } = useMemo(() => {
    const m = scene.clone(true);
    const list: THREE.MeshStandardMaterial[] = [];
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.emissive = new THREE.Color("#ff2a3a");
      mat.emissiveIntensity = 0;
      mesh.material = mat;
      list.push(mat);
    });
    const box = new THREE.Box3().setFromObject(m);
    m.position.sub(box.getCenter(new THREE.Vector3()));
    return { model: m, mats: list };
  }, [scene]);

  // El bucle modifica objetos de three.js a propósito (fuera del render de React).
  // eslint-disable-next-line react-hooks/immutability
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    phase.current = (phase.current + (dt * live.current.bpm) / 60) % 1;
    // Al unísono con el ECG: el corazón se contrae justo después del pico R (fase ~0.25 del ECG).
    const p = pulse?.current ? (pulse.current.phase - 0.2 + 1) % 1 : phase.current;
    const beat = (0.14 * g(p, 0.06, 0.045) + 0.07 * g(p, 0.26, 0.05)) * beatStrength(live.current.bpm);
    if (group.current) {
      group.current.scale.setScalar(2.7 * (1 + beat));
      group.current.rotation.y = t * 0.45;
      group.current.rotation.z = Math.sin(t * 0.6) * 0.08;
    }
    /* eslint-disable react-hooks/immutability -- materiales de three.js mutados en el bucle de render */
    for (const m of mats) m.emissiveIntensity = beat * 3.2;
    /* eslint-enable react-hooks/immutability */
  });

  return (
    <>
      <group ref={group}>
        <primitive object={model} />
      </group>
    </>
  );
}

export default function HeartScene({ bpm, pulse }: { bpm: number; color?: string; pulse?: React.RefObject<{ phase: number }> }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5.6], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.2} />
      <hemisphereLight args={["#ffe6e6", "#1a0d14", 1.1]} />
      <directionalLight position={[3, 4, 5]} intensity={3.6} />
      <directionalLight position={[-4, 1, -3]} intensity={1.2} color="#7cc4ff" />
      <pointLight position={[0, -2, 2]} intensity={18} color="#ff5a6e" />
      <Sparkles count={30} scale={[3.4, 3.4, 2]} size={2} speed={0.4} color="#7cc4ff" opacity={0.7} />
      <Suspense fallback={null}>
        <RealisticHeart bpm={bpm} pulse={pulse} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(HEART_URL);
