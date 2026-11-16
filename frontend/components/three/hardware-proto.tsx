"use client";

// Prototipo de hardware en 3D, armado con las medidas reales de los módulos de la foto (1 unidad = 1 cm):
//  Dispositivo AZRIEL. Placa superior (7 × 9 cm): ESP32-WROOM-32 y pantalla OLED SSD1306 de 0,96" (128 × 64).
//  Placa inferior: MPU6050 (movimiento), MAX30205 (temperatura) y MAX30102 (pulso), mirando a la piel.
//  - Las dos placas van en "sándwich", unidas por separadores y cables, dentro de una carcasa.
// `stage` va de 0 (piezas separadas) a 1 (sándwich armado) y a 2 (con carcasa).
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type PartId = "esp32" | "oled" | "mpu" | "temp" | "max30102" | "boards" | "case";
export interface Readings {
  hr: number;
  spo2: number;
  temp: number;
  move: number;
}

const PICK = "#ff8a3d";
const T = 0.16; // grosor de las placas
const HALF_GAP = 0.7; // las placas quedan a 1,4 cm una de otra
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Material que se ilumina en naranja cuando la pieza está elegida. */
function M({ color, on, rough = 0.5, metal = 0.1, ...rest }: { color: string; on?: boolean; rough?: number; metal?: number } & THREE.MeshStandardMaterialParameters) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={on ? PICK : "#000000"} emissiveIntensity={on ? 0.45 : 0} {...rest} />;
}

/** Textura de placa perforada: agujeros con anillo de cobre cada 2,54 mm y líneas cada 5 agujeros. */
function usePerfboardTexture() {
  return useMemo(() => {
    const W = 700, H = 900, pitch = 25.4;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#b9622c";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(255,240,220,0.55)";
    g.lineWidth = 2;
    for (let i = 0; i * pitch * 5 < W; i++) { g.beginPath(); g.moveTo(22 + i * pitch * 5, 30); g.lineTo(22 + i * pitch * 5, H - 30); g.stroke(); }
    for (let j = 0; j * pitch * 5 < H; j++) { g.beginPath(); g.moveTo(30, 22 + j * pitch * 5); g.lineTo(W - 30, 22 + j * pitch * 5); g.stroke(); }
    for (let x = 35; x < W - 25; x += pitch) {
      for (let y = 35; y < H - 25; y += pitch) {
        g.fillStyle = "#d8a35c";
        g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#2a1408";
        g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill();
      }
    }
    for (const [x, y] of [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]]) {
      g.fillStyle = "#1a0d05";
      g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "rgba(255,240,220,0.8)";
    g.font = "bold 22px monospace";
    "123456".split("").forEach((n, i) => g.fillText(n, W - 26, 70 + i * 127));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}

/** Pantalla OLED: muestra las lecturas (simuladas) y un corazón que late. */
function useOledTexture(readings: Readings) {
  const ref = useRef(readings);
  useEffect(() => {
    ref.current = readings;
  }, [readings]);
  const { tex, g } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, g: c.getContext("2d")! };
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const k = useRef({ acc: 1, t: 0 });
  /* eslint-disable react-hooks/immutability -- three.js: la textura se redibuja en el bucle de render */
  useFrame((_, dt) => {
    k.current.t += dt;
    k.current.acc += dt;
    if (k.current.acc < 0.1) return;
    k.current.acc = 0;
    const r = ref.current;
    const beat = (k.current.t % (60 / r.hr)) / (60 / r.hr) < 0.18;
    g.fillStyle = "#03060c";
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#ffd84d"; // franja amarilla superior típica de estas pantallas
    g.font = "bold 16px monospace";
    g.fillText("AZRIEL", 8, 18);
    g.fillText(beat ? "♥" : "♡", 230, 18);
    g.fillStyle = "#7fd4ff";
    g.font = "bold 22px monospace";
    g.fillText(`HR  ${Math.round(r.hr)}`, 8, 50);
    g.fillText(`SpO2 ${Math.round(r.spo2)}%`, 8, 76);
    g.font = "bold 18px monospace";
    g.fillText(`T ${r.temp.toFixed(1)}C`, 8, 102);
    g.fillText(`MOV ${r.move.toFixed(2)}g`, 128, 102);
    g.font = "12px monospace";
    g.fillText("bpm", 120, 50);
    tex.needsUpdate = true;
  });
  /* eslint-enable react-hooks/immutability */
  return tex;
}

function pickProps(id: PartId, onSelect?: (id: PartId) => void) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect?.(id);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
    },
  };
}

