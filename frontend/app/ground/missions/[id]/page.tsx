import { Suspense } from "react";
import { Loading } from "@/components/ground/ui";
import { MissionDetailView } from "@/components/ground/views/mission-detail";

export default function Page() {
  return (
    <Suspense fallback={<Loading rows={6} />}>
      <MissionDetailView />
    </Suspense>
  );
}
