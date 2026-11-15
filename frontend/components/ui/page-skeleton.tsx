// Estado de carga mientras llegan los datos del servidor.
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-9 w-72 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-80 rounded-2xl" />
    </div>
  );
}
