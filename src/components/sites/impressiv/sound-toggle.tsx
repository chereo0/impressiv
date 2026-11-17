"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FINALE } from "./venue/content";
import { STATION_EVENT } from "./venue/scroll";
import styles from "./sound.module.css";

/** Put the track here (public/sites/impressiv/audio/background.mp3). */
export const MUSIC_SRC = "/sites/impressiv/audio/background.mp3";

const STORAGE_KEY = "iv-sound";
const BASE_VOLUME = 0.35;

function readPref() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function writePref(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // storage unavailable (private mode): the toggle still works for this visit
  }
}

/**
 * Background music with a sound on/off button. Browsers only allow audio after the visitor
 * interacts, so music starts on the button (or, if they turned it on before, on their first
 * tap or key press). Fades in and out, pauses while the tab is hidden, and swells a little
 * at the stage finale on the home page.
 */
export function SoundToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const targetRef = useRef(0);
  const boostRef = useRef(0);
  const [on, setOn] = useState(false);
  const [available, setAvailable] = useState(true);

  // one audio element for the page, with a volume loop that eases towards the target
  useEffect(() => {
    const audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = 0;
    audioRef.current = audio;
    const onError = () => setAvailable(false);
    audio.addEventListener("error", onError);
    // hide the button until there is a track to play
    fetch(MUSIC_SRC, { method: "HEAD" })
      .then((r) => {
        if (!r.ok) setAvailable(false);
      })
      .catch(() => setAvailable(false));

    let raf = 0;
    const loop = () => {
      const target = targetRef.current * (BASE_VOLUME + boostRef.current * 0.3);
      const v = audio.volume + (target - audio.volume) * 0.04;
      audio.volume = Math.min(1, Math.max(0, Math.abs(v - target) < 0.002 ? target : v));
      if (targetRef.current === 0 && audio.volume === 0 && !audio.paused) audio.pause();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // the home page broadcasts its camera stop; swell into the stage finale
    const onStation = (e: Event) => {
      const s = (e as CustomEvent<number>).detail;
      boostRef.current = Math.min(1, Math.max(0, s - (FINALE - 1)));
    };
    window.addEventListener(STATION_EVENT, onStation);

    const onVisibility = () => {
      if (document.hidden) audio.pause();
      else if (targetRef.current > 0) audio.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(STATION_EVENT, onStation);
      document.removeEventListener("visibilitychange", onVisibility);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    targetRef.current = 1;
    audio.play().then(
      () => setOn(true),
      () => {
        targetRef.current = 0;
        setOn(false);
      },
    );
  }, []);

  const stop = () => {
    targetRef.current = 0;
    setOn(false);
  };

  // returning visitors who left sound on: resume on their first interaction
  useEffect(() => {
    if (!readPref()) return;
    const resume = () => {
      start();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [start]);

  if (!available) return null;

  return (
    <button
      type="button"
      className={cn(styles.toggle, on && styles.on)}
      aria-pressed={on}
      aria-label={on ? "Turn music off" : "Turn music on"}
      onClick={() => {
        const next = !on;
        writePref(next);
        if (next) start();
        else stop();
      }}
    >
      <span className={styles.bars} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className={styles.label}>{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
