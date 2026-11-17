"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PROJECTS, VIDEO_SRC } from "./content";
import { Hud } from "./hud";
import type { VenueHandle } from "./scene";
import { emitStation, SmoothScroll } from "./scroll";
import styles from "./venue.module.css";

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/**
 * Fixed full-screen 3D event hall behind the page. Every `[data-station]` section
 * is a camera stop; scrolling between sections walks the camera between stops.
 */
export function VenueExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<VenueHandle | null>(null);
  const stationRef = useRef(0);
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hoverProject, setHoverProject] = useState<number | null>(null);

  // build the scene in the browser only
  useEffect(() => {
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    const fallbackTimer = window.setTimeout(() => setReady(true), 9000);
    (async () => {
      try {
        await document.fonts.ready;
        const { createVenue } = await import("./scene");
        if (disposed || !canvasRef.current || !videoRef.current) return;
        handleRef.current = createVenue({
          canvas: canvasRef.current,
          video: videoRef.current,
          small,
          reducedMotion: reduced,
          onProgress: setPct,
          onReady: () => {
            setPct(100);
            window.setTimeout(() => setReady(true), 350);
          },
          onHoverProject: setHoverProject,
          onSelectProject: (i) => window.location.assign(PROJECTS[i].href),
        });
        handleRef.current.setStation(stationRef.current);
        videoRef.current.play().catch(() => undefined);
      } catch {
        setFailed(true);
        setReady(true);
      }
    })();
    const onVisibility = () => handleRef.current?.setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  // scroll position → fractional station index
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const sections = [...document.querySelectorAll<HTMLElement>("[data-station]")];
      if (!sections.length) return;
      const center = window.scrollY + window.innerHeight / 2;
      // a section with data-steps="n" owns n consecutive stops, spread evenly over its height
      const anchors = sections.flatMap((s) => {
        const top = s.getBoundingClientRect().top + window.scrollY;
        const steps = Number(s.dataset.steps ?? 1);
        if (steps === 1) return [top + s.offsetHeight / 2];
        const usable = s.offsetHeight - window.innerHeight;
        return Array.from({ length: steps }, (_, k) => top + window.innerHeight / 2 + (usable * k) / (steps - 1));
      });
      let station = 0;
      if (center >= anchors[anchors.length - 1]) station = anchors.length - 1;
      else {
        for (let i = 0; i < anchors.length - 1; i++) {
          if (center < anchors[i + 1]) {
            const t = (center - anchors[i]) / (anchors[i + 1] - anchors[i]);
            // dwell at each stop, travel in between
            station = i + smooth(0.18, 0.82, Math.max(0, t));
            break;
          }
        }
      }
      stationRef.current = station;
      handleRef.current?.setStation(station);
      emitStation(station);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <SmoothScroll />
      <Hud />
      <div className={cn(styles.backdrop, failed && styles.backdropFallback)} aria-hidden="true">
        <canvas ref={canvasRef} className={styles.canvas} />
        <video ref={videoRef} src={VIDEO_SRC} muted loop playsInline preload="auto" className={styles.hiddenVideo} />
      </div>

      <div className={cn(styles.screenTip, hoverProject !== null && styles.screenTipOn)} aria-live="polite">
        {hoverProject !== null && (
          <>
            <b>{PROJECTS[hoverProject].title}</b> · {PROJECTS[hoverProject].year} · click to view
          </>
        )}
      </div>

      <div className={cn(styles.loader, ready && styles.loaderDone)} aria-hidden={ready}>
        <span className={styles.loaderEyebrow}>IMPRESSIV · LIVE</span>
        <span className={styles.loaderTitle}>Soundcheck</span>
        <span className={styles.loaderBar}>
          <i style={{ transform: `scaleX(${pct / 100})` }} />
        </span>
        <span className={styles.loaderPct}>Setting up the stage · {pct}%</span>
      </div>
    </>
  );
}
