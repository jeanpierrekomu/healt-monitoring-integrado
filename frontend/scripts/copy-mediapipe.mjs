// Copia los archivos del detector corporal (MediaPipe) a public/ para servirlos desde la propia app,
// sin depender de internet durante la demo. Se ejecuta solo después de `npm install`.
import { cpSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/@mediapipe/tasks-vision/wasm";
const to = "public/mediapipe/wasm";
if (existsSync(from)) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log("MediaPipe copiado a", to);
}