/** Fila de pines dorados. */
function Pins({ n, x, z, step = 0.254, along = "z", y = 0.05 }: { n: number; x: number; z: number; step?: number; along?: "x" | "z"; y?: number }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={along === "z" ? [x, y, z + i * step] : [x + i * step, y, z]}>
          <boxGeometry args={[0.064, 0.12, 0.064]} />
          <meshStandardMaterial color="#d8b25a" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** ESP32 DevKit (28 × 52 mm) sobre sus tiras de pines. */
function Esp32({ on }: { on: boolean }) {
  return (
    <group>
      {[1.27, -1.27].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]}>
          <boxGeometry args={[0.25, 0.84, 4.9]} />
          <M color="#111318" on={on} rough={0.6} />
        </mesh>
      ))}
      <group position={[0, 0.92, 0]}>
        <mesh>
          <boxGeometry args={[2.8, T, 5.2]} />
          <M color="#0d1117" on={on} rough={0.45} />
        </mesh>
        <Pins n={19} x={1.27} z={-2.29} y={0.11} />
        <Pins n={19} x={-1.27} z={-2.29} y={0.11} />
        {/* Módulo ESP32-WROOM: placa con antena y blindaje metálico */}
        <mesh position={[0, 0.12, -1.2]}>
          <boxGeometry args={[1.8, 0.08, 2.55]} />
          <M color="#0a0c10" on={on} />
        </mesh>
        <RoundedBox args={[1.6, 0.3, 1.76]} radius={0.04} smoothness={3} position={[0, 0.3, -0.84]}>
          <M color="#c9cfd8" on={on} rough={0.28} metal={0.9} />
        </RoundedBox>
        <mesh position={[0, 0.17, -2.2]}>
          <boxGeometry args={[1.5, 0.01, 0.42]} />
          <meshStandardMaterial color="#b8923e" metalness={0.8} roughness={0.35} />
        </mesh>
        {/* USB-C, botones y chips del otro extremo */}
        <RoundedBox args={[0.9, 0.32, 0.75]} radius={0.12} smoothness={3} position={[0, 0.2, 2.3]}>
          <M color="#b8c0cc" on={on} rough={0.25} metal={0.95} />
        </RoundedBox>
        {[-0.95, 0.95].map((x) => (
          <group key={x} position={[x, 0.13, 1.75]}>
            <mesh><boxGeometry args={[0.42, 0.12, 0.32]} /><meshStandardMaterial color="#d9dde3" metalness={0.7} roughness={0.3} /></mesh>
            <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.09, 0.09, 0.08, 16]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          </group>
        ))}
        <mesh position={[0.35, 0.13, 0.9]}><boxGeometry args={[0.5, 0.1, 0.5]} /><M color="#15171c" on={on} rough={0.4} /></mesh>
        <mesh position={[-0.45, 0.12, 1.15]}><boxGeometry args={[0.36, 0.08, 0.2]} /><M color="#15171c" on={on} /></mesh>
        <mesh position={[0.9, 0.11, 1.2]}><boxGeometry args={[0.12, 0.05, 0.08]} /><meshBasicMaterial color="#ff3040" toneMapped={false} /></mesh>
      </group>
    </group>
  );
}

/** Pantalla OLED de 0,96" (27 × 28 mm). */
function Oled({ on, screen }: { on: boolean; screen: THREE.Texture }) {
  return (
    <group>
      <mesh position={[0, 0.18, -1.25]}>
        <boxGeometry args={[1.05, 0.36, 0.25]} />
        <M color="#111318" on={on} />
      </mesh>
      <group position={[0, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[2.73, 0.12, 2.78]} />
          <M color="#1f4fb8" on={on} rough={0.5} />
        </mesh>
        <Pins n={4} x={-0.38} z={-1.25} step={0.254} along="x" y={0.08} />
        <mesh position={[0, 0.13, 0.2]}>
          <boxGeometry args={[2.73, 0.15, 1.94]} />
          <M color="#05070b" on={on} rough={0.1} metal={0.3} />
        </mesh>
        <mesh position={[0, 0.211, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.18, 1.1]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.07, 1.25]}>
          <boxGeometry args={[1.4, 0.03, 0.18]} />
          <meshStandardMaterial color="#2c7a4a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/** Sensor de movimiento MPU-6050 (placa GY-521 azul, 21 × 16 mm). */
function Mpu({ on }: { on: boolean }) {
  return (
    <group position={[0, 0.3, 0]}>
      <mesh><boxGeometry args={[2.1, 0.12, 1.6]} /><M color="#2546b8" on={on} /></mesh>
      <mesh position={[0, 0.1, 0.1]}><boxGeometry args={[0.4, 0.09, 0.4]} /><M color="#0e0f12" on={on} rough={0.35} /></mesh>
      <mesh position={[0.6, 0.09, 0.15]}><boxGeometry args={[0.3, 0.07, 0.17]} /><M color="#0e0f12" on={on} /></mesh>
      {[-0.5, -0.3, 0.45, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.08, -0.25]}><boxGeometry args={[0.1, 0.05, 0.06]} /><meshStandardMaterial color="#c7a36a" /></mesh>
      ))}
      <Pins n={8} x={-0.89} z={0.68} along="x" y={0.08} />
      <mesh position={[0.6, 0.08, -0.4]}><boxGeometry args={[0.06, 0.03, 0.06]} /><meshBasicMaterial color="#ff4050" toneMapped={false} /></mesh>
    </group>
  );
}

