import { SiteFooter } from "../site-footer";
import { SiteShell } from "../site-shell";
import { ClientMarquee } from "../venue/marquee";
import { SmoothScroll } from "../venue/scroll";
import { WorkGrid } from "./work-grid";
import { WorkHero } from "./work-hero";
import styles from "./work.module.css";

export function WorkPage() {
  return (
    <SiteShell scene={<SmoothScroll />}>
      <main className={styles.main}>
        <WorkHero />
        <WorkGrid />
      </main>
      <ClientMarquee />
      <SiteFooter />
    </SiteShell>
  );
}
