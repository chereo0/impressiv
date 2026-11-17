import type { Metadata } from "next";
import { WorkPage } from "@/components/sites/impressiv/work/work-page";

export const metadata: Metadata = {
  title: "Work – ImpressIV",
  description: "Pavilions, booths, launch events, stage concepts and video mapping by ImpressIV.",
};

export default function Work() {
  return <WorkPage />;
}
