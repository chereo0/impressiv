"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./impressiv.module.css";

const NAV = [
  { label: "Work", href: "https://impressiv.com.sa/work/" },
  { label: "About", href: "https://impressiv.com.sa/about/" },
  { label: "Approach", href: "https://impressiv.com.sa/approach/" },
  { label: "Reels", href: "https://impressiv.com.sa/reel/" },
  { label: "Contact", href: "https://impressiv.com.sa/contact/" },
];

function MenuIcon() {
  return (
    <svg width="44" height="45" viewBox="0 0 44 45" aria-hidden="true">
      <g transform="translate(6 9)" fill="#FFFFFF">
        <polygon points="0 3 33 3 33 0 0 0" />
        <polygon points="5 27 33 27 33 24 5 24" />
        <polygon points="15 15 33 15 33 12 15 12" />
      </g>
    </svg>
  );
}

function CloseIcon() {
  // Font Awesome "window-close" (solid), drawn at 42px like the source.
  return (
    <svg width="38" height="34" viewBox="0 0 512 448" aria-hidden="true">
      <path
        fill="#000"
        d="M464 0H48C21.5 0 0 21.5 0 48v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zm-83.6 290.5c4.8 4.8 4.8 12.6 0 17.4l-40.5 40.5c-4.8 4.8-12.6 4.8-17.4 0L256 281.6l-66.5 66.8c-4.8 4.8-12.6 4.8-17.4 0l-40.5-40.5c-4.8-4.8-4.8-12.6 0-17.4l66.8-66.5-66.8-66.5c-4.8-4.8-4.8-12.6 0-17.4l40.5-40.5c4.8-4.8 12.6-4.8 17.4 0l66.5 66.8 66.5-66.8c4.8-4.8 12.6-4.8 17.4 0l40.5 40.5c4.8 4.8 4.8 12.6 0 17.4L313.6 224l66.8 66.5z"
      />
    </svg>
  );
}

export function SiteShell({ children, scene }: { children: ReactNode; scene?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.root}>
      {/* rendered outside the page wrapper so the menu's push transform doesn't move it */}
      {scene}
      <header className={cn(styles.header, solid && styles.headerSolid, open && styles.pushed)}>
          <a href="https://impressiv.com.sa/" aria-label="ImpressIV home">
            <Image
              className={styles.headerLogo}
              src="/sites/impressiv/logo-sm.png"
              alt="ImpressIV"
              width={300}
              height={34}
              priority
            />
          </a>
          <button
            type="button"
            className={styles.burger}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="iv-offcanvas"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </button>
      </header>
      <div className={cn(styles.page, open && styles.pushed)}>{children}</div>

      <div
        className={cn(styles.backdrop, open && styles.backdropOpen)}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="iv-offcanvas"
        className={cn(styles.offcanvas, open && styles.offcanvasOpen)}
        aria-hidden={!open}
        inert={!open}
      >
        <button type="button" className={styles.offcanvasClose} aria-label="Close menu" onClick={() => setOpen(false)}>
          <CloseIcon />
        </button>
        <nav className={styles.offcanvasNav} aria-label="Main">
          {NAV.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <Image
          className={styles.offcanvasLogo}
          src="/sites/impressiv/impressiv-logo-white.svg"
          alt="ImpressIV"
          width={507}
          height={57}
        />
      </aside>
    </div>
  );
}
