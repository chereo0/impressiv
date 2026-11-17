export type ChannelKind = "video" | "image" | "card" | "bars" | "snow" | "nosignal" | "dead";

export interface Channel {
  /** Channel number shown in the on-screen display. */
  number: number;
  kind: ChannelKind;
  /** Name shown when the set is hovered. */
  label: string;
  /** Image URL for `image` sets. */
  src?: string;
  /** Big title for `card` sets. */
  title?: string;
  /** Where clicking the set goes. */
  href?: string;
}

const SITE = "https://impressiv.com.sa";
const IMG = "/sites/impressiv";

/**
 * 21 sets, listed bottom row first (6, 5, 4, 3, 2, 1 sets per row), left to right.
 * Index 16 is the centre set the camera flies into.
 */
export const CHANNELS: Channel[] = [
  // row 1 (bottom, 6 sets)
  { number: 2, kind: "image", label: "Reels", src: `${IMG}/reels.jpg`, href: `${SITE}/reel/` },
  { number: 3, kind: "card", label: "Events", title: "EVENTS", href: `${SITE}/reel/` },
  {
    number: 4,
    kind: "image",
    label: "KACST Projects Launching",
    src: `${IMG}/slide-kacst.jpg`,
    href: `${SITE}/work/king-abdulaziz-city-for-science-and-technology/`,
  },
  { number: 0, kind: "bars", label: "Test card" },
  { number: 5, kind: "card", label: "Exhibition", title: "EXHIBITION", href: `${SITE}/reel/` },
  {
    number: 6,
    kind: "image",
    label: "EID Festival 2019 · Masmak Fort",
    src: `${IMG}/slide-eid.jpg`,
    href: `${SITE}/work/eid-festival-2019/`,
  },
  // row 2 (5 sets)
  { number: 0, kind: "snow", label: "No station" },
  {
    number: 7,
    kind: "image",
    label: "Saudi National Day 88 Festival",
    src: `${IMG}/slide-national-day.jpg`,
    href: `${SITE}/work/saudi-national-day-88-festival/`,
  },
  { number: 8, kind: "card", label: "Shows", title: "SHOWS", href: `${SITE}/reel/` },
  { number: 9, kind: "video", label: "Showreel 2019", href: `${SITE}/reel/` },
  { number: 10, kind: "card", label: "Making off", title: "MAKING OFF", href: `${SITE}/reel/` },
  // row 3 (4 sets)
  {
    number: 11,
    kind: "card",
    label: "Riyadh International Book Fair 2019",
    title: "BOOK FAIR 2019",
  },
  { number: 12, kind: "image", label: "SCCA 2018", src: `${IMG}/hero-poster.jpg`, href: `${SITE}/work/` },
  { number: 0, kind: "nosignal", label: "No signal" },
  { number: 13, kind: "card", label: "Since 2011", title: "SINCE 2011", href: `${SITE}/about/` },
  // row 4 (3 sets)
  {
    number: 14,
    kind: "card",
    label: "Event production & concept",
    title: "PRODUCTION",
    href: `${SITE}/approach/`,
  },
  { number: 1, kind: "video", label: "We do it live", href: "http://wa.link/frlwct" },
  {
    number: 15,
    kind: "card",
    label: "Product launching",
    title: "LAUNCHES",
    href: `${SITE}/work/`,
  },
  // row 5 (2 sets)
  { number: 16, kind: "image", label: "Featured work", src: `${IMG}/slide-national-day.jpg`, href: `${SITE}/work/` },
  { number: 0, kind: "dead", label: "Off" },
  // row 6 (top)
  { number: 17, kind: "card", label: "ImpressIV", title: "IMPRESSIV", href: `${SITE}/contact/` },
];

export const ROWS = [6, 5, 4, 3, 2, 1];
export const HERO_INDEX = 16;

/** One word per row, top row first, shown when the wall syncs into a single ident. */
export const IDENT_WORDS = ["IV", "WE", "DO", "IT", "LIVE", "EVENTS"];

export const IMAGE_POOL = [
  `${IMG}/reels.jpg`,
  `${IMG}/slide-kacst.jpg`,
  `${IMG}/slide-eid.jpg`,
  `${IMG}/slide-national-day.jpg`,
  `${IMG}/hero-poster.jpg`,
];

export const VIDEO_SRC = `${IMG}/hero-reel.mp4`;
