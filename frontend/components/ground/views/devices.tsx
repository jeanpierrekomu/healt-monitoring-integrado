"use client";

import { PageTitle } from "@/components/ground/shell";
import { DataView, Field, Photo, Tag } from "@/components/ground/ui";
import { useData } from "@/lib/ground/use-data";
import { photoUrl } from "@/lib/supabase";
import { getDevices } from "@/lib/queries/catalog";
import { countTelemetryByDevice } from "@/lib/queries/telemetry";
import type { Device } from "@/types/database";

export function DevicesView() {
  const devices = useData("ground:devices", getDevices);
  return (
    <>
      <PageTitle title="Dispositivos" subtitle="Catálogo de equipos que registran la telemetría." />
      <DataView state={devices} empty={(d) => d.length === 0} emptyHint="Todavía no hay dispositivos en la base de datos.">
        {(list) => (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((d) => <DeviceCard key={d.id} d={d} />)}
          </div>
        )}
      </DataView>
    </>
  );
}

function DeviceCard({ d }: { d: Device }) {
  const records = useData(`ground:device-telemetry:${d.id}`, () => countTelemetryByDevice(d.id));
  const status = String(d.status ?? "").toLowerCase();
  const tone = /activ|oper|online|ok|disponib/.test(status) ? "green" : /fail|fall|error|baja|offline|retir/.test(status) ? "red" : "gray";
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface/80 p-3">
      <div className="flex gap-3">
        <Photo src={photoUrl("hardware-photos", d.image_path)} name={d.device_name ?? d.device_code} size={72} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold" data-no-i18n>{d.device_name ?? d.device_code ?? "Dispositivo"}</p>
          <p className="truncate text-xs text-muted" data-no-i18n>{d.manufacturer ?? "Fabricante sin dato"}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {d.device_type && <Tag tone="cyan"><span data-no-i18n>{d.device_type}</span></Tag>}
            {d.status && <Tag tone={tone}><span data-no-i18n>{d.status}</span></Tag>}
          </div>
        </div>
      </div>
      {d.description && <p className="text-[13px] leading-relaxed text-muted" data-no-i18n>{d.description}</p>}
      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-2">
        <Field label="Código"><span className="font-mono text-xs" data-no-i18n>{d.device_code ?? "—"}</span></Field>
        <Field label="Firmware"><span className="font-mono text-xs" data-no-i18n>{d.firmware_version ?? "—"}</span></Field>
        <Field label="Registros">{records.loading ? "…" : records.error ? "—" : (records.data ?? 0).toLocaleString("es")}</Field>
      </dl>
    </article>
  );
}
