"use client";

// Mueve un elemento HTML (fuera del Canvas) para que siga a un punto 3D.
// Evita <Html> de drei, que crea raíces de React aparte y da errores al desmontarse con React 19.
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

export function Tracker({
  getTarget,
  getEl,
  offset = [0, 0],
}: {
  getTarget: () => THREE.Object3D | null | undefined;
  getEl: () => HTMLElement | null | undefined;
  offset?: [number, number];
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const target = getTarget();
    const el = getEl();
    if (!el) return;
    // Oculta la etiqueta si el objeto (o alguno de sus padres) está oculto.
    let node: THREE.Object3D | null | undefined = target;
    while (node) {
      if (!node.visible) {
        el.style.visibility = "hidden";
        return;
      }
      node = node.parent;
    }
    if (!target) {
      el.style.visibility = "hidden";
      return;
    }
    target.getWorldPosition(v);
    v.project(camera);
    const x = (v.x * 0.5 + 0.5) * size.width + offset[0];
    const y = (-v.y * 0.5 + 0.5) * size.height + offset[1];
    el.style.visibility = v.z > 1 ? "hidden" : "visible";
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });
  return null;
}