/** Sensor de temperatura de contacto (placa morada). */
function Temp({ on }: { on: boolean }) {
  return (
    <group position={[0, 0.3, 0]}>
      <mesh><boxGeometry args={[1.3, 0.1, 2.4]} /><M color="#6c2bb8" on={on} /></mesh>
      <mesh position={[0, 0.08, 0.35]}><boxGeometry args={[0.3, 0.06, 0.3]} /><M color="#101114" on={on} rough={0.35} /></mesh>
      <mesh position={[0, 0.085, 0.35]}><boxGeometry args={[0.12, 0.02, 0.12]} /><meshStandardMaterial color="#c9a14a" metalness={0.9} roughness={0.25} /></mesh>
      <Pins n={4} x={-0.38} z={-1.0} along="x" y={0.07} />
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.07, -0.35]}><boxGeometry args={[0.1, 0.04, 0.05]} /><meshStandardMaterial color="#c7a36a" /></mesh>
      ))}
    </group>
  );
}

/** Sensor óptico MAX30102: ventanita con luz roja e infrarroja que late con el pulso. */
function Max30102({ on, hr }: { on: boolean; hr: number }) {
  const led = useRef<THREE.MeshBasicMaterial>(null);
  const hrRef = useRef(hr);
  useEffect(() => {
    hrRef.current = hr;
  }, [hr]);
  useFrame((s) => {
    if (!led.current) return;
    const ph = (s.clock.elapsedTime % (60 / hrRef.current)) / (60 / hrRef.current);
    led.current.opacity = 0.45 + 0.55 * Math.exp(-ph * 7);
  });
  return (
    <group position={[0, 0.3, 0]}>
      <mesh><boxGeometry args={[2.0, 0.1, 1.4]} /><M color="#161b2e" on={on} /></mesh>
      <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.56, 0.06, 0.33]} /><M color="#05060a" on={on} rough={0.08} metal={0.4} /></mesh>
      <mesh position={[-0.12, 0.112, 0]}>
        <boxGeometry args={[0.1, 0.01, 0.1]} />
        <meshBasicMaterial ref={led} color="#ff2a3c" transparent toneMapped={false} />
      </mesh>
      <mesh position={[0.12, 0.112, 0]}><boxGeometry args={[0.12, 0.01, 0.12]} /><meshStandardMaterial color="#20222a" metalness={0.5} roughness={0.2} /></mesh>
      <Pins n={7} x={-0.76} z={-0.55} along="x" y={0.07} />
    </group>
  );
}

// Dónde va cada módulo sobre su placa (x, z en cm), siguiendo la foto.
const ON_TOP: { id: PartId; x: number; z: number }[] = [
  { id: "esp32", x: -0.1, z: -1.5 },
  { id: "oled", x: 0.1, z: 2.75 },
];
const ON_BOTTOM: { id: PartId; x: number; z: number; rot: number }[] = [
  { id: "mpu", x: 0.6, z: -1.6, rot: -0.15 },
  { id: "temp", x: 0.4, z: 1.1, rot: -0.12 },
  { id: "max30102", x: 0.25, z: 3.2, rot: -0.08 },
];
const CORNERS: [number, number][] = [[-3.15, -4.15], [3.15, -4.15], [-3.15, 4.15], [3.15, 4.15]];
const WIRES = [-1.2, -0.7, -0.2, 0.3, 0.8]; // posiciones (z) de los cables rojos en el borde derecho

