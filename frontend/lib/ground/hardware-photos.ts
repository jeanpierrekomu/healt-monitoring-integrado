// Fotos reales del prototipo AZRIEL. Las imágenes van en public/hardware/ y se agregan aquí.
// Ejemplo: { src: "/hardware/prototipo-final.jpg", caption: "AZRIEL terminado" }
// Las fotos se publican convertidas a JPG de 1200 × 1600 y SIN datos ocultos (ubicación GPS, cámara).

export interface HardwarePhoto {
  src: string;
  caption: string;
}

/** Foto grande del prototipo físico terminado (null mientras no haya). */
export const PROTOTYPE_PHOTO: HardwarePhoto | null = { src: "/hardware/azriel-final.jpg", caption: "AZRIEL terminado, puesto en el antebrazo" };

/** Fotos del proceso de construcción, en orden. */
export const BUILD_PHOTOS: HardwarePhoto[] = [
  { src: "/hardware/construccion-01.jpg", caption: "Mesa de trabajo: estación de soldadura, placas y módulos listos" },
  { src: "/hardware/construccion-02.jpg", caption: "Primera prueba de tamaño: los módulos sobre la muñeca" },
  { src: "/hardware/construccion-03.jpg", caption: "Empieza la soldadura de los módulos" },
  { src: "/hardware/construccion-04.jpg", caption: "Trabajo en equipo durante el Space Apps Challenge" },
  { src: "/hardware/construccion-05.jpg", caption: "Soldando los pines a la placa perforada" },
  { src: "/hardware/construccion-06.jpg", caption: "Soldadura con la pinza de sujeción" },
  { src: "/hardware/construccion-07.jpg", caption: "Detalle del cautín y la placa" },
  { src: "/hardware/construccion-08.jpg", caption: "Revisión de las conexiones con lupa" },
  { src: "/hardware/construccion-09.jpg", caption: "Soldadura de la segunda placa" },
  { src: "/hardware/construccion-10.jpg", caption: "Ajustes finales de los pines" },
  { src: "/hardware/construccion-11.jpg", caption: "Repasando el diagrama de conexiones" },
  { src: "/hardware/construccion-12.jpg", caption: "Placa superior: ESP32 y pantalla OLED" },
  { src: "/hardware/construccion-13.jpg", caption: "Placa inferior: MPU6050, MAX30205 y MAX30102" },
  { src: "/hardware/construccion-14.jpg", caption: "Las dos placas terminadas" },
  { src: "/hardware/construccion-15.jpg", caption: "Cableado entre las dos placas" },
  { src: "/hardware/construccion-16.jpg", caption: "Las placas listas para unirse en sándwich" },
  { src: "/hardware/construccion-17.jpg", caption: "Primera prueba en el brazo" },
  { src: "/hardware/construccion-18.jpg", caption: "AZRIEL en funcionamiento sobre el antebrazo" },
];
