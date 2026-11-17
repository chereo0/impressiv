const SITE = "https://impressiv.com.sa";
const IMG = "/sites/impressiv";

export const VIDEO_SRC = `${IMG}/hero-reel.mp4`;

export interface Project {
  title: string;
  client: string;
  category: string;
  year: string;
  image: string;
  href: string;
}

const work = (slug: string) => `${SITE}/work/${slug}/`;
const img = (name: string) => `${IMG}/projects/${name}.jpg`;

/** Real ImpressIV projects (impressiv.com.sa/work). Each gets its own LED screen in the hall. */
export const PROJECTS: Project[] = [
  {
    title: "Dawiyat at LEAP 2024",
    client: "Dawiyat",
    category: "Pavilion design",
    year: "2024",
    image: img("dawiyat-leap-2024"),
    href: work("dawiyat-integrated-participation-in-leap-2024"),
  },
  {
    title: "ROSHN at Real Estate Future Forum",
    client: "ROSHN",
    category: "Dynamic booth",
    year: "2024",
    image: img("roshn-real-estate-2024"),
    href: work("roshn-participation-at-future-real-estate-forum-2024"),
  },
  {
    title: "Zain at LEAP 2024",
    client: "Zain",
    category: "Pavilion design",
    year: "2024",
    image: img("zain-leap-2024"),
    href: work("zain-participation-in-leap-2024"),
  },
  {
    title: "Mobily at Capacity Middle East",
    client: "Mobily",
    category: "Dynamic booth",
    year: "2024",
    image: img("mobily-capacity-2024"),
    href: work("mobily-at-capacity-middle-east-2024"),
  },
  {
    title: "TAHAKOM at GITEX",
    client: "TAHAKOM",
    category: "Dynamic booth",
    year: "2023",
    image: img("tahakom-gitex-2023"),
    href: work("%d9%91tahakom-participation-in-gitex-2023"),
  },
  {
    title: "Saudi Post Identity Launch",
    client: "Saudi Post",
    category: "Concept · Design · Event production",
    year: "2021",
    image: img("saudi-post-identity"),
    href: work("saudi-post-identity-launch"),
  },
  {
    title: "STC New Identity Launch",
    client: "STC",
    category: "Concept · Design · Event production",
    year: "2021",
    image: img("stc-new-identity"),
    href: work("stc-new-identity-launching-event"),
  },
  {
    title: "Al Rajhi Building 3D Projection Mapping",
    client: "Al Rajhi Bank",
    category: "Stage concept · Video mapping",
    year: "2021",
    image: img("alrajhi-projection"),
    href: work("al-rajhi-building-3d-projection-mapping"),
  },
  {
    title: "Zain 5G Launch",
    client: "Zain",
    category: "Event production & design",
    year: "2020",
    image: img("zain-5g-launch"),
    href: work("zain-5g-launching"),
  },
  {
    title: "Riyadh International Book Fair",
    client: "Ministry of Culture",
    category: "Stage concept · Video mapping",
    year: "2017–2019",
    image: img("book-fair-2019"),
    href: work("bookfair-festival-2019"),
  },
  {
    title: "National Day 89 Gala Dinner",
    client: "National Day",
    category: "Concept · Design · Event production",
    year: "2019",
    image: img("national-day-89-gala"),
    href: work("national-day-89-gala-dinner"),
  },
  {
    title: "ANB Building 3D Projection Mapping",
    client: "ANB",
    category: "Stage concept · Video mapping",
    year: "2021",
    image: img("anb-projection"),
    href: work("anb-building-3d-projection-mapping"),
  },
];

/** Client names for the marquee, taken from the projects above. */
export const CLIENTS = [
  "Zain",
  "STC",
  "ROSHN",
  "Mobily",
  "Al Rajhi Bank",
  "ANB",
  "Dawiyat",
  "TAHAKOM",
  "Saudi Post",
  "KACST",
  "Tawuniya",
  "RETAL",
];

/** Stills that rotate on the side LED towers and the LED cube. */
export const STILLS = [
  `${IMG}/reels.jpg`,
  `${IMG}/hero-poster.jpg`,
  `${IMG}/slide-kacst.jpg`,
  `${IMG}/slide-eid.jpg`,
  `${IMG}/slide-national-day.jpg`,
  img("dawiyat-leap-2024"),
  img("zain-5g-launch"),
];

/* ------------------------------------------------------------- screens */

export const WALL_X = 17.7;
export const SCREEN_Y = 5.4;
const PER_WALL = Math.ceil(PROJECTS.length / 2);
const Z_FRONT = 10.5;
const Z_BACK = -11.5;

/** Where each project screen hangs: first half down the left wall, second half back up the right. */
export const SCREEN_SLOTS = PROJECTS.map((_, i) => {
  const left = i < PER_WALL;
  const k = left ? i : i - PER_WALL;
  const t = PER_WALL === 1 ? 0 : k / (PER_WALL - 1);
  const z = left ? Z_FRONT + (Z_BACK - Z_FRONT) * t : Z_BACK + (Z_FRONT - Z_BACK) * t;
  return { side: left ? -1 : 1, z };
});

/* ------------------------------------------------------------- camera */

type Vec = [number, number, number];
export interface Station {
  chapter: Chapter;
  pos: Vec;
  look: Vec;
}

export const CHAPTERS = ["Entrance", "The hall", "Reels", "Work", "The crowd", "On stage"] as const;
export type Chapter = (typeof CHAPTERS)[number];

/**
 * Camera stops in page order. Each page section owns one stop, except Work, which owns one
 * stop per project: the camera dollies along the left wall, swings over the crowd, and
 * comes back along the right wall.
 */
export const STATIONS: Station[] = [
  { chapter: "Entrance", pos: [0, 3, 31], look: [0, 7.2, 0] },
  { chapter: "The hall", pos: [-2, 9.5, 11], look: [0, 3.5, -16] },
  { chapter: "Reels", pos: [-4.2, 7.2, 4.5], look: [0, 8.6, -4] },
  ...SCREEN_SLOTS.map(
    ({ side, z }): Station => ({
      chapter: "Work",
      pos: [side * 11.2, 5.1, z - side * 2.6],
      look: [side * WALL_X, SCREEN_Y, z],
    }),
  ),
  { chapter: "The crowd", pos: [2, 1.75, -1], look: [0, 5, -23] },
  { chapter: "On stage", pos: [0, 3.6, -5.5], look: [0, 3.4, -23.4] },
];

export const WORK_START = STATIONS.findIndex((s) => s.chapter === "Work");
export const FINALE = STATIONS.length - 1;
