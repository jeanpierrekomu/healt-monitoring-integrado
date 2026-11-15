"use client";

// Ícono 3D de un hueso que gira, con un brillo del color del estado de salud ósea.
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useRef } from "react";
import * as THREE from "three";

function BoneMesh({ glow, calm }: { glow: string; calm: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (!ref.current || calm) return;
    ref.current.rotation.y += dt * 0.9;
    ref.current.rotation.z = -0.6 + Math.sin(clock.elapsedTime * 1.2) * 0.12;
  });
  const mat = (
    <meshStandardMaterial color="#f3e6c8" roughness={0.45} metalness={0.05} emissive={glow} emissiveIntensity={0.18} />
  );
  return (
    <group ref={ref} rotation={[0.3, 0, -0.6]}>
      {/* Diáfisis (cuerpo del hueso) */}
      <mesh>
        <cylinderGeometry args={[0.17, 0.17, 1.5, 24]} />
        {mat}
      </mesh>
      {/* Epífisis (extremos redondeados) */}
      {[-1, 1].map((end) =>
        [-1, 1].map((side) => (
          <mesh key={`${end}${side}`} position={[0.17 * side, 0.78 * end, 0]}>
            <sphereGeometry args={[0.27, 24, 24]} />
            {mat}
          </mesh>
        )),
      )}
    </group>
  );
}

export default function BoneIcon3D({ glow = "#4f8cff" }: { glow?: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 3.4], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={2.4} />
      <pointLight position={[-2, -1, 2]} intensity={8} color={glow} />
      <BoneMesh glow={glow} calm={reduced} />
    </Canvas>
  );
}
