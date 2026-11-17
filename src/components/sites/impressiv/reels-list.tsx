"use client";

import { useEffect, useRef } from "react";
import styles from "./impressiv.module.css";

/** Reels category list with the source's scroll-linked translateY (Elementor motion FX, speed 1.3). */
export function ReelsList() {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.parentElement!.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress 0 when the block enters at the bottom, 1 when it leaves at the top
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      const offset = (0.5 - progress) * 1.3 * 100;
      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div>
      <h2 ref={ref} className={styles.reelsList}>
        <a href="https://impressiv.com.sa/reel/">
          EVENTS
          <br />
          EXHIBITION
          <br />
          SHOWS
          <br />
          MAKING OFF
        </a>
      </h2>
    </div>
  );
}
