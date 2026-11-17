"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./impressiv.module.css";

const SLIDES = [
  {
    heading: "KACST Projects Launching",
    description: "PRODUCT LAUNCHING",
    image: "/sites/impressiv/slide-kacst.jpg",
    href: "https://impressiv.com.sa/work/king-abdulaziz-city-for-science-and-technology/",
  },
  {
    heading: "EID Festival 2019",
    description: "MASMAK FORT",
    image: "/sites/impressiv/slide-eid.jpg",
    href: "https://impressiv.com.sa/work/eid-festival-2019/",
  },
  {
    heading: "Saudi National Day 88 Festival",
    description: "EVENT PRODUCTION & CONCEPT",
    image: "/sites/impressiv/slide-national-day.jpg",
    href: "https://impressiv.com.sa/work/saudi-national-day-88-festival/",
  },
];

export function WorkSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => go(index + 1), 5000);
    return () => window.clearTimeout(id);
  }, [index, paused, go]);

  return (
    <section
      className={styles.slider}
      aria-roledescription="carousel"
      aria-label="Featured projects"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
        {SLIDES.map((slide, i) => (
          <div
            key={slide.heading}
            className={styles.slide}
            style={{ backgroundImage: `url("${slide.image}")` }}
            aria-hidden={i !== index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDES.length}`}
          >
            <div>
              <div className={styles.slideHeading}>{slide.heading}</div>
              <div className={styles.slideDesc}>{slide.description}</div>
              <a className={styles.slideButton} href={slide.href} tabIndex={i === index ? 0 : -1}>
                DETAILS
              </a>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className={cn(styles.arrow, styles.arrowPrev)} aria-label="Previous slide" onClick={() => go(index - 1)}>
        <ChevronLeft size={25} strokeWidth={1.5} />
      </button>
      <button type="button" className={cn(styles.arrow, styles.arrowNext)} aria-label="Next slide" onClick={() => go(index + 1)}>
        <ChevronRight size={25} strokeWidth={1.5} />
      </button>
      <div className={styles.bullets}>
        {SLIDES.map((slide, i) => (
          <button
            key={slide.heading}
            type="button"
            className={cn(styles.bullet, i === index && styles.bulletActive)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}
