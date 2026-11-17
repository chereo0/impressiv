"use client";

import { useEffect, useRef } from "react";
import { CLIENTS } from "./content";
import { useScrollVelocity } from "./scroll";
import styles from "./ui.module.css";

/** An endless band of client names that speeds up (and reverses) with the scroll. */
export function ClientMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);
  const velocity = useScrollVelocity();

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = 0;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const half = track.scrollWidth / 2;
      const speed = reduced ? 20 : 60 + velocity.current * 40;
      x -= speed * dt;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0) skewX(${reduced ? 0 : Math.max(-12, Math.min(12, -velocity.current * 0.8))}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [velocity]);

  const items = [...CLIENTS, ...CLIENTS];
  return (
    <div className={styles.marquee} aria-label={`Clients include ${CLIENTS.join(", ")}`}>
      <div ref={trackRef} className={styles.marqueeTrack} aria-hidden="true">
        {items.map((c, i) => (
          <span key={i}>
            {c}
            <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}
