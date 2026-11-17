/**
 * Every project on impressiv.com.sa/work (scraped 2026-11-17; mis-linked cards fixed, duplicates
 * removed). Images are local copies made by scripts/download-impressiv-work.ps1.
 */
export interface WorkProject {
  slug: string;
  file: string;
  title: string;
  category: string;
  year: string;
  /** Source image on impressiv.com.sa (used only by the download script). */
  source: string;
}

export type WorkFilter = "All" | "Pavilions & booths" | "Launch events" | "Stage & video mapping" | "Forums & ceremonies";

export const WORK_FILTERS: WorkFilter[] = [
  "All",
  "Pavilions & booths",
  "Launch events",
  "Stage & video mapping",
  "Forums & ceremonies",
];

const U = "https://impressiv.com.sa/wp-content/uploads/";

const p = (slug: string, title: string, category: string, year: string, source: string, file = slug): WorkProject => ({
  slug,
  file,
  title,
  category,
  year,
  source: U + source,
});

export const WORK_PROJECTS: WorkProject[] = [
  p("dawiyat-integrated-participation-in-leap-2024", "Dawiyat Participation in LEAP 2024", "Pavilion Design", "2024", "2024/06/7TM_3024.jpg"),
  p("roshn-participation-at-future-real-estate-forum-2024", "ROSHN at Real Estate Forum 2024", "Dynamic Booth", "2024", "2024/06/P26_5606-scaled.jpg"),
  p("zain-participation-in-leap-2024", "Zain Participation in LEAP 2024", "Pavilion Design", "2024", "2024/05/2N7A0808.jpg"),
  p("tawuniya-participation-in-leap-2024", "Tawuniya Participation in LEAP 2024", "Dynamic Booth", "2024", "2024/05/Tarek-5578.jpg"),
  p("mobily-at-capacity-middle-east-2024", "Mobily at Capacity Middle East 2024", "Dynamic Booth", "2024", "2024/06/0K4A2311.jpg"),
  p("real-estate-registry-at-proptech-saudi-2023", "RER at Proptech Saudi 2023", "Pavilion Design", "2023", "2024/06/P26_3892-scaled.jpg"),
  p("zain-participation-in-leap-2023", "Zain Participation in LEAP 2023", "Dynamic Booth", "2023", "2024/06/WISM795122.jpeg"),
  p("zain-participation-in-cityscape-2023", "Zain Participation in Cityscape 2023", "Pavilion Design", "2023", "2024/06/2N7A5161-1.jpg"),
  p("%d9%91tahakom-participation-in-gitex-2023", "TAHAKOM Participation in GITEX 2023", "Dynamic Booth", "2023", "2024/06/0K4A6378.jpg", "tahakom-participation-in-gitex-2023"),
  p("retal-participation-in-cityscape-2023", "RETAL Participation in Cityscape 2023", "Pavilion Design", "2023", "2024/06/86A0070.jpg"),
  p("zain-participation-at-step-ahead-conference-2023", "Zain at Step Ahead Conference 2023", "Dynamic Booth", "2023", "2024/06/FD8A7584.jpg"),
  p("emdad-al-khebrat-participation-at-atd-conference-2023", "Emdad Al Khebrat at ATD Conference 2023", "Pavilion Design", "2023", "2024/06/P26_8415.jpg"),
  p("king-abdulaziz-city-for-science-and-technology", "KACST Projects Launching", "Product Launching", "", "2019/08/work-projects-KACST-impressiv-thumb-1.jpg"),
  p("eid-festival-2019", "EID Festival 2019", "Logistics – Event Production", "2019", "2019/08/work-projects-EID2019-impressiv-thumb.jpg"),
  p("bookfair-festival-2019", "Riyadh International Book Fair", "Stage Concept – Video Mapping", "2017–2019", "2020/03/work-projects-book2019-impressiv-thumb.jpg.jpg"),
  p("saudi-post-identity-launch", "Saudi Post Identity Launch", "Concept – Design – Event Production", "2021", "2022/02/SAUDI%20POST%20IDENTITY%20LAUNCH%202021-e1644843165227.jpg"),
  p("fakher-launch-event", "FAKHER Launch Event", "Concept – Design – Event Production", "2021", "2022/02/FAKHER-LAUNCH-EVENT-2021-Cover.jpg"),
  p("saudi-national-day-88-festival-2", "Saudi National Day 88 Festival", "Stage Concept – Video Mapping", "2018", "2022/02/SAUDI-NATIONAL-DAY-88-FESTIVAL-2018-Cover.jpg"),
  p("tahakom-gitex-global-2021", "TAHAKOM GITEX Global 2021", "Concept – Design – Event Production", "2021", "2022/02/TAHAKOM-GITEX-GLOBAL-2021-Cover.jpg"),
  p("docc-launching-event", "DOCC Launching Event", "Stage Concept – Video Mapping", "", "2022/02/DOCC-LAUNCHING-EVENT-Cover.jpg"),
  p("stc-new-identity-launching-event", "STC New Identity Launching Event", "Concept – Design – Event Production", "2021", "2022/02/STC-NEW-IDENTITY-LAUNCHING-EVENT-2021-Cover.jpg"),
  p("atcsc-safety-in-excellence", "ATCSC Safety in Excellence", "Stage Concept – Video Mapping", "", "2022/02/ATCSC-SAFETY-IN-EXCELLENCE-Cover.jpg"),
  p("ccc-new-identity-launching-event", "CCC New Identity Launching Event", "Concept – Design – Event Production", "2021", "2022/02/CCC-NEW-IDENTITY-LAUNCHING-EVENT-2021-Cover.jpg"),
  p("zain-5g-launching", "Zain 5G Launching", "Event Production & Design", "", "2020/05/Zain-5G-work-cover.jpg"),
  p("ministry-of-interior-911-launching", "Ministry of Interior 911 Launching", "Concept – Design – Event Production", "", "2022/02/MINISTRY-OF-INTERIOR-911-LAUNCHING-Cover.jpg"),
  p("al-rajhi-building-3d-projection-mapping", "Al Rajhi Building 3D Projection Mapping", "Stage Concept – Video Mapping", "2021", "2022/02/AL-RAJHI-BUILDING-3D-PROJECTION-MAPPING-2021-Cover.jpg"),
  p("al-rajhi-bank-strategy-launch", "Al Rajhi Bank Strategy Launch", "Concept – Design – Event Production", "", "2022/02/AL-RAJHI-BANK-STRATEGY-LAUNCH-2.jpg"),
  p("anb-building-3d-projection-mapping", "ANB Building 3D Projection Mapping", "Stage Concept – Video Mapping", "", "2022/02/ANB-BUILDING-3D-PROJECTION-MAPPING-Cover.jpg"),
  p("anb-annual-event", "ANB Annual Event", "Concept – Design – Event Production", "", "2022/02/ANB-ANNUAL-EVENT-Cover.jpg"),
  p("gcc-award-event", "GCC Award Event", "Stage Concept – Video Mapping", "", "2022/02/GCC-AWARD-EVENT-Cover.jpg"),
  p("scca18-international-conference", "SCCA18 International Conference", "Concept – Design – Event Production", "2018", "2022/02/SCCA18-INTERNATIONAL-CONFERENCE-Cover.jpg"),
  p("arab-china-women", "Arab-China Women’s Forum", "Branding – Event Production", "", "2020/04/work-projects-arab-china-impressiv-thumb.jpg"),
  p("tasfiah-event-management", "Tasfiah 10 Years Anniversary", "Event Management & Ceremony", "", "2022/02/TASFIAH-10-YEARS-ANNIVERSARY-Cover.jpg"),
  p("stc-whats-next-event", "STC What’s Next Event", "Stage Concept – Video Mapping", "", "2022/02/STC-WHATS-NEXT-EVENT-Cover.jpg"),
  p("stc-sdp", "STC SDP", "Concept – Design – Event Production", "", "2022/02/STC-SDP-Cover.jpg"),
  p("stc-top-400-event", "STC TOP 400 Event", "Stage Concept – Video Mapping", "", "2022/02/STC-TOP-400-EVENT-Cover.jpg"),
  p("national-day-89-gala-dinner", "National Day 89 Gala Dinner", "Concept – Design – Event Production", "2019", "2022/02/NATIONAL-DAY-89-GALA-DINNER-Cover.jpg"),
  p("digital-diwaniyah-event-branding-and-ceremony", "Digital Diwaniyah", "Branding – Event Management", "", "2019/09/work-projects-digital-diwaniyah-impressiv-thumb.jpg"),
  p("future-projects-forum", "Future Projects Forum", "Concept – Design – Event Production", "", "2022/02/FUTURE-PROJECTS-FORUM-Cover.jpg"),
  p("qatrah-ceremony", "Qatrah Launching Ceremony", "Concept – Event Production", "", "2020/03/Quatrah-work-cover.jpg"),
  p("water-transmission-and-technologies-co-wtt-co-launching", "WTT Co. Launching", "Concept – Design – Event Production", "", "2022/02/WATER-TRANSMISSION-AND-TECHNOLOGIES-CO-Cover.jpg"),
  p("nwecc-launching-2021", "NWECC Launching 2021", "Branding – Event Management", "2021", "2022/02/NWECC-LAUNCHING-2021-Cover.jpg"),
  p("saudi-family-forum-2020", "Saudi Family Forum 2020", "Concept – Design – Event Production", "2020", "2022/02/SAUDI-FAMILY-FORUM-2020-Cover.jpg"),
  p("saudi-family-forum", "Saudi Family Forum", "Branding – Event Management", "", "2022/02/SAUDI-FAMILY-FORUM-Cover.jpg"),
  p("enjaz-award", "ENJAZ Award", "Concept – Design – Event Production", "", "2022/02/ENJAZ-AWARD-Cover.jpg"),
  p("al-fozan-academy-launching-ceremony", "Al Fozan Academy Launching Ceremony", "Branding – Event Management", "", "2022/02/AL-FOZAN-ACADEMY-LAUNCHING-CEREMONY-Cover.jpg"),
  p("one-team-project", "ONE TEAM Project", "Concept – Design – Event Production", "", "2022/02/ONE-TEAM-PROJECT-Cover.jpg"),
  p("gaca-aljanadriyah-participation", "GACA Aljanadriyah Participation", "Branding – Event Management", "", "2022/02/GACA-ALJANADRIYAH-PARTICIPATION-Cover.jpg"),
  p("organizers-day", "Organizers Day", "Concept – Design – Event Production", "", "2022/02/ORGANIZER-S-DAY-Cover.jpg"),
  p("mcit-booth-at-afed", "MCIT Booth at AFED", "Branding – Event Management", "", "2022/02/MCIT-BOOTH-AT-AFED-Cover.jpg"),
];

export const workImage = (p: WorkProject) => `/sites/impressiv/work/${p.file}.jpg`;
export const workHref = (p: WorkProject) => `https://impressiv.com.sa/work/${p.slug}/`;

/** Which filter tabs a project shows under (besides "All"). */
export function workFilters(p: WorkProject): WorkFilter[] {
  const t = `${p.title} ${p.category}`.toLowerCase();
  const out: WorkFilter[] = [];
  if (/pavilion|booth|participation/.test(t)) out.push("Pavilions & booths");
  if (/launch/.test(t)) out.push("Launch events");
  if (/video mapping|projection/.test(t)) out.push("Stage & video mapping");
  if (!out.length) out.push("Forums & ceremonies");
  return out;
}
