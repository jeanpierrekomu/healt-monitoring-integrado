import { Suspense } from "react";
import { Loading } from "@/components/ground/ui";
import { AstronautDetailView } from "@/components/ground/views/astronaut-detail";

export default function Page() {
  return (
    <Suspense fallback={<Loading rows={6} />}>
      <AstronautDetailView />
    </Suspense>
  );
}
