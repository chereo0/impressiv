const SITE = "https://impressiv.com.sa";
const IMG = "/sites/impressiv";

export const VIDEO_SRC = `${IMG}/hero-reel.mp4`;

export interface Project {
  title: string;
  subtitle: string;
  image: string;
  href: string;
}

/** Shown on the three screens along the hall wall and as cards in the Work section. */
export const PROJECTS: Project[] = [
  {
    title: "KACST Projects Launching",
    subtitle: "PRODUCT LAUNCHING",
    image: `${IMG}/slide-kacst.jpg`,
    href: `${SITE}/work/king-abdulaziz-city-for-science-and-technology/`,
  },
  {
    title: "EID Festival 2019",
    subtitle: "MASMAK FORT",
    image: `${IMG}/slide-eid.jpg`,
    href: `${SITE}/work/eid-festival-2019/`,
  },
  {
    title: "Saudi National Day 88 Festival",
    subtitle: "EVENT PRODUCTION & CONCEPT",
    image: `${IMG}/slide-national-day.jpg`,
    href: `${SITE}/work/saudi-national-day-88-festival/`,
  },
];

/** Stills that rotate on the side LED towers and the LED cube. */
export const STILLS = [
  `${IMG}/reels.jpg`,
  `${IMG}/hero-poster.jpg`,
  `${IMG}/slide-kacst.jpg`,
  `${IMG}/slide-eid.jpg`,
  `${IMG}/slide-national-day.jpg`,
];

/**
 * Camera stations, in page order. Each section of the page owns one; scrolling
 * moves the camera between them through the hall.
 */
export const STATIONS = [
  { name: "entrance", pos: [0, 2.6, 29], look: [0, 6.4, 0] },
  { name: "hall", pos: [-2, 9.5, 11], look: [0, 3.5, -16] },
  { name: "cube", pos: [3.0, 6.0, 4.4], look: [8, 6.5, -2] },
  { name: "screens", pos: [0.5, 5.2, 4], look: [-17.6, 5.0, -3.2] },
  { name: "crowd", pos: [2, 1.75, -1], look: [0, 5, -23] },
  { name: "stage", pos: [0, 3.6, -5.5], look: [0, 3.4, -23.4] },
] as const satisfies readonly { name: string; pos: readonly number[]; look: readonly number[] }[];

export type StationName = (typeof STATIONS)[number]["name"];
