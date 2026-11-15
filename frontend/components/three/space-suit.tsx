"use client";

// Traje espacial EMU (Extravehicular Mobility Unit) de NASA 3D Resources, ajustado en Blender al cuerpo del atlas.
// Tres etapas:
//  - "suit":  traje opaco que se "imprime" de los pies a la cabeza.
//  - "glass": el traje se vuelve vidrio holográfico y deja ver los órganos.
//  - "xray":  el traje casi desaparece para el modo rayos X.
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createHologramMaterial } from "./holographic-material";

export type SuitStage = "suit" | "glass" | "xray";

const SUIT_URL = "/models/emu-suit.glb";
// Altura en coordenadas del mundo (el cuerpo flota a y≈0.98) de los pies y de la parte alta del casco,
// para la animación de aparición. Los planos de corte de three.js trabajan en coordenadas del mundo.
const FEET_Y = 0;
const TOP_Y = 2.15;

const TARGET: Record<SuitStage, { solid: number; glass: number }> = {
  suit: { solid: 1, glass: 0 },
  glass: { solid: 0, glass: 0.3 },
  xray: { solid: 0, glass: 0.14 },
};

export function SpaceSuit({ stage, calm }: { stage: SuitStage; calm: boolean }) {
  const { scene } = useGLTF(SUIT_URL);
  const anim = useRef({ solid: 1, glass: 0, start: -1 });
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const { root, solids, glass, clip } = useMemo(() => {
    scene.updateMatrixWorld(true);
    const r = new THREE.Group();
    // Plano de corte para "imprimir" el traje opaco: se ve todo lo que está por debajo de `clip.constant`.
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), FEET_Y);
    const glassMat = createHologramMaterial({ color: "#9fd8ff", brightness: 0.1, fresnelAmount: 0.85, opacity: 0, scanlineSize: 5 });
    const list: THREE.MeshStandardMaterial[] = [];
    scene.traverse((o) => {
      const src = o as THREE.Mesh;
      if (!src.isMesh) return;
      const mat = (src.material as THREE.MeshStandardMaterial).clone();
      mat.transparent = true;
      mat.clippingPlanes = [plane];
      mat.clipShadows = true;
      mat.side = THREE.DoubleSide;
      // Acabado realista: el visor dorado refleja como metal pulido; el resto es tela mate.
      const c = mat.color;
      const visor = c.r > 0.55 && c.g > 0.35 && c.b < 0.3 && c.r - c.b > 0.35;
      mat.metalness = visor ? 0.9 : 0.05;
      mat.roughness = visor ? 0.2 : 0.82;
      mat.envMapIntensity = visor ? 2.2 : 0.35;
      // La tela se deja blanca: el detalle lo dan las sombras en tiempo real y el mapeo de tonos Neutral.
      if (visor) {
        // Un poco de brillo propio para que conserve el dorado aunque refleje el espacio oscuro.
        mat.emissive = c.clone();
        mat.emissiveIntensity = 0.35;
      }
      list.push(mat);
      const solid = new THREE.Mesh(src.geometry, mat);
      solid.applyMatrix4(src.matrixWorld);
      solid.renderOrder = 5;
      solid.castShadow = true;
      solid.receiveShadow = true;
      solid.raycast = () => {}; // el traje no bloquea los clics a los órganos
      const shell = new THREE.Mesh(src.geometry, glassMat);
      shell.applyMatrix4(src.matrixWorld);
      shell.renderOrder = 7;
      shell.raycast = () => {};
      r.add(solid, shell);
    });
    return { root: r, solids: list, glass: glassMat, clip: plane };
  }, [scene]);

  // El bucle de animación modifica materiales de three.js a propósito (fuera del render de React).
  // eslint-disable-next-line react-hooks/immutability
  useFrame(({ clock }, dt) => {
    const st = anim.current;
    const t = clock.elapsedTime;
    if (st.start < 0) st.start = t;
    const target = TARGET[stageRef.current];
    const k = 1 - Math.pow(0.02, dt); // suavizado independiente de los FPS
    st.solid += (target.solid - st.solid) * k;
    st.glass += (target.glass - st.glass) * k;

    // Aparición: el corte sube de los pies a la cabeza en ~1.6 s.
    const r = calm ? 1 : Math.min(1, (t - st.start) / 1.6);
    const eased = 1 - Math.pow(1 - r, 3);
    /* eslint-disable react-hooks/immutability -- materiales y uniforms de three.js actualizados en el bucle de render */
    clip.constant = r >= 1 ? 10 : FEET_Y + eased * (TOP_Y - FEET_Y);
    for (const m of solids) {
      m.opacity = st.solid;
      m.depthWrite = st.solid > 0.95;
      m.visible = st.solid > 0.01;
    }
    glass.uniforms.time.value += dt;
    glass.uniforms.hologramOpacity.value = st.glass;
    glass.visible = st.glass > 0.01;
    /* eslint-enable react-hooks/immutability */
  });

  return <primitive object={root} />;
}

useGLTF.preload(SUIT_URL);
