import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { SleepProvider } from "@/components/sleep/sleep-context";
import { AlertPopupProvider } from "@/components/alerts/alert-popup-context";
import { AlertPopups } from "@/components/alerts/alert-popup";
import { alertFromRecord } from "@/services/alert-messages";
import { Topbar, type NotificationItem } from "@/components/layout/topbar";
import { getAlerts } from "@/services/alerts";
import { getAstronauts } from "@/services/astronauts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [alerts, astronauts] = await Promise.all([getAlerts(), getAstronauts()]);
  const notifications: NotificationItem[] = alerts
    .filter((a) => a.review !== "resuelta")
    .map((a) => ({
      id: a.id,
      title: a.title,
      firstName: astronauts.find((x) => x.id === a.astronautId)?.name.split(" ")[0] ?? "",
      value: a.value,
      source: a.source,
      severity: a.severity,
      ago: a.ago,
    }));

  // Al entrar: alertas críticas pendientes como pop-up (con voz si está activada).
  const initial = alerts
    .filter((a) => a.review === "pendiente" && a.severity === "critico" && a.source !== "Modelo IA")
    .flatMap((r) => {
      const who = astronauts.find((x) => x.id === r.astronautId);
      return who ? [alertFromRecord(r, who)] : [];
    });
  const crew = astronauts.map(({ id, name, sex, baseline }) => ({ id, name, sex, baseline }));

  return (
    <AlertPopupProvider initial={initial} crew={crew}>
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar notifications={notifications} />
        <main className="flex-1 px-4 pt-6 pb-28 md:px-8 lg:pb-10">
          <SleepProvider>{children}</SleepProvider>
        </main>
      </div>
      <MobileNav />
      <AlertPopups />
    </div>
    </AlertPopupProvider>
  );
}
