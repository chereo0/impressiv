"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { PROJECTS, SCREEN_SLOTS, WORK_START } from "./content";
import { useStation } from "./scroll";
import styles from "./ui.module.css";

/**
 * The Work chapter: one scroll step per project. The camera visits each project's screen in
 * the hall; this pinned panel swaps to that project with a staggered transition.
 */
export function WorkGallery() {
  const station = useStation();
  const raw = station - WORK_START;
  const index = Math.min(PROJECTS.length - 1, Math.max(0, Math.round(raw)));
  const project = PROJECTS[index];
  // the screen is on the left wall for the first half → put the panel on the right, and vice versa
  const side = SCREEN_SLOTS[index].side < 0 ? "right" : "left";
  // within a step, fade the panel slightly while the camera is between screens
  const settle = 1 - Math.min(1, Math.abs(raw - index) * 2.2);

  return (
    <section
      className={styles.work}
      data-station="work"
      data-steps={PROJECTS.length}
      data-chapter="Work"
      style={{ height: `${PROJECTS.length * 85 + 40}vh` }}
      aria-labelledby="work-title"
    >
      <div className={cn(styles.workSticky, side === "left" ? styles.workLeft : styles.workRight)}>
        <div className={styles.workPanel} style={{ opacity: 0.55 + settle * 0.45 }}>
          <div className={styles.workHead}>
            <h2 id="work-title" className={styles.workEyebrow}>
              Featured work
            </h2>
            <span className={styles.workCount}>
              <b>{String(index + 1).padStart(2, "0")}</b> / {PROJECTS.length}
            </span>
          </div>

          {/* keyed so each project animates in */}
          <div key={index} className={styles.workBody}>
            <p className={styles.workMeta}>
              {project.client} · {project.year}
            </p>
            <h3 className={styles.workTitle}>{project.title}</h3>
            <p className={styles.workCategory}>{project.category}</p>
            <a className={styles.workLink} href={project.href}>
              View project <span aria-hidden="true">→</span>
            </a>
          </div>

          <Link className={styles.workAll} href="/work">
            See all projects <span aria-hidden="true">→</span>
          </Link>

          <div className={styles.workDots} aria-hidden="true">
            {PROJECTS.map((p, i) => (
              <i key={p.title} className={cn(i === index && styles.workDotOn, i < index && styles.workDotPast)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
