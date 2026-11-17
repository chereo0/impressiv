"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedText } from "../venue/animated-text";
import type { CorridorHandle } from "./corridor-scene";
import { WORK_PROJECTS, workImage } from "./projects";
import styles from "./work.module.css";

/** Scroll-driven intro: the camera walks down a corridor of LED screens showing the projects. */
export function WorkHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<CorridorHandle | null>(null);
  const progressRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    const small = window.innerWidth < 768;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fallback = window.setTimeout(() => setReady(true), 6000);
    (async () => {
      try {
        await document.fonts.ready;
        const { createCorridor } = await import("./corridor-scene");
        if (disposed || !canvasRef.current) return;
        handleRef.current = createCorridor({
          canvas: canvasRef.current,
          images: WORK_PROJECTS.slice(0, small ? 12 : 20).map(workImage),
          total: WORK_PROJECTS.length,
          small,
          reducedMotion: reduced,
          onReady: () => setReady(true),
        });
        handleRef.current.setProgress(progressRef.current);
      } catch {
        setFailed(true);
        setReady(true);
      }
    })();
    return () => {
      disposed = true;
      window.clearTimeout(fallback);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current!;
    const stage = stageRef.current!;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
      progressRef.current = p;
      stage.style.setProperty("--p", p.toFixed(4));
      handleRef.current?.setProgress(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const io = new IntersectionObserver(([e]) => handleRef.current?.setActive(e.isIntersecting));
    io.observe(section);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.hero} aria-labelledby="work-hero-title">
      <div ref={stageRef} className={cn(styles.heroStage, failed && styles.heroFallback)}>
        <canvas ref={canvasRef} className={styles.heroCanvas} aria-hidden="true" />
        <div className={cn(styles.heroCurtain, ready && styles.heroCurtainUp)} aria-hidden="true" />

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>The archive · 2017 – 2024</p>
          <AnimatedText as="h1" id="work-hero-title" className={styles.heroTitle} text="Our work" delay={250} />
          <p className={styles.heroSub}>
            {WORK_PROJECTS.length} projects: pavilions and booths, launch events, stage concepts, video mapping and
            ceremonies across the Kingdom.
          </p>
          <p className={styles.hint}>SCROLL TO WALK THE CORRIDOR ↓</p>
        </div>

        <div className={styles.heroOutro}>
          <a href="#archive" className={styles.outroLink}>
            Browse all {WORK_PROJECTS.length} projects ↓
          </a>
        </div>
      </div>
    </section>
  );
}
