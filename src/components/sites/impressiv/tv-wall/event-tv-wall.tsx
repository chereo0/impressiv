"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import heroStyles from "../impressiv.module.css";
import { VIDEO_SRC, type Channel } from "./channels";
import type { TvWallHandle } from "./scene";
import styles from "./tv-wall.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

function formatClock(d: Date) {
  const h = d.getHours();
  return `${h < 12 ? "AM" : "PM"} ${pad(h % 12 || 12)}:${pad(d.getMinutes())}`;
}

/**
 * Scroll-driven 3D wall of CRT sets. The section is tall; its inner stage is sticky,
 * and scroll progress through the section drives the camera, the ident sync and the
 * final fly-in that hands off to the hero.
 */
export function EventTvWall() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneVideoRef = useRef<HTMLVideoElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<TvWallHandle | null>(null);
  const progressRef = useRef(0);
  const monoRef = useRef(false);

  const [bootPct, setBootPct] = useState(0);
  const [booted, setBooted] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [mono, setMono] = useState(false);
  const [clock, setClock] = useState("");
  const [counter, setCounter] = useState("0:00:00");
  const [failed, setFailed] = useState(false);

  // boot screen: tape loads to 100%
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const duration = reduced ? 300 : 1900;
    let raf = 0;
    const step = (now: number) => {
      const pct = Math.min(100, Math.round(((now - start) / duration) * 100));
      setBootPct(pct);
      if (pct < 100) raf = requestAnimationFrame(step);
      else window.setTimeout(() => setBooted(true), 250);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // the 3D scene (three.js is loaded only in the browser)
  useEffect(() => {
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      try {
        await document.fonts.ready;
        const { createTvWall } = await import("./scene");
        if (disposed || !canvasRef.current || !sceneVideoRef.current) return;
        handleRef.current = createTvWall({
          canvas: canvasRef.current,
          video: sceneVideoRef.current,
          reducedMotion: reduced,
          onHover: setChannel,
          onSelect: (ch) => {
            if (ch.href) window.open(ch.href, ch.href.startsWith("http://wa.link") ? "_blank" : "_self");
          },
        });
        handleRef.current.setProgress(progressRef.current);
        handleRef.current.setMono(monoRef.current);
        sceneVideoRef.current.play().catch(() => undefined);
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      disposed = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (booted) handleRef.current?.powerOn();
    else return;
    // the scene may still be loading when boot finishes
    const id = window.setInterval(() => {
      if (handleRef.current) {
        handleRef.current.powerOn();
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [booted]);

  useEffect(() => {
    monoRef.current = mono;
    handleRef.current?.setMono(mono);
  }, [mono]);

  // scroll progress → scene + overlay
  useEffect(() => {
    const section = sectionRef.current!;
    const stage = stageRef.current!;
    let raf = 0;
    let lastHeroVisible = false;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / span));
      stage.style.setProperty("--p", p.toFixed(4));
      progressRef.current = p;
      handleRef.current?.setProgress(p);
      const secs = Math.floor(p * 754);
      setCounter(`${Math.floor(secs / 3600)}:${pad(Math.floor(secs / 60) % 60)}:${pad(secs % 60)}`);
      const heroVisible = p > 0.84;
      if (heroVisible !== lastHeroVisible) {
        lastHeroVisible = heroVisible;
        const hv = heroVideoRef.current;
        const sv = sceneVideoRef.current;
        if (hv && sv) {
          if (heroVisible) {
            hv.currentTime = sv.currentTime;
            hv.play().catch(() => undefined);
          } else hv.pause();
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const io = new IntersectionObserver(([entry]) => handleRef.current?.setActive(entry.isIntersecting));
    io.observe(section);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  const chLabel = channel
    ? channel.number
      ? `CH ${pad(channel.number)} · ${channel.label}`
      : channel.label
    : null;

  return (
    <section ref={sectionRef} id="iv-wall" className={styles.section} aria-label="ImpressIV on air">
      <div ref={stageRef} className={cn(styles.stage, mono && styles.mono)}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <video ref={sceneVideoRef} src={VIDEO_SRC} muted loop playsInline preload="auto" className={styles.hiddenVideo} />

        {failed && <div className={styles.fallback} />}

        {/* on-screen display */}
        <div className={styles.osd}>
          <div className={styles.osdTop}>
            <span>▶ PLAY&nbsp;&nbsp;SP {counter}</span>
            <span className={styles.osdBrand}>
              CH 01–17
              <small>LIVE FROM RIYADH</small>
            </span>
            <span className={styles.rec}>
              <i /> REC
            </span>
          </div>

          <div className={styles.osdLeft}>
            <span className={styles.onAir}>
              <i /> ON AIR
            </span>
            <h1 className={styles.osdTitle}>
              Events, exhibitions
              <br />& shows. Live.
            </h1>
          </div>

          <p className={styles.osdRight}>
            Every event we&apos;ve produced since 2011 broadcasts on its own set. Hover a screen to tune in, click
            to watch it.
          </p>

          <div className={styles.osdBottom}>
            <span>{clock}</span>
            <button type="button" className={styles.colorKnob} onClick={() => setMono((m) => !m)} aria-pressed={!mono}>
              COLOR [{mono ? "OFF" : "ON"}]
            </button>
            <span className={styles.osdHint} aria-live="polite">
              {chLabel ?? "SCROLL TO TUNE IN ▼"}
            </span>
            <span className={styles.hideSmall}>RIYADH · KSA</span>
          </div>
        </div>

        {/* hand-off: the centre screen becomes the hero */}
        <div className={styles.handoff}>
          <video
            ref={heroVideoRef}
            src={VIDEO_SRC}
            poster="/sites/impressiv/hero-poster.jpg"
            muted
            loop
            playsInline
            preload="none"
            className={styles.handoffVideo}
          />
          <div className={styles.crt} />
          <div className={styles.handoffInner}>
            <h2 className={heroStyles.heroTitle}>We do it live!</h2>
            <a className={heroStyles.heroButton} href="http://wa.link/frlwct">
              Contact us!
            </a>
          </div>
        </div>

        {/* VCR boot screen */}
        <div className={cn(styles.boot, booted && styles.bootDone)} aria-hidden={booted}>
          <span className={styles.bootPlay}>▶ PLAY</span>
          <span className={styles.bootBrand}>IMPRESSIV</span>
          <span className={styles.bootLoad}>LOADING TAPE&nbsp;&nbsp;{bootPct}%</span>
          <span className={styles.bootBar}>
            <i style={{ width: `${bootPct}%` }} />
          </span>
        </div>
      </div>
    </section>
  );
}