function Device({ stage, selected, onSelect, readings }: { stage: number; selected: PartId | null; onSelect: (id: PartId) => void; readings: Readings }) {
  const perf = usePerfboardTexture();
  const screen = useOledTexture(readings);
  useEffect(() => () => perf.dispose(), [perf]);
  const s = useRef(stage);
  const boardA = useRef<THREE.Group>(null);
  const boardB = useRef<THREE.Group>(null);
  const top = useRef<(THREE.Group | null)[]>([]);
  const bottom = useRef<(THREE.Group | null)[]>([]);
  const caseTop = useRef<THREE.Group>(null);
  const caseBottom = useRef<THREE.Group>(null);
  const caseMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const standoffs = useRef<THREE.Group>(null);
  const wires = useRef<(THREE.Mesh | null)[]>([]);
  const caseScreen = useRef<THREE.MeshBasicMaterial>(null);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);

   
  useFrame((_, dt) => {
    s.current += (stage - s.current) * Math.min(1, dt * 2.4);
    const e = clamp01(1 - s.current); // cuánto están separadas las piezas
    const c = clamp01(s.current - 1); // cuánto está cerrada la carcasa
    const ya = HALF_GAP + e * 1.7;
    const yb = -HALF_GAP - e * 1.9;
    boardA.current?.position.set(0, ya, 0);
    boardB.current?.position.set(0, yb, 0);
    // Separadas, la placa de sensores se muestra boca arriba; al armar el sándwich se da la vuelta.
    if (boardB.current) boardB.current.rotation.x = Math.PI * e;
    top.current.forEach((g, i) => g && (g.position.y = T / 2 + e * (0.7 + i * 0.35)));
    bottom.current.forEach((g, i) => g && (g.position.y = -T / 2 - e * (0.6 + i * 0.3)));
    if (caseTop.current) caseTop.current.position.y = 1.1 + (1 - c) * 7;
    if (caseBottom.current) caseBottom.current.position.y = -0.95 - (1 - c) * 7;
    caseMats.current.forEach((m) => {
      m.opacity = c * 0.93;
      m.visible = c > 0.01;
      m.depthWrite = c > 0.97;
    });
    if (caseScreen.current) caseScreen.current.opacity = clamp01((c - 0.7) / 0.3);
    if (standoffs.current) {
      standoffs.current.visible = e < 0.98;
      standoffs.current.position.y = (ya + yb) / 2;
      standoffs.current.scale.y = Math.max(0.01, ya - yb - T);
    }
    // Cables rojos entre las dos placas (borde derecho).
    wires.current.forEach((w, i) => {
      if (!w) return;
      tmp.a.set(3.25, ya - T / 2, WIRES[i]);
      tmp.b.set(3.25, yb + T / 2, WIRES[i] + 0.05);
      const len = tmp.a.distanceTo(tmp.b);
      w.position.copy(tmp.a).add(tmp.b).multiplyScalar(0.5);
      w.position.x += 0.35 * (1 - e * 0.5);
      w.quaternion.setFromUnitVectors(tmp.up, tmp.b.sub(tmp.a).normalize());
      w.scale.set(1, len, 1);
    });
  });
   

  const board = (label: string) => (
    <group {...pickProps("boards", onSelect)}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[7, T, 9]} />
        <meshStandardMaterial attach="material-0" color="#a85424" emissive={selected === "boards" ? PICK : "#000"} emissiveIntensity={selected === "boards" ? 0.35 : 0} />
        <meshStandardMaterial attach="material-1" color="#a85424" />
        <meshStandardMaterial attach="material-2" map={perf} roughness={0.75} emissive={selected === "boards" ? PICK : "#000"} emissiveIntensity={selected === "boards" ? 0.25 : 0} />
        <meshStandardMaterial attach="material-3" map={perf} roughness={0.75} emissive={selected === "boards" ? PICK : "#000"} emissiveIntensity={selected === "boards" ? 0.25 : 0} />
        <meshStandardMaterial attach="material-4" color="#a85424" />
        <meshStandardMaterial attach="material-5" color="#a85424" />
      </mesh>
      <mesh visible={false} name={label}><boxGeometry args={[0.01, 0.01, 0.01]} /></mesh>
    </group>
  );

  const caseMat = (m: THREE.MeshStandardMaterial | null) => {
    if (m && !caseMats.current.includes(m)) caseMats.current.push(m);
  };

  return (
    <group rotation={[0, -0.35, 0]}>
      {/* Placa superior: ESP32 y pantalla */}
      <group ref={boardA}>
        {board("placa-superior")}
        {ON_TOP.map((p, i) => (
          <group key={p.id} ref={(g) => { top.current[i] = g; }} position={[p.x, T / 2, p.z]} {...pickProps(p.id, onSelect)}>
            {p.id === "esp32" ? <Esp32 on={selected === "esp32"} /> : <Oled on={selected === "oled"} screen={screen} />}
          </group>
        ))}
      </group>
      {/* Placa inferior: sensores mirando hacia la piel */}
      <group ref={boardB}>
        {board("placa-inferior")}
        {ON_BOTTOM.map((p, i) => (
          <group key={p.id} ref={(g) => { bottom.current[i] = g; }} position={[p.x, -T / 2, p.z]} rotation={[Math.PI, p.rot, 0]} {...pickProps(p.id, onSelect)}>
            {p.id === "mpu" ? <Mpu on={selected === "mpu"} /> : p.id === "temp" ? <Temp on={selected === "temp"} /> : <Max30102 on={selected === "max30102"} hr={readings.hr} />}
          </group>
        ))}
      </group>
      {/* Separadores de latón en las esquinas */}
      <group ref={standoffs}>
        {CORNERS.map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0, z]}>
            <cylinderGeometry args={[0.17, 0.17, 1, 6]} />
            <meshStandardMaterial color="#c9a14a" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {WIRES.map((z, i) => (
        <mesh key={z} ref={(m) => { wires.current[i] = m; }}>
          <cylinderGeometry args={[0.05, 0.05, 1, 10]} />
          <meshStandardMaterial color={i === 1 ? "#1d1d1d" : "#e3263a"} roughness={0.5} />
        </mesh>
      ))}
      {/* Carcasa en dos mitades que se cierran sobre el sándwich */}
      <group ref={caseTop} {...pickProps("case", onSelect)}>
        <RoundedBox args={[7.9, 2.8, 9.9]} radius={0.55} smoothness={6} position={[0, 0, 0]}>
          <meshStandardMaterial ref={caseMat} color="#1e2533" roughness={0.38} metalness={0.25} transparent opacity={0} emissive={selected === "case" ? PICK : "#000"} emissiveIntensity={selected === "case" ? 0.3 : 0} />
        </RoundedBox>
        <mesh position={[0.15, 1.401, 2.95]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.3, 1.2]} />
          <meshBasicMaterial ref={caseScreen} map={screen} transparent opacity={0} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.402, -1.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.62, 48]} />
          <meshBasicMaterial color="#5b9bff" transparent opacity={0.6} toneMapped={false} />
        </mesh>
      </group>
      <group ref={caseBottom} {...pickProps("case", onSelect)}>
        <RoundedBox args={[7.9, 1.3, 9.9]} radius={0.5} smoothness={6}>
          <meshStandardMaterial ref={caseMat} color="#151b26" roughness={0.42} metalness={0.25} transparent opacity={0} />
        </RoundedBox>
      </group>
    </group>
  );
}

