"use client";

import { cn } from "@/lib/utils";
import { CHAPTERS, PROJECTS, STATIONS, WORK_START } from "./content";
import { scrollToElement, useStation } from "./scroll";
import styles from "./ui.module.css";

/** Chapter rail on the right edge + a progress line along the top. */
export function Hud() {
  const station = useStation();
  const index = Math.min(STATIONS.length - 1, Math.max(0, Math.round(station)));
  const chapter = STATIONS[index].chapter;
  const progress = station / (STATIONS.length - 1);
  const inWork = chapter === "Work";
  const projectNo = Math.min(PROJECTS.length, Math.max(1, Math.round(station - WORK_START) + 1));

  const jump = (c: (typeof CHAPTERS)[number]) => {
    const el = document.querySelector<HTMLElement>(`[data-chapter="${c}"]`);
    if (el) scrollToElement(el);
  };

  return (
    <>
      <div className={styles.progress} aria-hidden="true">
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      <nav className={styles.rail} aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <button
            key={c}
            type="button"
            className={cn(styles.railItem, c === chapter && styles.railActive)}
            onClick={() => jump(c)}
            aria-current={c === chapter ? "step" : undefined}
          >
            <span className={styles.railNo}>{String(i + 1).padStart(2, "0")}</span>
            <span className={styles.railLabel}>
              {c}
              {c === "Work" && inWork ? ` · ${String(projectNo).padStart(2, "0")}/${PROJECTS.length}` : ""}
            </span>
            <i className={styles.railTick} />
          </button>
        ))}
      </nav>
    </>
  );
}
