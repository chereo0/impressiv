"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect, useRef, useState } from "react";

/** Fractional camera station, broadcast by VenueExperience on every scroll frame. */
export const STATION_EVENT = "iv:station";

export function emitStation(station: number) {
  window.dispatchEvent(new CustomEvent<number>(STATION_EVENT, { detail: station }));
}

export function useStation() {
  const [station, setStation] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setStation((e as CustomEvent<number>).detail);
    window.addEventListener(STATION_EVENT, on);
    return () => window.removeEventListener(STATION_EVENT, on);
  }, []);
  return station;
}

let lenis: Lenis | null = null;

/** Smooth scroll to an element (falls back to native scrolling). */
export function scrollToElement(el: HTMLElement, offset = 0) {
  if (lenis) lenis.scrollTo(el, { offset, duration: 2.2 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
}

/** Scroll velocity in px/frame from Lenis (0 without it). */
export function useScrollVelocity() {
  const ref = useRef(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      ref.current = lenis ? lenis.velocity : 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return ref;
}

/** Inertial smooth scrolling for the whole page (off when the visitor prefers reduced motion). */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    lenis = instance;
    let raf = 0;
    const loop = (time: number) => {
      instance.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      instance.destroy();
      lenis = null;
    };
  }, []);
  return null;
}
