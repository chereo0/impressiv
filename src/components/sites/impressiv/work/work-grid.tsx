"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { WORK_FILTERS, WORK_PROJECTS, workFilters, workHref, workImage, type WorkFilter, type WorkProject } from "./projects";
import styles from "./work.module.css";

function Card({ project, index }: { project: WorkProject; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // tilt towards the pointer
  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 9).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 11).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = ref.current!;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <a
      ref={ref}
      href={workHref(project)}
      className={cn(styles.card, shown && styles.cardIn)}
      style={{ transitionDelay: shown ? `${(index % 3) * 90}ms` : undefined }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className={styles.cardInner}>
        <Image
          className={styles.cardImage}
          src={workImage(project)}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1100px) 50vw, 33vw"
        />
        <span className={styles.cardShade} />
        <span className={styles.cardGlare} />
        <span className={styles.cardNo}>{String(index + 1).padStart(2, "0")}</span>
        <span className={styles.cardText}>
          <span className={styles.cardCat}>{project.category}</span>
          <span className={styles.cardTitle}>{project.title}</span>
          <span className={styles.cardMeta}>
            {project.year || "ImpressIV"} <i aria-hidden="true">→</i>
          </span>
        </span>
      </span>
    </a>
  );
}

/** Filterable grid of every project; cards rise out of 3D as they scroll in and tilt under the pointer. */
export function WorkGrid() {
  const [filter, setFilter] = useState<WorkFilter>("All");
  const list = useMemo(
    () => (filter === "All" ? WORK_PROJECTS : WORK_PROJECTS.filter((p) => workFilters(p).includes(filter))),
    [filter],
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        WORK_FILTERS.map((f) => [f, f === "All" ? WORK_PROJECTS.length : WORK_PROJECTS.filter((p) => workFilters(p).includes(f)).length]),
      ) as Record<WorkFilter, number>,
    [],
  );

  return (
    <section id="archive" className={styles.archive} aria-labelledby="archive-title">
      <div className={styles.archiveHead}>
        <h2 id="archive-title" className={styles.archiveTitle}>
          {filter === "All" ? "All projects" : filter} <span>{list.length}</span>
        </h2>
        <div className={styles.filters} role="tablist" aria-label="Filter projects">
          {WORK_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={f === filter}
              className={cn(styles.filter, f === filter && styles.filterOn)}
              onClick={() => setFilter(f)}
            >
              {f} <sup>{counts[f]}</sup>
            </button>
          ))}
        </div>
      </div>

      {/* keyed by filter so the cards re-run their entrance */}
      <div key={filter} className={styles.grid}>
        {list.map((p, i) => (
          <Card key={p.slug} project={p} index={i} />
        ))}
      </div>
    </section>
  );
}