export default function HardwareProto({ stage, selected, onSelect, readings, spin }: {
  stage: number;
  selected: PartId | null;
  onSelect: (id: PartId | null) => void;
  readings: Readings;
  spin: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={[1.5, 2.5]}
      camera={{ position: [15, 12, 18], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 14, 10]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
      <directionalLight position={[-10, 4, -8]} intensity={1.6} color="#7fd4ff" />
      <directionalLight position={[0, -8, 6]} intensity={0.7} color="#ffd6b0" />
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2} color="#ffffff" position={[5, 8, 6]} scale={[10, 6, 1]} />
          <Lightformer form="rect" intensity={1} color="#7fd4ff" position={[-8, 2, 2]} scale={[6, 8, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#ffd9b8" position={[0, 6, -10]} scale={[12, 4, 1]} />
        </Environment>
        <Device stage={stage} selected={selected} onSelect={onSelect} readings={readings} />
        <ContactShadows position={[0, -5.2, 0]} scale={18} resolution={512} blur={2.6} far={8} opacity={0.6} color="#000814" />
      </Suspense>
      <OrbitControls enablePan={false} autoRotate={spin} autoRotateSpeed={0.8} minDistance={8} maxDistance={40} target={[0, 0, 0]} />
    </Canvas>
  );
}
